//! PDF Annotation Analyzer
//! 
//! This tool analyzes PDF files to examine annotation properties,
//! specifically focusing on FreeText annotations used by the 
//! PDF Filename Annotator application.

use clap::Parser;
use lopdf::{Document, Object, Dictionary};
use std::path::PathBuf;
use anyhow::{Result, Context};
use colored::*;

/// PDF Annotation Analyzer CLI options
#[derive(Parser)]
#[clap(
    name = "analyze_pdf_annotations",
    about = "Analyze PDF annotations to diagnose font inconsistency issues"
)]
struct Opts {
    /// Path to the PDF file to analyze
    #[clap(name = "FILE")]
    file: PathBuf,

    /// Enable detailed analysis mode
    #[clap(short, long)]
    detailed: bool,

    /// Focus on specific page numbers (comma-separated)
    #[clap(short, long)]
    pages: Option<String>,
}

fn main() -> Result<()> {
    env_logger::init();
    let opts = Opts::parse();
    
    println!("{}", "PDF Annotation Analyzer".bold().green());
    println!("Analyzing file: {}", opts.file.display());
    
    // Load the PDF
    let doc = Document::load(&opts.file)
        .with_context(|| format!("Failed to load PDF: {}", opts.file.display()))?;
    
    // Get total number of pages
    let page_count = doc.get_pages().len();
    println!("Total pages: {}", page_count);
    
    // Determine which pages to analyze
    let pages_to_analyze = if let Some(pages_str) = opts.pages.as_ref() {
        // Parse page numbers from comma-separated string
        pages_str
            .split(',')
            .filter_map(|s| s.trim().parse::<u32>().ok())
            .filter(|&p| p > 0 && p <= page_count as u32)
            .collect::<Vec<_>>()
    } else {
        // Analyze all pages
        (1..=page_count as u32).collect()
    };
    
    if pages_to_analyze.is_empty() {
        println!("No valid pages to analyze!");
        return Ok(());
    }
    
    println!("Analyzing {} pages: {:?}", pages_to_analyze.len(), pages_to_analyze);
    
    // Get page IDs
    let pages = doc.get_pages();
    
    // Analyze each requested page
    for page_num in pages_to_analyze {
        let page_id = pages.get(&page_num).copied()
            .with_context(|| format!("Failed to get page ID for page {}", page_num))?;
        
        analyze_page(&doc, page_id, page_num, opts.detailed)?;
    }
    
    Ok(())
}

fn analyze_page(doc: &Document, page_id: (u32, u16), page_num: u32, detailed: bool) -> Result<()> {
    println!("\n{}", format!("=== Page {} (ID: {:?}) ===", page_num, page_id).bold().blue());
    
    // Get the page dictionary
    let page_dict = doc.get_dictionary(page_id)
        .with_context(|| format!("Failed to get page dictionary for page {}", page_num))?;
    
    // Check for annotations array
    if let Ok(Object::Array(annots)) = page_dict.get(b"Annots") {
        println!("Found {} annotations", annots.len());
        
        // Check each annotation
        for (i, annot_ref) in annots.iter().enumerate() {
            if let Object::Reference(annot_id) = annot_ref {
                match doc.get_object(*annot_id) {
                    Ok(Object::Dictionary(dict)) => {
                        analyze_annotation(doc, dict, i, page_num, detailed)?;
                    },
                    Ok(_) => println!("  Annotation {} is not a dictionary", i),
                    Err(e) => println!("  Failed to get annotation {}: {}", i, e),
                }
            } else {
                println!("  Annotation {} is not a reference", i);
            }
        }
    } else {
        println!("No annotations found on this page");
    }
    
    // If detailed mode, also check page resources
    if detailed {
        analyze_page_resources(doc, page_dict, page_num)?;
    }
    
    Ok(())
}

fn analyze_annotation(_doc: &Document, dict: &Dictionary, index: usize, _page_num: u32, detailed: bool) -> Result<()> {
    println!("\n  {}:", format!("Annotation {}", index).bold().yellow());
    
    // Check annotation type
    if let Ok(Object::Name(subtype_bytes)) = dict.get(b"Subtype") {
        let subtype = String::from_utf8_lossy(subtype_bytes);
        println!("  Type: {}", subtype);
        
        // Only proceed with detailed analysis for FreeText annotations
        if subtype == "FreeText" {
            // Check for Default Appearance (DA) string
            if let Ok(Object::String(da_bytes, _)) = dict.get(b"DA") {
                let da_string = String::from_utf8_lossy(da_bytes);
                println!("  Default Appearance (DA): {}", da_string.cyan());
                
                // Parse and analyze DA string
                analyze_da_string(&da_string);
            } else {
                println!("  {}", "Default Appearance (DA) string missing!".red());
            }
            
            // Check for Contents
            if let Ok(Object::String(content_bytes, _)) = dict.get(b"Contents") {
                let content = String::from_utf8_lossy(content_bytes);
                println!("  Contents: \"{}\"", content);
            }
            
            // Check for rectangle defining annotation position
            if let Ok(Object::Array(rect)) = dict.get(b"Rect") {
                println!("  Rectangle: {:?}", rect);
            }
            
            // Check for border style
            if let Ok(Object::Array(border)) = dict.get(b"Border") {
                println!("  Border: {:?}", border);
            }
            
            // Print all dictionary entries in detailed mode
            if detailed {
                println!("\n  All annotation properties:");
                for (key, value) in dict.iter() {
                    let key_str = String::from_utf8_lossy(key);
                    println!("    {}: {:?}", key_str, value);
                }
            }
        }
    } else {
        println!("  Subtype missing");
    }
    
    Ok(())
}

