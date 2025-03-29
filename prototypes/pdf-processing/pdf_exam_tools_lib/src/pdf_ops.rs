use crate::annotation::add_labeled_freetext_multi;
use crate::annotation_utils::{
    find_annotation_by_label, get_annotation_contents, get_annotation_dict, get_annotation_rect,
};
use crate::config::FontConfig;
use crate::error::Error;
use log::warn;
use lopdf::{Document, Object};

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
        "Square" | "Circle" | "Rect" => {
            // TODO: Call add_labeled_rect (or similar) when implemented
            warn!(
                "Recreating annotation type '{}' is not yet supported.",
                subtype
            );
            Err(Error::Processing(format!(
                "Recreating annotation type '{}' is not yet supported.",
                subtype
            )))
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
