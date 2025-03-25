//! Verified pattern for PDF text annotation
//!
//! This pattern demonstrates how to add text annotations to PDF pages
//! at specific positions.

use lopdf::{self, content::{Content, Operation}, Document, Object, Stream};
use std::path::Path;

/// Add text annotation to a PDF page
///
/// # Arguments
///
/// * `doc` - PDF document to modify
/// * `page_id` - ID of the page to annotate
/// * `text` - Text to add to the page
/// * `x` - X coordinate in PDF points
/// * `y` - Y coordinate in PDF points
/// * `font_size` - Font size in points
///
/// # Returns
///
/// Result indicating success or error
///
/// # Example
///
/// ```
/// use lopdf::{Document, ObjectId};
/// use pdf_text_annotation::add_text_to_page;
///
/// let mut doc = Document::load("input.pdf").unwrap();
/// let pages = doc.get_pages();
/// let (page_id, _) = pages.iter().next().unwrap();
///
/// add_text_to_page(&mut doc, *page_id, "Hello, World!", 100.0, 100.0, 12.0).unwrap();
/// doc.save("output.pdf").unwrap();
/// ```
pub fn add_text_to_page(
    doc: &mut Document,
    page_id: lopdf::ObjectId,
    text: &str,
    x: f32,
    y: f32,
    font_size: f32,
) -> Result<(), lopdf::Error> {
    // Get the page dictionary
    let page_dict = doc.get_dictionary(page_id)?;
    
    // Get the content stream(s) for the page
    let contents_id = match page_dict.get(b"Contents") {
        Ok(contents) => match contents {
            &Object::Reference(id) => id,
            &Object::Array(ref arr) => {
                // If there are multiple content streams, use the first one
                // In a real implementation, you would need to handle this more robustly
                if let Some(Object::Reference(id)) = arr.first() {
                    *id
                } else {
                    return Err(lopdf::Error::ObjectNotFound);
                }
            }
            _ => return Err(lopdf::Error::ObjectNotFound),
        },
        Err(_) => {
            // Create a new content stream if one doesn't exist
            let content_id = doc.new_object_id();
            doc.objects.insert(
                content_id,
                Object::Stream(Stream::new(
                    lopdf::Dictionary::new(), 
                    vec![]
                ))
            );
            
            // Add the content stream to the page
            let mut page_dict = doc.get_dictionary_mut(page_id).unwrap();
            page_dict.set("Contents", Object::Reference(content_id));
            
            content_id
        }
    };
    
    // Get the content stream
    let content_stream = doc.get_object(contents_id)?;
    
    // Get the stream data
    let stream_data = match content_stream {
        Object::Stream(ref stream) => stream.clone(),
        _ => return Err(lopdf::Error::ObjectNotFound),
    };
    
    // Parse the content stream
    let content = Content::decode(&stream_data)?;
    
    // Create new operations for adding the text
    let mut operations = content.operations;
    
    // Save graphics state
    operations.push(Operation::new("q", vec![]));
    
    // Set font
    let font_name = "F0"; // Arbitrary name
    operations.push(Operation::new(
        "BT",
        vec![],
    ));
    operations.push(Operation::new(
        "Tf",
        vec![
            Object::Name(font_name.as_bytes().to_vec()),
            Object::Real(font_size),
        ],
    ));
    
    // Set text position
    operations.push(Operation::new(
        "Td",
        vec![Object::Real(x), Object::Real(y)],
    ));
    
    // Add text
    operations.push(Operation::new(
        "Tj",
        vec![Object::String(text.as_bytes().to_vec(), lopdf::StringFormat::Literal)],
    ));
    
    // End text object
    operations.push(Operation::new("ET", vec![]));
    
    // Restore graphics state
    operations.push(Operation::new("Q", vec![]));
    
    // Encode the modified content
    let modified_content = Content { operations };
    let encoded_content = modified_content.encode()?;
    
    // Update the stream in the document
    doc.objects.insert(
        contents_id,
        Object::Stream(Stream::new(
            stream_data.dict.clone(),
            encoded_content,
        )),
    );
    
    // Ensure font resource exists in page
    ensure_font_resource(doc, page_id, font_name)?;
    
    Ok(())
}

