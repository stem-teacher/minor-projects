//! Scanner PDF Diagnostic Utilities
//!
//! This module provides diagnostic utilities for analyzing scanner-generated PDFs.
//! It helps identify structural differences between scanner PDFs and regular PDFs,
//! which can be used to understand and fix annotation issues.

use lopdf::{self, Dictionary, Object, ObjectId};
use std::collections::HashMap;
use std::path::Path;

/// PDF diagnostic information structure
#[derive(Debug)]
pub struct PdfDiagnostic {
    /// Number of pages in the PDF
    pub page_count: usize,
    
    /// PDF version
    pub version: String,
    
    /// Page tree structure information
    pub page_tree: PageTreeInfo,
    
    /// Per-page diagnostics
    pub pages: Vec<PageDiagnostic>,
    
    /// Root catalog details
    pub catalog: DictionaryDiagnostic,
    
    /// Producer information (useful for detecting scanner software)
    pub producer: Option<String>,
    
    /// Key PDF metadata
    pub metadata: HashMap<String, String>,
}

/// Page tree structure information
#[derive(Debug)]
pub struct PageTreeInfo {
    /// Page tree structure type (flat, nested, etc.)
    pub structure: String,
    
    /// Depth of the page tree
    pub depth: usize,
    
    /// Object ID of the Pages object
    pub pages_id: Option<ObjectId>,
    
    /// Kids array structure
    pub kids_structure: String,
}

/// Diagnostic information for a single page
#[derive(Debug)]
pub struct PageDiagnostic {
    /// Page number (0-based)
    pub page_num: usize,
    
    /// Object ID of the page
    pub object_id: ObjectId,
    
    /// Page dictionary diagnostics
    pub dictionary: DictionaryDiagnostic,
    
    /// Content stream information
    pub content: ContentDiagnostic,
    
    /// Annotations present on the page
    pub annotations: Vec<AnnotationDiagnostic>,
    
    /// Resources dictionary information
    pub resources: Option<ResourcesDiagnostic>,
    
    /// MediaBox information
    pub media_box: Option<Vec<f64>>,
}

/// Dictionary information for diagnostics
#[derive(Debug)]
pub struct DictionaryDiagnostic {
    /// Dictionary keys (to detect missing required keys)
    pub keys: Vec<String>,
    
    /// Dictionary size
    pub size: usize,
    
    /// Type of the dictionary (if present)
    pub type_name: Option<String>,
    
    /// Unusual or non-standard keys
    pub unusual_keys: Vec<String>,
    
    /// Reference count (how many objects reference this dictionary)
    pub reference_count: usize,
}

/// Content stream diagnostic information
#[derive(Debug)]
pub struct ContentDiagnostic {
    /// Content type (direct, reference, array of references)
    pub content_type: String,
    
    /// Content stream length
    pub length: usize,
    
    /// Content stream format (if detectable)
    pub format: Option<String>,
    
    /// Whether content appears to be scanner-generated
    pub is_scanner_like: bool,
    
    /// Number of operations in the content stream
    pub operation_count: usize,
    
    /// Whether there are image operations
    pub has_images: bool,
    
    /// Content object IDs
    pub content_ids: Vec<ObjectId>,
}

/// Annotation diagnostic information
#[derive(Debug)]
pub struct AnnotationDiagnostic {
    /// Annotation type
    pub annotation_type: String,
    
    /// Object ID of the annotation
    pub object_id: ObjectId,
    
    /// Whether it has appearance streams
    pub has_appearance: bool,
    
    /// Annotation flags
    pub flags: Option<i64>,
    
    /// Annotation rectangle
    pub rect: Option<Vec<f64>>,
}

/// Resources diagnostic information
#[derive(Debug)]
pub struct ResourcesDiagnostic {
    /// Whether fonts are defined
    pub has_fonts: bool,
    
    /// Font names available
    pub font_names: Vec<String>,
    
    /// Whether XObjects are defined
    pub has_xobjects: bool,
    
