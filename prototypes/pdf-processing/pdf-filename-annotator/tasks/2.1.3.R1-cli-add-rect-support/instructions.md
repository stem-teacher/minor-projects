# Task 2.1.3.R1 Instructions: Enhance add-annotation CLI for Rect Type

**Goal:** Modify the `add-annotation` binary (`src/bin/add_annotation.rs`) to support creating rectangle annotations (`--type rect` or `--type square`) by calling the `add_labeled_rect_multi` library function.

**Target File:** `pdf-filename-annotator/src/bin/add_annotation.rs`
**Supporting Files:** `pdf_exam_tools_lib/src/lib.rs` (for imports)

**Steps:**

1.  **Update Imports:** Modify the `use pdf_exam_tools_lib::{...}` line to import `add_labeled_rect_multi`, `Color`, and `BorderStyle`.
    ```rust
    // Example
    use pdf_exam_tools_lib::{
        add_labeled_freetext_multi, add_labeled_rect_multi, // Add rect multi function
        FontConfig, Color, BorderStyle // Add Color/BorderStyle structs
    };
    use lopdf::Document; // Keep lopdf import
    use anyhow::{Context, Result};
    use clap::Parser;
    use std::path::PathBuf;
    ```

2.  **Update `clap` Args:** Modify the `Args` struct to include the optional arguments for rectangles (color, interior-color, border-width) and update the `--type_` help text. This should match the structure proposed in the previously aborted task attempt. Ensure the `parse_color` function is also present.

    ```rust
    // Args struct should look like this:
    #[derive(Parser, Debug)]
    #[command(author, version, about = "Adds annotations (FreeText, Rect/Square) to PDF pages.")]
    struct Args {
        /// Input PDF file path
        #[arg(short, long)]
        input: PathBuf,

        /// Output PDF file path
        #[arg(short, long)]
        output: PathBuf,

        /// Page numbers (1-based, comma-separated, e.g., "1,3,5")
        #[arg(short, long, value_delimiter = ',')]
        pages: Vec<u32>,

        /// Annotation label template (/T value). Use "{page}" for page number.
        #[arg(long)]
        label_template: String,

        /// Annotation type ('freetext', 'rect', 'square')
        #[arg(long, default_value = "freetext")]
        type_: String,

        /// Annotation rectangle [x1,y1,x2,y2] (comma-separated)
        #[arg(long, value_parser = parse_rect)]
        rect: [f32; 4],

        // --- FreeText Specific Args ---
        /// Text content template for FreeText. Use "{page}" for page number.
        #[arg(long, default_value = "")]
        contents_template: String,
        /// Font size for FreeText annotations (optional)
        #[arg(long, default_value_t = 12.0)]
        font_size: f32,

        // --- Rect/Square Specific Args ---
        /// Border color <R,G,B> (0.0-1.0, comma-separated, e.g., "1.0,0.0,0.0" for red)
        #[arg(long, value_parser = parse_color)]
        color: Option<Color>,

        /// Interior/Fill color <R,G,B> (0.0-1.0, comma-separated)
        #[arg(long, value_parser = parse_color)]
        interior_color: Option<Color>,

        /// Border width (points)
        #[arg(long)]
        border_width: Option<f32>,
    }

    // Keep parse_rect function
    fn parse_rect(s: &str) -> Result<[f32; 4], String> {
        let parts: Vec<&str> = s.split(',').map(|x| x.trim()).collect();
         if parts.len() != 4 {
             return Err("Rectangle must have exactly 4 comma-separated values".to_string());
         }
         let mut rect = [0.0f32; 4];
         for (i, part) in parts.iter().enumerate() {
             rect[i] = part.parse::<f32>().map_err(|e| format!("Invalid number '{}' at index {}: {}", part, i, e))?;
         }
         Ok(rect)
    }

    // Add parse_color function if not already present
    fn parse_color(s: &str) -> Result<Color, String> {
         let parts: Vec<&str> = s.split(',').map(|x| x.trim()).collect();
         if parts.len() != 3 {
             return Err("Color must have exactly 3 comma-separated values (R,G,B)".to_string());
         }
         let r = parts[0].parse::<f32>().map_err(|e| format!("Invalid R value '{}': {}", parts[0], e))?;
         let g = parts[1].parse::<f32>().map_err(|e| format!("Invalid G value '{}': {}", parts[1], e))?;
         let b = parts[2].parse::<f32>().map_err(|e| format!("Invalid B value '{}': {}", parts[2], e))?;
         if !(0.0..=1.0).contains(&r) || !(0.0..=1.0).contains(&g) || !(0.0..=1.0).contains(&b) {
              return Err("Color values must be between 0.0 and 1.0".to_string());
         }
         Ok(Color { r, g, b })
    }
    ```

3.  **Update `main` Function:** Modify the main logic to dispatch to the correct library function based on `args.type_`:
    *   Load the document as before.
    *   Use a `match args.type_.to_lowercase().as_str() { ... }`.
    *   **`"freetext"` case:** Call `add_labeled_freetext_multi` as it currently does. Prepare the `FontConfig` needed for it.
    *   **`"rect" | "square"` case:**
        *   Create the `Option<BorderStyle>` from `args.border_width`.
        *   Call `add_labeled_rect_multi`, passing `args.pages`, `args.label_template`, `args.rect`, `args.color`, `args.interior_color`, and the created `border_style` option.
        *   Wrap the call in `with_context`.
    *   **`_` (Default case):** Return an error using `anyhow::bail!` for unsupported types.
    *   Keep the `doc.save` call after the match block.
    *   Update the final success message to be more generic or reflect the type added.

    ```rust
    // Example main modification structure
    fn main() -> Result<()> {
        let args = Args::parse();

        let mut doc = Document::load(&args.input)
            .with_context(|| format!("Failed to load input PDF: {}", args.input.display()))?;

        // Perform action based on type
        match args.type_.to_lowercase().as_str() {
            "freetext" => {
                let font_config = FontConfig {
                    size: args.font_size,
                    family: "Helvetica".to_string(), // Still hardcoded
                    fallback: None,
                };
                add_labeled_freetext_multi(
                    &mut doc,
                    &args.pages,
                    &args.label_template,
                    &args.contents_template,
                    args.rect,
                    &font_config,
                ).with_context(|| format!("Failed to add FreeText annotations with template '{}'", args.label_template))?;
            }
            "rect" | "square" => {
                 let border_style = args.border_width.map(|w| BorderStyle { width: w });
                 add_labeled_rect_multi(
                    &mut doc,
                    &args.pages,
                    &args.label_template,
                    args.rect,
                    args.color, // Pass Option<Color> directly
                    args.interior_color, // Pass Option<Color> directly
                    border_style, // Pass Option<BorderStyle>
                 ).with_context(|| format!("Failed to add Rect/Square annotations with template '{}'", args.label_template))?;
            }
            unsupported => {
                anyhow::bail!("Unsupported annotation type '{}'. Supported types: freetext, rect, square.", unsupported);
            }
        }

        doc.save(&args.output)
            .with_context(|| format!("Failed to save output PDF: {}", args.output.display()))?;

        // General success message
        println!("Successfully added '{}' annotations with label template '{}' to pages {:?} in {}",
             args.type_, args.label_template, args.pages, args.output.display());

        Ok(())
    }
    ```

4.  **Format and Check:** Run `cargo fmt --package pdf-filename-annotator` and `cargo check --package pdf-filename-annotator`. Address compilation errors.