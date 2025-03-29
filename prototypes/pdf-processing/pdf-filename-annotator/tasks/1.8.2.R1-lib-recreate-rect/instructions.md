# Task 1.8.2.R1 Instructions: Enhance recreate_annotation_by_label for Rectangles

**Goal:** Modify the `recreate_annotation_by_label` function in `pdf_exam_tools_lib::pdf_ops` to handle annotations with `/Subtype` "Square" (or "Rect").

**Target File:** `pdf_exam_tools_lib/src/pdf_ops.rs`
**Supporting Files:** `pdf_exam_tools_lib/src/annotation_utils.rs`, `pdf_exam_tools_lib/src/annotation.rs`

**Steps:**

1.  **Add Imports:** Ensure `pdf_ops.rs` imports necessary types from `crate::annotation`, specifically `add_labeled_rect_multi`, `Color`, and `BorderStyle`.
    ```rust
    // Ensure these are present or add them
    use crate::annotation::{add_labeled_rect_multi, Color, BorderStyle};
    use lopdf::{Document, ObjectId, Object, Dictionary}; // Needed for property extraction
    use crate::error::Error;
    use crate::annotation_utils::{find_annotation_by_label, get_annotation_dict}; // Keep necessary utils
    use log::{warn, error}; // Keep log imports
    ```

2.  **Implement Helper Functions (if not already present):** Ensure the following helper functions (from the original Task 1.8.2 instructions) exist within `pdf_ops.rs`. If they are missing, add them now.
    ```rust
    // --- PASTE HELPER FUNCTIONS from Task 1.8.2 instructions below ---

    /// Helper to extract an optional RGB color from a dictionary key (e.g., /C, /IC).
    fn extract_color_property(dict: &Dictionary, key: &[u8]) -> Option<Color> {
        dict.get(key).ok().and_then(|obj| obj.as_array().ok()).and_then(|arr| {
            if arr.len() == 3 {
                let r = arr.get(0).and_then(|o| o.as_float().ok());
                let g = arr.get(1).and_then(|o| o.as_float().ok());
                let b = arr.get(2).and_then(|o| o.as_float().ok());
                match (r, g, b) {
                    (Some(r_val), Some(g_val), Some(b_val)) => {
                         // Basic validation for range 0.0-1.0
                         if (0.0..=1.0).contains(&r_val) && (0.0..=1.0).contains(&g_val) && (0.0..=1.0).contains(&b_val) {
                             Some(Color { r: r_val, g: g_val, b: b_val })
                         } else {
                             warn!("Extracted color {:?} has components outside 0.0-1.0 range.", (r_val, g_val, b_val));
                             None // Or return default? For now, treat invalid as None
                         }
                    },
                    _ => None,
                }
            } else {
                 warn!("Color array for key {:?} does not have 3 components: {:?}", String::from_utf8_lossy(key), arr);
                 None // Only support 3-component RGB for now
            }
        })
    }

    /// Helper to extract an optional BorderStyle from /BS or /Border keys.
    fn extract_border_style_property(dict: &Dictionary) -> Option<BorderStyle> {
        // Prefer /BS dictionary first
        if let Ok(bs_dict) = dict.get(b"BS").and_then(|o| o.as_dict()) {
            if let Ok(width) = bs_dict.get(b"W").and_then(|o| o.as_float()) {
                if width >= 0.0 { // Allow zero width border? Let's allow >= 0
                   return Some(BorderStyle { width });
                } else {
                   warn!("Extracted border width from /BS is negative: {}", width);
                }
            }
        }
        // Fallback to legacy /Border array [H V W]
        if let Ok(border_arr) = dict.get(b"Border").and_then(|o| o.as_array()) {
             if border_arr.len() >= 3 {
                 if let Ok(width) = border_arr.get(2).and_then(|o| o.as_float()) {
                      if width >= 0.0 { // Allow zero width
                          return Some(BorderStyle { width });
                      } else {
                          warn!("Extracted border width from /Border is negative: {}", width);
                      }
                 }
             }
        }
        None // No border width found or width is invalid
    }
    // --- End Helper Functions ---
    ```

3.  **Modify `recreate_annotation_by_label` Function:** Locate the `match subtype { ... }` block. Update the case for `"Square" | "Rect"`.

    ```rust
    // Inside recreate_annotation_by_label function...

        // ... (find annotation, get source_dict, extract subtype, rect, contents is needed for freetext only) ...

        // 4. Based on subtype, call the appropriate "add_labeled_..." function
        match subtype {
            "FreeText" => {
                // ... (Existing FreeText logic using add_labeled_freetext_multi) ...
                // Ensure contents is extracted here if needed by FreeText logic
                let contents = get_annotation_contents(&source_dict).unwrap_or_default();
                let font_config = FontConfig { size: 12.0, family: "Helvetica".to_string(), fallback: None };
                 if target_page_numbers.len() != 1 { /* error */ } let target_page_num = target_page_numbers[0]; // Keep single page logic for now
                add_labeled_freetext_multi(
                     target_doc, &[target_page_num], label, &contents, rect, &font_config,
                 )?;
                Ok(())
            }
            "Square" | "Rect" => { // Handle both subtypes
                 warn!("Recreating Rect/Square annotation: {}", label);

                 if target_page_numbers.len() != 1 {
                     return Err(Error::Processing("recreate_annotation_by_label for Rect/Square currently only supports exactly one target page.".to_string()));
                 }
                 let target_page_num = target_page_numbers[0];

                 // *** Extract Optional Color/Border properties using helpers ***
                 let color = extract_color_property(&source_dict, b"C");
                 let interior_color = extract_color_property(&source_dict, b"IC");
                 let border_style = extract_border_style_property(&source_dict);

                 // *** Call add_labeled_rect_multi (passing single page in slice) ***
                 add_labeled_rect_multi(
                     target_doc,
                     &[target_page_num],
                     label, // Use original label
                     rect,  // Use extracted rect
                     color, // Pass extracted Option<Color>
                     interior_color, // Pass extracted Option<Color>
                     border_style, // Pass extracted Option<BorderStyle>
                 )?; // Propagate errors

                 Ok(())
            }
            _ => {
                 warn!("Recreating annotation type '{}' is not supported.", subtype);
                 Err(Error::Processing(format!("Recreating annotation type '{}' is not supported.", subtype)))
            }
        }
    // ...
    ```

4.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`. Address compilation errors.