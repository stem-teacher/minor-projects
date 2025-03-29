use crate::annotation::{BorderStyle, Color};
use crate::error::Error; // Assuming library error enum is here
use lopdf::{Dictionary, Document, Object, ObjectId};
use serde::Serialize; // For returning structured data
use std::str;

#[derive(Debug, Serialize)]
pub struct AnnotationProperties {
    pub page: u32,
    pub id: (u32, u16), // ObjectId tuple
    pub subtype: Option<String>,
    pub label: Option<String>,         // From /T
    pub rect: Option<[f32; 4]>,        // From /Rect
    pub contents: Option<String>,      // From /Contents
    pub color: Option<Color>,          // From /C
    pub interior_color: Option<Color>, // From /IC
    pub border_style: Option<BorderStyle>, // From /BS or /Border
                                       // Add other common fields if desired (e.g., /F Flags)
                                       // pub flags: Option<i64>,
                                       // Add type-specific fields later if needed in a more complex enum structure
                                       // pub freetext_da: Option<String>,
}

/// Searches all pages for the first annotation whose /T (Title) field matches the label.
/// Returns the ObjectId of the annotation dictionary and the 1-based page number.
pub fn find_annotation_by_label(
    doc: &Document,
    label: &str,
) -> Result<Option<(ObjectId, u32)>, Error> {
    for (page_num, page_id) in doc.get_pages() {
        let page_dict = match doc.get_object(page_id) {
            Ok(Object::Dictionary(dict)) => dict,
            Ok(_) => {
                // Log warning or error? For now, skip non-dictionary page objects
                // log::warn!("Page object {:?} for page {} is not a dictionary, skipping.", page_id, page_num);
                continue;
            }
            Err(e) => return Err(Error::Pdf(e)),
        };

        if let Ok(annots_obj) = page_dict.get(b"Annots") {
            let annots_array_obj_ids: Vec<ObjectId> = match annots_obj {
                Object::Array(arr) => {
                    // Handle cases where Annots contains direct references
                    arr.iter()
                        .filter_map(|obj| obj.as_reference().ok())
                        .collect()
                }
                Object::Reference(ref_id) => {
                    match doc.get_object(*ref_id) {
                        Ok(Object::Array(arr)) => {
                            // Handle cases where Annots points to an array of references
                            arr.iter()
                                .filter_map(|obj| obj.as_reference().ok())
                                .collect()
                        }
                        Ok(_) => {
                            // log::warn!("Annots reference {:?} for page {} did not resolve to an array, skipping.", ref_id, page_num);
                            vec![]
                        }
                        Err(e) => return Err(Error::Pdf(e)), // Propagate error if reference resolution fails
                    }
                }
                _ => {
                    // log::warn!("Annots for page {} is not an array or reference, skipping.", page_num);
                    vec![]
                } // Skip page if Annots is not an array or reference
            };

            for annot_id in annots_array_obj_ids {
                match doc.get_object(annot_id) {
                    Ok(Object::Dictionary(annot_dict)) => {
                        if let Ok(title_obj) = annot_dict.get(b"T") {
                            // Handle both String and HexString formats potentially used for /T
                            let title_str = match title_obj {
                                Object::String(bytes, _format) => {
                                    String::from_utf8_lossy(bytes).into_owned()
                                }
                                _ => continue, // Skip if /T is not a string type
                            };

                            if title_str == label {
                                return Ok(Some((annot_id, page_num)));
                            }
                        }
                    }
                    Ok(_) => {
                        /* log::warn!("Annotation object {:?} is not a dictionary.", annot_id); */
                        continue;
                    }
                    Err(_) => {
                        /* Propagate or log error? For now, skip unresolvable annotation objects */
                        continue;
                    }
                }
            }
        }
    }
    Ok(None) // Not found after checking all pages
}

/// Helper to get an annotation's dictionary. Clones the dictionary for ownership.
pub fn get_annotation_dict(doc: &Document, obj_id: ObjectId) -> Result<Dictionary, Error> {
    doc.get_object(obj_id)
        .map_err(Error::Pdf)?
        .as_dict()
        .cloned() // Clone to return an owned Dictionary
        .map_err(|_| Error::Processing(format!("Object {:?} is not a dictionary", obj_id)))
}

// Note: Getting a mutable dictionary directly can be tricky with lopdf's borrowing.
// It's often safer to get an owned dictionary, modify it, and then update the object.
// We might skip get_annotation_dict_mut for now unless strictly needed later.

