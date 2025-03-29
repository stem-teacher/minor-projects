# Task 1.8 Instructions: Implement copy_single_annotation

**Goal:** Implement the `copy_single_annotation` function in a new module `pdf_exam_tools_lib::pdf_ops`. This function will copy a specified annotation object (and hopefully its dependencies like appearance streams) from a source document to a target document.

**Target File:** `pdf_exam_tools_lib/src/pdf_ops.rs` (Create if not exists)
**Supporting File:** `pdf_exam_tools_lib/src/lib.rs`

**Steps:**

1.  **Create `pdf_ops.rs` Module File:** Create the file `pdf_exam_tools_lib/src/pdf_ops.rs` with initial imports.
    ```rust
    use lopdf::{Document, ObjectId};
    use crate::error::Error;
    use crate::annotation_utils::add_annotation_to_page; // Import necessary helper
    use log::warn; // For logging potential clone issues
    ```

2.  **Implement Function:** Add the following function signature and implementation within `pdf_ops.rs`:
    ```rust
    /// Copies a single annotation object from a source document to a target document,
    /// linking it to the specified target page.
    /// Relies on `lopdf::Document::clone_object` for deep copying.
    pub fn copy_single_annotation(
        source_doc: &Document,
        target_doc: &mut Document,
        source_annot_id: ObjectId, // The ObjectId of the annotation dictionary in source_doc
        target_page_num: u32,
    ) -> Result<(), Error> {
        // Clone the object. The `true` argument requests a deep copy.
        // We need to carefully check if this truly deep copies appearance streams
        // and their *own* resource dependencies (fonts, images within the AP stream).
        // This is a potential weak point in lopdf or any PDF library.
        match target_doc.clone_object(source_doc, source_annot_id, true) {
            Ok(cloned_annot_id) => {
                // Object (dictionary) presumably cloned, now link it to the target page
                add_annotation_to_page(target_doc, target_page_num, cloned_annot_id)
                    .map_err(|e| {
                         // Add context if linking fails
                         Error::Processing(format!(
                             "Failed to link cloned annotation {:?} (source {:?}) to target page {}: {}",
                             cloned_annot_id, source_annot_id, target_page_num, e
                         ))
                    })
            }
            Err(e) => {
                // Log the specific clone error for debugging
                warn!("Failed to clone object {:?} from source doc: {}", source_annot_id, e);
                Err(Error::Processing(format!(
                    "Failed to clone annotation object {:?} using lopdf::clone_object: {}",
                    source_annot_id, e
                )))
            }
        }
    }
    ```
    *(Note the explicit `warn!` log and error message regarding potential `clone_object` limitations. This needs testing.)*

3.  **Update `lib.rs`:** Add `pub mod pdf_ops;` and potentially `pub use pdf_ops::copy_single_annotation;` to `pdf_exam_tools_lib/src/lib.rs`.

4.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`. Address compilation errors. Ensure `log` dependency is added to `pdf_exam_tools_lib/Cargo.toml` if not already present.