/// Ensure a font resource exists in the page resource dictionary
fn ensure_font_resource(
    doc: &mut Document,
    page_id: lopdf::ObjectId,
    font_name: &str,
) -> Result<(), lopdf::Error> {
    // Get the page dictionary
    let page_dict = doc.get_dictionary(page_id)?;
    
    // Check if the page has resources
    let resources_id = match page_dict.get(b"Resources") {
        Ok(resources) => match resources {
            &Object::Reference(id) => id,
            &Object::Dictionary(_) => {
                // Resources are inline in the page dictionary
                // Create a new object for them
                let resources_id = doc.new_object_id();
                let resources_dict = page_dict.get_dictionary(b"Resources").unwrap().clone();
                doc.objects.insert(resources_id, Object::Dictionary(resources_dict));
                
                // Update the page dictionary to reference the resources object
                let mut page_dict = doc.get_dictionary_mut(page_id).unwrap();
                page_dict.set("Resources", Object::Reference(resources_id));
                
                resources_id
            }
            _ => return Err(lopdf::Error::ObjectNotFound),
        },
        Err(_) => {
            // Create new resources if they don't exist
            let resources_id = doc.new_object_id();
            doc.objects.insert(
                resources_id,
                Object::Dictionary(lopdf::Dictionary::new()),
            );
            
            // Add the resources to the page
            let mut page_dict = doc.get_dictionary_mut(page_id).unwrap();
            page_dict.set("Resources", Object::Reference(resources_id));
            
            resources_id
        }
    };
    
    // Get the resources dictionary
    let mut resources_dict = doc.get_dictionary_mut(resources_id)?;
    
    // Check if the resources dictionary has a Font entry
    let font_dict = match resources_dict.get_mut(b"Font") {
        Ok(font_dict) => match font_dict {
            Object::Dictionary(dict) => dict,
            Object::Reference(id) => {
                doc.get_dictionary_mut(*id)?
            }
            _ => return Err(lopdf::Error::ObjectNotFound),
        },
        Err(_) => {
            // Create a new font dictionary
            let mut font_dict = lopdf::Dictionary::new();
            resources_dict.set("Font", Object::Dictionary(font_dict.clone()));
            resources_dict.get_dictionary_mut(b"Font").unwrap()
        }
    };
    
    // Add the font to the font dictionary if it doesn't exist
    if !font_dict.has(font_name.as_bytes()) {
        // Create a simple Type 1 font entry
        let mut font_entry = lopdf::Dictionary::new();
        font_entry.set("Type", Object::Name(b"Font".to_vec()));
        font_entry.set("Subtype", Object::Name(b"Type1".to_vec()));
        font_entry.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
        font_entry.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));
        
        font_dict.set(font_name, Object::Dictionary(font_entry));
    }
    
    Ok(())
}

/// Get the dimensions of a PDF page
pub fn get_page_dimensions(
    doc: &Document,
    page_id: lopdf::ObjectId,
) -> Result<(f32, f32), lopdf::Error> {
    // Get the page dictionary
    let page_dict = doc.get_dictionary(page_id)?;
    
    // Get the MediaBox (or default to letter size)
    let media_box = page_dict
        .get(b"MediaBox")
        .and_then(|obj| obj.as_array().ok())
        .map(|arr| {
            let lower_left_x = arr.get(0).and_then(|obj| obj.as_f64().ok()).unwrap_or(0.0) as f32;
            let lower_left_y = arr.get(1).and_then(|obj| obj.as_f64().ok()).unwrap_or(0.0) as f32;
            let upper_right_x = arr.get(2).and_then(|obj| obj.as_f64().ok()).unwrap_or(612.0) as f32;
            let upper_right_y = arr.get(3).and_then(|obj| obj.as_f64().ok()).unwrap_or(792.0) as f32;
            
            (upper_right_x - lower_left_x, upper_right_y - lower_left_y)
        })
        .unwrap_or((612.0, 792.0)); // Default to letter size in points
    
    Ok(media_box)
}
