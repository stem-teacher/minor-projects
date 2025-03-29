//! PDF utility functions for working with PDF documents and annotations

use lopdf::{Dictionary, Document, Object, ObjectId};
use std::collections::HashMap;
use std::io;
use std::path::Path;

/// Structure to represent a PDF annotation for the multiple-choice marking guide
#[derive(Debug, Clone)]
pub struct PdfAnnotation {
    /// Annotation type (e.g., "Square", "Circle", "FreeText")
    pub annotation_type: String,

    /// Bounding rectangle [x1, y1, x2, y2]
    pub rect: [f32; 4],

    /// Additional properties specific to the annotation type
    pub properties: HashMap<String, String>,

    /// Reference to the original appearance stream, if any
    pub appearance_ref: Option<ObjectId>,

    /// Contents of the annotation
    pub contents: Option<String>,
}

/// Extract all annotations from a template PDF file
pub fn extract_annotations_from_file(
    template_path: &Path,
    filter_types: Option<&[&str]>,
) -> io::Result<Vec<PdfAnnotation>> {
    // Load the document
    let doc = Document::load(template_path).map_err(|e| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Failed to load PDF: {}", e),
        )
    })?;

    // Get the first page
    let pages = doc.get_pages();
    if pages.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "PDF has no pages",
        ));
    }

    let first_page_id = match pages.get(&1) {
        Some(id) => id,
        None => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "Failed to get first page",
            ));
        }
    };

    let first_page = doc.get_dictionary(*first_page_id).map_err(|e| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Failed to get page dictionary: {}", e),
        )
    })?;

    // Check if the page has annotations
    let annotations = match first_page.get(b"Annots") {
        Ok(Object::Array(annots)) => annots.clone(),
        Ok(Object::Reference(ref_id)) => {
            // Try to resolve the reference to get the array
            match doc.get_object(*ref_id) {
                Ok(Object::Array(annots)) => annots.clone(),
                Ok(other) => {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        format!("Reference resolved to unexpected type: {:?}", other),
                    ));
                }
                Err(e) => {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        format!("Failed to resolve annotation reference: {}", e),
                    ));
                }
            }
        }
        Ok(other) => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("Annotations found but in unexpected format: {:?}", other),
            ));
        }
        Err(_) => {
            return Ok(Vec::new()); // No annotations found
        }
    };

    let mut extracted_annotations = Vec::new();

    // Process each annotation
    for annot_ref in annotations {
        match annot_ref {
            Object::Reference(id) => {
                // Get the annotation dictionary
                match doc.get_object(id) {
                    Ok(Object::Dictionary(dict)) => {
                        // Process the annotation dictionary
                        if let Some(annotation) = extract_annotation_data(&dict, Some(id)) {
                            // If filter_types is provided, only include annotations of those types
                            if let Some(types) = filter_types {
                                if types.contains(&annotation.annotation_type.as_str()) {
                                    extracted_annotations.push(annotation);
                                }
                            } else {
                                extracted_annotations.push(annotation);
                            }
                        }
                    }
                    _ => {}
                }
            }
            Object::Dictionary(dict) => {
                if let Some(annotation) = extract_annotation_data(&dict, None) {
                    // If filter_types is provided, only include annotations of those types
                    if let Some(types) = filter_types {
                        if types.contains(&annotation.annotation_type.as_str()) {
                            extracted_annotations.push(annotation);
                        }
                    } else {
                        extracted_annotations.push(annotation);
                    }
                }
            }
            _ => {}
        }
    }

    Ok(extracted_annotations)
}

