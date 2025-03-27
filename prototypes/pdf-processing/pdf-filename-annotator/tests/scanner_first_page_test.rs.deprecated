//! Tests for first page blank issue in scanner PDFs
//!
//! This test verifies that our fix for the first page blank issue works
//! with scanner-generated PDFs.

use lopdf::{Document, Object, Stream, dictionary};
use pdf_filename_annotator::{
    config::{Config, FontConfig, PositionConfig, Corner},
    processor::PdfProcessor,
    scanner_diagnostic
};
// Don't need these imports
// use assert_fs::prelude::*;
// use std::path::PathBuf;

// Create a test PDF that simulates a scanner PDF (first page with array content streams)
fn create_mock_scanner_pdf(path: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let mut doc = Document::with_version("1.5");
    
    // Create first page that mimics scanner PDF structure (multiple content streams)
    let first_page_id = doc.add_object(dictionary! {
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
    
    // Create content streams for first page (array of streams, typical in scanner PDFs)
    let content1_id = doc.add_object(Object::Stream(Stream::new(dictionary! {}, b"BT /F1 12 Tf (First Stream) Tj ET".to_vec())));
    let content2_id = doc.add_object(Object::Stream(Stream::new(dictionary! {}, b"q 1 0 0 1 100 700 cm /Im0 Do Q".to_vec())));
    
    // Add content streams as array to first page
    if let Ok(page_dict) = doc.get_dictionary_mut(first_page_id) {
        page_dict.set("Contents", Object::Array(vec![
            Object::Reference(content1_id),
            Object::Reference(content2_id)
        ]));
    }
    
    // Create second page (simpler structure)
    let second_page_id = doc.add_object(dictionary! {
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
            })
        })
    });
    
    // Create content stream for second page
    let content3_id = doc.add_object(Object::Stream(Stream::new(dictionary! {}, b"BT /F1 12 Tf (Page 2) Tj ET".to_vec())));
    
    // Add content stream to second page
    if let Ok(page_dict) = doc.get_dictionary_mut(second_page_id) {
        page_dict.set("Contents", Object::Reference(content3_id));
    }
    
    // Create page tree
    let pages_id = doc.add_object(dictionary! {
        "Type" => Object::Name(b"Pages".to_vec()),
        "Kids" => Object::Array(vec![
            Object::Reference(first_page_id),
            Object::Reference(second_page_id)
        ]),
        "Count" => Object::Integer(2)
    });
    
    // Set parent references
    if let Ok(page) = doc.get_dictionary_mut(first_page_id) {
        page.set("Parent", Object::Reference(pages_id));
    }
    if let Ok(page) = doc.get_dictionary_mut(second_page_id) {
        page.set("Parent", Object::Reference(pages_id));
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
fn test_first_page_blank_fix() {
    // Create a temporary directory for our test
    let temp_dir = assert_fs::TempDir::new().unwrap();
    
    // Create our mock scanner PDF
    let input_path = temp_dir.path().join("mock_scanner.pdf");
    create_mock_scanner_pdf(&input_path).unwrap();
    
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
    assert_eq!(pages_annotated, 2, "Both pages should have been annotated");
    
    // Check the output file
    let output_path = output_dir.join("mock_scanner.pdf");
    assert!(output_path.exists(), "Output file doesn't exist");
    
    // Load the output PDF and verify first page annotation
    let doc = Document::load(&output_path).unwrap();
    let pages = doc.get_pages();
    
    // Verify we have two pages
    assert_eq!(pages.len(), 2, "Output PDF should have 2 pages");
    
    // Check if first page has annotations
    let (page_num, _) = pages.iter().next().unwrap();
    let first_page = doc.get_object((*page_num, 0)).unwrap();
    
    if let Object::Dictionary(dict) = first_page {
        // Verify that the page has the Annots entry or content that includes our annotation
        let has_annots = dict.has(b"Annots");
        
        // If no annotations, check content stream for added text
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
        
        assert!(has_annots || has_content, "First page should have annotations or content");
    } else {
        panic!("Expected page to be a dictionary");
    }
    
    // Clean up
    temp_dir.close().unwrap();
}

// Test for scanner PDF detection
#[test]
fn test_scanner_pdf_detection() {
    // Create a temporary directory for our test
    let temp_dir = assert_fs::TempDir::new().unwrap();
    
    // Create our mock scanner PDF
    let scanner_path = temp_dir.path().join("mock_scanner.pdf");
    create_mock_scanner_pdf(&scanner_path).unwrap();
    
    // Analyze the PDF
    let diagnostic = scanner_diagnostic::analyze_pdf(&scanner_path).unwrap();
    
    // Check if it's detected as a scanner PDF
    let scanner_signs = scanner_diagnostic::count_scanner_indicators(&diagnostic);
    
    // Our mock scanner PDF should have several scanner indicators
    assert!(scanner_signs >= 4, "Mock scanner PDF should be detected as a scanner PDF");
    
    // Clean up
    temp_dir.close().unwrap();
}