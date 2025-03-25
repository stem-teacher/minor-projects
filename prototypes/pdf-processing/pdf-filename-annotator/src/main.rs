//! PDF Filename Annotator
//!
//! A command-line tool for annotating PDF files with their filenames
//! in the top-right corner of each page.

use anyhow::{Context, Result};
use clap::Parser;
// Logging is initialized via env_logger
use pdf_filename_annotator::{Config, PdfProcessor};
use std::path::PathBuf;
use std::fs;

/// Command line arguments for PDF Filename Annotator
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to the configuration file
    #[arg(short, long, required_unless_present = "list_fonts")]
    config: Option<PathBuf>,

    /// Verbose output
    #[arg(short, long)]
    verbose: bool,
    
    /// List available fonts
    #[arg(short, long)]
    list_fonts: bool,
}

fn main() -> Result<()> {
    // Initialize logger
    env_logger::init();

    // Parse command-line arguments
    let args = Args::parse();
    
    // If list_fonts flag is set, list available fonts and exit
    if args.list_fonts {
        return list_available_fonts();
    }

    // Load configuration from file
    let config_path = args.config.as_ref().expect("Config should be present when not listing fonts");
    let config = Config::from_file(config_path).context("Failed to load configuration")?;

    // Validate configuration
    config.validate().context("Invalid configuration")?;

    // Create PDF processor with the loaded configuration
    let processor = PdfProcessor::new(config);

    // Process all PDF files in the input directory
    let summary = processor
        .process_all()
        .context("Failed to process PDF files")?;

    // Print summary
    println!("Processing completed successfully!");
    println!("Files processed: {}", summary.files_processed);
    println!("Pages annotated: {}", summary.pages_annotated);
    println!("Errors encountered: {}", summary.errors.len());

    if !summary.errors.is_empty() && args.verbose {
        println!("\nErrors:");
        for (file, error) in summary.errors {
            println!("  {}: {}", file.display(), error);
        }
    }

    Ok(())
}

/// Lists available fonts in common system locations
fn list_available_fonts() -> Result<()> {
    println!("Checking for available fonts...");
    
    // Check common font directories
    let font_dirs = [
        "/System/Library/Fonts",
        "/System/Library/Fonts/Supplemental",
        "/Library/Fonts",
        "/usr/share/fonts/truetype",
        "/usr/share/fonts/TTF",
        "C:\\Windows\\Fonts",
        "./fonts",
    ];
    
    for dir in &font_dirs {
        let path = PathBuf::from(dir);
        if path.exists() {
            println!("Checking directory: {}", dir);
            
            // Try to list files in directory
            match fs::read_dir(&path) {
                Ok(entries) => {
                    for entry in entries {
                        if let Ok(entry) = entry {
                            let path = entry.path();
                            if let Some(ext) = path.extension() {
                                if ext == "ttf" || ext == "ttc" || ext == "otf" {
                                    if let Some(name) = path.file_stem() {
                                        println!("  Font: {}", name.to_string_lossy());
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Error reading directory {}: {}", dir, e);
                }
            }
        }
    }
    
    println!("Font scanning complete.");
    Ok(())
}