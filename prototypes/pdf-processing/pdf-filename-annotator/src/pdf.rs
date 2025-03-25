//! PDF processing functionality
//!
//! This module provides functionality for working with PDF files,
//! including opening, parsing, and modifying PDF documents.

use crate::annotation::Annotator;
use crate::config::Config;
use crate::error::PdfError;
use crate::filesystem::{ensure_output_dir, find_pdf_files, generate_output_path};
use log::{debug, error, info};
use lopdf::{self, Document as LopdfDocument};
// We're only using lopdf for PDF processing
// Remove pdf crate imports as we're not using them directly
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Summary of PDF processing results
#[derive(Debug)]
pub struct ProcessingSummary {
    /// Number of files successfully processed
    pub files_processed: usize,
    
    /// Number of pages annotated
    pub pages_annotated: usize,
    
    /// Map of files that encountered errors and their error messages
    pub errors: HashMap<PathBuf, String>,
}

/// PDF document metadata
#[derive(Debug, Default)]
pub struct PdfMetadata {
    /// Document title
    pub title: Option<String>,
    
    /// Document author
    pub author: Option<String>,
    
    /// Document subject
    pub subject: Option<String>,
    
    /// Document keywords
    pub keywords: Option<String>,
    
    /// Application that created the document
    pub creator: Option<String>,
    
    /// Application that produced the document
    pub producer: Option<String>,
    
    /// Document creation date
    pub creation_date: Option<String>,
    
    /// Document modification date
    pub modification_date: Option<String>,
}

/// Wrapper around lopdf for easier manipulation
pub struct PdfDocument {
    /// Inner lopdf document
    inner_doc: LopdfDocument,
    
    /// Document metadata
    metadata: PdfMetadata,
    
    /// Path to the document
    path: PathBuf,
}

impl PdfDocument {
    /// Open a PDF document from a file
    pub fn open(path: impl AsRef<Path>) -> Result<Self, PdfError> {
        let path = path.as_ref().to_path_buf();
        
        // Open the PDF file using lopdf
        let inner_doc = LopdfDocument::load(&path)?;
        
        // Extract metadata
        let metadata = Self::extract_metadata(&inner_doc);
        
        Ok(Self {
            inner_doc,
            metadata,
            path,
        })
    }
    
    /// Extract metadata from a PDF document
    fn extract_metadata(doc: &LopdfDocument) -> PdfMetadata {
        let mut metadata = PdfMetadata::default();
        
        // Try to get the info dictionary
        if let Ok(Some(info_id)) = doc.trailer.get(b"Info").map(|obj| obj.as_reference().ok()) {
            if let Ok(info) = doc.get_dictionary(info_id) {
                // Extract standard metadata fields
                metadata.title = info
                    .get(b"Title")
                    .ok()
                    .and_then(|obj| obj.as_string().ok())
                    .map(|bytes| String::from_utf8_lossy(bytes).into_owned());
                
                metadata.author = info
                    .get(b"Author")
                    .ok()
                    .and_then(|obj| obj.as_string().ok())
                    .map(|bytes| String::from_utf8_lossy(bytes).into_owned());
                
                metadata.subject = info
                    .get(b"Subject")
                    .ok()
                    .and_then(|obj| obj.as_string().ok())
                    .map(|bytes| String::from_utf8_lossy(bytes).into_owned());
                
                metadata.keywords = info
                    .get(b"Keywords")
                    .ok()
                    .and_then(|obj| obj.as_string().ok())
                    .map(|bytes| String::from_utf8_lossy(bytes).into_owned());
                
                metadata.creator = info
                    .get(b"Creator")
                    .ok()
                    .and_then(|obj| obj.as_string().ok())
                    .map(|bytes| String::from_utf8_lossy(bytes).into_owned());
                
                metadata.producer = info
                    .get(b"Producer")
                    .ok()
                    .and_then(|obj| obj.as_string().ok())
                    .map(|bytes| String::from_utf8_lossy(bytes).into_owned());
                
                metadata.creation_date = info
                    .get(b"CreationDate")
                    .ok()
                    .and_then(|obj| obj.as_string().ok())
                    .map(|bytes| String::from_utf8_lossy(bytes).into_owned());
                
                metadata.modification_date = info
                    .get(b"ModDate")
                    .ok()
                    .and_then(|obj| obj.as_string().ok())
                    .map(|bytes| String::from_utf8_lossy(bytes).into_owned());
            }
        }
        
        metadata
    }
    
