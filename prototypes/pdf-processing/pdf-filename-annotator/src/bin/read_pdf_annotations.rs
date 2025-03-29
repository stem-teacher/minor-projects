use lopdf::{Dictionary, Document, Object};
use std::collections::HashMap;
use std::path::Path;

// A simple main function with no dependencies on the rest of the crate
fn main() {
    // Path to the sample PDF
    let template_path = Path::new("requirements/after-marking.pdf");

    println!("Reading annotations from: {}", template_path.display());

    // Extract annotations from the template
    match extract_annotations(template_path) {
        Ok(annotations) => {
            println!("Found {} annotations in the template", annotations.len());

            // Print details of each annotation
            for (i, annotation) in annotations.iter().enumerate() {
                println!("\nAnnotation #{}", i + 1);
                println!("  Type: {}", annotation.annotation_type);
                println!(
                    "  Rect: [{:.2}, {:.2}, {:.2}, {:.2}]",
                    annotation.rect[0], annotation.rect[1], annotation.rect[2], annotation.rect[3]
                );

                if let Some(content) = &annotation.contents {
                    println!("  Contents: {}", content);
                }

                println!("  Properties:");
                for (key, value) in &annotation.properties {
                    println!("    {}: {}", key, value);
                }
            }
        }
        Err(e) => {
            eprintln!("Error reading annotations: {}", e);
        }
    }
}

/// Structure to hold annotation data
#[derive(Debug, Clone)]
struct PdfAnnotation {
    annotation_type: String,
    rect: [f32; 4], // Using f32 to match lopdf's Real type
    properties: HashMap<String, String>,
    contents: Option<String>,
}

/// Extract annotations from a PDF file
fn extract_annotations(template_path: &Path) -> Result<Vec<PdfAnnotation>, lopdf::Error> {
    // Load the document
    let doc = Document::load(template_path)?;

    println!("PDF version: {}", doc.version);
    println!("Number of pages: {}", doc.get_pages().len());

    // Get the first page
    let pages = doc.get_pages();
    if pages.is_empty() {
        return Err(lopdf::Error::from(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Template PDF has no pages",
        )));
    }

    let first_page_id = match pages.get(&1) {
        Some(id) => id,
        None => {
            return Err(lopdf::Error::from(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Failed to get first page",
            )));
        }
    };

    let first_page = doc.get_dictionary(*first_page_id)?;

    // Check if the page has annotations
    let annotations = match first_page.get(b"Annots") {
        Ok(Object::Array(annots)) => annots,
        Ok(_) => {
            return Err(lopdf::Error::from(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Annotations not in expected format",
            )));
        }
        Err(_) => {
            println!("No annotations found on the first page");
            return Ok(Vec::new());
        }
    };

    println!("Found {} annotation references", annotations.len());

    let mut extracted_annotations = Vec::new();

    // Process each annotation
    for (index, annot_ref) in annotations.iter().enumerate() {
        match annot_ref {
            Object::Reference(id) => {
                println!(
                    "Processing annotation #{} (Reference ID: {:?})",
                    index + 1,
                    id
                );

                // Get the annotation dictionary
                match doc.get_object(*id) {
                    Ok(Object::Dictionary(dict)) => {
                        // Process the annotation dictionary
                        if let Some(annotation) = extract_annotation_data(&dict) {
                            extracted_annotations.push(annotation);
                        }
                    }
                    Ok(other) => {
                        println!("  Warning: Expected dictionary, got {:?}", other);
                    }
                    Err(e) => {
                        println!("  Error getting annotation object: {:?}", e);
                    }
                }
            }
            Object::Dictionary(dict) => {
                println!("Processing annotation #{} (Inline Dictionary)", index + 1);
                if let Some(annotation) = extract_annotation_data(dict) {
                    extracted_annotations.push(annotation);
                }
            }
            _ => {
                println!("  Unexpected annotation reference type: {:?}", annot_ref);
            }
        }
    }

    Ok(extracted_annotations)
}

