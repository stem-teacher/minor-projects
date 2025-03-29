# Task 2.1.1 Instructions: Modify add_labeled_freetext for Multi-Page Support

**Goal:** Refactor `add_labeled_freetext` in `pdf_exam_tools_lib::annotation` to handle a collection of page numbers.

**Target File:** `pdf_exam_tools_lib/src/annotation.rs`

**Steps:**

1.  **Modify Function Signature:** Change the `add_labeled_freetext` signature to accept a slice of page numbers (`page_numbers: &[u32]`) instead of a single `page_num: u32`. Also, adjust the `label` and `contents` parameters to allow for dynamic generation per page. Return `Ok(())` on success, as returning multiple ObjectIds is less useful here.

    ```rust
    // Example new signature (adjust imports as needed)
    use crate::{FontConfig, Error, AnnotationError};
    use lopdf::{Document, Object, ObjectId, Dictionary};
    use crate::annotation_utils;
    use log::debug; // Add log import if not present

    /// Adds a labeled FreeText annotation to multiple specified pages.
    /// Creates the annotation object for each page, adds it to the document, and links it.
    /// Label and Contents can include placeholders "{page}" to be replaced by the current page number.
    pub fn add_labeled_freetext_multi( // Renamed to avoid conflict during refactor if necessary
        doc: &mut Document,
        page_numbers: &[u32], // Accept multiple page numbers
        label_template: &str,    // Template for /T, e.g., "Stamp_p{page}"
        contents_template: &str, // Template for /Contents, e.g., "File: {filename} Page: {page}"
        rect: [f32; 4],          // Same Rect for all pages for now
        font_config: &FontConfig,
    ) -> Result<(), Error> { // Return Ok(()) or Error
        // Implementation goes here
        Ok(()) // Placeholder
    }
    ```
    *(Note: Renamed to `_multi` temporarily to avoid breaking existing code until the CLI is updated. We can rename back later if preferred.)*

2.  **Implement Loop:** Replace the placeholder `Ok(())` with a loop that iterates through the `page_numbers` slice.

3.  **Inside the Loop:** For each `page_num` in the loop:
    *   **Generate Dynamic Label/Contents:** Replace any instance of `"{page}"` in `label_template` and `contents_template` with the current `page_num`.
    *   **Create Dictionary:** Create the `lopdf::Dictionary` for the annotation as done previously (setting `/Type`, `/Subtype`, `/Rect`).
    *   **Set Dynamic Label/Contents:** Use `annotation_utils::set_annotation_label` and `annotation_utils::set_annotation_contents` with the *dynamically generated* label and contents for this specific page.
    *   **Set Static Fields:** Set `/F`, `/Border`, `/DA` as before.
    *   **Add Object:** Add the dictionary to the document using `doc.add_object(...)` to get the unique `ObjectId` for *this page's annotation*.
    *   **Link to Page:** Call `annotation_utils::add_annotation_to_page(doc, page_num, new_annot_id)` for the current page number and the newly created annotation ID. Handle potential errors from this call (e.g., log a warning for the specific page and continue, or return the first error). Let's choose to **log and continue** for robustness. Add `use log::warn;` if not present.
    *   Add `debug!` logging for clarity (e.g., "Adding annotation '{label}' to page {page_num}").

4.  **Return:** If the loop completes without returning an early error, return `Ok(())`.

5.  **Update `lib.rs`:** Ensure the new `add_labeled_freetext_multi` function is exported from `pdf_exam_tools_lib/src/lib.rs`.

6.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`. Address any compilation errors.