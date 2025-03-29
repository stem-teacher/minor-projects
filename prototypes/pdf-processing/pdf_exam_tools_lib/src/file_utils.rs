use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Find PDF files in directory based on pattern and recursion settings
pub fn find_pdf_files(dir: &Path, recursive: bool, pattern: &str) -> Result<Vec<PathBuf>> {
    let mut files = Vec::new();

    let walker = if recursive {
        WalkDir::new(dir)
    } else {
        WalkDir::new(dir).max_depth(1)
    };

    for entry in walker {
        let entry = entry.context("Failed to read directory entry")?;
        let path = entry.path();

        if path.is_file()
            && path.extension().map_or(false, |ext| ext == "pdf")
            && path_matches_pattern(path, pattern)
        {
            files.push(path.to_path_buf());
        }
    }

    Ok(files)
}

/// Check if path matches pattern
fn path_matches_pattern(path: &Path, pattern: &str) -> bool {
    // Basic pattern matching implementation
    if pattern == "*.pdf" {
        return path.extension().map_or(false, |ext| ext == "pdf");
    }

    // More advanced pattern matching could be implemented here
    // For now, just return true if the extension is pdf
    path.extension().map_or(false, |ext| ext == "pdf")
}

/// Ensure directory exists, creating it if necessary
pub fn ensure_directory(dir: &Path) -> Result<()> {
    if !dir.exists() {
        fs::create_dir_all(dir).context("Failed to create directory")?;
    }
    Ok(())
}

/// Generate output path based on input path and output directory
pub fn generate_output_path(input_path: &Path, input_dir: &Path, output_dir: &Path) -> PathBuf {
    let relative_path = input_path.strip_prefix(input_dir).unwrap_or(input_path);
    output_dir.join(relative_path)
}
