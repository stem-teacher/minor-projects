# Task 1.9 Instructions: Implement get_annotation_properties Library Function

**Goal:** Implement a function `get_annotation_properties` in `pdf_exam_tools_lib::annotation_utils` that retrieves a structured summary of a labeled annotation's properties.

**Target File:** `pdf_exam_tools_lib/src/annotation_utils.rs`
**Supporting Files:** `pdf_exam_tools_lib/src/lib.rs`, `pdf_exam_tools_lib/src/annotation.rs` (for Color/BorderStyle types)

**Steps:**

1.  **Add Imports:** Ensure `annotation_utils.rs` imports `serde::Serialize` (add `serde` with `derive` feature to library's `Cargo.toml` if not present), `std::collections::HashMap`, and the `Color`, `BorderStyle` types from `crate::annotation`.
    ```rust
    use serde::Serialize; // For returning structured data
    use std::collections::HashMap;
    use crate::annotation::{Color, BorderStyle}; // Import helper types
    // Ensure other necessary imports like Document, ObjectId, Dictionary, Object, Error are present
    ```

2.  **Define `AnnotationProperties` Struct:** Add a new public, serializable struct (likely near the top of `annotation_utils.rs` or in a shared `types.rs` module) to hold the extracted properties. Include common fields and optional type-specific fields.
    ```rust
    #[derive(Debug, Serialize)]
    pub struct AnnotationProperties {
        pub page: u32,
        pub id: (u32, u16), // ObjectId tuple
        pub subtype: Option<String>,
        pub label: Option<String>, // From /T
        pub rect: Option<[f32; 4]>, // From /Rect
        pub contents: Option<String>, // From /Contents
        pub color: Option<Color>, // From /C
        pub interior_color: Option<Color>, // From /IC
        pub border_style: Option<BorderStyle>, // From /BS or /Border
        // Add other common fields if desired (e.g., /F Flags)
        // pub flags: Option<i64>,
        // Add type-specific fields later if needed in a more complex enum structure
        // pub freetext_da: Option<String>,
    }
    ```

3.  **Implement `get_annotation_properties` Function:** Add the following function to `annotation_utils.rs`:
    ```rust
    /// Finds an annotation by label and returns a structure containing its key properties.
    pub fn get_annotation_properties(
        doc: &Document,
        label: &str,
    ) -> Result<Option<AnnotationProperties>, Error> {
        // 1. Find the annotation by label
        match find_annotation_by_label(doc, label)? {
            Some((annot_id, page_num)) => {
                // 2. Get the dictionary
                let dict = get_annotation_dict(doc, annot_id)?; // Uses existing helper

                // 3. Extract properties using existing/new helpers
                let subtype = dict.get(b"Subtype").ok().and_then(|o| o.as_name_str().ok()).map(str::to_owned);
                let label = get_annotation_label(&dict); // Existing helper
                let rect = get_annotation_rect(&dict).ok(); // Existing helper, ignore error for optional field
                let contents = get_annotation_contents(&dict); // Existing helper

                // Use the helpers defined in the (aborted) Task 1.8.2 for Color/Border
                let color = extract_color_property(&dict, b"C");
                let interior_color = extract_color_property(&dict, b"IC");
                let border_style = extract_border_style_property(&dict);
                // let flags = dict.get(b"F").ok().and_then(|o| o.as_int().ok());

                // 4. Construct and return the properties struct
                Ok(Some(AnnotationProperties {
                    page: page_num,
                    id: annot_id,
                    subtype,
                    label,
                    rect,
                    contents,
                    color,
                    interior_color,
                    border_style,
                    // flags,
                }))
            }
            None => Ok(None), // Annotation not found
        }
    }

    // --- PASTE HELPER FUNCTIONS from Task 1.8.2 instructions below ---
    // fn extract_color_property(...) -> Option<Color> { ... }
    // fn extract_border_style_property(...) -> Option<BorderStyle> { ... }
    // --- Ensure these helpers are included here ---
    ```
    *(IMPORTANT: This requires copying the `extract_color_property` and `extract_border_style_property` helper functions specified in the instructions for the *previous* Task 1.8.2 into this `annotation_utils.rs` file, as they weren't actually added in that aborted task).*

4.  **Update `lib.rs`:** Ensure the new `get_annotation_properties` function and the `AnnotationProperties` struct are exported from `pdf_exam_tools_lib/src/lib.rs`.
    ```rust
    // Example addition to lib.rs exports
    pub use annotation_utils::{..., get_annotation_properties, AnnotationProperties}; // Add new items
    // Ensure Color, BorderStyle are also exported if defined in annotation.rs
    ```

5.  **Update `Cargo.toml`:** Add `serde = { version = "1.0", features = ["derive"] }` to `pdf_exam_tools_lib/Cargo.toml` under `[dependencies]` if it's not already there with the `derive` feature.

6.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`. Address compilation errors.
