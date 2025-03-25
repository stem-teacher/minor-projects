use clap::Parser;
use lopdf::{content::Content, dictionary, Document, Object, Stream, StringFormat};
use std::path::{Path, PathBuf};

/// Create a test PDF file with multiple pages
#[derive(Parser, Debug)]
struct Args {
    /// Output path for the test PDF
    #[arg(short, long, default_value = "test_run/input/sample.pdf")]
    output: PathBuf,

    /// Number of pages to create
    #[arg(short, long, default_value = "1")]
    pages: u32,

    /// Add content to pages
    #[arg(short, long)]
    with_content: bool,
}

fn create_test_pdf(path: &Path, num_pages: u32, add_content: bool) -> Result<(), lopdf::Error> {
    let mut doc = Document::with_version("1.5");

    // Create pages and collect their IDs
    let mut page_ids = Vec::with_capacity(num_pages as usize);

    for i in 0..num_pages {
        // Create a content stream for this page if requested
        let content_id = if add_content {
            // Create some simple content for the page
            let operations = vec![
                // Begin text
                lopdf::content::Operation::new("BT", vec![]),
                // Set font
                lopdf::content::Operation::new(
                    "Tf",
                    vec![Object::Name(b"Helvetica".to_vec()), Object::Real(24.0)],
                ),
                // Position text
                lopdf::content::Operation::new(
                    "Td",
                    vec![Object::Real(100.0), Object::Real(500.0)],
                ),
                // Show text
                lopdf::content::Operation::new(
                    "Tj",
                    vec![Object::String(
                        format!("Page {}", i + 1).as_bytes().to_vec(),
                        StringFormat::Literal,
                    )],
                ),
                // End text
                lopdf::content::Operation::new("ET", vec![]),
            ];

            // Convert operations to content stream
            let content = Content { operations };
            let content_bytes = content.encode()?;
            let content_stream = Stream::new(dictionary! {}, content_bytes);

            // Add the content stream to the document
            Some(doc.add_object(Object::Stream(content_stream)))
        } else {
            None
        };

        // Create page dictionary
        let mut page_dict = dictionary! {
            "Type" => Object::Name(b"Page".to_vec()),
            "MediaBox" => Object::Array(vec![
                Object::Integer(0),
                Object::Integer(0),
                Object::Integer(612),
                Object::Integer(792)
            ]),
            "Resources" => Object::Dictionary(dictionary! {
                "Font" => Object::Dictionary(dictionary! {
                    "Helvetica" => Object::Dictionary(dictionary! {
                        "Type" => Object::Name(b"Font".to_vec()),
                        "Subtype" => Object::Name(b"Type1".to_vec()),
                        "BaseFont" => Object::Name(b"Helvetica".to_vec())
                    })
                })
            })
        };

        // Add content if we created it
        if let Some(content_ref) = content_id {
            page_dict.set("Contents", Object::Reference(content_ref));
        }

        // Add the page to the document
        let page_id = doc.add_object(Object::Dictionary(page_dict));
        page_ids.push(page_id);
    }

    // Create page tree with all the pages
    let kids = page_ids.iter().map(|id| Object::Reference(*id)).collect();

    let pages_id = doc.add_object(dictionary! {
        "Type" => Object::Name(b"Pages".to_vec()),
        "Kids" => Object::Array(kids),
        "Count" => Object::Integer(num_pages as i64)
    });

    // Update all pages to point to their parent
    for page_id in &page_ids {
        if let Ok(page) = doc.get_dictionary_mut(*page_id) {
            page.set("Parent", Object::Reference(pages_id));
        }
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
    let args = Args::parse();

    create_test_pdf(&args.output, args.pages, args.with_content)?;
    println!("Created test PDF at {}", args.output.display());

    Ok(())
}