    /// Get the number of pages in the document
    pub fn page_count(&self) -> usize {
        self.inner_doc.get_pages().len()
    }
    
    /// Annotate all pages in the document with the given text
    pub fn annotate_all_pages(
        &mut self,
        text: &str,
        annotator: &Annotator,
        position_config: &crate::config::PositionConfig,
    ) -> Result<usize, PdfError> {
        let pages = self.inner_doc.get_pages();
        let mut annotated_count = 0;
        
        for (page_num, (page_id, _)) in pages.iter().enumerate() {
            // Get page dimensions
            let (page_width, page_height) = self.get_page_dimensions(*page_id)?;
            
            // Calculate text position based on page dimensions
            let (x, y) = annotator.calculate_position(
                position_config,
                page_width,
                page_height,
                text,
            );
            
            // Add the text to the page
            annotator.add_text_to_page(&mut self.inner_doc, *page_id, text, x, y)?;
            
            annotated_count += 1;
            debug!("Annotated page {} in {}", page_num + 1, self.path.display());
        }
        
        Ok(annotated_count)
    }
    
    /// Get the dimensions of a page
    fn get_page_dimensions(&self, page_id: (u32, u16)) -> Result<(f32, f32), PdfError> {
        // Get the page dictionary
        let page_dict = self.inner_doc.get_dictionary(page_id).map_err(|e| {
            PdfError::LopdfError(format!("Failed to get page dictionary: {}", e))
        })?;
        
        // Get the MediaBox (or default to letter size)
        let media_box = match page_dict.get(b"MediaBox") {
            Ok(obj) => {
                if let Ok(arr) = obj.as_array() {
                    let lower_left_x = arr.get(0).and_then(|obj| obj.as_real().ok()).unwrap_or(0.0) as f32;
                    let lower_left_y = arr.get(1).and_then(|obj| obj.as_real().ok()).unwrap_or(0.0) as f32;
                    let upper_right_x = arr.get(2).and_then(|obj| obj.as_real().ok()).unwrap_or(612.0) as f32;
                    let upper_right_y = arr.get(3).and_then(|obj| obj.as_real().ok()).unwrap_or(792.0) as f32;
                    
                    (upper_right_x - lower_left_x, upper_right_y - lower_left_y)
                } else {
                    (612.0, 792.0) // Default to letter size in points
                }
            },
            Err(_) => (612.0, 792.0), // Default to letter size in points
        };
        
        Ok(media_box)
    }
    
