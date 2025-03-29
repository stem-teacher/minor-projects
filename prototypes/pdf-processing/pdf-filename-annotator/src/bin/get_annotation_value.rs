use anyhow::{Context, Result};
use clap::Parser;
use lopdf::Document;
use std::path::PathBuf;
// Import necessary library functions
use pdf_exam_tools_lib::annotation_utils::{
    find_annotation_by_label, get_annotation_contents, get_annotation_dict,
};
// Removed unused import: pdf_exam_tools_lib::Error as LibError

#[derive(Parser, Debug)]
#[command(
    author,
    version,
    about = "Gets the /Contents value of a labeled PDF annotation."
)]
struct Args {
    /// Input PDF file path
    #[arg(short, long)]
    input: PathBuf,

    /// Annotation label (/T value) to find
    #[arg(short, long)]
    label: String,
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Load the document (read-only is sufficient)
    let doc = Document::load(&args.input)
        .with_context(|| format!("Failed to load input PDF: {}", args.input.display()))?;

    // Find the annotation by label
    match find_annotation_by_label(&doc, &args.label) {
        Ok(Some((annot_id, page_num))) => {
            // Annotation found, now get its dictionary
            let annot_dict = get_annotation_dict(&doc, annot_id).with_context(|| {
                format!(
                    "Failed to get dictionary for annotation object {:?}",
                    annot_id
                )
            })?;

            // Get the contents
            if let Some(contents) = get_annotation_contents(&annot_dict) {
                // Print contents to stdout
                println!("{}", contents);
            } else {
                // Annotation found, but has no /Contents field or it's not a string
                // Print empty string or error? Let's print empty string for scriptability.
                println!("");
                eprintln!(
                    "Warning: Annotation '{}' found on page {} but has no readable /Contents.",
                    args.label, page_num
                );
            }
        }
        Ok(None) => {
            // Annotation not found
            anyhow::bail!(
                "Annotation with label '{}' not found in {}",
                args.label,
                args.input.display()
            );
        }
        Err(e) => {
            // Error during search
            // Map library error to anyhow error
            return Err(anyhow::Error::new(e)
                .context(format!("Failed to find annotation '{}'", args.label)));
        }
    }

    Ok(())
}
