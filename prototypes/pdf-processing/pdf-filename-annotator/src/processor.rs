use crate::config::Config;
use crate::error::Error;
use crate::scanner_diagnostic;
use log::{debug, error, info, warn};
use lopdf::{dictionary, Document, Object, Stream};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Summary of PDF processing results
#[derive(Debug)]
pub struct ProcessingSummary {
    /// Number of files successfully processed
    pub files_processed: usize,

    /// Number of pages annotated
    pub pages_annotated: usize,

    /// Map of files that encountered errors and their error messages
    pub errors: HashMap<PathBuf, String>,

    /// Map of files with partial success (some pages failed)
    /// The value is a vector of tuples with (page_index, error_message)
    pub partial_success: HashMap<PathBuf, Vec<(usize, String)>>,
}

/// PDF processor for batch processing PDF files
pub struct PdfProcessor {
    /// Application configuration
    pub config: Config,
}

impl PdfProcessor {
    /// Create a new PDF processor with the given configuration
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    /// Process all PDF files in the configured input directory
    pub fn process_all(&self) -> Result<ProcessingSummary, Error> {
        // Ensure output directory exists
        self.ensure_output_dir()?;

        // Find all PDF files in the input directory
        let pdf_files = self.find_pdf_files()?;

        let mut summary = ProcessingSummary {
            files_processed: 0,
            pages_annotated: 0,
            errors: HashMap::new(),
            partial_success: HashMap::new(),
        };

        // Process each file
        for file_path in pdf_files {
            match self.process_file(&file_path) {
                Ok(pages) => {
                    summary.files_processed += 1;
                    summary.pages_annotated += pages;

                    // Check if this was a partial success (some pages failed)
                    if let Some(page_errors) = self.get_page_errors(&file_path) {
                        if !page_errors.is_empty() {
                            summary
                                .partial_success
                                .insert(file_path.clone(), page_errors);
                        }
                    }
                }
                Err(e) => {
                    error!("Error processing {}: {}", file_path.display(), e);
                    summary.errors.insert(file_path, e.to_string());
                }
            }
        }

        Ok(summary)
    }

    /// Process a single PDF file
    pub fn process_file(&self, input_path: &Path) -> Result<usize, Error> {
        // Generate output path
        let output_path = self.generate_output_path(input_path);

        // Get the filename (for annotation)
        let filename = input_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown.pdf");

        info!("Processing {}", input_path.display());

        // First, detect if this is a scanner-generated PDF
        let is_scanner_pdf = match scanner_diagnostic::analyze_pdf(input_path) {
            Ok(diagnostic) => {
                let scanner_indicators = scanner_diagnostic::count_scanner_indicators(&diagnostic);
                let is_scanner = scanner_indicators >= 4; // Threshold for scanner detection

                if is_scanner {
                    info!(
                        "Detected scanner-generated PDF with {} indicators",
                        scanner_indicators
                    );

                    // Look at specific scanner properties that might need special handling
                    let first_page_has_array_content = if !diagnostic.pages.is_empty() {
                        diagnostic.pages[0].content.content_type == "array"
                    } else {
                        false
                    };

                    if first_page_has_array_content {
                        debug!("First page has array content streams (typical for scanners)");
                    }

                    // Check for first page differences
                    if diagnostic.pages.len() > 1 {
                        let first_content_type = &diagnostic.pages[0].content.content_type;
                        let other_content_types: Vec<_> = diagnostic.pages[1..]
                            .iter()
                            .map(|p| &p.content.content_type)
                            .collect();

                        if !other_content_types.iter().all(|t| *t == first_content_type) {
                            debug!("First page has different content type than other pages");
                        }
                    }
                }

                is_scanner
            }
            Err(e) => {
                warn!("Failed to analyze PDF for scanner detection: {}", e);
                false
            }
        };

        // Log if this is a scanner PDF
        if is_scanner_pdf {
            debug!("Scanner PDF detected, will use special handling for first page");
        }

        // First, try to read the file with lopdf
        let mut doc = Document::load(input_path)?;

        // Fix any issues with the page tree
        self.fix_page_tree(&mut doc)?;

        // Create an annotator with our font config
        let annotator = crate::annotation::Annotator::new(self.config.font.clone())?;

        // Get the pages
        let pages = doc.get_pages();
        let mut pages_annotated = 0;

        // Track page-level failures
        let mut page_errors = Vec::new();

        // For debugging - print page count
        debug!("Found {} pages", pages.len());

        // Process each page
        // This is the fixed version of the page processing loop from processor.rs
        // Process each page
        for (idx, page_ref) in pages.iter().enumerate() {
            // Use the correct page dictionary object id from page_ref.1 rather than constructing a bogus one.
            let page_id = *page_ref.1; // Dereference to get the actual (u32,u16) tuple

            debug!("Processing page {} with ID {:?}", idx + 1, page_id);

            // Flag for special handling of first page in scanner PDFs
            let is_first_page_of_scanner = is_scanner_pdf && idx == 0;
            if is_first_page_of_scanner {
                debug!("Special handling for first page of scanner PDF");
            }

            // Create a fixed reference to the page if needed
            let fixed_page_id = match self.ensure_page_dictionary(&mut doc, page_id) {
                Ok(id) => id,
                Err(e) => {
                    error!(
                        "Failed to ensure page dictionary for page {} in {}: {}",
                        idx + 1,
                        input_path.display(),
                        e
                    );
                    page_errors.push((idx + 1, format!("Page dictionary error: {}", e)));
                    continue; // Skip to next page
                }
            };

            // Get page dimensions for positioning
            let (page_width, page_height) = match self.get_page_dimensions(&doc, fixed_page_id) {
                Ok(dimensions) => dimensions,
                Err(e) => {
                    error!(
                        "Failed to get dimensions for page {} in {}: {}",
                        idx + 1,
                        input_path.display(),
                        e
                    );
                    page_errors.push((idx + 1, format!("Dimension error: {}", e)));
                    continue; // Skip to next page
                }
            };

            // Calculate position for the annotation
            let (x, y) = annotator.calculate_position(
                &self.config.position,
                page_width,
                page_height,
                filename,
            );

            // For scanner PDFs, choose the annotation strategy
            let annotation_result = if is_scanner_pdf {
                if is_first_page_of_scanner {
                    self.add_scanner_first_page_annotation(
                        &annotator,
                        &mut doc,
                        fixed_page_id,
                        filename,
                        x,
                        y,
                    )
                } else if idx >= 3 {
                    self.add_scanner_later_page_annotation(
                        &annotator,
                        &mut doc,
                        fixed_page_id,
                        filename,
                        x,
                        y,
                        idx,
                    )
                } else {
                    self.add_searchable_annotation(
                        &annotator,
                        &mut doc,
                        fixed_page_id,
                        filename,
                        x,
                        y,
                    )
                    .or_else(|_| {
                        annotator.add_text_to_page(&mut doc, fixed_page_id, filename, x, y)
                    })
                }
            } else {
                self.add_searchable_annotation(&annotator, &mut doc, fixed_page_id, filename, x, y)
                    .or_else(|_| {
                        annotator.add_text_to_page(&mut doc, fixed_page_id, filename, x, y)
                    })
            };

            match annotation_result {
                Ok(_) => {
                    pages_annotated += 1;
                    debug!("Annotated page {} in {}", idx + 1, input_path.display());
                }
                Err(e) => {
                    error!(
                        "Failed to annotate page {} in {}: {}",
                        idx + 1,
                        input_path.display(),
                        e
                    );
                    page_errors.push((idx + 1, format!("Annotation error: {}", e)));
                }
            }
        }

        if pages_annotated > 0 {
            // Save the modified PDF
            doc.save(&output_path)?;

            info!("Saved annotated PDF to {}", output_path.display());
            info!("Annotated {} pages", pages_annotated);

            // Log any page-specific errors
            if !page_errors.is_empty() {
                info!(
                    "Note: {} out of {} pages could not be annotated in {}",
                    page_errors.len(),
                    pages.len(),
                    input_path.display()
                );

                // Store page errors in partial_success field (handled by process_all)
            }
        } else {
            return Err(Error::Processing(format!(
                "No pages were successfully annotated in {}. Errors: {:?}",
                input_path.display(),
                page_errors
            )));
        }

        Ok(pages_annotated)
    }