    /// Save the modified document to a file
    pub fn save(&mut self, path: impl AsRef<Path>) -> Result<(), PdfError> {
        let path = path.as_ref();
        
        // Create parent directories if they don't exist
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                PdfError::SaveError(format!("Failed to create parent directories: {}", e))
            })?;
        }
        
        // Save the document
        self.inner_doc.save(path).map_err(|e| {
            PdfError::SaveError(format!("Failed to save PDF: {}", e))
        })?;
        
        Ok(())
    }
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
    
    /// Process a single PDF file
    pub fn process_file(&self, input_path: impl AsRef<Path>) -> Result<usize, PdfError> {
        let input_path = input_path.as_ref();
        
        // Generate output path
        let output_path = generate_output_path(input_path, &self.config.output_dir);
        
        // Get the filename (for annotation)
        let filename = input_path.file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown.pdf");
        
        info!("Processing {}", input_path.display());
        
        // Open the PDF
        let mut pdf_doc = PdfDocument::open(input_path)?;
        
        // Create an annotator
        let annotator = Annotator::new(self.config.font.clone())?;
        
        // Annotate all pages
        let pages_annotated = pdf_doc.annotate_all_pages(filename, &annotator, &self.config.position)?;
        
        // Save the modified PDF
        pdf_doc.save(&output_path)?;
        
        info!("Saved annotated PDF to {}", output_path.display());
        info!("Annotated {} pages", pages_annotated);
        
        Ok(pages_annotated)
    }
    
    /// Process all PDF files in the configured input directory
    pub fn process_all(&self) -> Result<ProcessingSummary, PdfError> {
        // Ensure output directory exists
        ensure_output_dir(&self.config.output_dir)?;
        
        // Find all PDF files in the input directory
        let pdf_files = find_pdf_files(&self.config.input_dir, self.config.recursive)?;
        
        let mut summary = ProcessingSummary {
            files_processed: 0,
            pages_annotated: 0,
            errors: HashMap::new(),
        };
        
        // Process each file
        for file_path in pdf_files {
            match self.process_file(&file_path) {
                Ok(pages) => {
                    summary.files_processed += 1;
                    summary.pages_annotated += pages;
                }
                Err(e) => {
                    error!("Error processing {}: {}", file_path.display(), e);
                    summary.errors.insert(file_path, e.to_string());
                }
            }
        }
        
        Ok(summary)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use assert_fs::prelude::*;
    use lopdf::{Document, Dictionary, Object, ObjectId};
    use std::fs::File;
    
    // Helper to create a simple test PDF
    fn create_test_pdf(path: &Path) -> Result<(), PdfError> {
        // Create a minimal PDF document
        let mut doc = Document::with_version("1.5");
        
        // Create a page
        let page_id = doc.new_object_id();
        let mut page_dict = Dictionary::new();
        page_dict.set("Type", Object::Name(b"Page".to_vec()));
        page_dict.set("MediaBox", Object::Array(vec![
            Object::Integer(0),
            Object::Integer(0),
            Object::Integer(612),
            Object::Integer(792),
        ]));
        
        doc.objects.insert(page_id, Object::Dictionary(page_dict));
        
        // Create page tree
        let pages_id = doc.new_object_id();
        let mut pages_dict = Dictionary::new();
        pages_dict.set("Type", Object::Name(b"Pages".to_vec()));
        pages_dict.set("Kids", Object::Array(vec![Object::Reference(page_id)]));
        pages_dict.set("Count", Object::Integer(1));
        
        doc.objects.insert(pages_id, Object::Dictionary(pages_dict));
        
        // Update page to point to its parent
        if let Ok(Object::Dictionary(ref mut page_dict)) = doc.get_object_mut(page_id) {
            page_dict.set("Parent", Object::Reference(pages_id));
        }
        
        // Set the catalog
        let catalog_id = doc.new_object_id();
        let mut catalog_dict = Dictionary::new();
        catalog_dict.set("Type", Object::Name(b"Catalog".to_vec()));
        catalog_dict.set("Pages", Object::Reference(pages_id));
        
        doc.objects.insert(catalog_id, Object::Dictionary(catalog_dict));
        doc.trailer.set("Root", Object::Reference(catalog_id));
        
        // Save the document
        doc.save(path)?;
        
        Ok(())
    }
    
    #[test]
    fn test_pdf_document_open() {
        let temp_dir = assert_fs::TempDir::new().unwrap();
        let pdf_path = temp_dir.child("test.pdf");
        
        // Create a test PDF
        create_test_pdf(pdf_path.path()).unwrap();
        
        // Test opening the PDF
        let doc = PdfDocument::open(pdf_path.path());
        assert!(doc.is_ok());
        
        // Test page count
        let doc = doc.unwrap();
        assert_eq!(doc.page_count(), 1);
        
        temp_dir.close().unwrap();
    }
}
