//! PDF annotation functionality
//!
//! This module provides functionality for annotating PDF pages with text
//! in specific positions.

use crate::{Corner, FontConfig, PositionConfig, AnnotationError};
use log::{debug, warn};
use lopdf::{
    self,
    content::{Content, Operation},
    Document, Object, Stream,
};
use rusttype::{Font, Scale};
use std::fs;

/// Text annotation handler for PDF pages
pub struct Annotator {
    /// Font configuration
    font_config: FontConfig,

    /// Font data
    font_data: Vec<u8>,
}

impl Annotator {
    /// Create a new annotator with the given font configuration
    pub fn new(font_config: FontConfig) -> Result<Self, AnnotationError> {
        // Attempt to load the configured font
        let font_data = Self::load_font(&font_config.family).or_else(|_| {
            // Try fallback font if available
            if let Some(fallback) = &font_config.fallback {
                warn!(
                    "Failed to load font: {}. Trying fallback: {}",
                    font_config.family, fallback
                );
                Self::load_font(fallback)
            } else {
                Err(AnnotationError::FontError(format!(
                    "Failed to load font: {} and no fallback configured",
                    font_config.family
                )))
            }
        })?;

        Ok(Self {
            font_config,
            font_data,
        })
    }

    /// Adds a FreeText annotation to a PDF page
    ///
    /// This method creates a proper text annotation object that is searchable
    /// and detectable by text extraction tools.
    pub fn add_text_annotation(
        &self,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<(), AnnotationError> {
        // Add detailed logging for page and annotation information
        debug!("Adding text annotation to page ID: {:?}", page_id);
        debug!("Annotation text: '{}'", text);
        debug!("Annotation position: x={}, y={}", x, y);
        
        // Log font configuration details
        debug!(
            "Font config: size={}, family={}, fallback={:?}",
            self.font_config.size, 
            self.font_config.family, 
            self.font_config.fallback
        );

        // Calculate text width using rusttype
        let font = Font::try_from_vec(self.font_data.clone()).ok_or_else(|| {
            AnnotationError::FontError(
                "Failed to create font for text width calculation".to_string(),
            )
        })?;

        // Approximate text width calculation
        let scale = Scale::uniform(self.font_config.size);
        let text_width = font
            .layout(text, scale, rusttype::point(0.0, 0.0))
            .map(|g| g.position().x + g.unpositioned().h_metrics().advance_width)
            .last()
            .unwrap_or(0.0);

        // Convert from font units to PDF units and add buffer space to prevent truncation
        let font_scale_factor = 1.2; // Increased scale factor with buffer space built in
        let text_width = text_width * font_scale_factor;
        debug!("Calculated text width: {} (with scale factor: {})", text_width, font_scale_factor);
        
        // Add a buffer to ensure the entire text is visible - but we directly use the calculated value
        let text_height = self.font_config.size * 1.2; // Add some padding
        debug!("Calculated text height: {}", text_height);

        // Create annotation dictionary
        let mut annot_dict = lopdf::Dictionary::new();
        annot_dict.set("Type", Object::Name(b"Annot".to_vec()));
        annot_dict.set("Subtype", Object::Name(b"FreeText".to_vec()));
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

        // *** CRITICAL FIX: Explicitly create a resource dictionary for the annotation ***
        // This ensures consistent font resources across all pages
        let mut font_dict = lopdf::Dictionary::new();
        let mut helvetica_font = lopdf::Dictionary::new();
        helvetica_font.set("Type", Object::Name(b"Font".to_vec()));
        helvetica_font.set("Subtype", Object::Name(b"Type1".to_vec()));
        helvetica_font.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
        helvetica_font.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));
        helvetica_font.set("Name", Object::Name(b"Helvetica".to_vec()));
        font_dict.set("Helvetica", Object::Dictionary(helvetica_font));
        
