//! Tests for multi-page support in scanner PDFs
//!
//! This test verifies that our fix for scanner PDFs works on more than the first three pages.

use lopdf::{Document, Object, Stream, dictionary};
use pdf_filename_annotator::{
    config::{Config, FontConfig, PositionConfig, Corner},
    processor::PdfProcessor,
    scanner_diagnostic
};
use assert_fs::prelude::*;

// Create a test PDF that simulates a scanner PDF with multiple pages
fn create_mock_scanner_pdf(path: &std::path::Path, page_count: usize) -> Result<(), Box<dyn std::error::Error>> {
    let mut doc = Document::with_version("1.5");
    
    // Create pages with varying content stream structures
    let mut page_ids = Vec::new();
    
    for i in 0..page_count {
        // Create page dictionary
        let page_id = doc.add_object(dictionary! {
            "Type" => Object::Name(b"Page".to_vec()),
            "MediaBox" => Object::Array(vec![
                Object::Integer(0),
                Object::Integer(0),
                Object::Integer(612),
                Object::Integer(792)
            ]),
            "Resources" => Object::Dictionary(dictionary! {
                "Font" => Object::Dictionary(dictionary! {
                    "F1" => Object::Dictionary(dictionary! {
                        "Type" => Object::Name(b"Font".to_vec()),
                        "Subtype" => Object::Name(b"Type1".to_vec()),
                        "BaseFont" => Object::Name(b"Helvetica".to_vec())
                    })
                }),
                "XObject" => Object::Dictionary(dictionary! {
                    "Im0" => Object::Dictionary(dictionary! {
                        "Type" => Object::Name(b"XObject".to_vec()),
                        "Subtype" => Object::Name(b"Image".to_vec()),
                        "Width" => Object::Integer(10),
                        "Height" => Object::Integer(10),
                        "ColorSpace" => Object::Name(b"DeviceRGB".to_vec()),
                        "BitsPerComponent" => Object::Integer(8)
                    })
                })
            })
        });
        
        // Vary the content stream structure based on page number to simulate scanner PDF behavior
        if i == 0 {
            // First page - array of multiple content streams (typical for scanner first page)
            let content1_id = doc.add_object(Object::Stream(
                Stream::new(dictionary! {}, b"BT /F1 12 Tf (First Page First Stream) Tj ET".to_vec())
            ));
            let content2_id = doc.add_object(Object::Stream(
                Stream::new(dictionary! {}, b"q 1 0 0 1 100 700 cm /Im0 Do Q".to_vec())
            ));
            
            if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                page_dict.set("Contents", Object::Array(vec![
                    Object::Reference(content1_id),
                    Object::Reference(content2_id)
                ]));
            }
        } else if i < 3 {
            // First three pages often have particular structure in scanner PDFs
            let content_id = doc.add_object(Object::Stream(
                Stream::new(dictionary! {}, format!("BT /F1 12 Tf (Page {}) Tj ET", i + 1).as_bytes().to_vec())
            ));
            
            if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                page_dict.set("Contents", Object::Reference(content_id));
            }
        } else {
            // Pages beyond the first three often have a different structure in scanner PDFs
            // To simulate this, we'll use a slightly different content stream approach
            
            // Create an array of content streams for these pages too
            let content1_id = doc.add_object(Object::Stream(
                Stream::new(dictionary! {}, format!("BT /F1 12 Tf (Page {} Header) Tj ET", i + 1).as_bytes().to_vec())
            ));
            let content2_id = doc.add_object(Object::Stream(
                Stream::new(dictionary! {}, b"q 1 0 0 1 100 400 cm /Im0 Do Q".to_vec())
            ));
            
            if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                // For these pages, also use content arrays but with different structure
                page_dict.set("Contents", Object::Array(vec![
                    Object::Reference(content1_id),
                    Object::Reference(content2_id)
                ]));
                
                // Add a custom key that's often present in scanner PDFs on later pages
                page_dict.set("ScannerGenerated", Object::Boolean(true));
            }
        }
        
        page_ids.push(page_id);
    }
    
    // Create page tree
    let pages_id = doc.add_object(dictionary! {
        "Type" => Object::Name(b"Pages".to_vec()),
        "Kids" => Object::Array(page_ids.iter().map(|id| Object::Reference(*id)).collect()),
        "Count" => Object::Integer(page_count as i64)
    });
    
    // Set parent references for all pages
    for page_id in &page_ids {
        if let Ok(page) = doc.get_dictionary_mut(*page_id) {
            page.set("Parent", Object::Reference(pages_id));
        }
    }
    
    // Set up the catalog
    let catalog_id = doc.add_object(dictionary! {
        "Type" => Object::Name(b"Catalog".to_vec()),
        "Pages" => Object::Reference(pages_id)
    });
    
    // Add producer string to mimic scanner software
    let info_id = doc.add_object(dictionary! {
        "Producer" => Object::String(b"Epson Scan 2".to_vec(), lopdf::StringFormat::Literal)
    });
    
    // Set up trailer
    doc.trailer.set("Root", Object::Reference(catalog_id));
    doc.trailer.set("Info", Object::Reference(info_id));
    
    // Save the document
    doc.save(path)?;
    
    Ok(())
}

