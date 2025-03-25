//! Scanner PDF Analysis Tool
//! 
//! This binary provides a command-line tool for analyzing the structure of
//! scanner-generated PDFs to help understand and debug annotation issues.

use clap::{Arg, Command};
use pdf_filename_annotator::scanner_diagnostic;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Parse command line arguments
    let matches = Command::new("PDF Scanner Analysis")
        .version("0.1.0")
        .author("PDF Filename Annotator Contributors")
        .about("Analyzes PDF structure to help debug scanner PDF issues")
        .arg(
            Arg::new("file")
                .required(true)
                .help("PDF file to analyze")
                .index(1),
        )
        .arg(
            Arg::new("compare")
                .short('c')
                .long("compare")
                .help("Compare with a regular PDF to highlight differences")
                .value_name("COMPARE_FILE"),
        )
        .arg(
            Arg::new("output")
                .short('o')
                .long("output")
                .help("Save detailed output to a file")
                .value_name("OUTPUT_FILE"),
        )
        .arg(
            Arg::new("verbose")
                .short('v')
                .long("verbose")
                .help("Print detailed information")
                .action(clap::ArgAction::SetTrue),
        )
        .get_matches();

    // Get input file path
    let file_path = matches.get_one::<String>("file").unwrap();
    let path = PathBuf::from(file_path);
    
    // Check if file exists
    if !path.exists() {
        return Err(format!("File not found: {}", file_path).into());
    }
    
    // Analyze the PDF
    println!("Analyzing PDF: {}", file_path);
    let diagnostic = scanner_diagnostic::analyze_pdf(&path)?;
    
    // Print summary
    scanner_diagnostic::print_diagnostic_summary(&diagnostic);
    
    // Compare with regular PDF if requested
    if let Some(compare_path_str) = matches.get_one::<String>("compare") {
        let compare_path = PathBuf::from(compare_path_str);
        if !compare_path.exists() {
            return Err(format!("Comparison file not found: {}", compare_path_str).into());
        }
        
        println!("\nComparing with regular PDF: {}", compare_path_str);
        let compare_diagnostic = scanner_diagnostic::analyze_pdf(&compare_path)?;
        
        // Print some comparison metrics
        println!("\n=== Comparison Results ===");
        
        // Compare page counts
        println!("Page Count: Scanner: {}, Regular: {}", 
                 diagnostic.page_count, 
                 compare_diagnostic.page_count);
        
        // Compare content stream types
        let scanner_content_types: Vec<_> = diagnostic.pages.iter()
            .map(|p| p.content.content_type.as_str())
            .collect();
        
        let regular_content_types: Vec<_> = compare_diagnostic.pages.iter()
            .map(|p| p.content.content_type.as_str())
            .collect();
        
        println!("Content Types: Scanner: {:?}, Regular: {:?}",
                 scanner_content_types,
                 regular_content_types);
        
        // Compare page tree structure
        println!("Page Tree: Scanner: {}, Regular: {}",
                 diagnostic.page_tree.structure,
                 compare_diagnostic.page_tree.structure);
        
        // Check for scanner indicators
        let scanner_indicators = scanner_diagnostic::count_scanner_indicators(&diagnostic);
        let regular_indicators = scanner_diagnostic::count_scanner_indicators(&compare_diagnostic);
        
        println!("Scanner Indicators: Scanner PDF: {}/10, Regular PDF: {}/10",
                 scanner_indicators,
                 regular_indicators);
    }
    
    // If output file is specified, save detailed output
    if let Some(output_path_str) = matches.get_one::<String>("output") {
        let output_path = PathBuf::from(output_path_str);
        
        // Create JSON representation and save to file
        println!("\nSaving detailed analysis to: {}", output_path_str);
        
        // We would use the save_diagnostic_to_json function here, but for now
        // just save a simple text representation
        let mut content = String::new();
        for (page_idx, page) in diagnostic.pages.iter().enumerate() {
            content.push_str(&format!("=== Page {} ===\n", page_idx + 1));
            content.push_str(&format!("Content Type: {}\n", page.content.content_type));
            content.push_str(&format!("Content Length: {}\n", page.content.length));
            content.push_str(&format!("Operation Count: {}\n", page.content.operation_count));
            content.push_str(&format!("Has Images: {}\n", page.content.has_images));
            content.push_str(&format!("Is Scanner-like: {}\n", page.content.is_scanner_like));
            content.push_str(&format!("Annotations: {}\n", page.annotations.len()));
            content.push_str("\n");
        }
        
        std::fs::write(output_path, content)?;
    }
    
    Ok(())
}