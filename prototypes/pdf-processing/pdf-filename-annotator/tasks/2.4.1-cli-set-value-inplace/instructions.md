# Task 2.4.1 Instructions: Add --in-place to set-annotation-value

**Goal:** Modify the `set-annotation-value` binary (`src/bin/set_annotation_value.rs`) to support an `--in-place` flag. When set, the tool should modify the `--input` file directly instead of writing to `--output`. A backup should be created.

**Target File:** `pdf-filename-annotator/src/bin/set_annotation_value.rs`
**Supporting File:** `pdf-filename-annotator/Cargo.toml` (ensure `lopdf` >= 0.28 for `save_to`)

**Steps:**

1.  **Update Imports:** Add `use std::fs;` if not already present.

2.  **Update `clap` Args:** Modify the `Args` struct:
    *   Make the `--output` argument optional (`output: Option<PathBuf>`).
    *   Add an `--in-place` flag (`#[arg(long, default_value_t = false)]`).
    *   Add an optional `--backup-suffix` argument (`#[arg(long, default_value = ".bak")]`).

    ```rust
    // Example Args struct modification
    #[derive(Parser, Debug)]
    #[command(author, version, about = "Sets the /Contents value of a labeled PDF annotation.")]
    struct Args {
        /// Input PDF file path
        #[arg(short, long)]
        input: PathBuf,

        /// Output PDF file path (omit if using --in-place)
        #[arg(short, long)]
        output: Option<PathBuf>, // Made optional

        /// Modify the input file directly (creates backup)
        #[arg(long, default_value_t = false)] // Added flag
        in_place: bool,

        /// Suffix for backup file when using --in-place
        #[arg(long, default_value = ".bak")] // Added backup suffix
        backup_suffix: String,

        /// Annotation label (/T value) to find and modify
        #[arg(short, long)]
        label: String,

        /// The new text value for the /Contents field
        #[arg(short, long)]
        value: String,
    }
    ```

3.  **Update `main` Function Logic:**
    *   **Argument Validation:** Add checks early in `main`:
        *   If `args.in_place` is true AND `args.output` is `Some`, return an error (cannot use both).
        *   If `args.in_place` is false AND `args.output` is `None`, return an error (must specify one).
    *   **Determine Output Path:** Define the `actual_output_path` based on the flags: if `in_place`, use `args.input`; otherwise, use `args.output.unwrap()`.
    *   **Backup Logic:** If `args.in_place` is true:
        *   Construct the backup filename (e.g., `input_path.with_extension(input_path.extension().unwrap_or_default().to_str().unwrap().to_owned() + &args.backup_suffix)`).
        *   Use `fs::copy(&args.input, &backup_path)` to create the backup. Handle potential errors. Print a message about creating the backup.
    *   **Saving Logic:** Modify the final `doc.save(...)` call. `lopdf` versions >= 0.28 have `doc.save_to(&mut file)` which might be slightly more efficient for in-place saving by writing to a temp file then renaming, but simply using `doc.save(&actual_output_path)` should also work (it overwrites the file). Let's stick with `doc.save(&actual_output_path)` for simplicity.
    *   Update print messages to reflect the actual output path used.

    ```rust
    // Example main modification structure
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
                 args.input.extension().unwrap_or_default().to_str().unwrap_or("").to_owned() + &args.backup_suffix
             );
             fs::copy(&args.input, &backup_path)
                 .with_context(|| format!("Failed to create backup file: {}", backup_path.display()))?;
             println!("Created backup: {}", backup_path.display());
        }


        // Load the document MUTABLY
        let mut doc = Document::load(&args.input)
            .with_context(|| format!("Failed to load input PDF: {}", args.input.display()))?;

        // --- Find and Modify Annotation Logic (Keep as before) ---
         match find_annotation_by_label(&doc, &args.label) {
             Ok(Some((annot_id, page_num))) => {
                let update_result = { /* ... get dict, modify, insert ... */ Ok::<(), LibError>(()) }; // Existing logic
                 if let Err(e) = update_result { /* ... handle error ... */ }
                 println!("Successfully updated /Contents for annotation '{}' on page {}.", args.label, page_num);
             }
             Ok(None) => { /* ... handle not found ... */ }
             Err(e) => { /* ... handle search error ... */ }
         }
         // --- End Modify Logic ---


        // Save the modified document to the determined path
        doc.save(&actual_output_path)
            .with_context(|| format!("Failed to save output PDF: {}", actual_output_path.display()))?;

         println!("Saved updated PDF to {}", actual_output_path.display());

        Ok(())
    }
    ```

4.  **Format and Check:** Run `cargo fmt --package pdf-filename-annotator` and `cargo check --package pdf-filename-annotator`. Address compilation errors.