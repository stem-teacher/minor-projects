use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;
use tempfile::tempdir;
use pdf_rs as pdf;

/// Test the multiple-choice-marking-guide functionality
#[test]
fn test_marking_guide_application() {
    // Create temporary directory for test files
    let temp_dir = tempdir().expect("Failed to create temp directory");
    let temp_path = temp_dir.path();
    
    // Copy sample files to temp directory
    let sample_files = prepare_test_files(temp_path);
    
    // Run the marking guide program
    let output = Command::new("cargo")
        .args(&[
            "run", 
            "--bin", 
            "multiple-choice-marking-guide",
            "--",
            "--template", 
            sample_files.template_path.to_str().unwrap(),
            "--input-dir", 
            sample_files.input_dir.to_str().unwrap(),
            "--output-dir", 
            sample_files.output_dir.to_str().unwrap(),
        ])
        .output()
        .expect("Failed to execute command");
    
    assert!(output.status.success(), "Process failed: {}", String::from_utf8_lossy(&output.stderr));
    
    // Verify each output file has proper annotations
    for entry in fs::read_dir(&sample_files.output_dir).expect("Failed to read output directory") {
        let entry = entry.expect("Failed to read directory entry");
        let file_path = entry.path();
        
        if file_path.extension().map_or(false, |ext| ext == "pdf") {
            assert!(verify_annotations(&file_path), "Failed to verify annotations in {}", file_path.display());
        }
    }
}

/// Helper struct to track test file paths
struct TestFiles {
    template_path: PathBuf,
    input_dir: PathBuf,
    output_dir: PathBuf,
}

/// Set up the test files needed
fn prepare_test_files(temp_path: &Path) -> TestFiles {
    // Create directories
    let input_dir = temp_path.join("input");
    let output_dir = temp_path.join("output");
    fs::create_dir(&input_dir).expect("Failed to create input directory");
    fs::create_dir(&output_dir).expect("Failed to create output directory");
    
    // Copy template file from requirements
    let template_path = temp_path.join("after-marking.pdf");
    fs::copy(
        "requirements/after-marking.pdf",
        &template_path
    ).expect("Failed to copy template file");
    
    // Copy test files to input directory
    let test_files = [
        "test-exam-1.pdf", 
        "test-exam-2.pdf", 
        "test-exam-3.pdf"
    ];
    
    for file in &test_files {
        fs::copy(
            format!("tests/multiple-choice-tests/fixtures/{}", file),
            input_dir.join(file)
        ).expect(&format!("Failed to copy test file {}", file));
    }
    
    TestFiles {
        template_path,
        input_dir,
        output_dir,
    }
}

/// Verify that a PDF has the proper annotations
fn verify_annotations(pdf_path: &Path) -> bool {
    // Load the PDF document
    let file = fs::read(pdf_path).expect("Failed to read PDF file");
    let doc = pdf::Document::load_from(&*file).expect("Failed to parse PDF");
    
    // Get the first page
    let page = doc.get_pages().get(0).expect("Failed to get first page");
    
    // Check for annotations
    match page.annotations() {
        Ok(annotations) => {
            // We expect at least one annotation
            if annotations.is_empty() {
                println!("No annotations found");
                return false;
            }
            
            // Check annotation types - we would expect to find appropriate annotation types
            // like Circle, Square, etc. depending on the marking guide design
            let has_expected_annotations = annotations.iter().any(|annot| {
                // In a real test, we would check for specific annotation types
                // This is simplified for the example
                annot.get_type().is_ok()
            });
            
            has_expected_annotations
        },
        Err(e) => {
            println!("Error checking annotations: {:?}", e);
            false
        }
    }
}