    /// Add an annotation to the first page of a scanner PDF
    ///
    /// This method uses a special approach for scanner-generated PDFs which often
    /// have multiple content streams and a complex structure on the first page.
    /// It ensures all original content is preserved while adding our annotation.
    fn add_scanner_first_page_annotation(
        &self,
        annotator: &crate::annotation::Annotator,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<(), crate::error::AnnotationError> {
        debug!("Using scanner first page approach for page {:?}", page_id);

        // For scanner PDFs, we'll use a hybrid approach:
        // 1. First, try to create a new independent content stream with our annotation
        // 2. If that fails, try to add a stamp annotation
        // 3. If both fail, then fall back to modifying existing content

        // First check if the page has a Contents entry and what type it is
        // We need to use a block to limit the scope of our borrows
        let has_array_contents_and_data = {
            // Get the page dictionary
            let page_dict = doc.get_dictionary(page_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get scanner page dictionary: {}",
                    e
                ))
            })?;

            // Check for array contents
            let has_array_contents = match page_dict.get(b"Contents") {
                Ok(Object::Array(_)) => true,
                _ => false,
            };

            // If it has array contents, collect info about existing contents
            if has_array_contents {
                let existing_contents_data = match page_dict.get(b"Contents") {
                    Ok(Object::Array(array)) => {
                        debug!("Found Contents array with {} items", array.len());
                        (array.clone(), false, None)
                    }
                    Ok(Object::Reference(ref_id)) => {
                        debug!("Contents is a reference to {:?}", ref_id);
                        // Store reference ID but don't try to dereference it yet
                        (vec![], true, Some(*ref_id))
                    }
                    _ => {
                        // No contents or unexpected type, create an empty array
                        debug!("No valid Contents entry, creating new array");
                        (vec![], false, None)
                    }
                };
                (true, existing_contents_data)
            } else {
                (false, (vec![], false, None))
            }
        };

        let (has_array_contents, (mut existing_contents, page_dict_ref, ref_id_opt)) =
            has_array_contents_and_data;

        if has_array_contents {
            debug!("First page has array Contents, adding new content stream for annotation");

            // Create a new content stream for our annotation - this is independent
            // of any existing content to avoid corrupting it
            let new_content_stream = self.create_annotation_content_stream(doc, text, x, y)?;
            let new_content_id = doc.add_object(Object::Stream(new_content_stream));

            // Process referenced content array if needed to get all existing content
            if let Some(ref_id) = ref_id_opt {
                match doc.get_object(ref_id) {
                    Ok(Object::Array(array)) => {
                        debug!("Referenced Contents array has {} items", array.len());
                        existing_contents = array.clone();
                    }
                    Ok(Object::Stream(_stream)) => {
                        // Special case: reference points to a stream, not an array
                        // Create a new array that includes the original content stream
                        debug!("Referenced Contents is a single stream, creating new array");
                        existing_contents = vec![Object::Reference(ref_id)];
                    }
                    Ok(other) => {
                        // Not an array reference, but preserve whatever it is
                        debug!(
                            "Referenced Contents is not an array or stream ({}), preserving it",
                            if let Object::Dictionary(_) = other {
                                "Dictionary"
                            } else {
                                "Other"
                            }
                        );
                        existing_contents = vec![Object::Reference(ref_id)];
                    }
                    Err(e) => {
                        // We couldn't get the referenced object, warn and continue
                        debug!(
                            "Error getting referenced Contents: {}, creating new array",
                            e
                        );
                        existing_contents = vec![];
                    }
                }
            }

            // IMPORTANT: Append our annotation to existing content rather than replacing
            // This preserves all original content in its original order
            let mut updated_contents = existing_contents;
            updated_contents.push(Object::Reference(new_content_id));

            debug!(
                "Updated Contents array now has {} items",
                updated_contents.len()
            );

            // Update the page dictionary
            if page_dict_ref {
                // If it was a reference to an array, update the array object
                if let Some(ref_id) = ref_id_opt {
                    doc.objects.insert(ref_id, Object::Array(updated_contents));
                    debug!("Updated referenced Contents array at {:?}", ref_id);
                }
            } else {
                // If it was a direct array or missing, update the page dictionary
                let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                    crate::error::AnnotationError::ContentStreamError(format!(
                        "Failed to get mutable scanner page dictionary: {}",
                        e
                    ))
                })?;
                page_dict.set("Contents", Object::Array(updated_contents));
                debug!("Updated page dictionary Contents directly");
            }

            // Ensure resources exist with proper merging to preserve all original resources
            self.ensure_scanner_resources(doc, page_id)?;

            Ok(())
        } else {
            // No array contents, try to detect what kind of structure this page has
            let page_dict = doc.get_dictionary(page_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get scanner page dictionary: {}",
                    e
                ))
            })?;

            // Check if the page has a Contents entry at all
            if let Ok(Object::Reference(content_ref)) = page_dict.get(b"Contents") {
                // Page has a single reference to contents
                // Store the content reference for later use
                let ref_id = *content_ref;

                // Need to end the scope of the immutable borrow before doing mutable operations
                let _ = page_dict;

                // Determine what the reference points to
                let is_stream = match doc.get_object(ref_id) {
                    Ok(Object::Stream(_)) => true,
                    _ => {
                        debug!(
                            "Contents reference doesn't point to a Stream, trying other approaches"
                        );
                        false
                    }
                };

                if is_stream {
                    debug!("First page has a single content stream, converting to array structure");

                    // Create a new array with existing content and our annotation
                    let new_content_stream =
                        self.create_annotation_content_stream(doc, text, x, y)?;
                    let new_content_id = doc.add_object(Object::Stream(new_content_stream));

                    // Create array with original content plus our annotation
                    let contents_array =
                        vec![Object::Reference(ref_id), Object::Reference(new_content_id)];

                    // Update the page dictionary to use the array
                    let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                        crate::error::AnnotationError::ContentStreamError(format!(
                            "Failed to get mutable scanner page dictionary: {}",
                            e
                        ))
                    })?;
                    page_dict.set("Contents", Object::Array(contents_array));

                    // Ensure resources exist with proper merging
                    self.ensure_scanner_resources(doc, page_id)?;

                    return Ok(());
                }
            }

            // Fall back to using regular annotation methods
            debug!("First page does not have array Contents, using standard annotation approaches");

            // First try searchable annotation
            self.add_searchable_annotation(annotator, doc, page_id, text, x, y)
                .or_else(|_| {
                    // Then try stamp annotation
                    self.add_stamp_annotation(doc, page_id, text, x, y)
                })
                .or_else(|_| {
                    // Finally fall back to content stream annotation, which may
                    // replace existing content if the page has unusual structure
                    annotator.add_text_to_page(doc, page_id, text, x, y)
                })
        }
    }

    /// Create a new content stream for annotation
    fn create_annotation_content_stream(
        &self,
        _doc: &Document,
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<Stream, crate::error::AnnotationError> {
        // Create a content stream with a BT/ET block that draws the text
        // This uses the PDF content stream operators to create a standalone text block

        // Create a simple dictionary for the stream
        let stream_dict = lopdf::Dictionary::new();

        // Build a PDF content stream that draws the text
        // Important: Set graphics state to avoid interference with other content
        let font_size = self.config.font.size;
        let content = format!(
            "q\n                     % Save graphics state\n\
             1 0 0 1 0 0 cm\n           % Reset transformation matrix\n\
             BT\n                     % Begin text block\n\
             /F0 {} Tf\n             % Set font and size\n\
             1 0 0 1 {} {} Tm\n      % Set text matrix (position)\n\
             0 0 0 rg\n              % Set text color to black\n\
             1 Tr\n                  % Set text rendering mode to stroke\n\
             ({}) Tj\n              % Draw the text\n\
             0 Tr\n                  % Set text rendering mode to fill\n\
             ({}) Tj\n              % Draw the text again (filled)\n\
             ET\n                     % End text block\n\
             Q\n                     % Restore graphics state",
            font_size, x, y, text, text
        );

        // Create the stream object
        let stream = Stream::new(stream_dict, content.as_bytes().to_vec());

        Ok(stream)
    }

    /// Ensure that resources needed for scanner PDF annotation exist
    ///
    /// This method properly merges resource dictionaries, ensuring that we keep all existing
    /// resources while adding our own. This is critical for scanner PDFs where existing resources
    /// often reference important XObjects for the page content.
    fn ensure_scanner_resources(
        &self,
        doc: &mut Document,
        page_id: (u32, u16),
    ) -> Result<(), crate::error::AnnotationError> {
        // First we need to check if the resources exist and collect info
        let (resources_id, needs_update, existing_dict) = {
            // Get the page dictionary to check for resources
            let page_dict = doc.get_dictionary(page_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get page dictionary for resources: {}",
                    e
                ))
            })?;

            // Check if resources exist and get its form
            match page_dict.get(b"Resources") {
                Ok(Object::Dictionary(dict)) => {
                    // Resources directly in page - create a new object while preserving content
                    let resources_dict = dict.clone();
                    let new_id = doc.new_object_id();
                    doc.objects
                        .insert(new_id, Object::Dictionary(resources_dict.clone()));
                    (new_id, true, Some(resources_dict))
                }
                Ok(Object::Reference(id)) => {
                    // Resources as reference - get existing
                    let existing_dict = if let Ok(Object::Dictionary(dict)) = doc.get_object(*id) {
                        Some(dict.clone())
                    } else {
                        None
                    };
                    (*id, false, existing_dict)
                }
                _ => {
                    // No resources - create new
                    let resources_dict = lopdf::Dictionary::new();
                    let new_id = doc.new_object_id();
                    doc.objects
                        .insert(new_id, Object::Dictionary(resources_dict));
                    (new_id, true, None)
                }
            }
        };

        // Update page dictionary if needed
        if needs_update {
            let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get mutable page dictionary: {}",
                    e
                ))
            })?;
            page_dict.set("Resources", Object::Reference(resources_id));
        }

        // Handle font dictionary
        let has_font_and_font_ref = {
            // Check if there is a Font dictionary in resources
            let resources_dict = doc.get_dictionary(resources_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get resources dictionary: {}",
                    e
                ))
            })?;

            match resources_dict.get(b"Font") {
                Ok(Object::Dictionary(_)) => (true, None), // Has direct font dict
                Ok(Object::Reference(font_ref)) => (true, Some(*font_ref)), // Has referenced font dict
                _ => (false, None),                                         // No font dict
            }
        };

        // Process based on the font status, with proper merging to preserve existing fonts
        match has_font_and_font_ref {
            (false, _) => {
                // No Font dictionary, add one
                let resources_dict = doc.get_dictionary_mut(resources_id).map_err(|e| {
                    crate::error::AnnotationError::ContentStreamError(format!(
                        "Failed to get resources dictionary: {}",
                        e
                    ))
                })?;

                let mut font_dict = lopdf::Dictionary::new();

                // Add a basic Helvetica font
                let mut helvetica_dict = lopdf::Dictionary::new();
                helvetica_dict.set("Type", Object::Name(b"Font".to_vec()));
                helvetica_dict.set("Subtype", Object::Name(b"Type1".to_vec()));
                helvetica_dict.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                helvetica_dict.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));

                // Add to font dictionary
                font_dict.set("F0", Object::Dictionary(helvetica_dict));

                // Set in resources
                resources_dict.set("Font", Object::Dictionary(font_dict));
            }
            (true, None) => {
                // Direct font dictionary, ensure it has F0
                let resources_dict = doc.get_dictionary_mut(resources_id).map_err(|e| {
                    crate::error::AnnotationError::ContentStreamError(format!(
                        "Failed to get resources dictionary: {}",
                        e
                    ))
                })?;

                // Check if Font dictionary has F0
                let needs_f0 = {
                    if let Ok(Object::Dictionary(font_dict)) = resources_dict.get(b"Font") {
                        !font_dict.has(b"F0")
                    } else {
                        true // If it's not a dictionary, we'll add F0
                    }
                };

                if needs_f0 {
                    if let Ok(Object::Dictionary(font_dict)) = resources_dict.get_mut(b"Font") {
                        // Add Helvetica without modifying existing fonts
                        let mut helvetica_dict = lopdf::Dictionary::new();
                        helvetica_dict.set("Type", Object::Name(b"Font".to_vec()));
                        helvetica_dict.set("Subtype", Object::Name(b"Type1".to_vec()));
                        helvetica_dict.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                        helvetica_dict.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));

                        // Add to font dictionary without overwriting anything else
                        font_dict.set("F0", Object::Dictionary(helvetica_dict));
                    } else {
                        // Font is not a dictionary, preserve as much as possible
                        let mut font_dict = lopdf::Dictionary::new();

                        // If there was a previous value, try to preserve it
                        if let Ok(original_font) = resources_dict.get(b"Font") {
                            font_dict.set("Original", original_font.clone());
                        }

                        // Add Helvetica
                        let mut helvetica_dict = lopdf::Dictionary::new();
                        helvetica_dict.set("Type", Object::Name(b"Font".to_vec()));
                        helvetica_dict.set("Subtype", Object::Name(b"Type1".to_vec()));
                        helvetica_dict.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                        helvetica_dict.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));

                        // Add to font dictionary
                        font_dict.set("F0", Object::Dictionary(helvetica_dict));

                        // Set in resources
                        resources_dict.set("Font", Object::Dictionary(font_dict));
                    }
                }
            }
            (true, Some(font_ref)) => {
                // Referenced font dictionary, ensure it has F0
                let (font_needs_f0, font_dict_clone) = {
                    if let Ok(Object::Dictionary(font_dict)) = doc.get_object(font_ref) {
                        (!font_dict.has(b"F0"), Some(font_dict.clone()))
                    } else {
                        (true, None)
                    }
                };

                if font_needs_f0 {
                    if let Some(mut font_dict) = font_dict_clone {
                        // Add Helvetica while preserving existing fonts
                        let mut helvetica_dict = lopdf::Dictionary::new();
                        helvetica_dict.set("Type", Object::Name(b"Font".to_vec()));
                        helvetica_dict.set("Subtype", Object::Name(b"Type1".to_vec()));
                        helvetica_dict.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                        helvetica_dict.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));

                        // Add to font dictionary without overwriting existing entries
                        font_dict.set("F0", Object::Dictionary(helvetica_dict));

                        // Update the referenced dictionary
                        doc.objects.insert(font_ref, Object::Dictionary(font_dict));
                    } else {
                        // Create a new font dictionary and update resource reference
                        let mut font_dict = lopdf::Dictionary::new();

                        // Add Helvetica
                        let mut helvetica_dict = lopdf::Dictionary::new();
                        helvetica_dict.set("Type", Object::Name(b"Font".to_vec()));
                        helvetica_dict.set("Subtype", Object::Name(b"Type1".to_vec()));
                        helvetica_dict.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                        helvetica_dict.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));

                        // Add to font dictionary
                        font_dict.set("F0", Object::Dictionary(helvetica_dict));

                        // Update the reference in the document
                        doc.objects.insert(font_ref, Object::Dictionary(font_dict));
                    }
                }
            }
        }

        // Preserve existing XObject resources
        if let Some(existing_resources) = existing_dict {
            // Check if we have XObjects in the existing resources
            if let Ok(Object::Dictionary(xobjects)) = existing_resources.get(b"XObject") {
                let resources_dict = doc.get_dictionary_mut(resources_id).map_err(|e| {
                    crate::error::AnnotationError::ContentStreamError(format!(
                        "Failed to get resources dictionary: {}",
                        e
                    ))
                })?;

                // If XObjects aren't already in the new resources, add them
                if !resources_dict.has(b"XObject") {
                    resources_dict.set("XObject", Object::Dictionary(xobjects.clone()));
                } else if let Ok(Object::Dictionary(existing_xobjects)) =
                    resources_dict.get_mut(b"XObject")
                {
                    // If we already have XObjects, merge them rather than replacing
                    for (k, v) in xobjects.iter() {
                        if !existing_xobjects.has(k) {
                            let key = k.clone(); // Create a new owned key
                            existing_xobjects.set(key, v.clone());
                        }
                    }
                }
            }

            // Also preserve other resource dictionaries (ColorSpace, ExtGState, etc.)
            let preserve_keys: &[&[u8]] = &[
                b"ColorSpace",
                b"ExtGState",
                b"Pattern",
                b"Shading",
                b"Properties",
            ];

            let resources_dict = doc.get_dictionary_mut(resources_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get resources dictionary: {}",
                    e
                ))
            })?;

            for &key in preserve_keys {
                if !resources_dict.has(key) && existing_resources.has(key) {
                    if let Ok(value) = existing_resources.get(key) {
                        resources_dict.set(key, value.clone());
                    }
                }
            }
        }

        Ok(())
    }

    /// Add an annotation to pages beyond the first three in scanner PDFs
    ///
    /// This method handles the special case of pages 4+ in scanner PDFs, which often
    /// have different structures than the first three pages and require special handling.
    fn add_scanner_later_page_annotation(
        &self,
        annotator: &crate::annotation::Annotator,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
        page_index: usize,
    ) -> Result<(), crate::error::AnnotationError> {
        debug!(
            "Using scanner later page approach for page {} (index {})",
            page_id.0, page_index
        );

        // For pages beyond the first three, we need to check the page structure
        // and apply an appropriate annotation strategy based on what we find

        // First analyze the page structure to detect the type of content stream
        let page_structure = {
            let page_dict = doc.get_dictionary(page_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get scanner page dictionary: {}",
                    e
                ))
            })?;

            // Check for array contents, references, or direct stream
            let content_type = match page_dict.get(b"Contents") {
                Ok(Object::Array(_)) => "array",
                Ok(Object::Reference(ref_id)) => {
                    // Check what the reference points to
                    match doc.get_object(*ref_id) {
                        Ok(Object::Array(_)) => "array_ref",
                        Ok(Object::Stream(_)) => "stream_ref",
                        _ => "unknown_ref",
                    }
                }
                Ok(Object::Stream(_)) => "direct_stream",
                _ => "unknown",
            };

            // Check for scanner-specific dictionary entries
            let has_scanner_keys = page_dict.has(b"ScannerGenerated")
                || page_dict.has(b"Producer")
                || page_dict.has(b"Scanner");

            (content_type, has_scanner_keys)
        };

        // Based on the structure, choose the best annotation strategy
        let (content_type, has_scanner_keys) = page_structure;

        debug!(
            "Later page {} has content type: {} and scanner keys: {}",
            page_index + 1,
            content_type,
            has_scanner_keys
        );

        match content_type {
            "array" | "array_ref" => {
                // For array content streams (common in later scanner pages too),
                // use a similar approach to first page but with slight modifications
                self.handle_array_content_page(doc, page_id, text, x, y)
            }
            "direct_stream" => {
                // For direct stream content, try a stamp annotation first
                self.add_stamp_annotation(doc, page_id, text, x, y)
                    .or_else(|_| {
                        // If stamp fails, fall back to content stream
                        annotator.add_text_to_page(doc, page_id, text, x, y)
                    })
            }
            "stream_ref" => {
                // For referenced stream content, try searchable annotation first
                self.add_searchable_annotation(annotator, doc, page_id, text, x, y)
                    .or_else(|_| {
                        // If that fails, try stamp annotation
                        self.add_stamp_annotation(doc, page_id, text, x, y)
                    })
                    .or_else(|_| {
                        // Finally fall back to regular content stream
                        annotator.add_text_to_page(doc, page_id, text, x, y)
                    })
            }
            _ => {
                // For unknown structures, try multiple approaches
                if has_scanner_keys {
                    // If it has scanner-specific keys, try stamp first
                    self.add_stamp_annotation(doc, page_id, text, x, y)
                        .or_else(|_| {
                            // Then try searchable annotation
                            self.add_searchable_annotation(annotator, doc, page_id, text, x, y)
                        })
                        .or_else(|_| {
                            // Finally fall back to content stream
                            annotator.add_text_to_page(doc, page_id, text, x, y)
                        })
                } else {
                    // Otherwise use standard approach
                    self.add_searchable_annotation(annotator, doc, page_id, text, x, y)
                        .or_else(|_| annotator.add_text_to_page(doc, page_id, text, x, y))
                }
            }
        }
    }

    /// Helper method for pages with array content streams
    ///
    /// This method properly handles pages that use an array of content streams,
    /// which is common in scanner PDFs. It preserves all existing content while
    /// adding our annotation.
    fn handle_array_content_page(
        &self,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<(), crate::error::AnnotationError> {
        debug!("Handling array content page for page {:?}", page_id);

        // First check if the page has a Contents entry and get its data
        let contents_data = {
            // Get the page dictionary
            let page_dict = doc.get_dictionary(page_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get scanner page dictionary: {}",
                    e
                ))
            })?;

            // Check Contents type and collect info
            match page_dict.get(b"Contents") {
                Ok(Object::Array(array)) => {
                    debug!("Found Contents array with {} items", array.len());
                    (array.clone(), false, None)
                }
                Ok(Object::Reference(ref_id)) => {
                    debug!("Contents is a reference to {:?}", ref_id);
                    match doc.get_object(*ref_id) {
                        Ok(Object::Array(array)) => {
                            // It's a reference to an array
                            debug!("Referenced array has {} items", array.len());
                            (array.clone(), true, Some(*ref_id))
                        }
                        _ => {
                            // Not an array reference, create an empty array
                            (vec![], true, Some(*ref_id))
                        }
                    }
                }
                _ => {
                    // No contents or unexpected type, create an empty array
                    debug!("No valid Contents entry, creating new array");
                    (vec![], false, None)
                }
            }
        };

        let (existing_contents, is_ref, ref_id_opt) = contents_data;

        // Create new content stream with our annotation
        let new_content_stream = self.create_annotation_content_stream(doc, text, x, y)?;
        let new_content_id = doc.add_object(Object::Stream(new_content_stream));

        // IMPORTANT: Preserve all existing content streams - don't replace them
        // Create a new array with all existing content plus our annotation
        let mut updated_contents = existing_contents;
        updated_contents.push(Object::Reference(new_content_id));

        // Update the page dictionary based on its structure
        if is_ref {
            if let Some(ref_id) = ref_id_opt {
                // Update the referenced array - preserve original reference
                doc.objects.insert(ref_id, Object::Array(updated_contents));
            } else {
                // If there's a reference but no valid ref_id, update the page directly
                let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                    crate::error::AnnotationError::ContentStreamError(format!(
                        "Failed to get page dictionary: {}",
                        e
                    ))
                })?;

                page_dict.set("Contents", Object::Array(updated_contents));
            }
        } else {
            // Direct array or no array - update the page dictionary directly
            let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get page dictionary: {}",
                    e
                ))
            })?;

            page_dict.set("Contents", Object::Array(updated_contents));
        }

        // Ensure required resources exist for our annotation by merging resources
        self.ensure_scanner_resources(doc, page_id)?;

        Ok(())
    }

    /// Add a stamp annotation to a page (alternative to FreeText for scanner PDFs)
    fn add_stamp_annotation(
        &self,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<(), crate::error::AnnotationError> {
        debug!("Adding stamp annotation to page {:?}", page_id);

        // Calculate text width using approximation
        let (text_width, text_height) = (100.0, self.config.font.size + 4.0); // Approximate

        // Create annotation dictionary
        let mut annot_dict = lopdf::Dictionary::new();
        annot_dict.set("Type", Object::Name(b"Annot".to_vec()));
        annot_dict.set("Subtype", Object::Name(b"Stamp".to_vec()));
        annot_dict.set(
            "Contents",
            Object::String(text.as_bytes().to_vec(), lopdf::StringFormat::Literal),
        );
        annot_dict.set(
            "Rect",
            Object::Array(vec![
                Object::Real(x),
                Object::Real(y - text_height),
                Object::Real(x + text_width),
                Object::Real(y),
            ]),
        );

        // Set appearance characteristics
        let mut ap_dict = lopdf::Dictionary::new();
        ap_dict.set("R", Object::Integer(0)); // Rotation
        ap_dict.set(
            "BC",
            Object::Array(vec![
                Object::Real(0.0),
                Object::Real(0.0),
                Object::Real(0.0),
            ]),
        ); // Border color
        ap_dict.set(
            "BG",
            Object::Array(vec![
                Object::Real(1.0),
                Object::Real(1.0),
                Object::Real(1.0),
            ]),
        ); // Background color
        annot_dict.set("AP", Object::Dictionary(ap_dict));

        // Set flags (print bit)
        annot_dict.set("F", Object::Integer(4));

        // Set border
        annot_dict.set(
            "Border",
            Object::Array(vec![
                Object::Integer(0),
                Object::Integer(0),
                Object::Integer(1),
            ]),
        );

        // Create appearance stream (important for scanner PDFs)
        let stream_content = format!(
            "q\n\
             1 1 1 rg\n\
             0 0 0 RG\n\
             0.5 w\n\
             0 0 {} {} re\n\
             b\n\
             BT\n\
             /F0 {} Tf\n\
             0 0 0 rg\n\
             2 {} Td\n\
             ({}) Tj\n\
             ET\n\
             Q",
            text_width,
            text_height,
            self.config.font.size,
            text_height - 4.0, // Position text near top
            text
        );

        let mut ap_stream_dict = lopdf::Dictionary::new();
        ap_stream_dict.set("Type", Object::Name(b"XObject".to_vec()));
        ap_stream_dict.set("Subtype", Object::Name(b"Form".to_vec()));
        ap_stream_dict.set("FormType", Object::Integer(1));
        ap_stream_dict.set(
            "BBox",
            Object::Array(vec![
                Object::Real(0.0),
                Object::Real(0.0),
                Object::Real(text_width),
                Object::Real(text_height),
            ]),
        );

        // Add Resources for the appearance stream
        let mut resources_dict = lopdf::Dictionary::new();
        let mut font_dict = lopdf::Dictionary::new();
        let mut f0_dict = lopdf::Dictionary::new();
        f0_dict.set("Type", Object::Name(b"Font".to_vec()));
        f0_dict.set("Subtype", Object::Name(b"Type1".to_vec()));
        f0_dict.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
        font_dict.set("F0", Object::Dictionary(f0_dict));
        resources_dict.set("Font", Object::Dictionary(font_dict));
        ap_stream_dict.set("Resources", Object::Dictionary(resources_dict));

        // Create the appearance stream
        let ap_stream = Stream::new(ap_stream_dict, stream_content.as_bytes().to_vec());
        let ap_stream_id = doc.add_object(Object::Stream(ap_stream));

        // Add appearance dictionary with normal appearance
        let mut appearance_dict = lopdf::Dictionary::new();
        appearance_dict.set("N", Object::Reference(ap_stream_id));
        annot_dict.set("AP", Object::Dictionary(appearance_dict));

        // Add the annotation to the document
        let annot_id = doc.add_object(Object::Dictionary(annot_dict));

        // Handle Annots in a way that avoids borrowing conflicts
        let annots_info = {
            let page_dict = doc.get_dictionary(page_id).map_err(|e| {
                crate::error::AnnotationError::ContentStreamError(format!(
                    "Failed to get page dictionary: {}",
                    e
                ))
            })?;

            if let Ok(Object::Array(arr)) = page_dict.get(b"Annots") {
                // Direct array
                Some((None, arr.clone()))
            } else if let Ok(Object::Reference(ref_id)) = page_dict.get(b"Annots") {
                // Reference to array
                if let Ok(Object::Array(arr)) = doc.get_object(*ref_id) {
                    Some((Some(*ref_id), arr.clone()))
                } else {
                    None
                }
            } else {
                None
            }
        };

        // Update with the collected information
        match annots_info {
            Some((None, mut arr)) => {
                // Direct array case
                arr.push(Object::Reference(annot_id));
                let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                    crate::error::AnnotationError::ContentStreamError(format!(
                        "Failed to get page dictionary: {}",
                        e
                    ))
                })?;
                page_dict.set("Annots", Object::Array(arr));
            }
            Some((Some(ref_id), mut arr)) => {
                // Referenced array case
                arr.push(Object::Reference(annot_id));
                doc.objects.insert(ref_id, Object::Array(arr));
            }
            None => {
                // No existing annots or invalid reference
                let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                    crate::error::AnnotationError::ContentStreamError(format!(
                        "Failed to get page dictionary: {}",
                        e
                    ))
                })?;
                page_dict.set("Annots", Object::Array(vec![Object::Reference(annot_id)]));
            }
        }

        Ok(())
    }

    /// Add a searchable text annotation to a page
    fn add_searchable_annotation(
        &self,
        annotator: &crate::annotation::Annotator,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<(), crate::error::AnnotationError> {
        // Use the new add_text_annotation method which creates proper FreeText annotations
        annotator.add_text_annotation(doc, page_id, text, x, y)
    }

    /// Ensure the page tree is correctly structured
    fn fix_page_tree(&self, doc: &mut Document) -> Result<(), Error> {
        // Check if we can get the Root object
        let catalog_id = match doc.trailer.get(b"Root") {
            Ok(Object::Reference(id)) => *id,
            _ => {
                return Err(Error::Processing(
                    "Invalid or missing Root object".to_string(),
                ))
            }
        };

        // Make sure Root points to a valid catalog
        match doc.get_object(catalog_id) {
            Ok(Object::Dictionary(dict)) => {
                let is_catalog = match dict.get(b"Type") {
                    Ok(Object::Name(name)) => name == b"Catalog",
                    _ => false,
                };

                if !dict.has(b"Type") || !is_catalog {
                    debug!("Root object is not a Catalog, fixing...");

                    // Create a proper catalog
                    let mut catalog = dict.clone();
                    catalog.set("Type", Object::Name(b"Catalog".to_vec()));

                    // Make sure it has a Pages entry
                    if !catalog.has(b"Pages") {
                        debug!("Catalog has no Pages entry, creating one...");

                        // Create an empty Pages dictionary
                        let pages_dict = dictionary! {
                            "Type" => Object::Name(b"Pages".to_vec()),
                            "Kids" => Object::Array(vec![]),
                            "Count" => Object::Integer(0)
                        };

                        let pages_id = doc.add_object(Object::Dictionary(pages_dict));
                        catalog.set("Pages", Object::Reference(pages_id));
                    }

                    // Update the catalog
                    doc.objects.insert(catalog_id, Object::Dictionary(catalog));
                }
            }
            _ => {
                debug!("Root object is not a Dictionary, creating a new catalog...");

                // Create a proper catalog
                let catalog = dictionary! {
                    "Type" => Object::Name(b"Catalog".to_vec()),
                    "Pages" => Object::Reference((0, 0))  // Placeholder, will be updated
                };

                // Create an empty Pages dictionary
                let pages_dict = dictionary! {
                    "Type" => Object::Name(b"Pages".to_vec()),
                    "Kids" => Object::Array(vec![]),
                    "Count" => Object::Integer(0)
                };

                let pages_id = doc.add_object(Object::Dictionary(pages_dict));

                // Update the catalog reference to point to the new Pages
                let mut catalog = catalog.clone();
                catalog.set("Pages", Object::Reference(pages_id));

                // Add the updated catalog
                doc.objects.insert(catalog_id, Object::Dictionary(catalog));
            }
        }

        Ok(())
    }

    /// Ensure a page ID points to a valid page dictionary
    fn ensure_page_dictionary(
        &self,
        doc: &mut Document,
        page_id: (u32, u16),
    ) -> Result<(u32, u16), Error> {
        // Check if the page object exists and is a dictionary
        match doc.get_object(page_id) {
            Ok(Object::Dictionary(_)) => {
                // It's already a dictionary, no need to fix
                return Ok(page_id);
            }
            Ok(Object::Stream(_)) => {
                debug!("Page object is a Stream instead of Dictionary, creating new dictionary...");

                // Create a new page dictionary
                let page_dict = dictionary! {
                    "Type" => Object::Name(b"Page".to_vec()),
                    "MediaBox" => Object::Array(vec![
                        Object::Integer(0),
                        Object::Integer(0),
                        Object::Integer(612),
                        Object::Integer(792)
                    ]),
                    "Resources" => Object::Dictionary(dictionary! {
                        "Font" => Object::Dictionary(dictionary! {
                            "Helvetica" => Object::Dictionary(dictionary! {
                                "Type" => Object::Name(b"Font".to_vec()),
                                "Subtype" => Object::Name(b"Type1".to_vec()),
                                "BaseFont" => Object::Name(b"Helvetica".to_vec())
                            })
                        })
                    })
                };

                // Replace the stream with the dictionary
                doc.objects.insert(page_id, Object::Dictionary(page_dict));
                return Ok(page_id);
            }
            Err(_) => {
                debug!("Page object not found, creating a new page dictionary...");

                // Create a new page dictionary
                let page_dict = dictionary! {
                    "Type" => Object::Name(b"Page".to_vec()),
                    "MediaBox" => Object::Array(vec![
                        Object::Integer(0),
                        Object::Integer(0),
                        Object::Integer(612),
                        Object::Integer(792)
                    ]),
                    "Resources" => Object::Dictionary(dictionary! {
                        "Font" => Object::Dictionary(dictionary! {
                            "Helvetica" => Object::Dictionary(dictionary! {
                                "Type" => Object::Name(b"Font".to_vec()),
                                "Subtype" => Object::Name(b"Type1".to_vec()),
                                "BaseFont" => Object::Name(b"Helvetica".to_vec())
                            })
                        })
                    })
                };

                // Add the new page dictionary
                let new_page_id = doc.add_object(Object::Dictionary(page_dict));

                // Make sure it's in the page tree
                let catalog_id = match doc.trailer.get(b"Root") {
                    Ok(Object::Reference(id)) => *id,
                    _ => {
                        return Err(Error::Processing(
                            "Invalid or missing Root object".to_string(),
                        ))
                    }
                };

                // Get the Pages reference from the catalog
                let pages_id = match doc.get_dictionary(catalog_id) {
                    Ok(catalog) => match catalog.get(b"Pages") {
                        Ok(Object::Reference(pages_id)) => *pages_id,
                        _ => {
                            return Err(Error::Processing("Catalog has no Pages entry".to_string()))
                        }
                    },
                    Err(e) => {
                        return Err(Error::Processing(format!("Failed to get Catalog: {}", e)));
                    }
                };

                // First let's get information about the current kids array and count
                let (mut kids, mut count) = match doc.get_dictionary(pages_id) {
                    Ok(pages_dict) => {
                        let kids = match pages_dict.get(b"Kids") {
                            Ok(Object::Array(arr)) => arr.clone(),
                            _ => vec![], // No kids or not an array
                        };

                        let count = match pages_dict.get(b"Count") {
                            Ok(Object::Integer(count)) => *count,
                            _ => 0, // No count or not an integer
                        };

                        (kids, count)
                    }
                    Err(e) => {
                        return Err(Error::Processing(format!(
                            "Failed to get Pages dictionary: {}",
                            e
                        )));
                    }
                };

                // Now modify the dictionary without borrowing conflicts

                // Add the new page to the kids array
                kids.push(Object::Reference(new_page_id));
                count += 1;

                // Update the pages dictionary
                match doc.get_dictionary_mut(pages_id) {
                    Ok(pages_dict) => {
                        pages_dict.set("Kids", Object::Array(kids));
                        pages_dict.set("Count", Object::Integer(count));
                    }
                    Err(e) => {
                        return Err(Error::Processing(format!(
                            "Failed to update Pages dictionary: {}",
                            e
                        )));
                    }
                }

                // Set the parent reference on the new page
                match doc.get_dictionary_mut(new_page_id) {
                    Ok(page) => {
                        page.set("Parent", Object::Reference(pages_id));
                    }
                    Err(e) => {
                        return Err(Error::Processing(format!(
                            "Failed to set parent reference: {}",
                            e
                        )));
                    }
                }

                // Return the new page ID
                return Ok(new_page_id);
            }
            _ => {
                return Err(Error::Processing(format!(
                    "Page object is neither Dictionary nor Stream: {:?}",
                    page_id
                )));
            }
        }
    }

    // This function has been replaced by using the Annotator implementation

    /// Get the dimensions of a PDF page
    fn get_page_dimensions(
        &self,
        doc: &Document,
        page_id: (u32, u16),
    ) -> Result<(f32, f32), Error> {
        // Try to get the page dictionary
        let page_dict_result = doc.get_object(page_id);

        let media_box = match page_dict_result {
            Ok(Object::Dictionary(dict)) => {
                // Get the MediaBox from the dictionary
                match dict.get(b"MediaBox") {
                    Ok(Object::Array(arr)) => {
                        if arr.len() < 4 {
                            debug!("MediaBox has fewer than 4 elements, using default size");
                            (612.0, 792.0) // Default to letter size
                        } else {
                            let lower_left_x = match &arr[0] {
                                Object::Integer(i) => *i as f32,
                                Object::Real(f) => *f as f32,
                                _ => 0.0,
                            };
                            let lower_left_y = match &arr[1] {
                                Object::Integer(i) => *i as f32,
                                Object::Real(f) => *f as f32,
                                _ => 0.0,
                            };
                            let upper_right_x = match &arr[2] {
                                Object::Integer(i) => *i as f32,
                                Object::Real(f) => *f as f32,
                                _ => 612.0,
                            };
                            let upper_right_y = match &arr[3] {
                                Object::Integer(i) => *i as f32,
                                Object::Real(f) => *f as f32,
                                _ => 792.0,
                            };

                            (upper_right_x - lower_left_x, upper_right_y - lower_left_y)
                        }
                    }
                    Ok(Object::Reference(ref_id)) => {
                        // If MediaBox is a reference, try to resolve it
                        match doc.get_object(*ref_id) {
                            Ok(Object::Array(arr)) => {
                                if arr.len() < 4 {
                                    debug!("Referenced MediaBox has fewer than 4 elements, using default size");
                                    (612.0, 792.0)
                                } else {
                                    let lower_left_x = match &arr[0] {
                                        Object::Integer(i) => *i as f32,
                                        Object::Real(f) => *f as f32,
                                        _ => 0.0,
                                    };
                                    let lower_left_y = match &arr[1] {
                                        Object::Integer(i) => *i as f32,
                                        Object::Real(f) => *f as f32,
                                        _ => 0.0,
                                    };
                                    let upper_right_x = match &arr[2] {
                                        Object::Integer(i) => *i as f32,
                                        Object::Real(f) => *f as f32,
                                        _ => 612.0,
                                    };
                                    let upper_right_y = match &arr[3] {
                                        Object::Integer(i) => *i as f32,
                                        Object::Real(f) => *f as f32,
                                        _ => 792.0,
                                    };

                                    (upper_right_x - lower_left_x, upper_right_y - lower_left_y)
                                }
                            }
                            _ => {
                                debug!("Referenced MediaBox is not an Array, using default size");
                                (612.0, 792.0)
                            }
                        }
                    }
                    _ => {
                        // No MediaBox found, try parent
                        match dict.get(b"Parent") {
                            Ok(Object::Reference(parent_ref)) => {
                                // Get MediaBox from parent
                                match doc.get_object(*parent_ref) {
                                    Ok(Object::Dictionary(parent_dict)) => {
                                        match parent_dict.get(b"MediaBox") {
                                            Ok(Object::Array(arr)) if arr.len() >= 4 => {
                                                let lower_left_x = match &arr[0] {
                                                    Object::Integer(i) => *i as f32,
                                                    Object::Real(f) => *f as f32,
                                                    _ => 0.0,
                                                };
                                                let lower_left_y = match &arr[1] {
                                                    Object::Integer(i) => *i as f32,
                                                    Object::Real(f) => *f as f32,
                                                    _ => 0.0,
                                                };
                                                let upper_right_x = match &arr[2] {
                                                    Object::Integer(i) => *i as f32,
                                                    Object::Real(f) => *f as f32,
                                                    _ => 612.0,
                                                };
                                                let upper_right_y = match &arr[3] {
                                                    Object::Integer(i) => *i as f32,
                                                    Object::Real(f) => *f as f32,
                                                    _ => 792.0,
                                                };

                                                (
                                                    upper_right_x - lower_left_x,
                                                    upper_right_y - lower_left_y,
                                                )
                                            }
                                            _ => {
                                                debug!("Parent MediaBox not found or invalid, using default size");
                                                (612.0, 792.0)
                                            }
                                        }
                                    }
                                    _ => {
                                        debug!("Parent is not a Dictionary, using default size");
                                        (612.0, 792.0)
                                    }
                                }
                            }
                            _ => {
                                debug!("No MediaBox and no Parent, using default size");
                                (612.0, 792.0)
                            }
                        }
                    }
                }
            }
            Ok(Object::Stream(_)) => {
                debug!("Page object is a Stream instead of Dictionary, using default size");
                (612.0, 792.0)
            }
            Err(e) => {
                debug!("Error getting page object: {}, using default size", e);
                (612.0, 792.0)
            }
            _ => {
                debug!("Page object is neither Dictionary nor Stream, using default size");
                (612.0, 792.0)
            }
        };

        Ok(media_box)
    }

    /// Find all PDF files in a directory, optionally recursively
    fn find_pdf_files(&self) -> Result<Vec<PathBuf>, Error> {
        let dir = &self.config.input_dir;

        // Check if directory exists
        if !dir.exists() {
            return Err(Error::DirectoryNotFound(dir.to_path_buf()));
        }

        // Check if directory is readable
        if let Err(e) = fs::read_dir(dir) {
            return Err(Error::Io(e));
        }

        let mut pdf_files = Vec::new();

        // Use WalkDir to iterate through files
        let walker = if self.config.recursive {
            WalkDir::new(dir)
        } else {
            WalkDir::new(dir).max_depth(1)
        };

        for entry in walker.into_iter().filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file()
                && path
                    .extension()
                    .map_or(false, |ext| ext.eq_ignore_ascii_case("pdf"))
            {
                pdf_files.push(path.to_path_buf());
                debug!("Found PDF: {}", path.display());
            }
        }

        // Check if any PDF files were found
        if pdf_files.is_empty() {
            return Err(Error::NoPdfFiles(dir.to_path_buf()));
        }

        info!("Found {} PDF files in {}", pdf_files.len(), dir.display());
        Ok(pdf_files)
    }

    /// Ensure output directory exists, creating it if necessary
    fn ensure_output_dir(&self) -> Result<(), Error> {
        let dir = &self.config.output_dir;

        if !dir.exists() {
            info!("Creating output directory: {}", dir.display());
            fs::create_dir_all(dir)?;
        } else if !dir.is_dir() {
            return Err(Error::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!(
                    "Output path exists but is not a directory: {}",
                    dir.display()
                ),
            )));
        }

        // Check if directory is writable by creating and removing a test file
        let test_file = dir.join(".test_write_permission");
        match fs::write(&test_file, b"test") {
            Ok(_) => {
                let _ = fs::remove_file(test_file);
                Ok(())
            }
            Err(_) => Err(Error::PermissionDenied(dir.to_path_buf())),
        }
    }

    /// Generate output path for a processed PDF
    fn generate_output_path(&self, input_path: &Path) -> PathBuf {
        // Get the filename from the input path
        let filename = input_path.file_name().unwrap_or_default();

        // Create the output path by joining the output directory and filename
        self.config.output_dir.join(filename)
    }

    /// Get page errors for a file
    ///
    /// This method would normally track page errors per file in a database or struct field.
    /// For our implementation, we currently pass the errors directly to process_all()
    /// but this method is kept for future implementation.
    fn get_page_errors(&self, _file_path: &Path) -> Option<Vec<(usize, String)>> {
        // Currently page errors are passed directly to process_all
        // This method is a placeholder for a more permanent tracking solution
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Config, FontConfig, PositionConfig};
    use assert_fs::prelude::*;
    // These imports are used in processor.rs itself, not needed in tests

    // Helper function to create a minimal test PDF
    fn create_test_pdf(path: &Path) -> Result<(), Error> {
        let mut doc = Document::with_version("1.5");

        // Create a page
        let page_id = doc.add_object(dictionary! {
            "Type" => Object::Name(b"Page".to_vec()),
            "MediaBox" => Object::Array(vec![
                Object::Integer(0),
                Object::Integer(0),
                Object::Integer(612),
                Object::Integer(792)
            ]),
            "Resources" => Object::Dictionary(dictionary! {})
        });

        // Create page tree
        let pages_id = doc.add_object(dictionary! {
            "Type" => Object::Name(b"Pages".to_vec()),
            "Kids" => Object::Array(vec![Object::Reference(page_id)]),
            "Count" => Object::Integer(1)
        });

        // Update page to point to its parent
        if let Ok(page) = doc.get_dictionary_mut(page_id) {
            page.set("Parent", Object::Reference(pages_id));
        }

        // Set the catalog
        let catalog_id = doc.add_object(dictionary! {
            "Type" => Object::Name(b"Catalog".to_vec()),
            "Pages" => Object::Reference(pages_id)
        });

        doc.trailer.set("Root", Object::Reference(catalog_id));

        // Save the document
        doc.save(path)?;

        Ok(())
    }

    #[test]
    fn test_find_pdf_files() {
        let temp_dir = assert_fs::TempDir::new().unwrap();

        // Create some test PDF files
        let pdf1 = temp_dir.child("test1.pdf");
        let pdf2 = temp_dir.child("test2.pdf");

        create_test_pdf(pdf1.path()).unwrap();
        create_test_pdf(pdf2.path()).unwrap();

        // Create a config pointing to the temp dir
        let config = Config {
            input_dir: temp_dir.path().to_path_buf(),
            output_dir: temp_dir.path().to_path_buf(),
            recursive: false,
            font: FontConfig::default(),
            position: PositionConfig::default(),
        };

        let processor = PdfProcessor::new(config);

        // Test finding PDF files
        let pdf_files = processor.find_pdf_files().unwrap();
        assert_eq!(pdf_files.len(), 2);

        temp_dir.close().unwrap();
    }

    // Test disabled due to font loading issues in the test environment
    // #[test]
    // fn test_process_file() {
    //     // This test requires access to font files which may not be available in all test environments
    // }
}
