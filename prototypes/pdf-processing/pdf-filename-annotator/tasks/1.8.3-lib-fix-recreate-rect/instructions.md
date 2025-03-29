# Task 1.8.3 Instructions: Fix recreate_annotation_by_label for Rectangles

**Goal:** Correct the implementation of the `"Square" | "Rect"` match arm within the `recreate_annotation_by_label` function in `pdf_exam_tools_lib::pdf_ops` to properly call `add_labeled_rect_multi`.

**Target File:** `pdf_exam_tools_lib/src/pdf_ops.rs`

**Steps:**

1.  **Locate Match Arm:** Find the `match subtype { ... }` block within the `recreate_annotation_by_label` function. Locate the case that handles `"Square" | "Rect"`.

2.  **Replace Placeholder Logic:** Replace the entire content of that match arm (which currently likely returns an `Err(Error::Processing(...not yet supported...))`) with the logic that extracts properties and calls `add_labeled_rect_multi`. **This is the logic that *should* have been implemented in Task 1.8.2.**

    ```rust
    // Inside recreate_annotation_by_label function...
        // ...
        match subtype {
            "FreeText" => {
                // ... Keep existing FreeText logic ...
                Ok(())
            }
            "Square" | "Rect" => { // Handle both subtypes
                 // ---- START REPLACEMENT ----
                 // This block replaces the previous error/warning logic for Square/Rect

                 if target_page_numbers.len() != 1 {
                     // Keep the check for single target page for now
                     return Err(Error::Processing("recreate_annotation_by_label for Rect/Square currently only supports exactly one target page.".to_string()));
                 }
                 let target_page_num = target_page_numbers[0];

                 // Extract Optional Color/Border properties using helpers
                 // Ensure extract_color_property & extract_border_style_property helpers exist in this file
                 let color = extract_color_property(&source_dict, b"C");
                 let interior_color = extract_color_property(&source_dict, b"IC");
                 let border_style = extract_border_style_property(&source_dict);

                 // Call add_labeled_rect_multi (passing single page in slice)
                 // This is the crucial call that was missing or incorrect previously
                 add_labeled_rect_multi(
                     target_doc,
                     &[target_page_num],
                     label, // Use original label
                     rect,  // Use extracted rect
                     color, // Pass extracted Option<Color>
                     interior_color, // Pass extracted Option<Color>
                     border_style, // Pass extracted Option<BorderStyle>
                 )?; // Propagate errors if add_labeled_rect_multi fails

                 Ok(()) // Return Ok(()) on success for this match arm
                 // ---- END REPLACEMENT ----
            }
            _ => {
                 // Keep existing unsupported type logic
                 warn!("Recreating annotation type '{}' is not supported.", subtype);
                 Err(Error::Processing(format!("Recreating annotation type '{}' is not supported.", subtype)))
            }
        }
    // ...
    ```
    *(Ensure the helper functions `extract_color_property` and `extract_border_style_property` are correctly defined within `pdf_ops.rs` as implemented in the previous successful Task 1.8.2 report).*

3.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`. Address any compilation errors.
