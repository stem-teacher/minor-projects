use clap::Parser;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

// Import from main library - use the new module
use pdf_filename_annotator::mc_pdf_utils;

/// Program to apply multiple choice marking guide annotations from a template PDF
/// to the first page of other PDFs
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Template PDF with annotations to extract
    #[arg(short, long)]
    template: PathBuf,

    /// Input directory containing PDFs to process
    #[arg(short, long)]
    input_dir: PathBuf,

    /// Output directory for annotated PDFs
    #[arg(short, long)]
    output_dir: PathBuf,

    /// Process directories recursively
    #[arg(short, long, default_value_t = false)]
    recursive: bool,

    /// File pattern to match (e.g., "*.pdf")
    #[arg(short, long, default_value = "*.pdf")]
    pattern: String,

    /// Overwrite existing files
    #[arg(short, long, default_value_t = false)]
    force: bool,

    /// Verbose output
    #[arg(short, long, default_value_t = false)]
    verbose: bool,

    /// Dry run (don't modify files)
    #[arg(short, long, default_value_t = false)]
    dry_run: bool,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logger
    env_logger::init();

    // Parse command line arguments
    let args = Args::parse();

    println!("Multiple Choice Marking Guide");
    println!("============================");

    // Validate inputs
    validate_inputs(&args)?;

    // Extract annotations from template
    println!(
        "Extracting annotations from template: {}",
        args.template.display()
    );
    let template_annotations =
        mc_pdf_utils::extract_annotations_from_file(&args.template, Some(&["Square", "Circle"]))?;

    println!(
        "Found {} marking annotations in the template",
        template_annotations.len()
    );

    if args.verbose {
        for (i, annotation) in template_annotations.iter().enumerate() {
            println!(
                "Annotation #{}: Type={}, Rect=[{:.2}, {:.2}, {:.2}, {:.2}]",
                i + 1,
                annotation.annotation_type,
                annotation.rect[0],
                annotation.rect[1],
                annotation.rect[2],
                annotation.rect[3]
            );
        }
    }

    // Process input files
    println!("Processing input directory: {}", args.input_dir.display());
    let input_files = find_pdf_files(&args.input_dir, args.recursive, &args.pattern);

    println!("Found {} PDF files to process", input_files.len());

    // Create output directory if it doesn't exist
    if !args.output_dir.exists() {
        fs::create_dir_all(&args.output_dir)?;
    }

    // Process each file
    let mut success_count = 0;
    let mut failure_count = 0;

    for input_file in &input_files {
        let relative_path = input_file
            .strip_prefix(&args.input_dir)
            .unwrap_or(input_file);
        let output_file = args.output_dir.join(relative_path);

        // Create parent directories if needed
        if let Some(parent) = output_file.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)?;
            }
        }

        // Skip if output exists and force is not set
        if output_file.exists() && !args.force {
            println!("Skipping {} (output exists)", input_file.display());
            continue;
        }

        // Apply annotations
        println!("Processing {}", input_file.display());

        if args.dry_run {
            println!(
                "[DRY RUN] Would apply {} annotations to {}",
                template_annotations.len(),
                input_file.display()
            );
            success_count += 1;
        } else {
            match mc_pdf_utils::apply_annotations_to_file(
                input_file,
                &output_file,
                &template_annotations,
                true, // Copy appearance streams
            ) {
                Ok(_) => {
                    println!("Successfully processed {}", input_file.display());
                    success_count += 1;
                }
                Err(e) => {
                    println!("Failed to process {}: {}", input_file.display(), e);
                    failure_count += 1;
                }
            }
        }
    }

    // Print summary
    println!(
        "\nProcessing complete: {} succeeded, {} failed",
        success_count, failure_count
    );

    Ok(())
}

/// Validate command line arguments
fn validate_inputs(args: &Args) -> Result<(), Box<dyn std::error::Error>> {
    // Check that template file exists and is a PDF
    if !args.template.exists() {
        return Err(format!("Template file does not exist: {}", args.template.display()).into());
    }

    if args.template.extension().map_or(true, |ext| ext != "pdf") {
        return Err(format!("Template file is not a PDF: {}", args.template.display()).into());
    }

    // Check that input directory exists
    if !args.input_dir.exists() {
        return Err(format!(
            "Input directory does not exist: {}",
            args.input_dir.display()
        )
        .into());
    }

    // Check that output directory exists or can be created
    if !args.output_dir.exists() {
        match fs::create_dir_all(&args.output_dir) {
            Ok(_) => {}
            Err(e) => return Err(format!("Failed to create output directory: {}", e).into()),
        }
    }

    Ok(())
}

/// Find PDF files in directory based on pattern and recursion settings
fn find_pdf_files(dir: &Path, recursive: bool, pattern: &str) -> Vec<PathBuf> {
    let mut files = Vec::new();

    let walker = if recursive {
        WalkDir::new(dir)
    } else {
        WalkDir::new(dir).max_depth(1)
    };

    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();

        if path.is_file()
            && path.extension().map_or(false, |ext| ext == "pdf")
            && path_matches_pattern(path, pattern)
        {
            files.push(path.to_path_buf());
        }
    }

    files
}

/// Check if path matches pattern
fn path_matches_pattern(path: &Path, pattern: &str) -> bool {
    // Basic pattern matching implementation
    if pattern == "*.pdf" {
        return path.extension().map_or(false, |ext| ext == "pdf");
    }

    // More advanced pattern matching could be implemented here
    path.extension().map_or(false, |ext| ext == "pdf")
}
