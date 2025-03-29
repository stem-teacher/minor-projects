# Task 2.1.3 Instructions: Enhance add-annotation CLI for Rect Type

**Goal:** Modify the `add-annotation` binary (`src/bin/add_annotation.rs`) to support creating rectangle annotations (`--type rect` or `--type square`) by calling the `add_labeled_rect` library function.

**Target File:** `pdf-filename-annotator/src/bin/add_annotation.rs`
**Supporting Files:** `pdf_exam_tools_lib/src/lib.rs` (for imports)

**Steps:**

1.  **Update Imports:** Modify the `use pdf_exam_tools_lib::{...}` line to import `add_labeled_rect`, `Color`, and `BorderStyle`.
    ```rust
    // Example
    use pdf_exam_tools_lib::{
        add_labeled_freetext_multi, add_labeled_rect, // Add rect function
        FontConfig, Color, BorderStyle // Add Color/BorderStyle structs
    };
    ```

2.  **Update `clap` Args:** Modify the `Args` struct to include optional arguments relevant to rectangles:
    *   Change the `--type_` argument help text to include `rect`/`square`.
    *   Add `--color <R,G,B>` (border color). Use a custom parser function `parse_color`.
    *   Add `--interior-color <R,G,B>` (fill color). Use `parse_color`.
    *   Add `--border-width <WIDTH>` (border line width). Parse as `f32`.

    ```rust
    // Example Args struct modification
    #[derive(Parser, Debug)]
    #[command(author, version, about, long_about = None)]
    struct Args {
        // ... input, output, pages ...

        /// Annotation label template (/T value). Use "{page}" for page number.
        #[arg(long)]
        label_template: String,

        /// Annotation type ('freetext', 'rect', 'square')
        #[arg(long, default_value = "freetext")] // Updated help text implied
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

        // --- Rect/Square Specific Args (NEW) ---
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
    fn parse_rect(s: &str) -> Result<[f32; 4], String> { /* ... */ }

    // Add parse_color function
    fn parse_color(s: &str) -> Result<Color, String> {
        let parts: Vec<&str> = s.split(',').map(|x| x.trim()).collect();
        if parts.len() != 3 {
            return Err("Color must have exactly 3 comma-separated values (R,G,B)".to_string());
        }
        let r = parts[0].parse::<f32>().map_err(|e| format!("Invalid R value '{}': {}", parts[0], e))?;
        let g = parts[1].parse::<f32>().map_err(|e| format!("Invalid G value '{}': {}", parts[1], e))?;
        let b = parts[2].parse::<f32>().map_err(|e| format!("Invalid B value '{}': {}", parts[2], e))?;
        // Add basic range check (optional but good)
        if !(0.0..=1.0).contains(&r) || !(0.0..=1.0).contains(&g) || !(0.0..=1.0).contains(&b) {
             return Err("Color values must be between 0.0 and 1.0".to_string());
        }
        Ok(Color { r, g, b })
    }
    ```

3.  **Update `main` Function:** Modify the main logic to handle the different annotation types:
    *   Load the document as before.
    *   Use a `match args.type_.to_lowercase().as_str() { ... }` block.
    *   **`"freetext"` case:** Keep the existing logic calling `add_labeled_freetext_multi`.
    *   **`"rect" | "square"` case:**
        *   Create the `Option<BorderStyle>` based on `args.border_width`. If `Some(width)`, create `BorderStyle { width }`. If `None`, pass `None`.
        *   Call `add_labeled_rect`. Note that `add_labeled_rect` expects a *single* page number. We need to loop here, similar to how `add_labeled_freetext_multi` loops internally. **This reveals a design mismatch.**
        *   **Correction:** Let's simplify. Modify the CLI `Args` to take only a *single* `--page <u32>` again for now. We will add multi-page support consistently later. OR, we implement `add_labeled_rect_multi` in the library first.
        *   **Decision:** Let's implement `add_labeled_rect_multi` in the library **first** (as Task 1.6.1) before modifying the CLI. This keeps the library more capable. **Abort this task instruction** and proceed with Task 1.6.1 instead.

```markdown
# Task 2.1.3 Instructions: Enhance add-annotation CLI for Rect Type (ABORTED)

**Abort Reason:** Realized that the `add_labeled_rect` library function currently only supports a single page, while the CLI (`add-annotation`) was already updated to handle multiple pages (`--pages`). To maintain consistency, we should first implement `add_labeled_rect_multi` in the library before updating the CLI to use it. Aborting this task and proceeding with library enhancement first.
```