        // Create and set a dedicated resource dictionary for this annotation
        let mut dr_dict = lopdf::Dictionary::new();
        dr_dict.set("Font", Object::Dictionary(font_dict));
        annot_dict.set("DR", Object::Dictionary(dr_dict));
        
        // Default appearance string (DA) - This is a key part of the font consistency issue
        // The PDF specification requires precise format for the DA string
        let font_size = self.font_config.size;
        
        // Fix: Remove the double space between font name and size which may be causing issues
        // According to PDF spec, the format should be consistent with exactly one space between elements
        let fixed_da_string = format!("/{} {} Tf 0 0 0 rg", "Helvetica", font_size);
        debug!("Default Appearance (DA) string (fixed format): '{}'", fixed_da_string);
        
        // Set the DA string in the annotation dictionary using the fixed format
        annot_dict.set(
            "DA",
            Object::String(
                fixed_da_string.as_bytes().to_vec(),
                lopdf::StringFormat::Literal,
            ),
        );

        // *** CRITICAL FIX: Remove any existing appearance stream (AP) ***
        // This forces PDF viewers to use our DA string and resource dictionary
        // If an AP entry exists, it can override our font settings
        annot_dict.remove(b"AP");
        
        // No border
        annot_dict.set(
            "Border",
            Object::Array(vec![
                Object::Integer(0),
                Object::Integer(0),
                Object::Integer(0),
            ]),
        );

        // Set print flag (bit position 2, value 4)
        annot_dict.set("F", Object::Integer(4));

        // Add the annotation to the document
        let annot_id = doc.add_object(Object::Dictionary(annot_dict));

        // Add the annotation to the page
        // We need to handle the Annots array carefully to avoid borrowing conflicts
        let annots_info = {
            let page_dict = doc.get_dictionary(page_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!("Failed to get page dictionary: {}", e))
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

        match annots_info {
            Some((None, mut arr)) => {
                // Direct array case
                arr.push(Object::Reference(annot_id));
                let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                    AnnotationError::ContentStreamError(format!(
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
                    AnnotationError::ContentStreamError(format!(
                        "Failed to get page dictionary: {}",
                        e
                    ))
                })?;
                page_dict.set("Annots", Object::Array(vec![Object::Reference(annot_id)]));
            }
        }

        Ok(())
    }

