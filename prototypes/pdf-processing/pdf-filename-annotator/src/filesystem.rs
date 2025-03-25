//! File system operations for PDF Filename Annotator
//!
//! This module provides functionality for working with the file system,
//! such as finding PDF files and managing output directories.

use crate::error::FileSystemError;
use log::{debug, info};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

/// Check if a file has a PDF extension
fn is_pdf(entry: &DirEntry) -> bool {
    entry.file_type().is_file() && entry
        .path()
        .extension()
        .map_or(false, |ext| ext.eq_ignore_ascii_case("pdf"))
}

/// Find all PDF files in a directory, optionally recursively
pub fn find_pdf_files(
    dir: impl AsRef<Path>,
    recursive: bool,
) -> Result<Vec<PathBuf>, FileSystemError> {
    let dir = dir.as_ref();
    
    // Check if directory exists
    if !dir.exists() {
        return Err(FileSystemError::DirectoryNotFound(dir.to_path_buf()));
    }
    
    // Check if directory is readable
    if let Err(e) = fs::read_dir(dir) {
        return Err(FileSystemError::IoError(e));
    }
    
    let mut pdf_files = Vec::new();
    
    // Use WalkDir to iterate through files
    let walker = if recursive {
        WalkDir::new(dir)
    } else {
        WalkDir::new(dir).max_depth(1)
    };
    
    for entry in walker.into_iter().filter_map(Result::ok).filter(is_pdf) {
        pdf_files.push(entry.path().to_path_buf());
        debug!("Found PDF: {}", entry.path().display());
    }
    
    // Check if any PDF files were found
    if pdf_files.is_empty() {
        return Err(FileSystemError::NoPdfFiles(dir.to_path_buf()));
    }
    
    info!("Found {} PDF files in {}", pdf_files.len(), dir.display());
    Ok(pdf_files)
}

/// Ensure output directory exists, creating it if necessary
pub fn ensure_output_dir(dir: impl AsRef<Path>) -> Result<(), FileSystemError> {
    let dir = dir.as_ref();
    
    if !dir.exists() {
        info!("Creating output directory: {}", dir.display());
        fs::create_dir_all(dir)?;
    } else if !dir.is_dir() {
        return Err(FileSystemError::IoError(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!("Output path exists but is not a directory: {}", dir.display()),
        )));
    }
    
    // Check if directory is writable by creating and removing a test file
    let test_file = dir.join(".test_write_permission");
    match fs::write(&test_file, b"test") {
        Ok(_) => {
            let _ = fs::remove_file(test_file);
            Ok(())
        }
        Err(_) => Err(FileSystemError::PermissionDenied(dir.to_path_buf())),
    }
}

/// Generate output path for a processed PDF
pub fn generate_output_path(
    input_path: impl AsRef<Path>,
    output_dir: impl AsRef<Path>,
) -> PathBuf {
    let input_path = input_path.as_ref();
    let output_dir = output_dir.as_ref();
    
    // Get the filename from the input path
    let filename = input_path.file_name().unwrap_or_default();
    
    // Create the output path by joining the output directory and filename
    output_dir.join(filename)
}

#[cfg(test)]
mod tests {
    use super::*;
    use assert_fs::prelude::*;
    use predicates::prelude::*;
    
    #[test]
    fn test_is_pdf() {
        let dir = assert_fs::TempDir::new().unwrap();
        
        // Create test files
        let pdf_file = dir.child("test.pdf");
        pdf_file.touch().unwrap();
        
        let txt_file = dir.child("test.txt");
        txt_file.touch().unwrap();
        
        // Use WalkDir to get DirEntry objects
        let walker = WalkDir::new(dir.path()).min_depth(1).max_depth(1);
        let entries: Vec<DirEntry> = walker.into_iter().filter_map(Result::ok).collect();
        
        // Find the PDF and TXT entries
        let pdf_entry = entries.iter().find(|e| e.path().extension().unwrap_or_default() == "pdf").unwrap();
        let txt_entry = entries.iter().find(|e| e.path().extension().unwrap_or_default() == "txt").unwrap();
        
        assert!(is_pdf(pdf_entry));
        assert!(!is_pdf(txt_entry));
        
        dir.close().unwrap();
    }
    
    #[test]
    fn test_find_pdf_files() {
        let dir = assert_fs::TempDir::new().unwrap();
        
        // Create test files
        let pdf_file1 = dir.child("test1.pdf");
        pdf_file1.touch().unwrap();
        
        let pdf_file2 = dir.child("test2.PDF");
        pdf_file2.touch().unwrap();
        
        let txt_file = dir.child("test.txt");
        txt_file.touch().unwrap();
        
        // Create subdirectory with PDF file
        let subdir = dir.child("subdir");
        subdir.create_dir_all().unwrap();
        
        let pdf_file3 = subdir.child("test3.pdf");
        pdf_file3.touch().unwrap();
        
        // Test non-recursive search
        let pdf_files = find_pdf_files(dir.path(), false).unwrap();
        assert_eq!(pdf_files.len(), 2);
        assert!(pdf_files.iter().any(|p| p.ends_with("test1.pdf")));
        assert!(pdf_files.iter().any(|p| p.ends_with("test2.PDF")));
        
        // Test recursive search
        let pdf_files = find_pdf_files(dir.path(), true).unwrap();
        assert_eq!(pdf_files.len(), 3);
        assert!(pdf_files.iter().any(|p| p.ends_with("test1.pdf")));
        assert!(pdf_files.iter().any(|p| p.ends_with("test2.PDF")));
        assert!(pdf_files.iter().any(|p| p.ends_with("test3.pdf")));
        
        dir.close().unwrap();
    }
    
    #[test]
    fn test_ensure_output_dir() {
        let dir = assert_fs::TempDir::new().unwrap();
        
        // Test creating a new directory
        let output_dir = dir.child("output");
        ensure_output_dir(output_dir.path()).unwrap();
        assert!(output_dir.path().exists());
        assert!(output_dir.path().is_dir());
        
        // Test using an existing directory
        ensure_output_dir(output_dir.path()).unwrap();
        
        // Test using a file as directory (should fail)
        let file = dir.child("file.txt");
        file.touch().unwrap();
        assert!(ensure_output_dir(file.path()).is_err());
        
        dir.close().unwrap();
    }
    
    #[test]
    fn test_generate_output_path() {
        let input_path = Path::new("/path/to/input/file.pdf");
        let output_dir = Path::new("/path/to/output");
        
        let output_path = generate_output_path(input_path, output_dir);
        assert_eq!(output_path, Path::new("/path/to/output/file.pdf"));
    }
}