/// Extract data from an annotation dictionary
fn extract_annotation_data(dict: &Dictionary) -> Option<PdfAnnotation> {
    // Get annotation type
    let annot_type = match dict.get(b"Subtype") {
        Ok(Object::Name(name)) => {
            let type_name = String::from_utf8_lossy(name).to_string();
            println!("  Annotation type: {}", type_name);
            type_name
        }
        Ok(other) => {
            println!("  Warning: Expected name for Subtype, got {:?}", other);
            return None;
        }
        Err(e) => {
            println!("  Error getting annotation Subtype: {:?}", e);
            return None;
        }
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
            println!("  Rect: {:?}", coords);
            coords
        }
        Ok(other) => {
            println!("  Warning: Expected array for Rect, got {:?}", other);
            return None;
        }
        Err(e) => {
            println!("  Error getting annotation Rect: {:?}", e);
            return None;
        }
    };

    // Extract common annotation properties
    let mut properties = HashMap::new();

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
        println!("  Color: {:?}", color_values);
        properties.insert("color".to_string(), format!("{:?}", color_values));
    }

    // Border style
    if let Ok(Object::Array(border)) = dict.get(b"Border") {
        println!("  Border: {:?}", border);
        properties.insert("border".to_string(), format!("{:?}", border));
    }

    // Border style dictionary
    if let Ok(Object::Dictionary(bs)) = dict.get(b"BS") {
        println!("  BorderStyle dictionary present");
        properties.insert("border_style".to_string(), "present".to_string());

        // Width
        if let Ok(Object::Real(w)) = bs.get(b"W") {
            println!("    Width: {}", w);
            properties.insert("border_width".to_string(), w.to_string());
        } else if let Ok(Object::Integer(w)) = bs.get(b"W") {
            println!("    Width: {}", w);
            properties.insert("border_width".to_string(), w.to_string());
        }

        // Style
        if let Ok(Object::Name(s)) = bs.get(b"S") {
            let style = String::from_utf8_lossy(s).to_string();
            println!("    Style: {}", style);
            properties.insert("border_style_type".to_string(), style);
        }
    }

    // Appearance dictionary
    if let Ok(Object::Dictionary(ap)) = dict.get(b"AP") {
        println!("  Appearance dictionary present");
        properties.insert("has_appearance".to_string(), "true".to_string());

        // Normal appearance
        if let Ok(appearance_ref) = ap.get(b"N") {
            println!("    Normal appearance: {:?}", appearance_ref);
            properties.insert(
                "normal_appearance".to_string(),
                format!("{:?}", appearance_ref),
            );
        }
    }

    // Flag - check if it has the Print flag set (bit position 2)
    if let Ok(Object::Integer(flags)) = dict.get(b"F") {
        let print_flag = (*flags & 4) != 0;
        println!("  Print flag: {}", print_flag);
        properties.insert("print_flag".to_string(), print_flag.to_string());
    }

    // Contents (text or comment)
    let contents = if let Ok(Object::String(text, _)) = dict.get(b"Contents") {
        let content_text = String::from_utf8_lossy(text).to_string();
        println!("  Contents: {}", content_text);
        Some(content_text)
    } else {
        None
    };

    // Get annotation-specific properties based on type
    match annot_type.as_str() {
        "Circle" | "Square" => {
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
                println!("  Fill color: {:?}", fill_values);
                properties.insert("fill_color".to_string(), format!("{:?}", fill_values));
            }
        }
        "Highlight" => {
            // QuadPoints for text highlighting
            if let Ok(Object::Array(points)) = dict.get(b"QuadPoints") {
                println!("  QuadPoints: {:?}", points);
                properties.insert("quad_points".to_string(), format!("{:?}", points));
            }
        }
        "FreeText" => {
            // Appearance string for text formatting
            if let Ok(Object::String(da, _)) = dict.get(b"DA") {
                let da_string = String::from_utf8_lossy(da).to_string();
                println!("  DA string: {}", da_string);
                properties.insert("da_string".to_string(), da_string);
            }

            // Default appearance state
            if let Ok(Object::String(q, _)) = dict.get(b"Q") {
                let q_string = String::from_utf8_lossy(q).to_string();
                println!("  Q value: {}", q_string);
                properties.insert("text_alignment".to_string(), q_string);
            }
        }
        _ => {
            // Print all keys for unknown annotation types
            println!("  Keys for {} annotation:", annot_type);
            for (key, _) in dict.iter() {
                println!("    Key: {}", String::from_utf8_lossy(key));
            }
        }
    }

    // Check for additional annotation properties
    for key in [
        b"T" as &[u8],
        b"P",
        b"M",
        b"CA",
        b"RC",
        b"OC",
        b"StructParent",
    ] {
        if let Ok(value) = dict.get(key) {
            let key_name = String::from_utf8_lossy(key).to_string();
            println!("  {}: {:?}", key_name, value);
            properties.insert(key_name, format!("{:?}", value));
        }
    }

    // Create annotation object
    let annotation = PdfAnnotation {
        annotation_type: annot_type,
        rect,
        properties,
        contents,
    };

    Some(annotation)
}