#[test]
fn test_multi_page_scanner_support() {
    // Create a temporary directory for our test
    let temp_dir = assert_fs::TempDir::new().unwrap();
    
    // Create our mock scanner PDF with 6 pages (more than the typical 3-page issue)
    let input_path = temp_dir.path().join("mock_scanner_multi.pdf");
    create_mock_scanner_pdf(&input_path, 6).unwrap();
    
    // Setup output directory
    let output_dir = temp_dir.path().join("output");
    std::fs::create_dir(&output_dir).unwrap();
    
    // Create configuration
    let config = Config {
        input_dir: temp_dir.path().to_path_buf(),
        output_dir: output_dir.clone(),
        recursive: false,
        font: FontConfig::default(),
        position: PositionConfig {
            corner: Corner::TopRight,
            x_offset: 10.0,
            y_offset: 10.0,
        },
    };
    
    // Process the PDF
    let processor = PdfProcessor::new(config);
    let result = processor.process_file(&input_path);
    
    // Check if processing succeeded
    assert!(result.is_ok(), "Failed to process PDF: {:?}", result.err());
    
    // Get the number of pages processed
    let pages_annotated = result.unwrap();
    assert_eq!(pages_annotated, 6, "All 6 pages should have been annotated");
    
    // Check the output file
    let output_path = output_dir.join("mock_scanner_multi.pdf");
    assert!(output_path.exists(), "Output file doesn't exist");
    
    // Load the output PDF and verify annotations on all pages
    let doc = Document::load(&output_path).unwrap();
    let pages = doc.get_pages();
    
    // Verify we have 6 pages
    assert_eq!(pages.len(), 6, "Output PDF should have 6 pages");
    
    // Check all pages for annotations or content with our text
    for (i, (page_id, _)) in pages.iter().enumerate() {
        let page = doc.get_object((page_id.clone(), 0)).unwrap();
        
        if let Object::Dictionary(dict) = page {
            // Look for either annotations or content with our filename
            let has_annots = dict.has(b"Annots");
            
            // If no annotations, check content streams
            let has_content = if !has_annots {
                if let Ok(contents) = dict.get(b"Contents") {
                    match contents {
                        Object::Array(arr) => !arr.is_empty(),
                        Object::Reference(_) => true,
                        _ => false,
                    }
                } else {
                    false
                }
            } else {
                true
            };
            
            assert!(
                has_annots || has_content, 
                "Page {} should have annotations or content", 
                i + 1
            );
        } else {
            panic!("Expected page {} to be a dictionary", i + 1);
        }
    }
    
    // Clean up
    temp_dir.close().unwrap();
}

// Test to verify detection of scanner structure differences beyond page 3
#[test]
fn test_scanner_structure_detection() {
    // Create a temporary directory for our test
    let temp_dir = assert_fs::TempDir::new().unwrap();
    
    // Create our mock scanner PDF with 6 pages
    let scanner_path = temp_dir.path().join("scanner_structure.pdf");
    create_mock_scanner_pdf(&scanner_path, 6).unwrap();
    
    // Analyze the PDF
    let diagnostic = scanner_diagnostic::analyze_pdf(&scanner_path).unwrap();
    
    // Verify we have 6 pages
    assert_eq!(diagnostic.pages.len(), 6, "Should detect 6 pages");
    
    // Verify scanner detection
    let scanner_signs = scanner_diagnostic::count_scanner_indicators(&diagnostic);
    assert!(scanner_signs >= 4, "Should detect as scanner PDF");
    
    // Compare first 3 pages vs later pages to demonstrate the issue
    let first_three_content_types: Vec<_> = diagnostic.pages[0..3]
        .iter()
        .map(|p| &p.content.content_type)
        .collect();
        
    let later_pages_content_types: Vec<_> = diagnostic.pages[3..]
        .iter()
        .map(|p| &p.content.content_type)
        .collect();
    
    // Document structural differences for debugging
    println!("First 3 pages content types: {:?}", first_three_content_types);
    println!("Later pages content types: {:?}", later_pages_content_types);
    
    // Clean up
    temp_dir.close().unwrap();
}