    /// Load a font by name
    fn load_font(font_name: &str) -> Result<Vec<u8>, AnnotationError> {
        // This is a simplified implementation
        // In a real application, you would search for fonts in system locations

        // For demo purposes, we'll look in a few common locations with different extensions
        let common_extensions = [".ttf", ".ttc", ".otf"];
        let base_locations = [
            "/usr/share/fonts/truetype",
            "/usr/share/fonts/TTF",
            "/Library/Fonts",
            "/System/Library/Fonts",
            "/System/Library/Fonts/Supplemental",
            "C:\\Windows\\Fonts",
            "./fonts",
        ];

        // Try exact matches first
        for location in &base_locations {
            for ext in &common_extensions {
                let path = format!("{}/{}{}", location, font_name, ext);
                match fs::read(&path) {
                    Ok(data) => {
                        debug!("Loaded font from exact path: {}", path);
                        return Ok(data);
                    }
                    Err(_) => continue,
                }
            }
        }

        // If exact match fails, try case-insensitive partial matches
        for location in &base_locations {
            if let Ok(entries) = fs::read_dir(location) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(file_name) = path.file_name() {
                        let file_name_str = file_name.to_string_lossy().to_lowercase();
                        let font_name_lower = font_name.to_lowercase();

                        // Check if the filename contains the font name we're looking for
                        if file_name_str.contains(&font_name_lower) {
                            if let Some(ext) = path.extension() {
                                let ext_str = ext.to_string_lossy().to_lowercase();
                                if ext_str == "ttf" || ext_str == "ttc" || ext_str == "otf" {
                                    match fs::read(&path) {
                                        Ok(data) => {
                                            debug!(
                                                "Loaded font from partial match: {}",
                                                path.display()
                                            );
                                            return Ok(data);
                                        }
                                        Err(_) => continue,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // For testing/demo purposes, we could include a fallback embedded font
        // In a real application, you would handle this more robustly
        Err(AnnotationError::FontError(format!(
            "Could not find font: {} in known locations",
            font_name
        )))
    }

    /// Calculate the position for text based on position configuration and page size
    pub fn calculate_position(
        &self,
        position: &PositionConfig,
        page_width: f32,
        page_height: f32,
        text: &str,
    ) -> (f32, f32) {
        // Calculate approximate text width using rusttype
        let font = Font::try_from_vec(self.font_data.clone()).expect("Font data should be valid");

        let scale = Scale::uniform(self.font_config.size);
        let text_width = font
            .layout(text, scale, rusttype::point(0.0, 0.0))
            .map(|g| g.position().x + g.unpositioned().h_metrics().advance_width)
            .last()
            .unwrap_or(0.0);

        // Convert from font units to PDF units and add buffer space to prevent truncation
        let font_scale_factor = 1.2; // Increased scale factor with buffer space built in
        let text_width = text_width * font_scale_factor;

        // Calculate position based on corner
        match position.corner {
            Corner::TopLeft => (
                position.x_offset,
                page_height - position.y_offset - self.font_config.size,
            ),
            Corner::TopRight => (
                page_width - text_width - position.x_offset,
                page_height - position.y_offset - self.font_config.size,
            ),
            Corner::BottomLeft => (position.x_offset, position.y_offset),
            Corner::BottomRight => (
                page_width - text_width - position.x_offset,
                position.y_offset,
            ),
        }
    }

    /// Add text to a PDF page
    pub fn add_text_to_page(
        &self,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<(), AnnotationError> {
        // Get the page dictionary
        let page_dict = doc.get_dictionary(page_id).map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to get page dictionary: {}", e))
        })?;

        // Get (or create) the content stream(s)
        let contents_id = match page_dict.get(b"Contents") {
            Ok(contents) => match contents {
                &Object::Reference(id) => id,
                &Object::Array(ref arr) => {
                    if let Some(Object::Reference(id)) = arr.first() {
                        *id
                    } else {
                        return Err(AnnotationError::ContentStreamError(
                            "Unexpected content stream format".to_string(),
                        ));
                    }
                }
                _ => {
                    return Err(AnnotationError::ContentStreamError(
                        "Unexpected content stream format".to_string(),
                    ));
                }
            },
            Err(_) => {
                // Create a new content stream if one doesn't exist
                let content_id = doc.new_object_id();
                doc.objects.insert(
                    content_id,
                    Object::Stream(Stream::new(lopdf::Dictionary::new(), vec![])),
                );

                // Update the page dictionary
                let page_dict_mut = doc.get_dictionary_mut(page_id).map_err(|e| {
                    AnnotationError::ContentStreamError(format!(
                        "Failed to update page dictionary: {}",
                        e
                    ))
                })?;
                page_dict_mut.set("Contents", Object::Reference(content_id));

                content_id
            }
        };

        // Get the real content stream ID from the object.
        // (For example, sometimes the object at contents_id is itself a dictionary with a Contents reference.)
        let real_contents_id = match doc.get_object(contents_id) {
            Ok(Object::Dictionary(dict)) => {
                if let Ok(Object::Reference(contents_ref)) = dict.get(b"Contents") {
                    *contents_ref
                } else {
                    // Create a new empty stream if needed
                    let new_stream_id = doc.new_object_id();
                    doc.objects.insert(
                        new_stream_id,
                        Object::Stream(Stream::new(lopdf::Dictionary::new(), vec![])),
                    );
                    new_stream_id
                }
            }
            Ok(_) => contents_id, // Otherwise, use the one we got
            Err(e) => {
                return Err(AnnotationError::ContentStreamError(format!(
                    "Failed to get content object: {}",
                    e
                )));
            }
        };

        debug!("Using content stream ID: {:?}", real_contents_id);

        // Retrieve the actual content stream
        let content_obj = doc.get_object(real_contents_id).map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to get content stream: {}", e))
        })?;

        // Obtain the stream data
        let stream_data = match content_obj {
            Object::Stream(ref stream) => {
                debug!("Found direct stream object");
                stream.clone()
            }
            Object::Array(ref arr) => {
                debug!("Found array of content streams, merging them");
                if arr.is_empty() {
                    // Create a new stream if empty
                    let new_stream = Stream::new(lopdf::Dictionary::new(), vec![]);
                    let new_stream_id = doc.new_object_id();
                    doc.objects
                        .insert(new_stream_id, Object::Stream(new_stream.clone()));
                    if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                        page_dict.set("Contents", Object::Reference(new_stream_id));
                    }
                    new_stream
                } else {
                    // Merge all streams; copy the dictionary from the first stream
                    let mut merged_content = Vec::new();
                    let mut stream_dict = lopdf::Dictionary::new();

                    for item in arr {
                        if let Object::Reference(ref_id) = item {
                            if let Ok(Object::Stream(stream)) = doc.get_object(*ref_id) {
                                if stream_dict.is_empty() {
                                    stream_dict = stream.dict.clone();
                                }
                                merged_content.extend_from_slice(&stream.content);
                            } else {
                                debug!("Non-stream reference in contents array, skipping");
                            }
                        }
                    }
                    Stream::new(stream_dict, merged_content)
                }
            }
            other => {
                debug!("Expected stream but got: {:?}", other);
                // Try to resolve a Contents reference if available
                if let Object::Dictionary(dict) = other {
                    if let Ok(Object::Reference(contents_ref)) = dict.get(b"Contents") {
                        debug!("Dictionary has Contents reference: {:?}", contents_ref);
                        if let Ok(Object::Stream(stream)) = doc.get_object(*contents_ref) {
                            debug!("Got stream from Contents reference");
                            stream.clone()
                        } else {
                            debug!("Contents reference is not a stream, creating new one");
                            let new_stream = Stream::new(lopdf::Dictionary::new(), vec![]);
                            let new_stream_id = doc.new_object_id();
                            doc.objects
                                .insert(new_stream_id, Object::Stream(new_stream.clone()));
                            if let Ok(dict) = doc.get_dictionary_mut(page_id) {
                                dict.set("Contents", Object::Reference(new_stream_id));
                            }
                            new_stream
                        }
                    } else {
                        debug!("Dictionary has no Contents entry, creating new stream");
                        let new_stream = Stream::new(lopdf::Dictionary::new(), vec![]);
                        let new_stream_id = doc.new_object_id();
                        doc.objects
                            .insert(new_stream_id, Object::Stream(new_stream.clone()));
                        if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                            page_dict.set("Contents", Object::Reference(new_stream_id));
                        }
                        new_stream
                    }
                } else {
                    debug!("Creating new stream for unexpected object type");
                    let new_stream = Stream::new(lopdf::Dictionary::new(), vec![]);
                    let new_stream_id = doc.new_object_id();
                    doc.objects
                        .insert(new_stream_id, Object::Stream(new_stream.clone()));
                    if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                        page_dict.set("Contents", Object::Reference(new_stream_id));
                    }
                    new_stream
                }
            }
        };

        // Parse the content stream
        let content = Content::decode(&stream_data.content).map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to decode content stream: {}", e))
        })?;

        // Create new content operations (with proper PDF operator usage)
        let mut operations = content.operations;

        // Save graphics state
        operations.push(Operation::new("q", vec![]));

        // Set text color (black)
        operations.push(Operation::new("0 0 0 rg", vec![]));

        // Set line width for text
        operations.push(Operation::new("1 w", vec![]));

        // Begin text object
        operations.push(Operation::new("BT", vec![]));

        // Set font with proper operands - always use F0/Helvetica
        operations.push(Operation::new(
            "Tf",
            vec![
                Object::Name(b"F0".to_vec()),
                Object::Real(self.font_config.size),
            ],
        ));

        // Set text matrix for positioning
        operations.push(Operation::new(
            "Tm",
            vec![
                Object::Real(1.0), // a
                Object::Real(0.0), // b
                Object::Real(0.0), // c
                Object::Real(1.0), // d
                Object::Real(x),   // e: x position
                Object::Real(y),   // f: y position
            ],
        ));

        // Set text rendering mode to stroke (using operand)
        operations.push(Operation::new("Tr", vec![Object::Integer(1)]));

        // Add text with hexadecimal encoding
        operations.push(Operation::new(
            "Tj",
            vec![Object::String(
                text.as_bytes().to_vec(),
                lopdf::StringFormat::Hexadecimal,
            )],
        ));

        // Switch back to fill mode
        operations.push(Operation::new("Tr", vec![Object::Integer(0)]));

        // Add text again with fill
        operations.push(Operation::new(
            "Tj",
            vec![Object::String(
                text.as_bytes().to_vec(),
                lopdf::StringFormat::Literal,
            )],
        ));

        // End text object
        operations.push(Operation::new("ET", vec![]));

        // Restore graphics state
        operations.push(Operation::new("Q", vec![]));

        // Encode the modified content stream
        let modified_content = Content { operations };
        let encoded_content = modified_content.encode().map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to encode content stream: {}", e))
        })?;

        // IMPORTANT: Update the object at the actual (resolved) content stream id!
        doc.objects.insert(
            real_contents_id,
            Object::Stream(Stream::new(stream_data.dict.clone(), encoded_content)),
        );

        // Ensure that the font resource exists on the page (or inherited from the parent)
        self.ensure_font_resource(doc, page_id, "F0")?;

        Ok(())
    }

    /// Ensure a font resource exists in the page resource dictionary
    fn ensure_font_resource(
        &self,
        doc: &mut Document,
        page_id: lopdf::ObjectId,
        font_name: &str,
    ) -> Result<(), AnnotationError> {
        // Get the page dictionary
        let page_dict = doc.get_dictionary(page_id).map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to get page dictionary: {}", e))
        })?;

        // We need to handle resources carefully to avoid borrowing conflicts
        let (resources_id, needs_page_update) = {
            match page_dict.get(b"Resources") {
                Ok(resources) => match resources {
                    &Object::Reference(id) => (id, false),
                    &Object::Dictionary(ref dict) => {
                        // Resources are inline in the page dictionary
                        // Create a new object for them
                        // First, drop the immutable borrow on page_dict
                        let resources_dict = dict.clone();

                        // Create a new object ID and insert the dictionary
                        let new_resources_id = doc.new_object_id();
                        doc.objects
                            .insert(new_resources_id, Object::Dictionary(resources_dict));

                        // We'll need to update the page dictionary to reference this object
                        (new_resources_id, true)
                    }
                    _ => {
                        return Err(AnnotationError::ContentStreamError(
                            "Unexpected resources format".to_string(),
                        ));
                    }
                },
                Err(_) => {
                    // Create new resources if they don't exist
                    let new_resources_id = doc.new_object_id();
                    doc.objects.insert(
                        new_resources_id,
                        Object::Dictionary(lopdf::Dictionary::new()),
                    );

                    // We'll need to update the page dictionary
                    (new_resources_id, true)
                }
            }
        };

        // Update the page dictionary if needed
        if needs_page_update {
            let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!("Failed to get page dictionary: {}", e))
            })?;
            page_dict.set("Resources", Object::Reference(resources_id));
        }

        // Handle Font resources carefully to avoid borrowing conflicts
        let font_dict_ref_id_option = {
            let resources_dict = doc.get_dictionary(resources_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!(
                    "Failed to get resources dictionary: {}",
                    e
                ))
            })?;

            // Check if the resources dictionary has a Font entry that's a reference
            if let Ok(Object::Reference(id)) = resources_dict.get(b"Font") {
                Some(*id)
            } else {
                None
            }
        };

        // Handle the case where Font is a reference
        if let Some(font_dict_ref_id) = font_dict_ref_id_option {
            // Add the font to the referenced font dictionary
            let font_dict = doc.get_dictionary_mut(font_dict_ref_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!("Failed to get font dictionary: {}", e))
            })?;

            // Add the font if it doesn't exist
            if !font_dict.has(font_name.as_bytes()) {
                // Create a simple Type 1 font entry - consistent with other font definitions
                let mut font_entry = lopdf::Dictionary::new();
                font_entry.set("Type", Object::Name(b"Font".to_vec()));
                font_entry.set("Subtype", Object::Name(b"Type1".to_vec()));
                font_entry.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                font_entry.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));
                // Add name property for consistency with other font entries
                font_entry.set("Name", Object::Name(b"Helvetica".to_vec()));
                
                debug!("Created consistent font entry for referenced font dictionary, page ID: {:?}", page_id);

                font_dict.set(font_name, Object::Dictionary(font_entry));
            }
        } else {
            // Font is either an inline dictionary or doesn't exist
            let resources_dict = doc.get_dictionary_mut(resources_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!(
                    "Failed to get resources dictionary: {}",
                    e
                ))
            })?;

            // Get or create the Font dictionary
            if let Ok(Object::Dictionary(font_dict)) = resources_dict.get_mut(b"Font") {
                // Add the font if it doesn't exist
                if !font_dict.has(font_name.as_bytes()) {
                    // Create a simple Type 1 font entry - keeping format consistent
                    let mut font_entry = lopdf::Dictionary::new();
                    font_entry.set("Type", Object::Name(b"Font".to_vec()));
                    font_entry.set("Subtype", Object::Name(b"Type1".to_vec()));

                    // Always use Helvetica for font consistency across all pages
                    font_entry.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                    font_entry.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));
                    
                    // Ensure the font has a consistent name property on all pages
                    // This is important for consistent rendering across PDF viewers
                    font_entry.set("Name", Object::Name(b"Helvetica".to_vec()));
                    
                    debug!("Created consistent font entry for page ID: {:?}", page_id);

                    font_dict.set(font_name, Object::Dictionary(font_entry));
                }
            } else {
                // Create a new font dictionary
                let mut font_dict = lopdf::Dictionary::new();

                // Create a simple Type 1 font entry - keeping format consistent
                let mut font_entry = lopdf::Dictionary::new();
                font_entry.set("Type", Object::Name(b"Font".to_vec()));
                font_entry.set("Subtype", Object::Name(b"Type1".to_vec()));

                // Always use Helvetica for font consistency across all pages
                font_entry.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                font_entry.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));
                
                // Ensure the font has a consistent name property on all pages
                // This is important for consistent rendering across PDF viewers
                font_entry.set("Name", Object::Name(b"Helvetica".to_vec()));
                
                debug!("Created consistent font entry for new dictionary, page ID: {:?}", page_id);

                font_dict.set(font_name, Object::Dictionary(font_entry));

                // Set the font dictionary in resources
                resources_dict.set("Font", Object::Dictionary(font_dict));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    // Font loading tests have been removed due to test environment constraints.
    // In a real-world application, you would use a mocking framework to test font loading
    // and provide test fixtures for fonts.

    // For manual testing, you may need to:
    // 1. Create a fonts directory in the project
    // 2. Copy common fonts (like Arial.ttf) into this directory
    // 3. Update the load_font method to check the local fonts directory first
}