    /// XObject names
    pub xobject_names: Vec<String>,
    
    /// Whether resources are inherited
    pub is_inherited: bool,
}

/// Analyze a PDF file and return diagnostic information
pub fn analyze_pdf(path: &Path) -> Result<PdfDiagnostic, lopdf::Error> {
    // Load the document
    let doc = lopdf::Document::load(path)?;
    
    // Get basic document info
    let version = doc.version.to_string();
    let pages = doc.get_pages();
    let page_count = pages.len();
    
    // Get producer information
    let producer = get_producer_info(&doc);
    
    // Collect metadata
    let metadata = get_metadata(&doc);
    
    // Get page tree info
    let page_tree = analyze_page_tree(&doc)?;
    
    // Get catalog info
    let catalog_id = match doc.trailer.get(b"Root") {
        Ok(Object::Reference(id)) => *id,
        _ => (0, 0),
    };
    
    let catalog = match doc.get_object(catalog_id) {
        Ok(Object::Dictionary(dict)) => analyze_dictionary(&doc, dict, catalog_id),
        _ => DictionaryDiagnostic {
            keys: vec![],
            size: 0,
            type_name: None,
            unusual_keys: vec![],
            reference_count: 0,
        },
    };
    
    // Analyze individual pages
    let mut page_diagnostics = Vec::new();
    
    for (i, (page_id, _)) in pages.iter().enumerate() {
        let page_diag = analyze_page(&doc, (*page_id, 0), i)?;
        page_diagnostics.push(page_diag);
    }
    
    Ok(PdfDiagnostic {
        page_count,
        version,
        page_tree,
        pages: page_diagnostics,
        catalog,
        producer,
        metadata,
    })
}

/// Get producer information from the document
fn get_producer_info(doc: &lopdf::Document) -> Option<String> {
    if let Ok(Object::Reference(info_id)) = doc.trailer.get(b"Info") {
        if let Ok(Object::Dictionary(info_dict)) = doc.get_object(*info_id) {
            if let Ok(Object::String(producer_bytes, _)) = info_dict.get(b"Producer") {
                return Some(String::from_utf8_lossy(producer_bytes).to_string());
            }
        }
    }
    None
}

/// Collect metadata from the document
fn get_metadata(doc: &lopdf::Document) -> HashMap<String, String> {
    let mut metadata = HashMap::new();
    
    if let Ok(Object::Reference(info_id)) = doc.trailer.get(b"Info") {
        if let Ok(Object::Dictionary(info_dict)) = doc.get_object(*info_id) {
            for (key, value) in info_dict.iter() {
                let key_str = String::from_utf8_lossy(key).to_string();
                
                if let Object::String(value_bytes, _) = value {
                    let value_str = String::from_utf8_lossy(value_bytes).to_string();
                    metadata.insert(key_str, value_str);
                }
            }
        }
    }
    
    metadata
}

/// Analyze the page tree structure
fn analyze_page_tree(doc: &lopdf::Document) -> Result<PageTreeInfo, lopdf::Error> {
    // Get catalog and pages reference
    let catalog_id = match doc.trailer.get(b"Root") {
        Ok(Object::Reference(id)) => *id,
        _ => return Err(lopdf::Error::ObjectNotFound((0, 0))),
    };
    
    let pages_id = match doc.get_dictionary(catalog_id)?.get(b"Pages") {
        Ok(Object::Reference(id)) => Some(*id),
        _ => None,
    };
    
    // If we have a pages reference, analyze its structure
    let (structure, depth, kids_structure) = if let Some(pages_id) = pages_id {
        if let Ok(Object::Dictionary(pages_dict)) = doc.get_object(pages_id) {
            // Check if it's a flat or nested structure
            let structure = if let Ok(Object::Array(kids)) = pages_dict.get(b"Kids") {
                // Check the first kid to see if it's a page or another pages object
                if let Some(Object::Reference(kid_id)) = kids.first() {
                    if let Ok(Object::Dictionary(kid_dict)) = doc.get_object(*kid_id) {
                        match kid_dict.get(b"Type") {
                            Ok(Object::Name(name)) if name == b"Page" => "flat",
                            Ok(Object::Name(name)) if name == b"Pages" => "nested",
                            _ => "unknown",
                        }
                    } else {
                        "unknown"
                    }
                } else {
                    "empty"
                }
            } else {
                "invalid"
            };
            
            // Calculate the depth of the page tree
            let depth = calculate_page_tree_depth(doc, pages_id)?;
            
            // Analyze kids structure
            let kids_structure = analyze_kids_structure(doc, pages_id)?;
            
            (structure.to_string(), depth, kids_structure)
        } else {
            ("invalid".to_string(), 0, "invalid".to_string())
        }
    } else {
        ("missing".to_string(), 0, "missing".to_string())
    };
    
    Ok(PageTreeInfo {
        structure,
        depth,
        pages_id,
        kids_structure,
    })
}

