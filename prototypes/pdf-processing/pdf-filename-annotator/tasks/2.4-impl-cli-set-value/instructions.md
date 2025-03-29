# Task 2.4 Instructions: Implement set-annotation-value CLI

**Goal:** Create the `set-annotation-value` binary (`src/bin/set_annotation_value.rs`) that finds an annotation by label (`/T`) and updates its `/Contents` field with a new value.

**Target File:** `pdf-filename-annotator/src/bin/set_annotation_value.rs` (Create if not exists)
**Supporting File:** `pdf-filename-annotator/Cargo.toml`

**Steps:**

1.  **Create Binary Source File:** Create `pdf-filename-annotator/src/bin/set_annotation_value.rs` with the following structure and `clap` parsing:

    ```rust
    use clap::Parser;
    use std::path::PathBuf;
    use anyhow::{Context, Result};
    use lopdf::{Document, Dictionary, Object}; // Need Dictionary/Object for update
    // Import necessary library functions
    use pdf_exam_tools_lib::annotation_utils::{find_annotation_by_label, set_annotation_contents}; // Need set_annotation_contents
    use pdf_exam_tools_lib::Error as LibError;

    #[derive(Parser, Debug)]
    #[command(author, version, about = "Sets the /Contents value of a labeled PDF annotation.")]
    struct Args {
        /// Input PDF file path
        #[arg(short, long)]
        input: PathBuf,

        /// Output PDF file path
        #[arg(short, long)]
        output: PathBuf,

        /// Annotation label (/T value) to find and modify
        #[arg(short, long)]
        label: String,

        /// The new text value for the /Contents field
        #[arg(short, long)]
        value: String,
    }

    fn main() -> Result<()> {
        let args = Args::parse();

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
                    let mut annot_dict = doc.get_object(annot_id).map_err(LibError::Pdf)?
                        .as_dict()
                        .cloned() // Clone the dictionary
                        .map_err(|_| LibError::Processing(format!("Object {:?} is not a dictionary", annot_id)))?;

                    // Modify the owned dictionary using the library function
                    set_annotation_contents(&mut annot_dict, &args.value);

                    // Update the object in the document's object map
                    doc.objects.insert(annot_id, Object::Dictionary(annot_dict));
                    Ok::<(), LibError>(()) // Indicate success within this block
                }; // End of block scope for annot_dict borrow

                // Check if the update block succeeded
                if let Err(e) = update_result {
                     return Err(anyhow::Error::new(e).context(format!("Failed to update annotation object {:?}", annot_id)));
                }

                println!("Successfully updated /Contents for annotation '{}' on page {}.", args.label, page_num);

            }
            Ok(None) => {
                // Annotation not found
                anyhow::bail!("Annotation with label '{}' not found in {}", args.label, args.input.display());
            }
            Err(e) => {
                // Error during search
                return Err(anyhow::Error::new(e).context(format!("Failed to find annotation '{}'", args.label)));
            }
        }

        // Save the modified document
        doc.save(&args.output)
            .with_context(|| format!("Failed to save output PDF: {}", args.output.display()))?;

         println!("Saved updated PDF to {}", args.output.display());

        Ok(())
    }
    ```
    *(Note the approach: get an owned `Dictionary`, modify it using the library function, then use `doc.objects.insert` to replace the old object with the modified one. This avoids complex mutable borrowing issues with `lopdf`.)*

2.  **Update `Cargo.toml`:** Ensure `pdf-filename-annotator/Cargo.toml` includes a `[[bin]]` section for `set-annotation-value` and has the necessary dependencies (`clap`, `anyhow`, `lopdf`, `pdf_exam_tools_lib`).

    ```toml
    # Example [[bin]] entry to add in pdf-filename-annotator/Cargo.toml
    [[bin]]
    name = "set-annotation-value"
    path = "src/bin/set_annotation_value.rs"
    ```

3.  **Format and Check:** Run `cargo fmt --package pdf-filename-annotator` and `cargo check --package pdf-filename-annotator`. Address any compilation errors.