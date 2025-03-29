# Task 1.6.1 Instructions: Implement add_labeled_rect_multi

**Goal:** Implement the `add_labeled_rect_multi` function in `pdf_exam_tools_lib::annotation`. This function will create labeled Square annotations on multiple specified pages.

**Target File:** `pdf_exam_tools_lib/src/annotation.rs`
**Supporting Files:** `pdf_exam_tools_lib/src/lib.rs`, `pdf_exam_tools_lib/src/annotation_utils.rs`

**Steps:**

1.  **Add Imports:** Ensure `annotation.rs` imports necessary types like `log::{debug, warn}` if not already present. Ensure `Color` and `BorderStyle` structs are defined or imported.

2.  **Implement `add_labeled_rect_multi` Function:** Add the following function definition to `annotation.rs`. It should loop through pages and call the single-page `add_labeled_rect` logic (which we can define inline or call the existing `add_labeled_rect` function). Let's call the existing `add_labeled_rect`.

    ```rust
    use crate::{Color, BorderStyle, Error}; // Ensure these are imported or defined
    use lopdf::{Document, ObjectId, Dictionary, Object};
    use crate::annotation_utils;
    use log::{debug, warn};

    /// Adds a labeled Square annotation to multiple specified pages.
    /// Creates the annotation object for each page, adds it to the document, and links it.
    /// Label can include placeholder "{page}" to be replaced by the current page number.
    pub fn add_labeled_rect_multi(
        doc: &mut Document,
        page_numbers: &[u32],       // Pages to add annotation to
        label_template: &str,       // Label template with optional {page}
        rect: [f32; 4],             // Same Rect for all pages
        color: Option<Color>,       // Optional border color /C
        interior_color: Option<Color>, // Optional fill color /IC
        border_style: Option<BorderStyle>, // Optional border width/style /BS
    ) -> Result<(), Error> { // Return Ok(()) or Error
        for &page_num in page_numbers {
            // Generate dynamic label for this page
            let label = label_template.replace("{page}", &page_num.to_string());
            debug!("Adding rect annotation '{}' to page {}", label, page_num);

            // Call the single-page function we implemented in Task 1.6.R1
            match add_labeled_rect(
                doc,
                page_num,
                &label, // Use the generated label
                rect,
                color, // Pass through options
                interior_color,
                border_style.clone(), // Clone BorderStyle if it's not Copy
            ) {
                Ok(_) => {
                    // Successfully added for this page
                }
                Err(e) => {
                    // Log error and continue to next page for robustness
                    warn!(
                        "Failed to add rect annotation '{}' to page {}: {}",
                        label, page_num, e
                    );
                    // Optionally collect errors and return them at the end?
                    // For now, just log and continue.
                }
            }
        }
        Ok(()) // Overall success if loop completes (even if some pages had errors)
    }

    // Keep the existing single-page add_labeled_rect function as it might be useful
    // pub fn add_labeled_rect(...) -> Result<ObjectId, Error> { ... }
    ```
    *(Note: We call the existing `add_labeled_rect` within the loop. Ensure `BorderStyle` implements `Clone` if it wasn't already done.)*

3.  **Update `lib.rs`:** Ensure the new `add_labeled_rect_multi` function is exported from `pdf_exam_tools_lib/src/lib.rs`. Add it alongside the other `add_labeled_rect` export.
    ```rust
    // Example addition to lib.rs exports
    pub use annotation::{..., add_labeled_rect, add_labeled_rect_multi, ...}; // Add new multi function
    ```

4.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`. Address compilation errors (like adding `#[derive(Clone)]` to `BorderStyle` if needed).