/// Calculate the depth of the page tree
fn calculate_page_tree_depth(doc: &lopdf::Document, pages_id: ObjectId) -> Result<usize, lopdf::Error> {
    fn depth_recursive(doc: &lopdf::Document, obj_id: ObjectId, current_depth: usize) -> Result<usize, lopdf::Error> {
        if let Ok(Object::Dictionary(dict)) = doc.get_object(obj_id) {
            // Check if this is a Pages object or a Page object
            if let Ok(Object::Name(name)) = dict.get(b"Type") {
                if name == b"Page" {
                    return Ok(current_depth);
                }
            }
            
            // If it's a Pages object, check its kids
            if let Ok(Object::Array(kids)) = dict.get(b"Kids") {
                let mut max_depth = current_depth;
                
                for kid in kids {
                    if let Object::Reference(kid_id) = kid {
                        let kid_depth = depth_recursive(doc, *kid_id, current_depth + 1)?;
                        max_depth = max_depth.max(kid_depth);
                    }
                }
                
                return Ok(max_depth);
            }
        }
        
        Ok(current_depth)
    }
    
    depth_recursive(doc, pages_id, 0)
}

/// Analyze the structure of the kids array
fn analyze_kids_structure(doc: &lopdf::Document, pages_id: ObjectId) -> Result<String, lopdf::Error> {
    // Get the kids array
    if let Ok(Object::Dictionary(dict)) = doc.get_object(pages_id) {
        if let Ok(Object::Array(kids)) = dict.get(b"Kids") {
            // Check if kids are all Page objects, all Pages objects, or mixed
            let mut page_count = 0;
            let mut pages_count = 0;
            let mut other_count = 0;
            
            for kid in kids {
                if let Object::Reference(kid_id) = kid {
                    if let Ok(Object::Dictionary(kid_dict)) = doc.get_object(*kid_id) {
                        match kid_dict.get(b"Type") {
                            Ok(Object::Name(name)) if name == b"Page" => page_count += 1,
                            Ok(Object::Name(name)) if name == b"Pages" => pages_count += 1,
                            _ => other_count += 1,
                        }
                    } else {
                        other_count += 1;
                    }
                } else {
                    other_count += 1;
                }
            }
            
            if page_count > 0 && pages_count == 0 && other_count == 0 {
                return Ok("all_pages".to_string());
            } else if page_count == 0 && pages_count > 0 && other_count == 0 {
                return Ok("all_page_nodes".to_string());
            } else if page_count > 0 && pages_count > 0 {
                return Ok("mixed".to_string());
            } else if other_count > 0 {
                return Ok("non_standard".to_string());
            } else {
                return Ok("empty".to_string());
            }
        }
    }
    
    Ok("invalid".to_string())
}

