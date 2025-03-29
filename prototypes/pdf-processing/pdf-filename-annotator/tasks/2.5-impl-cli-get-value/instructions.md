# Task 2.5 Instructions: Implement get-annotation-value CLI

**Goal:** Create the `get-annotation-value` binary (`src/bin/get_annotation_value.rs`) that finds an annotation by its label (`/T` field) and prints its `/Contents` field to standard output.

**Target File:** `pdf-filename-annotator/src/bin/get_annotation_value.rs` (Create if not exists)
**Supporting File:** `pdf-filename-annotator/Cargo.toml`

**Steps:**

1.  **Create Binary Source File:** Create `pdf-filename-annotator/src/bin/get_annotation_value.rs` with the following basic structure and `clap` argument parsing:

    ```rust
    use clap::Parser;
    use std::path::PathBuf;
    use anyhow::{Context, Result};
    use lopdf::Document;
    // Import necessary library functions
    use pdf_exam_tools_lib::annotation_utils::{find_annotation_by_label, get_annotation_dict, get_annotation_contents};
    use pdf_exam_tools_lib::Error as LibError; // Import library error type

    #[derive(Parser, Debug)]
    #[command(author, version, about = "Gets the /Contents value of a labeled PDF annotation.")]
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
                let annot_dict = get_annotation_dict(&doc, annot_id)
                    .with_context(|| format!("Failed to get dictionary for annotation object {:?}", annot_id))?;

                // Get the contents
                if let Some(contents) = get_annotation_contents(&annot_dict) {
                    // Print contents to stdout
                    println!("{}", contents);
                } else {
                    // Annotation found, but has no /Contents field or it's not a string
                    // Print empty string or error? Let's print empty string for scriptability.
                    println!("");
                    eprintln!("Warning: Annotation '{}' found on page {} but has no readable /Contents.", args.label, page_num);
                }
            }
            Ok(None) => {
                // Annotation not found
                anyhow::bail!("Annotation with label '{}' not found in {}", args.label, args.input.display());
            }
            Err(e) => {
                // Error during search
                // Map library error to anyhow error
                return Err(anyhow::Error::new(e).context(format!("Failed to find annotation '{}'", args.label)));
            }
        }

        Ok(())
    }
    ```

2.  **Update `Cargo.toml`:** Ensure the `pdf-filename-annotator/Cargo.toml` file includes:
    *   A `[[bin]]` section for `get-annotation-value`.
    *   Dependencies on `clap`, `anyhow`, `lopdf`, and `pdf_exam_tools_lib`. Add them if they are missing from the `[dependencies]` section (though most should be there already).

    ```toml
    # Example [[bin]] entry to add in pdf-filename-annotator/Cargo.toml
    [[bin]]
    name = "get-annotation-value"
    path = "src/bin/get_annotation_value.rs"

    # Example dependencies to ensure exist under [dependencies]
    # clap = { version = "4.5.4", features = ["derive"] }
    # anyhow = "1.0"
    # lopdf = "0.36.0" # Or your version
    # pdf_exam_tools_lib = { path = "../pdf_exam_tools_lib" }
    ```
    *(Use commands like `grep` and `awk` or `perl` to add these if they don't exist, similar to previous tasks)*.

3.  **Format and Check:** Run `cargo fmt --package pdf-filename-annotator` and `cargo check --package pdf-filename-annotator`. Address any compilation errors. Pay attention to imports.