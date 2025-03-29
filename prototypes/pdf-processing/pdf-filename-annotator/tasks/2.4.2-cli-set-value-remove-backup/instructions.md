# Task 2.4.2 Instructions: Remove Backup Logic from set-annotation-value

**Goal:** Modify the `set-annotation-value` binary (`src/bin/set_annotation_value.rs`) to remove the automatic backup creation when using `--in-place`. The flag should still determine the save path.

**Target File:** `pdf-filename-annotator/src/bin/set_annotation_value.rs`

**Steps:**

1.  **Update `clap` Args:** Modify the `Args` struct:
    *   Remove the `--backup-suffix` argument entirely.
    *   Update the help text for `--in-place` to clarify it modifies the input file *without* creating a backup.

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
        output: Option<PathBuf>,

        /// Modify the input file directly (NO backup created by default)
        #[arg(long, default_value_t = false)] // Updated help text implied
        in_place: bool,

        // --backup-suffix argument REMOVED --

        /// Annotation label (/T value) to find and modify
        #[arg(short, long)]
        label: String,

        /// The new text value for the /Contents field
        #[arg(short, long)]
        value: String,
    }
    ```

2.  **Update `main` Function Logic:**
    *   Remove the entire block of code related to creating the backup file (the `if args.in_place { ... fs::copy ... }` block).
    *   Keep the logic that determines `actual_output_path` based on `args.in_place` and `args.output`.
    *   Keep the final `doc.save(&actual_output_path)` call.
    *   Update any print messages that referred to backups.

    ```rust
    // Example main modification structure
    fn main() -> Result<()> {
        let args = Args::parse();

        // Argument validation (Keep this)
        if args.in_place && args.output.is_some() {
            anyhow::bail!("Cannot use --in-place and --output simultaneously.");
        }
        if !args.in_place && args.output.is_none() {
             anyhow::bail!("Must specify either --output or --in-place.");
        }

        // Determine output path (Keep this)
        let actual_output_path = if args.in_place {
            args.input.clone()
        } else {
            args.output.clone().unwrap()
        };

        // --- REMOVE BACKUP LOGIC ---
        // if args.in_place {
        //     ... fs::copy logic ...
        // }
        // --- END REMOVAL ---


        // Load the document MUTABLY (Keep this)
        let mut doc = Document::load(&args.input)
            .with_context(|| format!("Failed to load input PDF: {}", args.input.display()))?;

        // --- Find and Modify Annotation Logic (Keep this) ---
         match find_annotation_by_label(&doc, &args.label) {
            // ... Existing logic ...
         }
        // --- End Modify Logic ---

        // Save the modified document to the determined path (Keep this)
        doc.save(&actual_output_path)
            .with_context(|| format!("Failed to save output PDF: {}", actual_output_path.display()))?;

         println!("Saved updated PDF to {}", actual_output_path.display()); // Keep or adjust message

        Ok(())
    }
    ```

3.  **Format and Check:** Run `cargo fmt --package pdf-filename-annotator` and `cargo check --package pdf-filename-annotator`. Address compilation errors.