/// Analyze a page object
fn analyze_page(doc: &lopdf::Document, page_id: ObjectId, page_num: usize) -> Result<PageDiagnostic, lopdf::Error> {
    // Get the page dictionary
    let page_dict = match doc.get_object(page_id)? {
        Object::Dictionary(dict) => dict.clone(),
        _ => Dictionary::new(),
    };
    
    // Analyze the dictionary
    let dictionary = analyze_dictionary(doc, &page_dict, page_id);
    
    // Get MediaBox information
    let media_box = get_media_box(&page_dict, doc);
    
    // Analyze content streams
    let content = analyze_content_streams(&page_dict, doc)?;
    
    // Analyze annotations
    let annotations = analyze_annotations(&page_dict, doc)?;
    
    // Analyze resources
    let resources = if let Ok(obj) = page_dict.get(b"Resources") {
        match obj {
            Object::Dictionary(dict) => Some(analyze_resources(dict, doc, false)),
            Object::Reference(res_id) => {
                if let Ok(Object::Dictionary(dict)) = doc.get_object(*res_id) {
                    Some(analyze_resources(dict, doc, true))
                } else {
                    None
                }
            }
            _ => None,
        }
    } else {
        None
    };
    
    Ok(PageDiagnostic {
        page_num,
        object_id: page_id,
        dictionary,
        content,
        annotations,
        resources,
        media_box,
    })
}

/// Analyze a PDF dictionary
fn analyze_dictionary(doc: &lopdf::Document, dict: &Dictionary, dict_id: ObjectId) -> DictionaryDiagnostic {
    // Collect keys
    let keys: Vec<String> = dict.iter().map(|(k, _)| String::from_utf8_lossy(k).to_string()).collect();
    
    // Get dictionary size
    let size = dict.len();
    
    // Get type if available
    let type_name = match dict.get(b"Type") {
        Ok(Object::Name(name)) => Some(String::from_utf8_lossy(name).to_string()),
        _ => None,
    };
    
    // Check for unusual keys (those not commonly found in PDF dictionaries)
    let standard_keys = [
        "Type", "Subtype", "Length", "Filter", "DecodeParms",
        "Parent", "Kids", "Count", "MediaBox", "Resources",
        "Contents", "CropBox", "BleedBox", "TrimBox", "ArtBox",
        "Rotate", "Annots", "Font", "ProcSet", "XObject",
        "ExtGState", "ColorSpace", "Pattern", "Shading", "Properties",
    ];
    
    let unusual_keys: Vec<String> = keys.iter()
        .filter(|k| !standard_keys.contains(&k.as_str()))
        .cloned()
        .collect();
    
    // Count references to this dictionary (approximate)
    let reference_count = count_references(doc, dict_id);
    
    DictionaryDiagnostic {
        keys,
        size,
        type_name,
        unusual_keys,
        reference_count,
    }
}

/// Count how many objects reference this object (approximate)
fn count_references(doc: &lopdf::Document, obj_id: ObjectId) -> usize {
    let mut count = 0;
    
    // Iterate through all objects in the document
    for (_, obj) in &doc.objects {
        match obj {
            Object::Dictionary(dict) => {
                for (_, value) in dict {
                    if let Object::Reference(ref_id) = value {
                        if *ref_id == obj_id {
                            count += 1;
                        }
                    }
                }
            }
            Object::Array(arr) => {
                for item in arr {
                    if let Object::Reference(ref_id) = item {
                        if *ref_id == obj_id {
                            count += 1;
                        }
                    }
                }
            }
            _ => {}
        }
    }
    
    count
}

/// Get MediaBox dimensions
fn get_media_box(dict: &Dictionary, doc: &lopdf::Document) -> Option<Vec<f64>> {
    fn extract_bbox(bbox: &Object) -> Option<Vec<f64>> {
        match bbox {
            Object::Array(arr) if arr.len() == 4 => {
                let mut result = Vec::with_capacity(4);
                for item in arr {
                    match item {
                        Object::Integer(i) => result.push(*i as f64),
                        Object::Real(r) => result.push((*r).into()),
                        _ => return None,
                    }
                }
                Some(result)
            }
            _ => None,
        }
    }
    
    // Try to get MediaBox directly
    if let Ok(bbox) = dict.get(b"MediaBox") {
        if let Some(values) = extract_bbox(bbox) {
            return Some(values);
        }
        
        // If MediaBox is a reference, resolve it
        if let Object::Reference(bbox_id) = bbox {
            if let Ok(bbox_obj) = doc.get_object(*bbox_id) {
                if let Some(values) = extract_bbox(bbox_obj) {
                    return Some(values);
                }
            }
        }
    }
    
    // Try to get MediaBox from parent
    if let Ok(Object::Reference(parent_id)) = dict.get(b"Parent") {
        if let Ok(Object::Dictionary(parent_dict)) = doc.get_object(*parent_id) {
            return get_media_box(parent_dict, doc);
        }
    }
    
    None
}

