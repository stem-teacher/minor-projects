# Task 4.5.1 Instructions: Modify set_annotation_contents to Remove RC/AP

**Goal:** Modify the `set_annotation_contents` function in `pdf_exam_tools_lib::annotation_utils` to remove the `/RC` (Rich Content) and `/AP` (Appearance Stream) keys from the annotation dictionary.

**Target File:** `pdf_exam_tools_lib/src/annotation_utils.rs`

**Steps:**

1.  **Locate Function:** Find the `set_annotation_contents` function definition in the target file.

2.  **Modify Implementation:** Add lines to remove the `/RC` and `/AP` keys *after* setting the `/Contents` key.

    ```rust
    // Current function likely looks like this:
    // pub fn set_annotation_contents(dict: &mut Dictionary, contents: &str) {
    //     dict.set("Contents", Object::String(contents.as_bytes().to_vec(), lopdf::StringFormat::Literal));
    // }
    // Modify it to look like this:
    use lopdf::{Dictionary, Object}; // Ensure Object is imported
    pub fn set_annotation_contents(dict: &mut Dictionary, contents: &str) {
        dict.set("Contents", Object::String(contents.as_bytes().to_vec(), lopdf::StringFormat::Literal));
        // Explicitly remove Rich Content and Appearance Stream to force use of /Contents or /DA
        dict.remove(b"RC");
        dict.remove(b"AP");
    }
    ```
    
    *(Make sure *`Object`* is included in the *`use lopdf::{...}`* statement at the top of the file if it's not already there)*.

3.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`. Address any compilation errors.