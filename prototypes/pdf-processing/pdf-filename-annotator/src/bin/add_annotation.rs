use anyhow::{Context, Result};
use clap::Parser;
use std::path::PathBuf;

use lopdf::Document;
use pdf_exam_tools_lib::{add_labeled_freetext_multi, FontConfig}; // Updated to use multi-page function

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Input PDF file path
    #[arg(short, long)]
    input: PathBuf,

    /// Output PDF file path
    #[arg(short, long)]
    output: PathBuf,

    /// Page numbers (1-based, comma-separated, e.g., "1,3,5")
    #[arg(short, long, value_delimiter = ',')] // Updated to accept multiple pages
    pages: Vec<u32>, // Store as Vec<u32>

    /// Annotation label template (/T value). Use "{page}" for page number.
    #[arg(long)] // Renamed from --label
    label_template: String,

    /// Annotation type (currently only 'freetext' supported)
    #[arg(long, default_value = "freetext")]
    type_: String, // Use type_ because type is a reserved keyword

    /// Annotation rectangle [x1,y1,x2,y2] (comma-separated)
    #[arg(long, value_parser = parse_rect)]
    rect: [f32; 4],

    /// Text content template for FreeText. Use "{page}" for page number.
    #[arg(long, default_value = "")]
    contents_template: String, // Renamed from --contents

    /// Font size for FreeText annotations (optional)
    #[arg(long, default_value_t = 12.0)]
    font_size: f32,
    // font_family is omitted for now, hardcoding Helvetica in lib
}

/// Parses a comma-separated string into a [f32; 4] array.
fn parse_rect(s: &str) -> Result<[f32; 4], String> {
    let parts: Vec<&str> = s.split(',').map(|x| x.trim()).collect();
    if parts.len() != 4 {
        return Err("Rectangle must have exactly 4 comma-separated values".to_string());
    }
    let mut rect = [0.0f32; 4];
    for (i, part) in parts.iter().enumerate() {
        rect[i] = part
            .parse::<f32>()
            .map_err(|e| format!("Invalid number '{}' at index {}: {}", part, i, e))?;
    }
    Ok(rect)
}

fn main() -> Result<()> {
    // Consider adding env_logger initialization here later
    // env_logger::init();

    let args = Args::parse();

    // Basic validation for type (expand later)
    if args.type_ != "freetext" {
        anyhow::bail!(
            "Unsupported annotation type '{}'. Only 'freetext' is currently supported.",
            args.type_
        );
    }

    // Load the document
    let mut doc = Document::load(&args.input)
        .with_context(|| format!("Failed to load input PDF: {}", args.input.display()))?;

    // Prepare FontConfig (simplified for now)
    let font_config = FontConfig {
        size: args.font_size,
        family: "Helvetica".to_string(), // Hardcoded for now
        fallback: None,
    };

    // Call the multi-page library function
    add_labeled_freetext_multi(
        &mut doc,
        &args.pages, // Pass the Vec as a slice
        &args.label_template,
        &args.contents_template,
        args.rect,
        &font_config, // Pass reference
    )
    .with_context(|| {
        format!(
            "Failed to add annotations using template '{}'",
            args.label_template
        )
    })?;

    // Save the modified document
    doc.save(&args.output)
        .with_context(|| format!("Failed to save output PDF: {}", args.output.display()))?;

    println!(
        "Successfully added annotations with label template '{}' to pages {:?} in {}",
        args.label_template,
        args.pages,
        args.output.display()
    );

    Ok(())
}
