use anyhow::{Context, Result};
use clap::Parser;
use lopdf::Document;
use pdf_exam_tools_lib::annotation_utils::find_annotation_by_label;
use pdf_exam_tools_lib::pdf_ops::recreate_annotation_by_label; // Import the key function
use std::path::PathBuf; // Needed to find source page if target page isn't specified

#[derive(Parser, Debug)]
#[command(
    author,
    version,
    about = "Copies labeled annotations from source PDF to target PDF by recreating them."
)]
struct Args {
    /// Source PDF file path (template)
    #[arg(long)]
    source: PathBuf,

    /// Target PDF file path (file to modify)
    #[arg(long)]
    target: PathBuf,

    /// Output PDF file path
    #[arg(short, long)]
    output: PathBuf,

    /// Annotation label(s) to copy (comma-separated)
    #[arg(short, long, value_delimiter = ',')]
    labels: Vec<String>,

    /// Target page number (1-based). If omitted, copies to the same page number as found in the source.
    #[arg(long)]
    target_page: Option<u32>,
    // Note: We are NOT implementing --in-place for this tool initially.
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Load source document (read-only)
    let source_doc = Document::load(&args.source)
        .with_context(|| format!("Failed to load source PDF: {}", args.source.display()))?;

    // Load target document (mutably)
    let mut target_doc = Document::load(&args.target)
        .with_context(|| format!("Failed to load target PDF: {}", args.target.display()))?;

    let mut annotations_copied = 0;
    let mut errors_encountered = Vec::new();

    // Loop through the labels provided by the user
    for label in &args.labels {
        println!("Processing label: {}", label);

        // Determine the target page number for this label
        let actual_target_page = match args.target_page {
            Some(tp) => tp, // User specified a single target page for all labels
            None => {
                // User didn't specify target page, find where it is in the source
                match find_annotation_by_label(&source_doc, label) {
                    Ok(Some((_annot_id, source_page_num))) => source_page_num, // Use source page number
                    Ok(None) => {
                        let err_msg = format!(
                            "Annotation '{}' not found in source PDF '{}', skipping.",
                            label,
                            args.source.display()
                        );
                        eprintln!("Warning: {}", err_msg);
                        errors_encountered.push(err_msg);
                        continue; // Skip to the next label
                    }
                    Err(e) => {
                        let err_msg = format!(
                            "Error finding annotation '{}' in source PDF '{}': {}, skipping.",
                            label,
                            args.source.display(),
                            e
                        );
                        eprintln!("Error: {}", err_msg);
                        errors_encountered.push(err_msg);
                        continue; // Skip to the next label
                    }
                }
            }
        };

        // Call the library function to recreate the annotation
        match recreate_annotation_by_label(
            &source_doc,
            &mut target_doc,
            label,
            &[actual_target_page], // Pass the single target page number as a slice
        ) {
            Ok(_) => {
                println!("  -> Copied '{}' to page {}", label, actual_target_page);
                annotations_copied += 1;
            }
            Err(e) => {
                let err_msg = format!(
                    "Failed to copy annotation '{}' to page {}: {}",
                    label, actual_target_page, e
                );
                eprintln!("Error: {}", err_msg);
                errors_encountered.push(err_msg);
                // Continue to next label even if one fails
            }
        }
    } // End loop through labels

    // Save the modified target document if any annotations were potentially copied
    if annotations_copied > 0 || args.labels.is_empty() {
        // Save even if no labels specified or all failed? Or only on success? Let's save if attempts were made.
        target_doc
            .save(&args.output)
            .with_context(|| format!("Failed to save output PDF: {}", args.output.display()))?;
        println!("Saved modified PDF to {}", args.output.display());
    } else {
        println!("No annotations were successfully copied. Output file not saved.");
        // If errors occurred, maybe return non-zero exit code?
        if !errors_encountered.is_empty() {
            // Use anyhow::bail! to return an error status if needed
            // anyhow::bail!("Errors occurred during annotation copying. See warnings/errors above.");
        }
    }

    if !errors_encountered.is_empty() {
        eprintln!("\nSummary of errors/warnings:");
        for err in errors_encountered {
            eprintln!("- {}", err);
        }
        // Optionally return Err here to indicate partial failure to shell
        // return Err(anyhow::anyhow!("One or more annotations could not be copied."));
    }

    Ok(())
}