/// Extracts the /T (Title/Label) field value from an annotation dictionary.
pub fn get_annotation_label(dict: &Dictionary) -> Option<String> {
    dict.get(b"T").ok().and_then(|obj| match obj {
        Object::String(bytes, _) => Some(String::from_utf8_lossy(bytes).into_owned()),
        _ => None,
    })
}

/// Sets the /T (Title/Label) field value in an annotation dictionary.
pub fn set_annotation_label(dict: &mut Dictionary, label: &str) {
    dict.set(
        "T",
        Object::String(label.as_bytes().to_vec(), lopdf::StringFormat::Literal),
    );
}

/// Extracts the /Contents field value from an annotation dictionary.
pub fn get_annotation_contents(dict: &Dictionary) -> Option<String> {
    dict.get(b"Contents").ok().and_then(|obj| match obj {
        Object::String(bytes, _) => Some(String::from_utf8_lossy(bytes).into_owned()),
        _ => None,
    })
}

/// Sets the /Contents field value in an annotation dictionary.
/// Also removes /RC (Rich Content) and /AP (Appearance Stream) fields to force viewers
/// to use the /Contents value along with the /DA (Default Appearance) settings.
pub fn set_annotation_contents(dict: &mut Dictionary, contents: &str) {
    // PDF Spec recommends using PDFDocEncoding or UTF-16BE for /Contents.
    // For simplicity with lopdf, Literal or Hexadecimal might work for ASCII/simple text.
    // Using Literal for now, might need adjustment if non-ASCII causes issues.
    dict.set(
        "Contents",
        Object::String(contents.as_bytes().to_vec(), lopdf::StringFormat::Literal),
    );

    // Explicitly remove Rich Content and Appearance Stream to force use of /Contents or /DA
    dict.remove(b"RC");
    dict.remove(b"AP");
}

/// Extracts the /Rect [x1, y1, x2, y2] field value from an annotation dictionary.
pub fn get_annotation_rect(dict: &Dictionary) -> Result<[f32; 4], Error> {
    let rect_obj = dict
        .get(b"Rect")
        .map_err(|_| Error::Processing("Missing /Rect field".to_string()))?;
    let rect_arr = rect_obj
        .as_array()
        .map_err(|_| Error::Processing("/Rect is not an array".to_string()))?;

    if rect_arr.len() != 4 {
        return Err(Error::Processing(format!(
            "/Rect array does not have 4 elements: {:?}",
            rect_arr
        )));
    }

    let mut rect = [0.0f32; 4];
    for (i, val) in rect_arr.iter().enumerate() {
        // Use as_float which handles both Integer and Real lopdf types
        rect[i] = val.as_float().map_err(|_| {
            Error::Processing(format!("Invalid number in /Rect at index {}: {:?}", i, val))
        })?;
    }
    Ok(rect)
}

/// Adds a reference to an existing annotation object to a page's /Annots array.
/// Creates the /Annots array if it doesn't exist. Handles direct and referenced arrays.
/// The annotation object itself MUST already be added to the document.

