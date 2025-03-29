# Task 2.1.2 Instructions: Modify add-annotation CLI for Multi-Page

**Goal:** Update the `add-annotation` binary (`src/bin/add_annotation.rs`) to accept multiple page numbers and use the `add_labeled_freetext_multi` library function.

**Target File:** `pdf-filename-annotator/src/bin/add_annotation.rs`

**Steps:**

1.  **Update Imports:** Modify the `use pdf_exam_tools_lib::{...}` line to import `add_labeled_freetext_multi` instead of `add_labeled_freetext`. Remove the `Config` import if it's unused now (it was only needed for FontConfig previously). Ensure `FontConfig` is still imported.
    ```rust
    // Example
    use pdf_exam_tools_lib::{add_labeled_freetext_multi, FontConfig}; // Import the multi function
    ```

2.  **Update `clap` Args:** Modify the `Args` struct:
    *   Change the `page: u32` argument to accept multiple values. `clap` makes this easy. Also, allow specifying "all" pages or ranges (e.g., "1-3,5,7-").
    *   Rename `--page` to `--pages` for clarity.
    *   Add a helper function or use `clap`'s built-in parsing capabilities to handle page ranges/lists/all. For simplicity now, let's just accept a comma-separated list of numbers. Update the type and add `value_delimiter = ','`.
    *   Change `--label` to `--label-template`.
    *   Change `--contents` to `--contents-template`. Add help text mentioning the `{page}` placeholder.

    ```rust
    // Example Args struct modification
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
        // TODO: Add support for "all" or ranges like "1-5,7" later.
        #[arg(short, long, value_delimiter = ',')] // Use comma delimiter
        pages: Vec<u32>, // Store as Vec<u32>

        /// Annotation label template (/T value). Use "{page}" for page number.
        #[arg(long)] // Renamed from --label
        label_template: String,

        /// Annotation type (currently only 'freetext' supported)
        #[arg(long, default_value = "freetext")]
        type_: String,

        /// Annotation rectangle [x1,y1,x2,y2] (comma-separated)
        #[arg(long, value_parser = parse_rect)]
        rect: [f32; 4],

        /// Text content template for FreeText. Use "{page}" for page number.
        #[arg(long, default_value = "")]
        contents_template: String, // Renamed from --contents

        /// Font size for FreeText annotations (optional)
        #[arg(long, default_value_t = 12.0)]
        font_size: f32,
    }
    // Keep parse_rect function
    fn parse_rect(s: &str) -> Result<[f32; 4], String> {
        // ... existing implementation ...
    }
    ```

3.  **Update `main` Function:**
    *   Modify the call inside `main` to use `add_labeled_freetext_multi`.
    *   Pass the `args.pages` vector (as a slice `&args.pages`) to the function.
    *   Pass `args.label_template` and `args.contents_template`.
    *   Update the success message.

    ```rust
    // Example main modification
    fn main() -> Result<()> {
        // ... init ...
        let args = Args::parse();

        if args.type_ != "freetext" {
            anyhow::bail!("Unsupported annotation type '{}'. Only 'freetext' is currently supported.", args.type_);
        }

        let mut doc = Document::load(&args.input)
            .with_context(|| format!("Failed to load input PDF: {}", args.input.display()))?;

        let font_config = FontConfig {
            size: args.font_size,
            family: "Helvetica".to_string(),
            fallback: None,
        };

        // Call the multi-page library function
        add_labeled_freetext_multi(
            &mut doc,
            &args.pages, // Pass the Vec as a slice
            &args.label_template,
            &args.contents_template,
            args.rect,
            &font_config,
        ).with_context(|| format!("Failed to add annotations using template '{}'", args.label_template))?;

        doc.save(&args.output)
            .with_context(|| format!("Failed to save output PDF: {}", args.output.display()))?;

        // Update success message
        println!("Successfully added annotations with label template '{}' to pages {:?} in {}",
             args.label_template, args.pages, args.output.display());

        Ok(())
    }
    ```

4.  **Format and Check:** Run `cargo fmt --package pdf-filename-annotator` and `cargo check --package pdf-filename-annotator`. Address any compilation errors.