/// Extract data from an annotation dictionary
fn extract_annotation_data(dict: &Dictionary, id: Option<ObjectId>) -> Option<PdfAnnotation> {
    // Get annotation type
    let annot_type = match dict.get(b"Subtype") {
        Ok(Object::Name(name)) => String::from_utf8_lossy(name).to_string(),
        _ => return None, // Skip annotations without a valid type
    };

    // Get rect - required for all annotations
    let rect = match dict.get(b"Rect") {
        Ok(Object::Array(array)) if array.len() == 4 => {
            let mut coords = [0.0; 4];
            for (i, val) in array.iter().enumerate() {
                match val {
                    Object::Real(num) => coords[i] = *num,
                    Object::Integer(num) => coords[i] = *num as f32,
                    _ => {}
                }
            }
            coords
        }
        _ => return None, // Skip annotations without a valid rect
    };

    // Extract common annotation properties
    let mut properties = HashMap::new();

    // Store annotation ID if available
    if let Some(object_id) = id {
        properties.insert("object_id".to_string(), format!("{:?}", object_id));
    }

    // Color
    if let Ok(Object::Array(color)) = dict.get(b"C") {
        let color_values: Vec<f32> = color
            .iter()
            .filter_map(|v| match v {
                Object::Real(num) => Some(*num),
                Object::Integer(num) => Some(*num as f32),
                _ => None,
            })
            .collect();
        properties.insert("color".to_string(), format!("{:?}", color_values));
    }

    // Border style
    if let Ok(Object::Array(border)) = dict.get(b"Border") {
        properties.insert("border".to_string(), format!("{:?}", border));
    }

    // Border style dictionary
    if let Ok(Object::Dictionary(bs)) = dict.get(b"BS") {
        properties.insert("border_style".to_string(), "present".to_string());

        // Width
        if let Ok(Object::Real(w)) = bs.get(b"W") {
            properties.insert("border_width".to_string(), w.to_string());
        } else if let Ok(Object::Integer(w)) = bs.get(b"W") {
            properties.insert("border_width".to_string(), w.to_string());
        }

        // Style
        if let Ok(Object::Name(s)) = bs.get(b"S") {
            let style = String::from_utf8_lossy(s).to_string();
            properties.insert("border_style_type".to_string(), style);
        }
    }

    // Flag - check if it has the Print flag set (bit position 2)
    if let Ok(Object::Integer(flags)) = dict.get(b"F") {
        let print_flag = (*flags & 4) != 0;
        properties.insert("print_flag".to_string(), print_flag.to_string());
    }

    // Author (T)
    if let Ok(Object::String(author, _)) = dict.get(b"T") {
        properties.insert(
            "author".to_string(),
            String::from_utf8_lossy(author).to_string(),
        );
    }

    // Modified date (M)
    if let Ok(Object::String(date, _)) = dict.get(b"M") {
        properties.insert(
            "modified_date".to_string(),
            String::from_utf8_lossy(date).to_string(),
        );
    }

    // Contents (text or comment)
    let contents = if let Ok(Object::String(text, _)) = dict.get(b"Contents") {
        Some(String::from_utf8_lossy(text).to_string())
    } else {
        None
    };

    // Appearance dictionary and reference to normal appearance stream
    let mut appearance_ref = None;
    if let Ok(Object::Dictionary(ap)) = dict.get(b"AP") {
        properties.insert("has_appearance".to_string(), "true".to_string());

        // Normal appearance
        if let Ok(Object::Reference(normal_ref)) = ap.get(b"N") {
            properties.insert(
                "normal_appearance_ref".to_string(),
                format!("{:?}", normal_ref),
            );
            appearance_ref = Some(*normal_ref);
        }
    }

    // Get annotation-specific properties based on type
    match annot_type.as_str() {
        "Square" | "Circle" => {
            // Fill color
            if let Ok(Object::Array(fill)) = dict.get(b"IC") {
                let fill_values: Vec<f32> = fill
                    .iter()
                    .filter_map(|v| match v {
                        Object::Real(num) => Some(*num),
                        Object::Integer(num) => Some(*num as f32),
                        _ => None,
                    })
                    .collect();
                properties.insert("fill_color".to_string(), format!("{:?}", fill_values));
            }
        }
        "FreeText" => {
            // Appearance string for text formatting
            if let Ok(Object::String(da, _)) = dict.get(b"DA") {
                properties.insert(
                    "da_string".to_string(),
                    String::from_utf8_lossy(da).to_string(),
                );
            }

            // Default appearance state
            if let Ok(Object::Integer(q)) = dict.get(b"Q") {
                properties.insert("text_alignment".to_string(), q.to_string());
            }
        }
        _ => {}
    }

    // Create annotation object
    let annotation = PdfAnnotation {
        annotation_type: annot_type,
        rect,
        properties,
        appearance_ref,
        contents,
    };

    Some(annotation)
}

