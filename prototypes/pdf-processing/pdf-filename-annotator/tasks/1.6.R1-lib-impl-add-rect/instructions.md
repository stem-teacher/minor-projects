# Task 1.6.R1 Instructions: Implement add_labeled_rect

**Goal:** Implement the `add_labeled_rect` function in `pdf_exam_tools_lib::annotation` to create labeled Square annotations.

**Target File:** `pdf_exam_tools_lib/src/annotation.rs`
**Supporting Files:** `pdf_exam_tools_lib/src/lib.rs`, `pdf_exam_tools_lib/src/annotation_utils.rs`

**Steps:**

1.  **Add Imports:** Ensure `annotation.rs` imports necessary types:
    ```rust
    use lopdf::{Document, Object, ObjectId, Dictionary};
    use crate::error::{Error, AnnotationError}; // Assuming Error is needed
    use crate::annotation_utils; // Make sure this is imported
    // Potentially add Color/BorderStyle structs/enums if defining them
    ```

2.  **Define Helper Structs (Optional but Recommended):** Define simple structs/enums to represent optional parameters cleanly, perhaps at the top of `annotation.rs` or in a new `types.rs` module (if creating `types.rs`, export it from `lib.rs`).
    ```rust
    /// Represents RGB Color (0.0 to 1.0 range)
    #[derive(Debug, Clone, Copy)]
    pub struct Color { pub r: f32, pub g: f32, pub b: f32 }

    /// Represents Border Style options
    #[derive(Debug, Clone)]
    pub struct BorderStyle {
         pub width: f32,
         // Could add style (Solid, Dashed) later
    }
    ```

3.  **Implement `add_labeled_rect` Function:** Add the following function to `annotation.rs`:
    ```rust
    use crate::config::FontConfig; // Already likely imported

    /// Adds a labeled Square annotation to a specific page.
    /// Creates the annotation object, adds it to the document, and links it to the page.
    /// Returns the ObjectId of the created annotation dictionary.
    pub fn add_labeled_rect(
        doc: &mut Document,
        page_num: u32,
        label: &str,         // The /T value
        rect: [f32; 4],      // The /Rect value [x1, y1, x2, y2]
        color: Option<Color>,       // Optional border color /C
        interior_color: Option<Color>, // Optional fill color /IC
        border_style: Option<BorderStyle>, // Optional border width/style /BS
    ) -> Result<ObjectId, Error> {
        let mut annot_dict = Dictionary::new();

        // Set common fields
        annot_dict.set("Type", Object::Name(b"Annot".to_vec()));
        annot_dict.set("Subtype", Object::Name(b"Square".to_vec())); // Use Square subtype
        annotation_utils::set_annotation_label(&mut annot_dict, label);
        annot_dict.set("Rect", Object::Array(vec![
            Object::Real(rect[0]), Object::Real(rect[1]), Object::Real(rect[2]), Object::Real(rect[3])
        ]));
        annot_dict.set("F", Object::Integer(4)); // Print flag

        // Set optional color fields
        if let Some(c) = color {
            annot_dict.set("C", Object::Array(vec![Object::Real(c.r), Object::Real(c.g), Object::Real(c.b)]));
        }
        if let Some(ic) = interior_color {
             annot_dict.set("IC", Object::Array(vec![Object::Real(ic.r), Object::Real(ic.g), Object::Real(ic.b)]));
        }

        // Set optional border fields
        if let Some(bs) = border_style {
            let mut bs_dict = Dictionary::new();
            bs_dict.set("Type", Object::Name(b"Border".to_vec())); // As per spec for /BS entry
            bs_dict.set("W", Object::Real(bs.width)); // Border width
            // bs_dict.set("S", Object::Name(b"S")); // Style (S=Solid, D=Dashed) - add later if needed
            annot_dict.set("BS", Object::Dictionary(bs_dict));
             // Also set the legacy /Border array (some viewers might need it)
             // [H V W] - Horizontal/Vertical corner radii (0), Width
             annot_dict.set("Border", Object::Array(vec![Object::Integer(0), Object::Integer(0), Object::Real(bs.width)]));
        } else {
             // Default border if none specified (e.g., thin black)
             annot_dict.set("C", Object::Array(vec![Object::Real(0.0), Object::Real(0.0), Object::Real(0.0)])); // Black border color
             annot_dict.set("Border", Object::Array(vec![Object::Integer(0), Object::Integer(0), Object::Integer(1)])); // Width 1
        }


        // No /DA or /DR needed for Square annotations typically

        // Add object to document
        let new_annot_id = doc.add_object(Object::Dictionary(annot_dict));

        // Link to page
        annotation_utils::add_annotation_to_page(doc, page_num, new_annot_id)?;

        Ok(new_annot_id)
    }
    ```

4.  **Update `lib.rs`:** Ensure the new `add_labeled_rect` function (and the `Color`, `BorderStyle` structs if added) are exported from `pdf_exam_tools_lib/src/lib.rs`.
    ```rust
    // Example addition to lib.rs exports
    pub use annotation::{add_labeled_freetext, add_labeled_freetext_multi, add_labeled_rect, Annotator, Color, BorderStyle}; // Add new items
    ```

5.  **Format and Check:** Run `cargo fmt --package pdf_exam_tools_lib` and `cargo check --package pdf_exam_tools_lib`. Address compilation errors.