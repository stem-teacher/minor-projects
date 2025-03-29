# Task 1.5 Instructions: Implement add_labeled_freetext

**Goal:** Implement the `add_labeled_freetext` function in the `pdf_exam_tools_lib::annotation` module. This function will create a complete FreeText annotation object, add it to the document, link it to the specified page, and return its ObjectId.

**Target File:** `pdf_exam_tools_lib/src/annotation.rs`

**Steps:**

1.  **Define Function Signature:** Add the following function signature to `pdf_exam_tools_lib/src/annotation.rs`. Make sure necessary types (`Document`, `ObjectId`, `Error`, `AnnotationError`, `FontConfig`) are imported either at the top of the file or via `crate::...`.
    ```rust
    use crate::{FontConfig, Error, AnnotationError}; // Adjust imports as needed
    use lopdf::{Document, Object, ObjectId, Dictionary};
    use crate::annotation_utils; // Import the utils module

    /// Adds a labeled FreeText annotation to a specific page.
    /// Creates the annotation object, adds it to the document, and links it to the page.
    /// Returns the ObjectId of the created annotation dictionary.
    pub fn add_labeled_freetext(
        doc: &mut Document,
        page_num: u32,
        label: &str,        // The /T value for the annotation
        contents: &str,     // The /Contents value
        rect: [f32; 4],     // The /Rect value [x1, y1, x2, y2]
        font_config: &FontConfig, // Used for /DA string, might be simplified later
    ) -> Result<ObjectId, Error> {
        // Implementation goes here
        Err(Error::Processing("Not yet implemented".to_string())) // Placeholder
    }
    ```

2.  **Implement Function Body:** Replace the placeholder `Err(...)` with the implementation logic. This should involve:
    *   Creating a new `lopdf::Dictionary`.
    *   Setting standard annotation keys: `/Type` (Annot), `/Subtype` (FreeText).
    *   Setting `/Rect` using the `rect` parameter.
    *   Setting `/Contents` by calling `annotation_utils::set_annotation_contents`.
    *   Setting `/T` (label) by calling `annotation_utils::set_annotation_label`.
    *   Setting `/F` (Flags, e.g., Print=4).
    *   Setting `/Border` (e.g., `[0, 0, 0]`).
    *   **Setting `/DA` (Default Appearance):** Construct the string like `/Helvetica 12 Tf 0 g` (using `font_config.size`, hardcoding Helvetica and black color `0 g` for now is fine for simplicity). Convert to `Object::String`.
    *   **Setting `/DR` (Default Resources - Optional but Recommended):** Consider adding a minimal `/Font` resource dictionary referencing `/Helvetica` similar to the original `Annotator::add_text_annotation` logic, if needed for consistency, although often viewers handle standard fonts referenced in `/DA`. Let's *omit* `/DR` for now for simplicity and see if viewers handle `/DA` alone correctly.
    *   Add the completed dictionary object to the document using `doc.add_object(...)` to get its `ObjectId`.
    *   Call `annotation_utils::add_annotation_to_page(doc, page_num, new_annot_id)` to link the new annotation ID to the page.
    *   Return `Ok(new_annot_id)`.
    *   Handle potential errors from `add_annotation_to_page` and map them to `Error`.

3.  **Update `lib.rs`:** Ensure the `annotation.rs` module and the `add_labeled_freetext` function are correctly declared and exported in `pdf_exam_tools_lib/src/lib.rs`. It might look like:
    ```rust
    pub mod annotation;
    pub use annotation::add_labeled_freetext; // Add this if not already exporting the module
    // ... other exports ...
    ```

4.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`.