/// Apply annotations to a target PDF
pub fn apply_annotations_to_file(
    input_path: &Path,
    output_path: &Path,
    annotations: &[PdfAnnotation],
    copy_appearance_streams: bool,
) -> io::Result<()> {
    // Load the input document
    let mut doc = Document::load(input_path).map_err(|e| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Failed to load input PDF: {}", e),
        )
    })?;

    // Get the first page
    let pages = doc.get_pages();
    if pages.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "PDF has no pages",
        ));
    }

    let first_page_id = match pages.get(&1) {
        Some(id) => id,
        None => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "Failed to get first page",
            ));
        }
    };

    // Get the existing annotations array or create a new one
    let mut annots_array = match doc
        .get_dictionary(*first_page_id)
        .and_then(|dict| dict.get(b"Annots"))
    {
        Ok(Object::Array(array)) => array.clone(),
        Ok(Object::Reference(id)) => match doc.get_object(*id) {
            Ok(Object::Array(array)) => array.clone(),
            _ => Vec::new(),
        },
        _ => Vec::new(),
    };

    // Apply each annotation to the document
    for annotation in annotations {
        let annot_obj = create_annotation_object(&mut doc, annotation, copy_appearance_streams)?;
        annots_array.push(annot_obj);
    }

    // Update the page's annotations array
    let mut first_page_dict = doc
        .get_dictionary(*first_page_id)
        .map_err(|e| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("Failed to get page dictionary: {}", e),
            )
        })?
        .clone();

    first_page_dict.set(b"Annots", Object::Array(annots_array));

    // Update the page in the document
    doc.objects
        .insert(*first_page_id, Object::Dictionary(first_page_dict));

    // Save the modified document
    doc.save(output_path)?;
    Ok(())
}

