use crate::annotation::{add_labeled_freetext_multi, add_labeled_rect_multi, BorderStyle, Color};
use crate::annotation_utils::{
    find_annotation_by_label, get_annotation_contents, get_annotation_dict, get_annotation_rect,
};
use crate::config::FontConfig;
use crate::error::Error;
use log::warn;
use lopdf::{Dictionary, Document, Object};

/// Finds an annotation by label in source_doc, extracts properties, and recreates it
/// in target_doc on the specified target pages using library functions.
/// Currently only supports recreating FreeText annotations.
pub fn recreate_annotation_by_label(
    source_doc: &Document,
    target_doc: &mut Document,
    label: &str, // Label to find in source_doc
    target_page_numbers: &[u32], // Pages to create the annotation on in target_doc
                 // font_config: &FontConfig, // We might need this if recreating FreeText, passed down
) -> Result<(), Error> {
    // 1. Find the annotation in the source document
    let (source_annot_id, _source_page_num) = find_annotation_by_label(source_doc, label)?
        .ok_or_else(|| {
            Error::Processing(format!(
                "Annotation with label '{}' not found in source document",
                label
            ))
        })?;

    // 2. Get the source annotation's dictionary
    let source_dict = get_annotation_dict(source_doc, source_annot_id)?;

    // 3. Extract common and type-specific properties
    let subtype = source_dict
        .get(b"Subtype")
        .ok()
        .and_then(|obj| match obj {
            Object::Name(name) => String::from_utf8(name.clone()).ok(),
            _ => None,
        })
        .ok_or_else(|| {
            Error::Processing(format!(
                "Annotation {:?} is missing or has invalid /Subtype",
                source_annot_id
            ))
        })?;

    let rect = get_annotation_rect(&source_dict)?;
    let contents = get_annotation_contents(&source_dict).unwrap_or_default(); // Default to empty string if no /Contents

    // TODO: Extract other relevant properties like /C, /IC, /BS etc. if needed for other types

    // 4. Based on subtype, call the appropriate "add_labeled_..." function
    match subtype.as_str() {
        "FreeText" => {
            // For FreeText, we also need font info, potentially from /DA or use a default
            // Let's use a default FontConfig for now, similar to add-annotation CLI
            let font_config = FontConfig {
                size: 12.0, // Default size - Could try parsing /DA later if needed
                family: "Helvetica".to_string(),
                fallback: None,
            };

            warn!("Revising recreate_annotation_by_label: Functionality reduced to single target page for simplicity. CLI will handle loops.");

            if target_page_numbers.len() != 1 {
                return Err(Error::Processing("recreate_annotation_by_label currently only supports exactly one target page number.".to_string()));
            }
            let target_page_num = target_page_numbers[0];

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
        "Square" | "Rect" => {
            // Handle both subtypes
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
                label,          // Use original label
                rect,           // Use extracted rect
                color,          // Pass extracted Option<Color>
                interior_color, // Pass extracted Option<Color>
                border_style,   // Pass extracted Option<BorderStyle>
            )?; // Propagate errors

            Ok(())
        }
        _ => {
            warn!("Recreating annotation type '{}' is not supported.", subtype);
            Err(Error::Processing(format!(
                "Recreating annotation type '{}' is not supported.",
                subtype
            )))
        }
    }
}

/// Helper to extract an optional RGB color from a dictionary key (e.g., /C, /IC).
fn extract_color_property(dict: &Dictionary, key: &[u8]) -> Option<Color> {
    dict.get(key)
        .ok()
        .and_then(|obj| obj.as_array().ok())
        .and_then(|arr| {
            if arr.len() == 3 {
                let r = arr.get(0).and_then(|o| o.as_float().ok());
                let g = arr.get(1).and_then(|o| o.as_float().ok());
                let b = arr.get(2).and_then(|o| o.as_float().ok());
                match (r, g, b) {
                    (Some(r_val), Some(g_val), Some(b_val)) => {
                        // Basic validation for range 0.0-1.0
                        if (0.0..=1.0).contains(&r_val)
                            && (0.0..=1.0).contains(&g_val)
                            && (0.0..=1.0).contains(&b_val)
                        {
                            Some(Color {
                                r: r_val,
                                g: g_val,
                                b: b_val,
                            })
                        } else {
                            warn!(
                                "Extracted color {:?} has components outside 0.0-1.0 range.",
                                (r_val, g_val, b_val)
                            );
                            None // Or return default? For now, treat invalid as None
                        }
                    }
                    _ => None,
                }
            } else {
                warn!(
                    "Color array for key {:?} does not have 3 components: {:?}",
                    String::from_utf8_lossy(key),
                    arr
                );
                None // Only support 3-component RGB for now
            }
        })
}

/// Helper to extract an optional BorderStyle from /BS or /Border keys.
fn extract_border_style_property(dict: &Dictionary) -> Option<BorderStyle> {
    // Prefer /BS dictionary first
    if let Ok(bs_dict) = dict.get(b"BS").and_then(|o| o.as_dict()) {
        if let Ok(width) = bs_dict.get(b"W").and_then(|o| o.as_float()) {
            if width >= 0.0 {
                // Allow zero width border? Let's allow >= 0
                return Some(BorderStyle { width });
            } else {
                warn!("Extracted border width from /BS is negative: {}", width);
            }
        }
    }
    // Fallback to legacy /Border array [H V W]
    if let Ok(border_arr) = dict.get(b"Border").and_then(|o| o.as_array()) {
        if border_arr.len() >= 3 {
            // Get the third element and try to convert it to float
            if let Some(w_obj) = border_arr.get(2) {
                if let Ok(width) = w_obj.as_float() {
                    if width >= 0.0 {
                        // Allow zero width
                        return Some(BorderStyle { width });
                    } else {
                        warn!("Extracted border width from /Border is negative: {}", width);
                    }
                }
            }
        }
    }
    None // No border width found or width is invalid
}
