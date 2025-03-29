# Task 1.8 Instructions: Implement recreate_annotation_by_label

**Goal:** Implement the `recreate_annotation_by_label` function in `pdf_exam_tools_lib::pdf_ops`. This function finds an annotation by label in a source document, extracts its key properties, and calls library functions (e.g., `add_labeled_freetext_multi`) to create a new, equivalent annotation in the target document.

**Target File:** `pdf_exam_tools_lib/src/pdf_ops.rs` (Create or modify)
**Supporting Files:** `pdf_exam_tools_lib/src/lib.rs`, `pdf_exam_tools_lib/src/annotation_utils.rs`, `pdf_exam_tools_lib/src/annotation.rs`

**Steps:**

1.  **Prepare `pdf_ops.rs`:** Ensure the file `pdf_exam_tools_lib/src/pdf_ops.rs` exists. Remove or comment out any previous `copy_single_annotation` or `recursive_copy_object` functions from the failed Task 1.8.1 attempt. Add necessary imports:
    ```rust
    use lopdf::{Document, ObjectId, Object, Dictionary};
    use crate::error::Error;
    use crate::annotation_utils::{find_annotation_by_label, get_annotation_dict, get_annotation_label, get_annotation_contents, get_annotation_rect};
    use crate::annotation::add_labeled_freetext_multi; // Import the function to add FreeText
    // We will need add_labeled_rect later, but not for this step
    use crate::config::FontConfig; // Need this for FreeText creation
    use log::{warn, error};
    ```

2.  **Implement `recreate_annotation_by_label` Function:** Add the following function signature and implementation within `pdf_ops.rs`:
    ```rust
    /// Finds an annotation by label in source_doc, extracts properties, and recreates it
    /// in target_doc on the specified target pages using library functions.
    /// Currently only supports recreating FreeText annotations.
    pub fn recreate_annotation_by_label(
        source_doc: &Document,
        target_doc: &mut Document,
        label: &str,               // Label to find in source_doc
        target_page_numbers: &[u32], // Pages to create the annotation on in target_doc
        // font_config: &FontConfig, // We might need this if recreating FreeText, passed down
    ) -> Result<(), Error> {
        // 1. Find the annotation in the source document
        let (source_annot_id, source_page_num) = find_annotation_by_label(source_doc, label)?
            .ok_or_else(|| Error::Processing(format!("Annotation with label '{}' not found in source document", label)))?;

        // 2. Get the source annotation's dictionary
        let source_dict = get_annotation_dict(source_doc, source_annot_id)?;

        // 3. Extract common and type-specific properties
        let subtype = source_dict.get(b"Subtype")
            .ok()
            .and_then(|obj| obj.as_name_str())
            .ok_or_else(|| Error::Processing(format!("Annotation {:?} is missing /Subtype", source_annot_id)))?;

        let rect = get_annotation_rect(&source_dict)?;
        let contents = get_annotation_contents(&source_dict).unwrap_or_default(); // Default to empty string if no /Contents

        // TODO: Extract other relevant properties like /C, /IC, /BS etc. if needed for other types

        // 4. Based on subtype, call the appropriate "add_labeled_..." function
        match subtype {
            "FreeText" => {
                // For FreeText, we also need font info, potentially from /DA or use a default
                // Let's use a default FontConfig for now, similar to add-annotation CLI
                let font_config = FontConfig {
                    size: 12.0, // Default size - Could try parsing /DA later if needed
                    family: "Helvetica".to_string(),
                    fallback: None,
                };
                // Use the *original label* as the label template for the new annotation(s).
                // Use the *extracted contents* as the contents template.
                // We assume the caller wants the same label/contents on all target pages unless templates are used differently.
                // If dynamic content is needed, the CLI tool calling this should provide templates.
                // Let's adjust: the CLI should provide templates, this function just uses them.
                // --> REVISED approach: This function is simpler if the CLI does the finding and calls the specific add function.
                // --> Let's revert: Make this function simpler. It copies ONE annotation to ONE page. CLI loops.

                 warn!("Revising recreate_annotation_by_label: Functionality reduced to single target page for simplicity. CLI will handle loops.");

                 if target_page_numbers.len() != 1 {
                     return Err(Error::Processing("recreate_annotation_by_label currently only supports exactly one target page number.".to_string()));
                 }
                 let target_page_num = target_page_numbers[0];


                 // Re-extract properties (as before)
                 // ... subtype, rect, contents ...

                 // Call add_labeled_freetext (single page version - needs implementing or using _multi with one page)
                 // Let's assume add_labeled_freetext exists or reuse _multi logic for one page
                  let font_config = FontConfig { size: 12.0, family: "Helvetica".to_string(), fallback: None };

                  // Create label/content templates based on source label/content for now
                  let label_template = label; // Use original label
                  let contents_template = &contents; // Use original content

                   // We need to use the _multi function signature now
                   add_labeled_freetext_multi(
                       target_doc,
                       &[target_page_num], // Pass single page in slice
                       label_template,     // Use original label
                       contents_template,  // Use original content
                       rect,
                       &font_config,
                   )?; // Propagate errors

                   Ok(())


            }
            "Square" | "Circle" | "Rect" => {
                 // TODO: Call add_labeled_rect (or similar) when implemented
                 warn!("Recreating annotation type '{}' is not yet supported.", subtype);
                 Err(Error::Processing(format!("Recreating annotation type '{}' is not yet supported.", subtype)))
            }
            _ => {
                 warn!("Recreating annotation type '{}' is not supported.", subtype);
                 Err(Error::Processing(format!("Recreating annotation type '{}' is not supported.", subtype)))
            }
        }
    }
    ```
    *(Self-Correction during instruction generation: Realized passing multiple target pages here complicates things if the source properties should be applied identically. Simpler if this function handles finding source properties and recreating on ONE target page. The CLI tool (`cp-annotation`) will handle looping through labels and deciding the target page for each.)*

3.  **Update `lib.rs`:** Add `pub mod pdf_ops;` and `pub use pdf_ops::recreate_annotation_by_label;` to `pdf_exam_tools_lib/src/lib.rs`. Remove exports related to the old `copy_single_annotation` if they exist.

4.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`. Ensure `log` and other dependencies are present. Address compilation errors.