/// Analyze content streams of a page
fn analyze_content_streams(page_dict: &Dictionary, doc: &lopdf::Document) -> Result<ContentDiagnostic, lopdf::Error> {
    let mut content_type = "missing".to_string();
    let mut length = 0;
    let mut format = None;
    let mut is_scanner_like = false;
    let mut operation_count = 0;
    let mut has_images = false;
    let mut content_ids = Vec::new();
    
    // Find the Contents entry
    if let Ok(contents) = page_dict.get(b"Contents") {
        match contents {
            Object::Reference(content_id) => {
                content_type = "reference".to_string();
                content_ids.push(*content_id);
                
                // Try to get the content stream
                if let Ok(stream) = doc.get_object(*content_id) {
                    if let Object::Stream(stream) = stream {
                        // Get length
                        length = stream.content.len();
                        
                        // Try to decode and analyze content
                        if let Ok(content) = lopdf::content::Content::decode(&stream.content) {
                            operation_count = content.operations.len();
                            
                            // Check for image operations (scanner-like)
                            for op in &content.operations {
                                if op.operator == "Do" {
                                    has_images = true;
                                }
                            }
                            
                            // Guess format
                            if length > 10000 && has_images {
                                format = Some("image_heavy".to_string());
                                is_scanner_like = true;
                            } else if operation_count > 0 {
                                format = Some("text_based".to_string());
                            }
                        }
                    }
                }
            }
            Object::Array(arr) => {
                content_type = "array".to_string();
                
                // Collect all content IDs
                for item in arr {
                    if let Object::Reference(content_id) = item {
                        content_ids.push(*content_id);
                        
                        // Analyze each stream
                        if let Ok(Object::Stream(stream)) = doc.get_object(*content_id) {
                            length += stream.content.len();
                            
                            // Try to decode and analyze content
                            if let Ok(content) = lopdf::content::Content::decode(&stream.content) {
                                operation_count += content.operations.len();
                                
                                // Check for image operations
                                for op in &content.operations {
                                    if op.operator == "Do" {
                                        has_images = true;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Guess format
                if length > 10000 && has_images {
                    format = Some("image_heavy".to_string());
                    is_scanner_like = true;
                } else if operation_count > 0 {
                    format = Some("text_based".to_string());
                }
                
                // Multiple content streams is common in scanner PDFs
                if arr.len() > 1 {
                    is_scanner_like = true;
                }
            }
            Object::Stream(stream) => {
                content_type = "direct_stream".to_string();
                
                // Get length
                length = stream.content.len();
                
                // Try to decode and analyze content
                if let Ok(content) = lopdf::content::Content::decode(&stream.content) {
                    operation_count = content.operations.len();
                    
                    // Check for image operations
                    for op in &content.operations {
                        if op.operator == "Do" {
                            has_images = true;
                        }
                    }
                    
                    // Guess format
                    if length > 10000 && has_images {
                        format = Some("image_heavy".to_string());
                        is_scanner_like = true;
                    } else if operation_count > 0 {
                        format = Some("text_based".to_string());
                    }
                }
            }
            _ => {
                content_type = "unknown".to_string();
            }
        }
    }
    
    Ok(ContentDiagnostic {
        content_type,
        length,
        format,
        is_scanner_like,
        operation_count,
        has_images,
        content_ids,
    })
}

/// Analyze annotations on a page
fn analyze_annotations(page_dict: &Dictionary, doc: &lopdf::Document) -> Result<Vec<AnnotationDiagnostic>, lopdf::Error> {
    let mut annotations = Vec::new();
    
    // Find the Annots entry
    if let Ok(annots) = page_dict.get(b"Annots") {
        match annots {
            Object::Reference(annots_id) => {
                // Try to get the annotations array
                if let Ok(Object::Array(annots_arr)) = doc.get_object(*annots_id) {
                    for annot in annots_arr {
                        if let Object::Reference(annot_id) = annot {
                            if let Ok(Object::Dictionary(annot_dict)) = doc.get_object(*annot_id) {
                                annotations.push(analyze_annotation(annot_dict, *annot_id));
                            }
                        }
                    }
                }
            }
            Object::Array(annots_arr) => {
                // Process direct array
                for annot in annots_arr {
                    if let Object::Reference(annot_id) = annot {
                        if let Ok(Object::Dictionary(annot_dict)) = doc.get_object(*annot_id) {
                            annotations.push(analyze_annotation(annot_dict, *annot_id));
                        }
                    }
                }
            }
            _ => {}
        }
    }
    
    Ok(annotations)
}

/// Analyze a single annotation
fn analyze_annotation(annot_dict: &Dictionary, annot_id: ObjectId) -> AnnotationDiagnostic {
    // Get annotation type
    let annotation_type = match annot_dict.get(b"Subtype") {
        Ok(Object::Name(name)) => String::from_utf8_lossy(name).to_string(),
        _ => "unknown".to_string(),
    };
    
    // Check for appearance stream
    let has_appearance = annot_dict.has(b"AP");
    
    // Get flags
    let flags = match annot_dict.get(b"F") {
        Ok(Object::Integer(f)) => Some(*f),
        _ => None,
    };
    
    // Get rectangle
    let rect = match annot_dict.get(b"Rect") {
        Ok(Object::Array(arr)) if arr.len() == 4 => {
            let mut values = Vec::with_capacity(4);
            for item in arr {
                match item {
                    Object::Integer(i) => values.push(*i as f64),
                    Object::Real(r) => values.push((*r).into()),
                    _ => {}
                }
            }
            if values.len() == 4 {
                Some(values)
            } else {
                None
            }
        }
        _ => None,
    };
    
    AnnotationDiagnostic {
        annotation_type,
        object_id: annot_id,
        has_appearance,
        flags,
        rect,
    }
}

/// Analyze resources dictionary
fn analyze_resources(res_dict: &Dictionary, doc: &lopdf::Document, is_inherited: bool) -> ResourcesDiagnostic {
    // Check for fonts
    let (has_fonts, font_names) = match res_dict.get(b"Font") {
        Ok(Object::Dictionary(font_dict)) => {
            let names = font_dict.iter()
                .map(|(k, _)| String::from_utf8_lossy(k).to_string())
                .collect();
            (true, names)
        }
        Ok(Object::Reference(font_id)) => {
            if let Ok(Object::Dictionary(font_dict)) = doc.get_object(*font_id) {
                let names = font_dict.iter()
                    .map(|(k, _)| String::from_utf8_lossy(k).to_string())
                    .collect();
                (true, names)
            } else {
                (true, vec![])
            }
        }
        _ => (false, vec![]),
    };
    
    // Check for XObjects
    let (has_xobjects, xobject_names) = match res_dict.get(b"XObject") {
        Ok(Object::Dictionary(xobject_dict)) => {
            let names = xobject_dict.iter()
                .map(|(k, _)| String::from_utf8_lossy(k).to_string())
                .collect();
            (true, names)
        }
        Ok(Object::Reference(xobject_id)) => {
            if let Ok(Object::Dictionary(xobject_dict)) = doc.get_object(*xobject_id) {
                let names = xobject_dict.iter()
                    .map(|(k, _)| String::from_utf8_lossy(k).to_string())
                    .collect();
                (true, names)
            } else {
                (true, vec![])
            }
        }
        _ => (false, vec![]),
    };
    
    ResourcesDiagnostic {
        has_fonts,
        font_names,
        has_xobjects,
        xobject_names,
        is_inherited,
    }
}

/// Function to save diagnostic information to JSON format
// JSON support is disabled for now
// To enable, add `serde` and `serde_derive` features to the crate
/*
pub fn save_diagnostic_to_json(diagnostic: &PdfDiagnostic, output_path: &Path) -> Result<(), std::io::Error> {
    use serde_json;
    use std::fs::File;
    use std::io::Write;
    
    // Convert to JSON-compatible format
    let json = serde_json::to_string_pretty(diagnostic)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    
    // Write to file
    let mut file = File::create(output_path)?;
    file.write_all(json.as_bytes())?;
    
    Ok(())
}
*/

/// Convenience function to print a summary of diagnostics to stdout
pub fn print_diagnostic_summary(diagnostic: &PdfDiagnostic) {
    println!("=== PDF Diagnostic Summary ===");
    println!("Page Count: {}", diagnostic.page_count);
    println!("PDF Version: {}", diagnostic.version);
    println!("Producer: {}", diagnostic.producer.as_deref().unwrap_or("Unknown"));
    
    println!("\nPage Tree Structure:");
    println!("  Type: {}", diagnostic.page_tree.structure);
    println!("  Depth: {}", diagnostic.page_tree.depth);
    println!("  Kids Structure: {}", diagnostic.page_tree.kids_structure);
    
    println!("\nScanner PDF Likelihood:");
    let scanner_signs = count_scanner_indicators(diagnostic);
    println!("  Signs of Scanner PDF: {}/10", scanner_signs);
    
    if scanner_signs >= 7 {
        println!("  VERDICT: High likelihood of scanner-generated PDF");
    } else if scanner_signs >= 4 {
        println!("  VERDICT: Possible scanner-generated PDF");
    } else {
        println!("  VERDICT: Likely a standard PDF");
    }
    
    println!("\nPage Analysis:");
    for page in &diagnostic.pages {
        println!("  Page {}: {} operations, Images: {}, Content Type: {}", 
                 page.page_num + 1,
                 page.content.operation_count,
                 if page.content.has_images { "Yes" } else { "No" },
                 page.content.content_type);
        
        // Print annotation count
        println!("    Annotations: {}", page.annotations.len());
        
        // Print resources info
        if let Some(res) = &page.resources {
            println!("    Resources: Fonts: {}, XObjects: {}, Inherited: {}", 
                     res.has_fonts,
                     res.has_xobjects,
                     res.is_inherited);
        } else {
            println!("    Resources: None");
        }
    }
    
    println!("\nContent Stream Analysis:");
    for (i, page) in diagnostic.pages.iter().enumerate() {
        println!("  Page {}: Length: {}, Type: {}, Scanner-like: {}", 
                 i + 1,
                 page.content.length,
                 page.content.format.as_deref().unwrap_or("unknown"),
                 page.content.is_scanner_like);
    }
    
    println!("\nDifferential Analysis:");
    // Compare first page to others
    if diagnostic.page_count > 1 {
        println!("  First Page vs. Others:");
        let first_page = &diagnostic.pages[0];
        let mut diff_count = 0;
        
        // Compare content type
        let first_content_type = &first_page.content.content_type;
        let other_content_types: Vec<_> = diagnostic.pages[1..].iter()
            .map(|p| &p.content.content_type)
            .collect();
        
        if !other_content_types.iter().all(|t| *t == first_content_type) {
            println!("    Different content types: First page: {}, Others: {:?}", 
                     first_content_type,
                     other_content_types.iter().map(|s| s.as_str()).collect::<Vec<_>>());
            diff_count += 1;
        }
        
        // Compare content length
        let first_content_len = first_page.content.length;
        let other_content_lens: Vec<_> = diagnostic.pages[1..].iter()
            .map(|p| p.content.length)
            .collect();
        
        if other_content_lens.iter().any(|&l| (l as i64 - first_content_len as i64).abs() > 1000) {
            println!("    Significant content length differences: First page: {}, Others range: {} to {}", 
                     first_content_len,
                     other_content_lens.iter().min().unwrap_or(&0),
                     other_content_lens.iter().max().unwrap_or(&0));
            diff_count += 1;
        }
        
        // Compare resources
        if first_page.resources.is_some() && diagnostic.pages[1..].iter().any(|p| p.resources.is_none()) {
            println!("    First page has resources, but some other pages don't");
            diff_count += 1;
        }
        
        // Print conclusion
        if diff_count > 0 {
            println!("    Conclusion: First page differs from others in {} significant ways", diff_count);
        } else {
            println!("    Conclusion: First page appears similar to others in structure");
        }
    }
    
    println!("\n=== End of Summary ===");
}

/// Count indicators that suggest a scanner-generated PDF
pub fn count_scanner_indicators(diagnostic: &PdfDiagnostic) -> u32 {
    let mut count = 0;
    
    // Check producer string for scanner software
    if let Some(producer) = &diagnostic.producer {
        let scanner_keywords = ["scan", "epson", "canon", "hp", "xerox", "brother", "fujitsu", "twain", "wia"];
        if scanner_keywords.iter().any(|&kw| producer.to_lowercase().contains(kw)) {
            count += 2; // Strong indicator
        }
    }
    
    // Check for image-heavy content
    let image_heavy_pages = diagnostic.pages.iter()
        .filter(|p| p.content.has_images && p.content.format.as_deref() == Some("image_heavy"))
        .count();
    
    if image_heavy_pages > 0 {
        count += if image_heavy_pages == diagnostic.pages.len() { 2 } else { 1 };
    }
    
    // Check for multiple content streams
    let multiple_content_streams = diagnostic.pages.iter()
        .filter(|p| p.content.content_type == "array")
        .count();
    
    if multiple_content_streams > 0 {
        count += 1;
    }
    
    // Check for XObjects (often used for scanned images)
    let xobject_pages = diagnostic.pages.iter()
        .filter(|p| p.resources.as_ref().map_or(false, |r| r.has_xobjects))
        .count();
    
    if xobject_pages > diagnostic.pages.len() / 2 {
        count += 1;
    }
    
    // Check for page differences (first page vs others)
    if diagnostic.page_count > 1 {
        let first_page = &diagnostic.pages[0];
        let first_content_type = &first_page.content.content_type;
        let other_content_types: Vec<_> = diagnostic.pages[1..].iter()
            .map(|p| &p.content.content_type)
            .collect();
        
        if !other_content_types.iter().all(|t| *t == first_content_type) {
            count += 1;
        }
        
        // Significant content length differences
        let first_content_len = first_page.content.length;
        if diagnostic.pages[1..].iter()
            .any(|p| (p.content.length as i64 - first_content_len as i64).abs() > 1000) {
            count += 1;
        }
    }
    
    // Check for unusual dictionary structures
    let unusual_keys = diagnostic.pages.iter()
        .flat_map(|p| p.dictionary.unusual_keys.iter())
        .collect::<std::collections::HashSet<_>>()
        .len();
    
    if unusual_keys > 3 {
        count += 1;
    }
    
    // Check metadata for scanner keywords
    let scanner_metadata_keywords = ["scan", "ocr", "resolution", "dpi"];
    for (_, value) in &diagnostic.metadata {
        if scanner_metadata_keywords.iter().any(|&kw| value.to_lowercase().contains(kw)) {
            count += 1;
            break;
        }
    }
    
    count
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    
    #[test]
    #[ignore = "Requires a PDF file for testing"]
    fn test_analyze_pdf() {
        // This test requires a real PDF file
        let path = PathBuf::from("test_files/sample.pdf");
        if path.exists() {
            let result = analyze_pdf(&path);
            assert!(result.is_ok());
            
            let diagnostic = result.unwrap();
            assert!(diagnostic.page_count > 0);
        }
    }
}