/// Create annotation object from PdfAnnotation structure
fn create_annotation_object(
    doc: &mut Document,
    annotation: &PdfAnnotation,
    copy_appearance_streams: bool,
) -> io::Result<Object> {
    // Create a new annotation dictionary
    let mut dict = Dictionary::new();

    // Set standard annotation properties
    dict.set(b"Type", Object::Name(b"Annot".to_vec()));
    dict.set(
        b"Subtype",
        Object::Name(annotation.annotation_type.as_bytes().to_vec()),
    );

    // Set rectangle coordinates
    let rect = Object::Array(vec![
        Object::Real(annotation.rect[0]),
        Object::Real(annotation.rect[1]),
        Object::Real(annotation.rect[2]),
        Object::Real(annotation.rect[3]),
    ]);
    dict.set(b"Rect", rect);

    // Flag to make annotation appear in print
    if let Some(print_flag) = annotation.properties.get("print_flag") {
        if print_flag == "true" {
            dict.set(b"F", Object::Integer(4));
        } else {
            dict.set(b"F", Object::Integer(0));
        }
    } else {
        dict.set(b"F", Object::Integer(4)); // Default to visible in print
    }

    // Set border array if present
    if let Some(border_str) = annotation.properties.get("border") {
        // Parse the border string
        if border_str.starts_with('[') && border_str.ends_with(']') {
            let values: Vec<&str> = border_str
                .trim_start_matches('[')
                .trim_end_matches(']')
                .split(',')
                .map(|s| s.trim())
                .collect();

            if values.len() >= 3 {
                let mut border_array = Vec::new();
                for val in values {
                    if let Ok(num) = val.parse::<f32>() {
                        border_array.push(Object::Real(num));
                    } else {
                        border_array.push(Object::Integer(0));
                    }
                }
                dict.set(b"Border", Object::Array(border_array));
            }
        }
    }

    // Set border style if present
    if annotation.properties.contains_key("border_style") {
        let mut bs_dict = Dictionary::new();

        // Set border width
        if let Some(width_str) = annotation.properties.get("border_width") {
            if let Ok(width) = width_str.parse::<f32>() {
                bs_dict.set(b"W", Object::Real(width));
            }
        }

        // Set border style type
        if let Some(style) = annotation.properties.get("border_style_type") {
            bs_dict.set(b"S", Object::Name(style.as_bytes().to_vec()));
        } else {
            bs_dict.set(b"S", Object::Name(b"S".to_vec())); // Default to Solid
        }

        dict.set(b"BS", Object::Dictionary(bs_dict));
    }

    // Set author if present
    if let Some(author) = annotation.properties.get("author") {
        dict.set(
            b"T",
            Object::String(author.as_bytes().to_vec(), lopdf::StringFormat::Literal),
        );
    }

    // Set modified date if present
    if let Some(date) = annotation.properties.get("modified_date") {
        dict.set(
            b"M",
            Object::String(date.as_bytes().to_vec(), lopdf::StringFormat::Literal),
        );
    }

    // Set contents if present
    if let Some(contents) = &annotation.contents {
        dict.set(
            b"Contents",
            Object::String(contents.as_bytes().to_vec(), lopdf::StringFormat::Literal),
        );
    }

    // Set color if present
    if let Some(color_str) = annotation.properties.get("color") {
        // Parse the color array string
        if color_str.starts_with('[') && color_str.ends_with(']') {
            let values: Vec<&str> = color_str
                .trim_start_matches('[')
                .trim_end_matches(']')
                .split(',')
                .map(|s| s.trim())
                .collect();

            let mut color_array = Vec::new();
            for val in values {
                if let Ok(num) = val.parse::<f32>() {
                    color_array.push(Object::Real(num));
                }
            }

            if !color_array.is_empty() {
                dict.set(b"C", Object::Array(color_array));
            }
        }
    }

    // Handle annotation-specific properties
    match annotation.annotation_type.as_str() {
        "Square" | "Circle" => {
            // Set fill color if present
            if let Some(fill_color_str) = annotation.properties.get("fill_color") {
                // Parse the fill color array string
                if fill_color_str.starts_with('[') && fill_color_str.ends_with(']') {
                    let values: Vec<&str> = fill_color_str
                        .trim_start_matches('[')
                        .trim_end_matches(']')
                        .split(',')
                        .map(|s| s.trim())
                        .collect();

                    let mut fill_array = Vec::new();
                    for val in values {
                        if let Ok(num) = val.parse::<f32>() {
                            fill_array.push(Object::Real(num));
                        }
                    }

                    if !fill_array.is_empty() {
                        dict.set(b"IC", Object::Array(fill_array));
                    }
                }
            }
        }
        "FreeText" => {
            // Set DA string if present
            if let Some(da_string) = annotation.properties.get("da_string") {
                dict.set(
                    b"DA",
                    Object::String(da_string.as_bytes().to_vec(), lopdf::StringFormat::Literal),
                );
            }

            // Set text alignment if present
            if let Some(alignment) = annotation.properties.get("text_alignment") {
                if let Ok(q) = alignment.parse::<i64>() {
                    dict.set(b"Q", Object::Integer(q));
                }
            }
        }
        _ => {}
    }

    // Handle appearance streams if requested
    if copy_appearance_streams && annotation.appearance_ref.is_some() {
        // To be implemented - complex logic to copy and transform appearance streams
        // For now, we'll skip this and rely on the PDF viewer to generate appearances
    }

    // Add the annotation dictionary to the document and return a reference
    let id = doc.add_object(Object::Dictionary(dict));
    Ok(Object::Reference(id))
}
