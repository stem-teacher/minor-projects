use anyhow::{Context, Result};
use clap::Parser;
use lopdf::{Document, Object};
use std::fs;
use std::path::PathBuf;
// Import necessary library functions
use pdf_exam_tools_lib::annotation_utils::{find_annotation_by_label, set_annotation_contents};
use pdf_exam_tools_lib::Error as LibError;

#[derive(Parser, Debug)]
#[command(
    author,
    version,
    about = "Sets the /Contents value of a labeled PDF annotation."
)]
struct Args {
    /// Input PDF file path
    #[arg(short, long)]
    input: PathBuf,

    /// Output PDF file path (omit if using --in-place)
    #[arg(short, long)]
    output: Option<PathBuf>,

    /// Modify the input file directly (creates backup)
    #[arg(long, default_value_t = false)]
    in_place: bool,

    /// Suffix for backup file when using --in-place
    #[arg(long, default_value = ".bak")]
    backup_suffix: String,

    /// Annotation label (/T value) to find and modify
    #[arg(short, long)]
    label: String,

    /// The new text value for the /Contents field
    #[arg(short, long)]
    value: String,
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Argument validation
    if args.in_place && args.output.is_some() {
        anyhow::bail!("Cannot use --in-place and --output simultaneously.");
    }
    if !args.in_place && args.output.is_none() {
        anyhow::bail!("Must specify either --output or --in-place.");
    }

    // Determine output path
    let actual_output_path = if args.in_place {
        args.input.clone() // Use input path for in-place
    } else {
        args.output.clone().unwrap() // Use specified output path
    };

    // Backup if in-place
    if args.in_place {
        let backup_path = args.input.with_extension(
            args.input
                .extension()
                .unwrap_or_default()
                .to_str()
                .unwrap_or("")
                .to_owned()
                + &args.backup_suffix,
        );
        fs::copy(&args.input, &backup_path)
            .with_context(|| format!("Failed to create backup file: {}", backup_path.display()))?;
        println!("Created backup: {}", backup_path.display());
    }

    // Load the document MUTABLY
    let mut doc = Document::load(&args.input)
        .with_context(|| format!("Failed to load input PDF: {}", args.input.display()))?;

    // Find the annotation by label
    match find_annotation_by_label(&doc, &args.label) {
        Ok(Some((annot_id, page_num))) => {
            // Annotation found. Now we need to update the object in the document.
            // Get the dictionary, modify it, and update the object.
            // Using a block scope to manage borrows carefully.
            let update_result = {
                // Get an owned copy of the dictionary
                let mut annot_dict = doc
                    .get_object(annot_id)
                    .map_err(LibError::Pdf)?
                    .as_dict()
                    .cloned() // Clone the dictionary
                    .map_err(|_| {
                        LibError::Processing(format!("Object {:?} is not a dictionary", annot_id))
                    })?;

                // Modify the owned dictionary using the library function
                set_annotation_contents(&mut annot_dict, &args.value);

                // Update the object in the document's object map
                doc.objects.insert(annot_id, Object::Dictionary(annot_dict));
                Ok::<(), LibError>(()) // Indicate success within this block
            }; // End of block scope for annot_dict borrow

            // Check if the update block succeeded
            if let Err(e) = update_result {
                return Err(anyhow::Error::new(e)
                    .context(format!("Failed to update annotation object {:?}", annot_id)));
            }

            println!(
                "Successfully updated /Contents for annotation '{}' on page {}.",
                args.label, page_num
            );
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
            return Err(anyhow::Error::new(e)
                .context(format!("Failed to find annotation '{}'", args.label)));
        }
    }

    // Save the modified document to the determined path
    doc.save(&actual_output_path).with_context(|| {
        format!(
            "Failed to save output PDF: {}",
            actual_output_path.display()
        )
    })?;

    println!("Saved updated PDF to {}", actual_output_path.display());

    Ok(())
}