/// Adds a reference to an existing annotation object to a page's /Annots array.
/// Creates the /Annots array if it doesn't exist. Handles direct and referenced arrays.
/// The annotation object itself MUST already be added to the document.
pub fn add_annotation_to_page(
    doc: &mut Document,
    page_num: u32,
    annotation_ref_id: ObjectId, // ID of the annotation *dictionary* object already added to doc
) -> Result<(), Error> {
    // Find the page ID using get_pages() instead of get_page_id()
    let page_id = doc
        .get_pages()
        .get(&page_num)
        .copied()
        .ok_or_else(|| Error::Processing(format!("Page number {} not found", page_num)))?;

    // We need mutable access to the document's objects map later, so we get necessary info first.
    // Determine if Annots exists and if it's a reference or direct array.
    let annots_state = {
        let page_dict = doc
            .get_object(page_id)
            .map_err(Error::Pdf)?
            .as_dict()
            .map_err(|_| {
                Error::Processing(format!("Page object {page_id:?} is not a dictionary"))
            })?;

        match page_dict.get(b"Annots") {
            Ok(Object::Array(arr)) => Ok(Some((None, arr.clone()))), // Direct array
            Ok(Object::Reference(ref_id)) => Ok(Some((Some(*ref_id), vec![]))), // Will resolve later
            Ok(_) => Err(Error::Processing(format!(
                "Page {page_num} /Annots field is not an Array or Reference"
            ))),
            Err(_) => Ok(None), // No /Annots entry exists
        }
    }?; // Propagate potential error from the match

    let annotation_ref = Object::Reference(annotation_ref_id);

    match annots_state {
        // Case 1: Direct array found in page dictionary
        Some((None, mut direct_arr)) => {
            direct_arr.push(annotation_ref);
            // Get mutable access *now* to update the page dict
            let page_dict_mut = doc.get_dictionary_mut(page_id).map_err(|_| {
                Error::Processing(format!("Failed to get mutable dict for page {page_id:?}"))
            })?;
            page_dict_mut.set("Annots", Object::Array(direct_arr));
            Ok(())
        }
        // Case 2: Reference to an array found
        Some((Some(ref_id), _)) => {
            // Try to get the referenced array mutably (might not exist in objects map yet if Cloned)
            // Safest approach: get object, clone if array, modify, update object map
            let annots_array = doc
                .get_object(ref_id)
                .map_err(Error::Pdf)?
                .as_array()
                .cloned() // Clone the potentially existing array
                .unwrap_or_else(|_| Vec::new()); // Or start fresh if not an array

            let mut updated_arr = annots_array;
            updated_arr.push(annotation_ref);
            doc.objects.insert(ref_id, Object::Array(updated_arr)); // Update or insert the object
            Ok(())
        }
        // Case 3: No /Annots entry exists
        None => {
            // Create a new array containing just our annotation ref
            let new_annots_arr = vec![annotation_ref];
            // Add this new array as a new object to the document
            let new_arr_id = doc.add_object(Object::Array(new_annots_arr));
            // Get mutable access to the page dict to add the reference
            let page_dict_mut = doc.get_dictionary_mut(page_id).map_err(|_| {
                Error::Processing(format!("Failed to get mutable dict for page {page_id:?}"))
            })?;
            page_dict_mut.set("Annots", Object::Reference(new_arr_id));
            Ok(())
        }
    }
}

/// Extracts a Color property from a dictionary, using the specified key (usually /C or /IC).
/// Returns None if the key doesn't exist or isn't a valid color array.
fn extract_color_property(dict: &Dictionary, key: &[u8]) -> Option<Color> {
    dict.get(key).ok().and_then(|obj| {
        match obj {
            Object::Array(arr) => {
                // Color arrays should have 1, 3, or 4 components (Gray, RGB, or CMYK)
                // For this implementation, we'll handle RGB (3 components)
                if arr.len() == 3 {
                    // Try to get all 3 components as floats
                    let r = arr.get(0).and_then(|o| o.as_float().ok())?;
                    let g = arr.get(1).and_then(|o| o.as_float().ok())?;
                    let b = arr.get(2).and_then(|o| o.as_float().ok())?;

                    // Return a new Color with these values
                    Some(Color { r, g, b })
                } else {
                    // If it's not RGB, just return None for simplicity
                    // In a more complete implementation, we'd handle grayscale and CMYK too
                    None
                }
            }
            _ => None, // Not an array
        }
    })
}

/// Extracts a BorderStyle from a dictionary, either from the /BS entry (preferred)
/// or from the legacy /Border entry.
/// Returns None if neither entry exists or is valid.
fn extract_border_style_property(dict: &Dictionary) -> Option<BorderStyle> {
    // First try to get it from the /BS dictionary
    if let Ok(bs_obj) = dict.get(b"BS") {
        if let Ok(bs_dict) = bs_obj.as_dict() {
            // The width is in the /W entry
            if let Ok(w_obj) = bs_dict.get(b"W") {
                if let Ok(width) = w_obj.as_float() {
                    return Some(BorderStyle { width });
                }
            }
        }
    }

    // If that didn't work, try to get it from the legacy /Border array
    if let Ok(border_obj) = dict.get(b"Border") {
        if let Ok(border_arr) = border_obj.as_array() {
            // The width is the third element (index 2) in the array
            if border_arr.len() >= 3 {
                if let Some(w_obj) = border_arr.get(2) {
                    if let Ok(width) = w_obj.as_float() {
                        return Some(BorderStyle { width });
                    }
                }
            }
        }
    }

    // If we got here, we couldn't find a valid border style
    None
}

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
            let subtype = dict.get(b"Subtype").ok().and_then(|o| {
                o.as_name()
                    .ok()
                    .map(|bytes| String::from_utf8_lossy(bytes).into_owned())
            });
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