fn analyze_da_string(da_string: &str) {
    println!("  DA String analysis:");
    
    // Check for leading slash in font name
    if !da_string.contains("/") {
        println!("    {}", "Warning: No font name (missing slash)".red());
    }
    
    // Check for multiple spaces between font name and size
    if da_string.contains("  ") {
        println!("    {}", "Warning: Multiple spaces detected".red());
    }
    
    // Try to parse components
    let parts: Vec<&str> = da_string.split_whitespace().collect();
    
    // Expected format: "/Helvetica 12 Tf 0 0 0 rg"
    if parts.len() >= 4 && parts[2] == "Tf" {
        let font_name = parts[0];
        let font_size = parts[1];
        println!("    Font name: {}", font_name.green());
        println!("    Font size: {}", font_size.green());
        
        // Check if font name format is correct
        if !font_name.starts_with("/") {
            println!("    {}", "Warning: Font name should start with '/'".red());
        }
        
        // Check for extra spaces in unexpected places
        if da_string.contains("/  ") || da_string.contains("  Tf") {
            println!("    {}", "Warning: Irregular spacing in DA string".red());
        }
    } else {
        println!("    {}", "Warning: DA string format doesn't match expected pattern".red());
    }
}

fn analyze_page_resources(doc: &Document, page_dict: &Dictionary, _page_num: u32) -> Result<()> {
    println!("\n  {}", "Page Resources:".bold().magenta());
    
    // Check for Resources dictionary
    if let Ok(resources_obj) = page_dict.get(b"Resources") {
        let resources_dict = match resources_obj {
            Object::Dictionary(dict) => Some(dict),
            Object::Reference(ref_id) => {
                if let Ok(Object::Dictionary(dict)) = doc.get_object(*ref_id) {
                    Some(dict)
                } else {
                    None
                }
            },
            _ => None,
        };
        
        if let Some(resources) = resources_dict {
            // Check Font dictionary
            if let Ok(font_obj) = resources.get(b"Font") {
                let font_dict = match font_obj {
                    Object::Dictionary(dict) => Some(dict),
                    Object::Reference(ref_id) => {
                        if let Ok(Object::Dictionary(dict)) = doc.get_object(*ref_id) {
                            Some(dict)
                        } else {
                            None
                        }
                    },
                    _ => None,
                };
                
                if let Some(fonts) = font_dict {
                    println!("    Found Font dictionary with {} entries", fonts.len());
                    
                    // Examine each font entry
                    for (name, font_obj) in fonts.iter() {
                        let name_str = String::from_utf8_lossy(name);
                        println!("    Font: {}", name_str.yellow());
                        
                        // Get font details
                        let font_details = match font_obj {
                            Object::Dictionary(dict) => Some(dict),
                            Object::Reference(ref_id) => {
                                if let Ok(Object::Dictionary(dict)) = doc.get_object(*ref_id) {
                                    Some(dict)
                                } else {
                                    None
                                }
                            },
                            _ => None,
                        };
                        
                        if let Some(font) = font_details {
                            // Check BaseFont
                            if let Ok(Object::Name(base_font)) = font.get(b"BaseFont") {
                                println!("      BaseFont: {}", String::from_utf8_lossy(base_font).green());
                            }
                            
                            // Check Type
                            if let Ok(Object::Name(font_type)) = font.get(b"Type") {
                                println!("      Type: {}", String::from_utf8_lossy(font_type));
                            }
                            
                            // Check Subtype
                            if let Ok(Object::Name(subtype)) = font.get(b"Subtype") {
                                println!("      Subtype: {}", String::from_utf8_lossy(subtype));
                            }
                            
                            // Check Encoding
                            if let Ok(Object::Name(encoding)) = font.get(b"Encoding") {
                                println!("      Encoding: {}", String::from_utf8_lossy(encoding));
                            }
                        } else {
                            println!("      Unable to access font details");
                        }
                    }
                } else {
                    println!("    Font dictionary not found or invalid");
                }
            } else {
                println!("    No Font dictionary found");
            }
        } else {
            println!("    Resources dictionary not found or invalid");
        }
    } else {
        println!("    No Resources entry found on this page");
    }
    
    Ok(())
}
