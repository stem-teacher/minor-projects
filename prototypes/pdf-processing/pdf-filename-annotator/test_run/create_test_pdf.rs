use lopdf::{Document, Object, dictionary};
use std::path::Path;

fn create_test_pdf(path: &Path) -> Result<(), lopdf::Error> {
    let mut doc = Document::with_version("1.5");
    
    // Create a page
    let page_id = doc.add_object(dictionary! {
        "Type" => Object::Name(b"Page".to_vec()),
        "MediaBox" => Object::Array(vec![
            Object::Integer(0),
            Object::Integer(0),
            Object::Integer(612),
            Object::Integer(792)
        ]),
        "Resources" => Object::Dictionary(dictionary! {})
    });
    
    // Create page tree
    let pages_id = doc.add_object(dictionary! {
        "Type" => Object::Name(b"Pages".to_vec()),
        "Kids" => Object::Array(vec![Object::Reference(page_id)]),
        "Count" => Object::Integer(1)
    });
    
    // Update page to point to its parent
    if let Ok(page) = doc.get_dictionary_mut(page_id) {
        page.set("Parent", Object::Reference(pages_id));
    }
    
    // Set the catalog
    let catalog_id = doc.add_object(dictionary! {
        "Type" => Object::Name(b"Catalog".to_vec()),
        "Pages" => Object::Reference(pages_id)
    });
    
    doc.trailer.set("Root", Object::Reference(catalog_id));
    
    // Save the document
    doc.save(path)?;
    
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let output_path = Path::new("/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator/test_run/input/sample.pdf");
    create_test_pdf(output_path)?;
    println!("Created test PDF at {}", output_path.display());
    Ok(())
}