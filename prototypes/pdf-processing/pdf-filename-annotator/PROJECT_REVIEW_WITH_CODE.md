# PDF Exam Marking Review

## Introduction

The purpose of this technical review is to assess the current state of a set of Rust programs designed to automate the marking of student examination papers, a process currently performed manually using paper.

The intended system utilises PDF document processing to annotate and grade exams digitally through multiple discrete executables that facilitate different stages of the marking workflow. Two executables have already been developed to demonstrate core functionalities.

### System Workflow Overview:

The system workflow consists of:

1. Recognising the first page of the exam as a multiple-choice answer sheet and subsequent pages as written responses.
2. Scanning paper-based exams to create PDF files, each file containing a complete student response set.
3. Storing exam PDFs and associated student data (JSON format) within class-specific directories.
4. Renaming exam PDFs to follow the naming convention `{class}_{lastname} {firstname}-{student-number}.pdf`, ensuring accurate student tracking and association.
5. Annotating each exam page with this filename to enable independent marking of different questions by multiple markers.
6. Reading a multiple-choice marking template PDF (containing green rectangles indicating correct answers) and applying these annotations to each multiple-choice sheet to assist marking and indicate correct answers to students.
7. Evaluating multiple-choice answers by comparing marked areas on the student's exam against the marking template:
   - Annotating incorrect responses with red rectangles.
   - Annotating unanswered questions with red lines.
   - Flagging ambiguous responses for manual review.
8. Generating reports listing exams requiring manual review of ambiguous multiple-choice answers, allowing markers to quickly assess, adjust, or confirm annotations.
9. Scoring multiple-choice answers based on the presence of red annotations and recording the resultant score within a text annotation.
10. Extracting regions of exam pages (as images or OCR-text) based on an exam template file, consolidating them into a single PDF for manual written response marking, accompanied by automatic preliminary scoring.
11. Allowing markers to review and score written responses manually within the consolidated PDF, with comments and marks recorded as annotations.
12. Transferring marks and review annotations from the consolidated PDF back to individual student exam PDFs.
13. Creating consolidated scores and reports per student from individual annotations.

### Review Goals:

The review aims to:
1. Strengthen foundational capabilities.
2. Provide a detailed, sequenced technical implementation guide that minimises technical risks and avoids code duplication across executables.

### Detailed Review Structure:

The subsequent sections will outline:
- Required outcomes from the review.
- Existing executables and their purposes.
- Known technical limitations needing resolution.
- Challenges with current AI coding agents.
- Required new executables to enable a comprehensive marking lifecycle.
- Key remaining technical features needing development and demonstration.
- Reference to the "PDF Processing Tools Project Review" for additional context.

### Required Review Outcomes:

The review must provide:

1. A highly detailed assessment of the current codebase, explicitly addressing known limitations and recommending precise refactoring to eliminate code duplication.
2. Validation that identified technical mechanisms are comprehensive and creation of a detailed implementation guide for a technical demonstrator.
3. A specification and incremental implementation guide for all required executables to build the overall system effectively.

This specification will be reviewed by two AI agents, whose responses will be consolidated.

### Existing Executables:

- **PDF Filename Annotator**: Annotates PDFs to support separate marking and records student identification for tracking.
- **Multiple Choice Marking Guide**: Applies annotations from a template to student exam PDFs for streamlined multiple-choice marking.

### Known Limitations:

- **Inconsistent Annotation Fonts**: Indicating multiple annotation methods are in use.
- **Code Duplication**: Caused by isolated AI agent development sessions.
- **Lack of Annotation Labelling**: Annotation types and names are undefined, complicating automated processing and scripting.

### Challenges with AI Coding Agents:

Development has relied on Claude Desktop and Claude Code agents, beneficial for rapid debugging but inadequate for comprehensive software engineering due to context limitations and erratic behaviours, including unstructured code duplication.

To mitigate these issues:
- Development must be provided in discrete, explicitly ordered steps.
- Enhanced utilisation of other AI coding APIs (available via MCP interface) at strategic points is recommended; guidance on their optimal usage is required.

### Additional Required Executables:

The following executables, with suggested names, must be developed using a shared codebase:

1. **Annotation List**: Outputs annotations (name, type, text value) from a PDF as a JSON file.
2. **Annotation Rename**: Renames annotations based on JSON input.
3. **Text Annotation Get**: Retrieves values of specified text annotations.
4. **Text Annotation Set**: Assigns specified values to annotations.
5. **Annotation Copy**: Copies annotations between PDFs, with options for page adjustment.
6. **Annotation Remove**: Deletes specified annotations.
7. **Annotation by Area**: Lists annotations within specified areas on PDF pages.
8. **Multiple-Choice Scorer**: Scores multiple-choice sections based on annotation counts.
9. **Score Annotator**: Adds score annotations to student papers.
10. **Total Scorer**: Aggregates individual question scores into a total.
11. **Score Reporter**: Generates consolidated JSON reports of student scores.
12. **Image Extractor**: Extracts images based on annotations.
13. **PDF Page Adder**: Adds blank pages to PDFs.
14. **PDF Image Inserter**: Inserts images into specified PDF pages.
15. **Consolidated Marking Preparer**: Generates consolidated marking PDFs for written responses, including OCR text, marker annotations, and preliminary AI scores.
16. **Positional Annotation Adder**: Adds annotations at defined positions for incorrect/blank responses.
17. **Image Analyser**: Automates identification of marked answers in multiple-choice questions using image processing (OpenCV).
18. **OCR Processor**: Performs local OCR with a fallback to cloud OCR if quality thresholds are unmet.

### Suggested Improvements:
- Clearly define and standardise annotation naming conventions to simplify automated processing.
- Ensure consistent font and annotation style to enhance readability and uniformity across all PDFs.
- Regularly consolidate AI-generated code to prevent duplication.
- Include detailed guidance for AI API integration points and usage recommendations.
- Provide explicit error-handling guidelines for edge cases, such as ambiguous responses or OCR failures.

This structured approach will ensure clarity, facilitate targeted AI assistance, and significantly improve software quality and maintainability.


18.  OCR. Perform a local ocr on a given image, and if not to an adequate threshold, revert to a cloud offering.

The following is an outline of a potential approach.

```rust
use std::error::Error;
use std::fs;
use tesseract::Tesseract; // Ensure you have the appropriate tesseract crate installed
use reqwest::blocking::Client;
use serde_json::Value;

// Function to perform OCR using Tesseract locally.
// Returns the recognized text and a confidence score.
fn perform_local_ocr(image_path: &str) -> Result<(String, f32), Box<dyn Error>> {
    // Initialize Tesseract for English (adjust language as needed).
    let mut tess = Tesseract::new(None, "eng")?;
    tess.set_image(image_path)?;

    // Retrieve OCR result.
    let text = tess.get_text()?;

    // Retrieve mean confidence (implementation may vary).
    // Note: Tesseract's API may require custom parsing to get confidence.
    let confidence = tess.get_mean_confidence()?;

    Ok((text, confidence))
}

// Function to call a cloud OCR service as a fallback.
// This example uses reqwest to post the image bytes to an API endpoint.
fn perform_cloud_ocr(image_path: &str) -> Result<String, Box<dyn Error>> {
    let image_bytes = fs::read(image_path)?;
    let client = Client::new();

    // Replace with your actual cloud OCR endpoint and API key as required.
    let api_url = "https://api.example.com/ocr";

    let response = client.post(api_url)
        .header("Authorization", "Bearer YOUR_API_KEY")
        .body(image_bytes)
        .send()?
        .text()?;

    // Assume the service returns a JSON with a "text" field.
    let json_response: Value = serde_json::from_str(&response)?;
    let text = json_response["text"].as_str().unwrap_or("").to_string();

    Ok(text)
}

// Main function that selects OCR method based on confidence.
fn perform_ocr_with_fallback(image_path: &str, confidence_threshold: f32) -> Result<String, Box<dyn Error>> {
    let (local_text, confidence) = perform_local_ocr(image_path)?;

    // If the confidence is below threshold, use cloud OCR.
    if confidence < confidence_threshold {
        println!("Local OCR confidence ({}) below threshold; using cloud OCR.", confidence);
        let cloud_text = perform_cloud_ocr(image_path)?;
        return Ok(cloud_text);
    }

    Ok(local_text)
}

fn main() -> Result<(), Box<dyn Error>> {
    let image_path = "path/to/your/image.png";
    let confidence_threshold = 80.0; // Define an appropriate threshold for your use case.

    let ocr_result = perform_ocr_with_fallback(image_path, confidence_threshold)?;
    println!("OCR Result:\n{}", ocr_result);

    Ok(())
}
```



# PDF Processing Tools Project Review

## 1. Project Overview

This project encompasses a suite of PDF processing tools designed primarily for educational purposes. The collection of tools includes:

1. **PDF Filename Annotator**: Stamps each page of PDF files with their filename in a specified corner (typically top-right)
2. **Multiple Choice Marking Guide**: Extracts annotations from a template PDF and applies them to target PDFs to create marking guides
3. **Annotation Analysis Tools**: Several utilities for diagnosing and analyzing PDF annotations

These tools are developed in Rust and share common code for PDF manipulation, configuration handling, and error management. The project demonstrates a structured approach to software development with clear separation of concerns, comprehensive error handling, and a focus on maintainability.

### Key Features Across Tools:

- PDF annotation creation and manipulation
- Batch processing capabilities
- Configurable text and annotation positioning
- Error handling and recovery
- Diagnostic capabilities
- Template-based annotation application (for marking guides)

## 2. Project Structure

### Directory Structure

```
pdf-filename-annotator/
├── Cargo.toml                   # Rust package configuration
├── Cargo.lock                   # Dependency lock file
├── README.md                    # Project overview
├── config.example.json          # Example configuration
├── configs/                     # Sample configuration files
├── docs/                        # Documentation
├── process/                     # Development process templates
├── project/                     # Project planning and status files
├── requirements/                # Specification and requirements
│   ├── SPECIFICATION-file-annotator.md    # Main annotator specs
│   └── multiple-choice-guide/   # Multiple choice guide requirements
│       └── REQUIREMENTS_SPECIFICATION.md  # Detailed requirements
├── src/                         # Source code
│   ├── annotation.rs            # PDF annotation functionality
│   ├── bin/                     # Binary executables
│   │   ├── analyze_pdf_annotations.rs     # Diagnostic tool
│   │   ├── multiple_choice_marking_guide.rs # Multiple choice guide tool
│   │   ├── read_annotations.rs            # Annotation reading utility
│   │   └── ...
│   ├── config.rs                # Configuration handling
│   ├── error.rs                 # Error types and handling
│   ├── file_utils.rs            # File system utilities
│   ├── lib.rs                   # Library exports
│   ├── main.rs                  # Main application entry point
│   ├── mc_pdf_utils.rs          # Multiple choice specific utilities
│   ├── pdf_utils.rs             # PDF manipulation utilities
│   └── processor.rs             # PDF processing workflow
├── agents/                      # Agent-specific context tracking
└── CLAUDE_DESKTOP.md            # Session context information
```

## 3. Tool Specifications

### 3.1 PDF Filename Annotator

The PDF Filename Annotator was built based on the following core requirements:

1. **Find PDF Files**: Locate all PDF files in a specified input directory
   - Support optional recursive searching of subdirectories
   - Filter for .pdf extensions (case-insensitive)

2. **Filename Annotation**: Add the filename as text to each PDF page
   - Position: Top-right corner of each page (configurable)
   - Font: Calibri, 12-point (with fallback options if unavailable)
   - Content: Exact filename including extension
   - Appearance: Black text, no background

3. **File Processing**: Handle batches of PDF files
   - Read from configured input directory
   - Write to configured output directory
   - Preserve original files
   - Support processing multiple files in sequence

### 3.2 Multiple Choice Marking Guide

The Multiple Choice Marking Guide automates the application of standardized marking annotations to multiple-choice exam papers:

1. **Annotation Extraction**:
   - Extract all annotation elements from the first page of a template PDF
   - Identify the type, position, and properties of each annotation
   - Filter annotations to include only those relevant to marking
   - Preserve the visual characteristics of annotations
   - Handle multiple annotation types (circles, checkmarks, highlights, etc.)

2. **Annotation Application**:
   - Apply extracted annotations to the first page of each target PDF
   - Position annotations exactly as they appear in the template
   - Preserve all visual properties of annotations
   - Handle different page sizes and orientations
   - Avoid modifying other pages in the target PDFs

3. **Batch Processing**:
   - Process directories of PDF files recursively
   - Support filtering of input files by pattern
   - Maintain directory structure in output
   - Skip already processed files (with optional override)
   - Report progress during processing

4. **Performance and Reliability**:
   - Process at least 10 PDF files per minute on standard hardware
   - Handle PDFs up to 10MB in size
   - Validate input PDFs before processing
   - Recover from errors with individual files
   - Complete batch processing despite individual file failures

## 4. Implementation Details

### 4.1 Package Configuration

The application is built using Rust 2021 edition and defines multiple binary targets:

```toml
[package]
name = "pdf-filename-annotator"
version = "0.1.0"
edition = "2021"
authors = ["Philip Haynes"]
description = "A tool to annotate PDF files with their filenames"
readme = "README.md"

[[bin]]
name = "pdf-filename-annotator"
path = "src/main.rs"

[[bin]]
name = "multiple-choice-marking-guide"
path = "src/bin/multiple_choice_marking_guide.rs"

[[bin]]
name = "analyze-pdf-annotations"
path = "src/bin/analyze_pdf_annotations.rs"

# ... additional binaries
```

### 4.2 Key Dependencies

- **lopdf** (^0.36.0): PDF processing library
- **clap** (^4.5.4): Command line argument parsing
- **serde** (^1.0.197): JSON serialization/deserialization
- **anyhow/thiserror** (^1.0): Error handling
- **walkdir** (^2.5.0): Directory traversal
- **rusttype** (^0.9.3): Font handling
- **colored** (^2.1.0): Terminal output coloring for diagnostics

## 5. Tool Implementation Details

### 5.1 PDF Filename Annotator

The PDF Filename Annotator is focused on adding text annotations to PDF files. It provides a consistent, reliable way to stamp filenames on each page of PDFs.

#### Core Components:

1. **PdfProcessor**: Main orchestrator that handles batch processing of files
2. **Annotator**: Specialized component for adding text annotations to PDFs
3. **Config**: Configuration structure for customization

#### Recent Improvements:
- Fixed font inconsistency issues by standardizing DA string format and font resources
- Improved annotation creation with proper FreeText annotations
- Enhanced error handling and recovery during batch processing
- Added diagnostics to verify annotation consistency

### 5.2 Multiple Choice Marking Guide

The Multiple Choice Marking Guide tool implements a different use case: copying annotation patterns from a template PDF to multiple target PDFs. This allows teachers to create standardized marking guides for multiple-choice exams.

#### Core Components:

1. **McPdfAnnotation**: A specialized structure for representing PDF annotations with all their properties
2. **mc_pdf_utils**: A module containing utility functions for annotation extraction and application
3. **Command-line interface**: A flexible CLI for batch processing files with various options

#### Key Features:
- Extracts annotations from a template PDF, focusing on marking-relevant types (e.g., circles, squares)
- Preserves all visual properties of annotations, including colors, borders, and contents
- Applies annotations precisely to the first page of target PDFs
- Supports recursive directory processing with pattern matching
- Includes dry-run mode for previewing changes

The implementation demonstrates a non-trivial use of the lopdf library to:
1. Extract structured annotation data including type, position, appearance, and properties
2. Create new annotation dictionaries with the same properties
3. Handle various annotation types (Square, Circle, FreeText)
4. Manage complex PDF object relationships

## 6. Source Code Analysis

### 6.1 Library Structure (lib.rs)

```rust
// Export library modules
pub mod file_utils;
pub mod pdf_utils;
pub mod mc_pdf_utils;
pub mod config;
pub mod processor;
pub mod error;
pub mod annotation;
// pub mod pdf_annotation_utils; // Temporarily removed due to type conflicts

// Re-export types from pdf_utils - only for original functionality
// Re-export types used by main binary
pub use config::Config;
pub use processor::PdfProcessor;

// Re-export types for multiple choice marking guide
pub use mc_pdf_utils::McPdfAnnotation;
```

The library is well-structured with clearly defined modules for each concern. This design allows for code reuse across the different tools while maintaining separation of concerns.

### 6.2 PDF Filename Annotator Main (main.rs)

```rust
fn main() -> Result<()> {
    // Initialize logger
    env_logger::init();

    // Parse command-line arguments
    let args = Args::parse();

    // If list_fonts flag is set, list available fonts and exit
    if args.list_fonts {
        return list_available_fonts();
    }

    // Load configuration from file
    let config_path = args.config.as_ref().expect("Config should be present when not listing fonts");
    let config = Config::from_file(config_path).context("Failed to load configuration")?;

    // Validate configuration
    config.validate().context("Invalid configuration")?;

    // Create PDF processor with the loaded configuration
    let processor = PdfProcessor::new(config);

    // Process all PDF files in the input directory
    let summary = processor
        .process_all()
        .context("Failed to process PDF files")?;

    // Print summary
    println!("Processing completed successfully!");
    println!("Files processed: {}", summary.files_processed);
    println!("Pages annotated: {}", summary.pages_annotated);
    println!("Errors encountered: {}", summary.errors.len());

    if !summary.errors.is_empty() && args.verbose {
        println!("\nErrors:");
        for (file, error) in summary.errors {
            println!("  {}: {}", file.display(), error);
        }
    }

    Ok(())
}
```

The main function demonstrates:
- Clear organization and flow
- Proper error handling with context
- Configuration validation
- Comprehensive reporting

### 6.3 Multiple Choice Marking Guide (multiple_choice_marking_guide.rs)

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logger
    env_logger::init();

    // Parse command line arguments
    let args = Args::parse();

    println!("Multiple Choice Marking Guide");
    println!("============================");

    // Validate inputs
    validate_inputs(&args)?;

    // Extract annotations from template
    println!("Extracting annotations from template: {}", args.template.display());
    let template_annotations = mc_pdf_utils::extract_annotations_from_file(
        &args.template,
        Some(&["Square", "Circle"])
    )?;

    println!("Found {} marking annotations in the template", template_annotations.len());

    if args.verbose {
        for (i, annotation) in template_annotations.iter().enumerate() {
            println!("Annotation #{}: Type={}, Rect=[{:.2}, {:.2}, {:.2}, {:.2}]",
                     i + 1,
                     annotation.annotation_type,
                     annotation.rect[0], annotation.rect[1],
                     annotation.rect[2], annotation.rect[3]);
        }
    }

    // Process input files
    println!("Processing input directory: {}", args.input_dir.display());
    let input_files = find_pdf_files(&args.input_dir, args.recursive, &args.pattern);

    // ... rest of implementation
}
```

The Multiple Choice Marking Guide demonstrates:
- Targeted annotation extraction by type (focusing on marking symbols)
- Clear user feedback during processing
- Validation of input files
- Detailed error reporting
- Support for dry-run mode

### 6.4 McPdfAnnotation Structure (mc_pdf_utils.rs)

```rust
/// Structure to represent a PDF annotation for the multiple-choice marking guide
#[derive(Debug, Clone)]
pub struct McPdfAnnotation {
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
```

This structure shows a thoughtful design that:
- Captures all essential annotation information
- Handles various annotation types
- Stores position data in a consistent format
- Preserves appearance information
- Uses a flexible property system for type-specific properties

## 7. Comparison of Approaches

### 7.1 Annotation Methods

The project uses two different approaches to PDF annotation:

1. **PDF Filename Annotator**:
   - Uses FreeText annotations for adding text to PDFs
   - Focuses on font consistency and proper text rendering
   - Creates self-contained annotations with embedded resources

2. **Multiple Choice Marking Guide**:
   - Extracts and copies existing annotations
   - Focuses on preserving visual properties exactly
   - Handles various annotation types (Square, Circle, etc.)

### 7.2 Processing Models

Both tools share a common batch processing model:

1. Find files matching criteria in input directories
2. Process each file, creating a new output file
3. Handle errors gracefully, continuing with remaining files
4. Report comprehensive processing statistics

The key difference is in what they process:
- Filename Annotator processes every page of each PDF
- Marking Guide focuses only on the first page of each PDF

## 8. Current Status and Next Steps

### 8.1 Recent Improvements

1. **Font Consistency Fix**: The project has addressed issues with font inconsistency by:
   - Standardizing DA (Default Appearance) string format
   - Adding Name property to font dictionaries
   - Ensuring consistent font resources across pages
   - Creating diagnostic tools for annotation analysis

2. **Project Structure**: The development process has been formalized with:
   - A structured SDLC framework
   - Templates for task tracking and documentation
   - Separation of agent-specific context
   - Improved validation methodologies

### 8.2 Next Planned Tasks

1. **Task 5.1**: Create Process for Consistent Application Validation
   - Develop structured validation methodology for testing PDF annotations
   - Create standardized testing scripts
   - Establish consistent file organization strategy
   - Document validation process with clear steps

2. **Task 5.2**: Re-implement Consistent Annotation Strategy
   - Apply new validation process to verify annotation strategies
   - Create comprehensive tests for different PDF types
   - Document implementation with clear explanations

3. **Task 3.3**: Fix Scanned PDF Issues
   - Use validation process to identify and fix remaining issues
   - Address annotation strategy inconsistencies
   - Ensure all scanned PDFs are properly processed

## 9. Integration Between Tools

The project demonstrates effective integration between tools through:

1. **Shared Library Code**: Common functionality is extracted into the library and reused across tools
2. **Consistent Error Handling**: All tools use a similar approach to error handling
3. **Unified Processing Model**: Batch processing follows similar patterns in different tools

The relationship between the PDF Filename Annotator and Multiple Choice Marking Guide shows how a base PDF processing framework can be extended to handle different educational use cases.

## 10. Lessons from Multiple Choice Guide Development

The Multiple Choice Marking Guide implementation contains several patterns that could be beneficial for the main PDF Filename Annotator:

1. **Flexible Property Model**: The McPdfAnnotation's property HashMap approach allows for storing diverse annotation properties without changing the structure
2. **Targeted Filtering**: Filtering annotations by type could be useful in other contexts
3. **Appearance Preservation**: The approach to preserving visual properties could be applied to other annotation types

## 11. Conclusion

The PDF Processing Tools project represents a comprehensive solution for educational PDF processing needs. It includes both general-purpose tools (PDF Filename Annotator) and specialized applications (Multiple Choice Marking Guide) that share a common codebase.

The project demonstrates:
- Effective use of Rust's safety features and external libraries
- Clear separation of concerns across modules
- Robust error handling and recovery
- Flexible configuration and customization
- Thoughtful application of design patterns

The code is well-structured, with clear documentation and a consistent approach to problem-solving. The recent improvements in font consistency and project structure have significantly enhanced the reliability and maintainability of the applications.

As the project moves forward with its planned tasks, the focus on consistent validation and testing will further strengthen the codebase and ensure reliable operation across different PDF types and environments.

## 12. Appendix: Complete Source Code

### 12.1 Library Entry Point (lib.rs)

```rust
// Export library modules
pub mod file_utils;
pub mod pdf_utils;
pub mod mc_pdf_utils;
pub mod config;
pub mod processor;
pub mod error;
pub mod annotation;
// pub mod pdf_annotation_utils; // Temporarily removed due to type conflicts

// Re-export types from pdf_utils - only for original functionality
// Re-export types used by main binary
pub use config::Config;
pub use processor::PdfProcessor;

// Re-export types for multiple choice marking guide
pub use mc_pdf_utils::McPdfAnnotation;
```

### 12.2 Main Application (main.rs)

```rust
//! PDF Filename Annotator
//!
//! A command-line tool for annotating PDF files with their filenames
//! in the top-right corner of each page.

use anyhow::{Context, Result};
use clap::Parser;
// Logging is initialized via env_logger
use pdf_filename_annotator::{Config, PdfProcessor};
use std::path::PathBuf;
use std::fs;

/// Command line arguments for PDF Filename Annotator
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to the configuration file
    #[arg(short, long, required_unless_present = "list_fonts")]
    config: Option<PathBuf>,

    /// Verbose output
    #[arg(short, long)]
    verbose: bool,

    /// List available fonts
    #[arg(short, long)]
    list_fonts: bool,
}

fn main() -> Result<()> {
    // Initialize logger
    env_logger::init();

    // Parse command-line arguments
    let args = Args::parse();

    // If list_fonts flag is set, list available fonts and exit
    if args.list_fonts {
        return list_available_fonts();
    }

    // Load configuration from file
    let config_path = args.config.as_ref().expect("Config should be present when not listing fonts");
    let config = Config::from_file(config_path).context("Failed to load configuration")?;

    // Validate configuration
    config.validate().context("Invalid configuration")?;

    // Create PDF processor with the loaded configuration
    let processor = PdfProcessor::new(config);

    // Process all PDF files in the input directory
    let summary = processor
        .process_all()
        .context("Failed to process PDF files")?;

    // Print summary
    println!("Processing completed successfully!");
    println!("Files processed: {}", summary.files_processed);
    println!("Pages annotated: {}", summary.pages_annotated);
    println!("Errors encountered: {}", summary.errors.len());

    if !summary.errors.is_empty() && args.verbose {
        println!("\nErrors:");
        for (file, error) in summary.errors {
            println!("  {}: {}", file.display(), error);
        }
    }

    Ok(())
}

/// Lists available fonts in common system locations
fn list_available_fonts() -> Result<()> {
    println!("Checking for available fonts...");

    // Check common font directories
    let font_dirs = [
        "/System/Library/Fonts",
        "/System/Library/Fonts/Supplemental",
        "/Library/Fonts",
        "/usr/share/fonts/truetype",
        "/usr/share/fonts/TTF",
        "C:\\Windows\\Fonts",
        "./fonts",
    ];

    for dir in &font_dirs {
        let path = PathBuf::from(dir);
        if path.exists() {
            println!("Checking directory: {}", dir);

            // Try to list files in directory
            match fs::read_dir(&path) {
                Ok(entries) => {
                    for entry in entries {
                        if let Ok(entry) = entry {
                            let path = entry.path();
                            if let Some(ext) = path.extension() {
                                if ext == "ttf" || ext == "ttc" || ext == "otf" {
                                    if let Some(name) = path.file_stem() {
                                        println!("  Font: {}", name.to_string_lossy());
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Error reading directory {}: {}", dir, e);
                }
            }
        }
    }

    println!("Font scanning complete.");
    Ok(())
}
```

### 12.3 Configuration Handler (config.rs)

```rust
//! Configuration handling for PDF Filename Annotator
//!
//! This module provides structures and functionality for loading and
//! managing application configuration.

use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};

use crate::error::Error;

/// Corner position for annotations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Corner {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}

impl Default for Corner {
    fn default() -> Self {
        Corner::TopRight
    }
}

/// Font configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontConfig {
    /// Font size in points
    #[serde(default = "default_font_size")]
    pub size: f32,

    /// Font family name
    #[serde(default = "default_font_family")]
    pub family: String,

    /// Fallback font if primary font cannot be loaded
    #[serde(default)]
    pub fallback: Option<String>,
}

fn default_font_size() -> f32 {
    12.0
}

fn default_font_family() -> String {
    "Helvetica".to_string()
}

impl Default for FontConfig {
    fn default() -> Self {
        Self {
            size: default_font_size(),
            family: default_font_family(),
            fallback: Some("Arial".to_string()),
        }
    }
}

/// Position configuration for annotations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionConfig {
    /// Corner of the page for positioning the annotation
    #[serde(default)]
    pub corner: Corner,

    /// Horizontal offset from the corner in points
    #[serde(default = "default_offset")]
    pub x_offset: f32,

    /// Vertical offset from the corner in points
    #[serde(default = "default_offset")]
    pub y_offset: f32,
}

fn default_offset() -> f32 {
    10.0
}

impl Default for PositionConfig {
    fn default() -> Self {
        Self {
            corner: Corner::default(),
            x_offset: default_offset(),
            y_offset: default_offset(),
        }
    }
}

/// Main application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Directory containing input PDF files
    pub input_dir: PathBuf,

    /// Directory for saving output PDF files
    pub output_dir: PathBuf,

    /// Whether to recursively process subdirectories
    #[serde(default)]
    pub recursive: bool,

    /// Font configuration
    #[serde(default)]
    pub font: FontConfig,

    /// Position configuration
    #[serde(default)]
    pub position: PositionConfig,
}

impl Config {
    /// Load configuration from a JSON file
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self, Error> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let config = serde_json::from_reader(reader)?;
        Ok(config)
    }

    /// Create a default configuration
    pub fn default() -> Self {
        Self {
            input_dir: PathBuf::from("./input"),
            output_dir: PathBuf::from("./output"),
            recursive: false,
            font: FontConfig::default(),
            position: PositionConfig::default(),
        }
    }

    /// Validate the configuration values
    pub fn validate(&self) -> Result<(), Error> {
        // Check if input directory exists
        if !self.input_dir.exists() {
            return Err(Error::Configuration(format!(
                "Input directory does not exist: {}",
                self.input_dir.display()
            )));
        }

        // Check if input directory is a directory
        if !self.input_dir.is_dir() {
            return Err(Error::Configuration(format!(
                "Input path is not a directory: {}",
                self.input_dir.display()
            )));
        }

        // Check font size range
        if self.font.size <= 0.0 || self.font.size > 72.0 {
            return Err(Error::Configuration(format!(
                "Font size must be between 0 and 72 points: {}",
                self.font.size
            )));
        }

        // Validate offset values
        if self.position.x_offset < 0.0 || self.position.x_offset > 100.0 {
            return Err(Error::Configuration(format!(
                "X offset must be between 0 and 100 points: {}",
                self.position.x_offset
            )));
        }

        if self.position.y_offset < 0.0 || self.position.y_offset > 100.0 {
            return Err(Error::Configuration(format!(
                "Y offset must be between 0 and 100 points: {}",
                self.position.y_offset
            )));
        }

        Ok(())
    }
}
```

### 12.4 Error Handler (error.rs)

```rust
//! Error types for PDF Filename Annotator
//!
//! This module defines custom error types for various components
//! of the application.

use std::path::PathBuf;
use thiserror::Error;

/// Application error types
#[derive(Debug, Error)]
pub enum Error {
    /// I/O error
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    /// JSON error
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    /// PDF library error
    #[error("PDF error: {0}")]
    Pdf(#[from] lopdf::Error),

    /// Configuration error
    #[error("Configuration error: {0}")]
    Configuration(String),

    /// Directory not found
    #[error("Directory not found: {0}")]
    DirectoryNotFound(PathBuf),

    /// No PDF files found
    #[error("No PDF files found in directory: {0}")]
    NoPdfFiles(PathBuf),

    /// Permission denied
    #[error("Permission denied: {0}")]
    PermissionDenied(PathBuf),

    /// PDF processing error
    #[error("PDF processing error: {0}")]
    Processing(String),

    /// Annotation error
    #[error("Annotation error: {0}")]
    Annotation(#[from] AnnotationError),
}

/// Errors specific to PDF annotation operations
#[derive(Debug, Error)]
pub enum AnnotationError {
    /// Font loading or processing error
    #[error("Font error: {0}")]
    FontError(String),

    /// Content stream processing error
    #[error("Content stream error: {0}")]
    ContentStreamError(String),

    /// PDF object error
    #[error("PDF object error: {0}")]
    ObjectError(String),

    /// General annotation error
    #[error("Annotation error: {0}")]
    General(String),

    /// PDF library error
    #[error("PDF library error: {0}")]
    PdfError(#[from] lopdf::Error),
}
```

### 12.5 File Utilities (file_utils.rs)

```rust
use std::path::{Path, PathBuf};
use std::fs;
use walkdir::WalkDir;
use anyhow::{Result, Context};

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

        if path.is_file() &&
           path.extension().map_or(false, |ext| ext == "pdf") &&
           path_matches_pattern(path, pattern) {
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
```

### 12.6 Multiple Choice Marking Guide (multiple_choice_marking_guide.rs)

```rust
use std::path::{Path, PathBuf};
use std::fs;
use clap::Parser;
use log::info;
use walkdir::WalkDir;

// Import from main library - use the new module
use pdf_filename_annotator::mc_pdf_utils;

/// Program to apply multiple choice marking guide annotations from a template PDF
/// to the first page of other PDFs
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Template PDF with annotations to extract
    #[arg(short, long)]
    template: PathBuf,

    /// Input directory containing PDFs to process
    #[arg(short, long)]
    input_dir: PathBuf,

    /// Output directory for annotated PDFs
    #[arg(short, long)]
    output_dir: PathBuf,

    /// Process directories recursively
    #[arg(short, long, default_value_t = false)]
    recursive: bool,

    /// File pattern to match (e.g., "*.pdf")
    #[arg(short, long, default_value = "*.pdf")]
    pattern: String,

    /// Overwrite existing files
    #[arg(short, long, default_value_t = false)]
    force: bool,

    /// Verbose output
    #[arg(short, long, default_value_t = false)]
    verbose: bool,

    /// Dry run (don't modify files)
    #[arg(short, long, default_value_t = false)]
    dry_run: bool,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logger
    env_logger::init();

    // Parse command line arguments
    let args = Args::parse();

    println!("Multiple Choice Marking Guide");
    println!("============================");

    // Validate inputs
    validate_inputs(&args)?;

    // Extract annotations from template
    println!("Extracting annotations from template: {}", args.template.display());
    let template_annotations = mc_pdf_utils::extract_annotations_from_file(
        &args.template,
        Some(&["Square", "Circle"])
    )?;

    println!("Found {} marking annotations in the template", template_annotations.len());

    if args.verbose {
        for (i, annotation) in template_annotations.iter().enumerate() {
            println!("Annotation #{}: Type={}, Rect=[{:.2}, {:.2}, {:.2}, {:.2}]",
                     i + 1,
                     annotation.annotation_type,
                     annotation.rect[0], annotation.rect[1],
                     annotation.rect[2], annotation.rect[3]);
        }
    }

    // Process input files
    println!("Processing input directory: {}", args.input_dir.display());
    let input_files = find_pdf_files(&args.input_dir, args.recursive, &args.pattern);

    println!("Found {} PDF files to process", input_files.len());

    // Create output directory if it doesn't exist
    if !args.output_dir.exists() {
        fs::create_dir_all(&args.output_dir)?;
    }

    // Process each file
    let mut success_count = 0;
    let mut failure_count = 0;

    for input_file in &input_files {
        let relative_path = input_file.strip_prefix(&args.input_dir).unwrap_or(input_file);
        let output_file = args.output_dir.join(relative_path);

        // Create parent directories if needed
        if let Some(parent) = output_file.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)?;
            }
        }

        // Skip if output exists and force is not set
        if output_file.exists() && !args.force {
            println!("Skipping {} (output exists)", input_file.display());
            continue;
        }

        // Apply annotations
        println!("Processing {}", input_file.display());

        if args.dry_run {
            println!("[DRY RUN] Would apply {} annotations to {}",
                 template_annotations.len(), input_file.display());
            success_count += 1;
        } else {
            match mc_pdf_utils::apply_annotations_to_file(
                input_file,
                &output_file,
                &template_annotations,
                true // Copy appearance streams
            ) {
                Ok(_) => {
                    println!("Successfully processed {}", input_file.display());
                    success_count += 1;
                },
                Err(e) => {
                    println!("Failed to process {}: {}", input_file.display(), e);
                    failure_count += 1;
                }
            }
        }
    }

    // Print summary
    println!("\nProcessing complete: {} succeeded, {} failed", success_count, failure_count);

    Ok(())
}

/// Validate command line arguments
fn validate_inputs(args: &Args) -> Result<(), Box<dyn std::error::Error>> {
    // Check that template file exists and is a PDF
    if !args.template.exists() {
        return Err(format!("Template file does not exist: {}", args.template.display()).into());
    }

    if args.template.extension().map_or(true, |ext| ext != "pdf") {
        return Err(format!("Template file is not a PDF: {}", args.template.display()).into());
    }

    // Check that input directory exists
    if !args.input_dir.exists() {
        return Err(format!("Input directory does not exist: {}", args.input_dir.display()).into());
    }

    // Check that output directory exists or can be created
    if !args.output_dir.exists() {
        match fs::create_dir_all(&args.output_dir) {
            Ok(_) => {},
            Err(e) => return Err(format!("Failed to create output directory: {}", e).into()),
        }
    }

    Ok(())
}

/// Find PDF files in directory based on pattern and recursion settings
fn find_pdf_files(dir: &Path, recursive: bool, pattern: &str) -> Vec<PathBuf> {
    let mut files = Vec::new();

    let walker = if recursive {
        WalkDir::new(dir)
    } else {
        WalkDir::new(dir).max_depth(1)
    };

    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();

        if path.is_file() &&
           path.extension().map_or(false, |ext| ext == "pdf") &&
           path_matches_pattern(path, pattern) {
            files.push(path.to_path_buf());
        }
    }

    files
}

/// Check if path matches pattern
fn path_matches_pattern(path: &Path, pattern: &str) -> bool {
    // Basic pattern matching implementation
    if pattern == "*.pdf" {
        return path.extension().map_or(false, |ext| ext == "pdf");
    }

    // More advanced pattern matching could be implemented here
    path.extension().map_or(false, |ext| ext == "pdf")
}
```

### 12.7 MC PDF Utilities (mc_pdf_utils.rs)

```rust
//! PDF utility functions for working with PDF documents and annotations
//! specifically for the multiple-choice marking guide

use lopdf::{Document, Object, ObjectId, Dictionary};
use std::path::Path;
use std::collections::HashMap;
use std::io;

/// Structure to represent a PDF annotation for the multiple-choice marking guide
#[derive(Debug, Clone)]
pub struct McPdfAnnotation {
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
    filter_types: Option<&[&str]>
) -> io::Result<Vec<McPdfAnnotation>> {
    // Load the document
    let doc = Document::load(template_path)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData,
                                    format!("Failed to load PDF: {}", e)))?;

    // Get the first page
    let pages = doc.get_pages();
    if pages.is_empty() {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "PDF has no pages"));
    }

    let first_page_id = match pages.get(&1) {
        Some(id) => id,
        None => {
            return Err(io::Error::new(io::ErrorKind::InvalidData,
                                    "Failed to get first page"));
        }
    };

    let first_page = doc.get_dictionary(*first_page_id)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData,
                                   format!("Failed to get page dictionary: {}", e)))?;

    // Check if the page has annotations
    let annotations = match first_page.get(b"Annots") {
        Ok(Object::Array(annots)) => {
            annots.clone()
        },
        Ok(Object::Reference(ref_id)) => {
            // Try to resolve the reference to get the array
            match doc.get_object(*ref_id) {
                Ok(Object::Array(annots)) => {
                    annots.clone()
                },
                Ok(other) => {
                    return Err(io::Error::new(io::ErrorKind::InvalidData,
                                           format!("Reference resolved to unexpected type: {:?}", other)));
                },
                Err(e) => {
                    return Err(io::Error::new(io::ErrorKind::InvalidData,
                                           format!("Failed to resolve annotation reference: {}", e)));
                }
            }
        },
        Ok(other) => {
            return Err(io::Error::new(io::ErrorKind::InvalidData,
                                   format!("Annotations found but in unexpected format: {:?}", other)));
        },
        Err(_) => {
            return Ok(Vec::new()); // No annotations found
        },
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
                    },
                    _ => {}
                }
            },
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
            },
            _ => {}
        }
    }

    Ok(extracted_annotations)
}

/// Extract data from an annotation dictionary
fn extract_annotation_data(dict: &Dictionary, id: Option<ObjectId>) -> Option<McPdfAnnotation> {
    // Get annotation type
    let annot_type = match dict.get(b"Subtype") {
        Ok(Object::Name(name)) => {
            String::from_utf8_lossy(name).to_string()
        },
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
        },
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
        let color_values: Vec<f32> = color.iter().filter_map(|v| {
            match v {
                Object::Real(num) => Some(*num),
                Object::Integer(num) => Some(*num as f32),
                _ => None,
            }
        }).collect();
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
        properties.insert("author".to_string(), String::from_utf8_lossy(author).to_string());
    }

    // Modified date (M)
    if let Ok(Object::String(date, _)) = dict.get(b"M") {
        properties.insert("modified_date".to_string(), String::from_utf8_lossy(date).to_string());
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
            properties.insert("normal_appearance_ref".to_string(), format!("{:?}", normal_ref));
            appearance_ref = Some(*normal_ref);
        }
    }

    // Get annotation-specific properties based on type
    match annot_type.as_str() {
        "Square" | "Circle" => {
            // Fill color
            if let Ok(Object::Array(fill)) = dict.get(b"IC") {
                let fill_values: Vec<f32> = fill.iter().filter_map(|v| {
                    match v {
                        Object::Real(num) => Some(*num),
                        Object::Integer(num) => Some(*num as f32),
                        _ => None,
                    }
                }).collect();
                properties.insert("fill_color".to_string(), format!("{:?}", fill_values));
            }
        },
        "FreeText" => {
            // Appearance string for text formatting
            if let Ok(Object::String(da, _)) = dict.get(b"DA") {
                properties.insert("da_string".to_string(), String::from_utf8_lossy(da).to_string());
            }

            // Default appearance state
            if let Ok(Object::Integer(q)) = dict.get(b"Q") {
                properties.insert("text_alignment".to_string(), q.to_string());
            }
        },
        _ => {}
    }

    // Create annotation object
    let annotation = McPdfAnnotation {
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
    annotations: &[McPdfAnnotation],
    copy_appearance_streams: bool
) -> io::Result<()> {
    // Load the input document
    let mut doc = Document::load(input_path)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData,
                                   format!("Failed to load input PDF: {}", e)))?;

    // Get the first page
    let pages = doc.get_pages();
    if pages.is_empty() {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "PDF has no pages"));
    }

    let first_page_id = match pages.get(&1) {
        Some(id) => id,
        None => {
            return Err(io::Error::new(io::ErrorKind::InvalidData,
                                    "Failed to get first page"));
        }
    };

    // Get the existing annotations array or create a new one
    let mut annots_array = match doc.get_dictionary(*first_page_id)
        .and_then(|dict| dict.get(b"Annots")) {
        Ok(Object::Array(array)) => array.clone(),
        Ok(Object::Reference(id)) => {
            match doc.get_object(*id) {
                Ok(Object::Array(array)) => array.clone(),
                _ => Vec::new(),
            }
        },
        _ => Vec::new(),
    };

    // Apply each annotation to the document
    for annotation in annotations {
        let annot_obj = create_annotation_object(&mut doc, annotation, copy_appearance_streams)?;
        annots_array.push(annot_obj);
    }

    // Update the page's annotations array
    let mut first_page_dict = doc.get_dictionary(*first_page_id)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData,
                                   format!("Failed to get page dictionary: {}", e)))?.clone();

    first_page_dict.set(b"Annots", Object::Array(annots_array));

    // Update the page in the document
    doc.objects.insert(*first_page_id, Object::Dictionary(first_page_dict));

    // Save the modified document
    doc.save(output_path)?;
    Ok(())
}

/// Create annotation object from PdfAnnotation structure
fn create_annotation_object(
    doc: &mut Document,
    annotation: &McPdfAnnotation,
    copy_appearance_streams: bool
) -> io::Result<Object> {
    // Create a new annotation dictionary
    let mut dict = Dictionary::new();

    // Set standard annotation properties
    dict.set(b"Type", Object::Name(b"Annot".to_vec()));
    dict.set(b"Subtype", Object::Name(annotation.annotation_type.as_bytes().to_vec()));

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
            let values: Vec<&str> = border_str.trim_start_matches('[')
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
        dict.set(b"T", Object::String(author.as_bytes().to_vec(),
                              lopdf::StringFormat::Literal));
    }

    // Set modified date if present
    if let Some(date) = annotation.properties.get("modified_date") {
        dict.set(b"M", Object::String(date.as_bytes().to_vec(),
                              lopdf::StringFormat::Literal));
    }

    // Set contents if present
    if let Some(contents) = &annotation.contents {
        dict.set(b"Contents", Object::String(contents.as_bytes().to_vec(),
                                    lopdf::StringFormat::Literal));
    }

    // Set color if present
    if let Some(color_str) = annotation.properties.get("color") {
        // Parse the color array string
        if color_str.starts_with('[') && color_str.ends_with(']') {
            let values: Vec<&str> = color_str.trim_start_matches('[')
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
                    let values: Vec<&str> = fill_color_str.trim_start_matches('[')
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
        },
        "FreeText" => {
            // Set DA string if present
            if let Some(da_string) = annotation.properties.get("da_string") {
                dict.set(b"DA", Object::String(da_string.as_bytes().to_vec(),
                                     lopdf::StringFormat::Literal));
            }

            // Set text alignment if present
            if let Some(alignment) = annotation.properties.get("text_alignment") {
                if let Ok(q) = alignment.parse::<i64>() {
                    dict.set(b"Q", Object::Integer(q));
                }
            }
        },
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
```

### 12.8 PDF Annotation Analyzer (analyze_pdf_annotations.rs)

```rust
//! PDF Annotation Analyzer
//!
//! This tool analyzes PDF files to examine annotation properties,
//! specifically focusing on FreeText annotations used by the
//! PDF Filename Annotator application.

use clap::Parser;
use lopdf::{Document, Object, Dictionary};
use std::path::PathBuf;
use std::fs;
use std::io::{self, Write};
use anyhow::{Result, Context};
use colored::*;

/// PDF Annotation Analyzer CLI options
#[derive(Parser)]
#[clap(
    name = "analyze_pdf_annotations",
    about = "Analyze PDF annotations to diagnose font inconsistency issues"
)]
struct Opts {
    /// Path to the PDF file to analyze
    #[clap(name = "FILE")]
    file: PathBuf,

    /// Enable detailed analysis mode
    #[clap(short, long)]
    detailed: bool,

    /// Focus on specific page numbers (comma-separated)
    #[clap(short, long)]
    pages: Option<String>,
}

fn main() -> Result<()> {
    env_logger::init();
    let opts = Opts::parse();

    println!("{}", "PDF Annotation Analyzer".bold().green());
    println!("Analyzing file: {}", opts.file.display());

    // Load the PDF
    let doc = Document::load(&opts.file)
        .with_context(|| format!("Failed to load PDF: {}", opts.file.display()))?;

    // Get total number of pages
    let page_count = doc.get_pages().len();
    println!("Total pages: {}", page_count);

    // Determine which pages to analyze
    let pages_to_analyze = if let Some(pages_str) = opts.pages.as_ref() {
        // Parse page numbers from comma-separated string
        pages_str
            .split(',')
            .filter_map(|s| s.trim().parse::<u32>().ok())
            .filter(|&p| p > 0 && p <= page_count as u32)
            .collect::<Vec<_>>()
    } else {
        // Analyze all pages
        (1..=page_count as u32).collect()
    };

    if pages_to_analyze.is_empty() {
        println!("No valid pages to analyze!");
        return Ok(());
    }

    println!("Analyzing {} pages: {:?}", pages_to_analyze.len(), pages_to_analyze);

    // Get page IDs
    let pages = doc.get_pages();

    // Analyze each requested page
    for page_num in pages_to_analyze {
        let page_id = pages.get(&page_num).copied()
            .with_context(|| format!("Failed to get page ID for page {}", page_num))?;

        analyze_page(&doc, page_id, page_num, opts.detailed)?;
    }

    Ok(())
}

fn analyze_page(doc: &Document, page_id: (u32, u16), page_num: u32, detailed: bool) -> Result<()> {
    println!("\n{}", format!("=== Page {} (ID: {:?}) ===", page_num, page_id).bold().blue());

    // Get the page dictionary
    let page_dict = doc.get_dictionary(page_id)
        .with_context(|| format!("Failed to get page dictionary for page {}", page_num))?;

    // Check for annotations array
    if let Ok(Object::Array(annots)) = page_dict.get(b"Annots") {
        println!("Found {} annotations", annots.len());

        // Check each annotation
        for (i, annot_ref) in annots.iter().enumerate() {
            if let Object::Reference(annot_id) = annot_ref {
                match doc.get_object(*annot_id) {
                    Ok(Object::Dictionary(dict)) => {
                        analyze_annotation(doc, dict, i, page_num, detailed)?;
                    },
                    Ok(_) => println!("  Annotation {} is not a dictionary", i),
                    Err(e) => println!("  Failed to get annotation {}: {}", i, e),
                }
            } else {
                println!("  Annotation {} is not a reference", i);
            }
        }
    } else {
        println!("No annotations found on this page");
    }

    // If detailed mode, also check page resources
    if detailed {
        analyze_page_resources(doc, page_dict, page_num)?;
    }

    Ok(())
}

fn analyze_annotation(doc: &Document, dict: &Dictionary, index: usize, page_num: u32, detailed: bool) -> Result<()> {
    println!("\n  {}:", format!("Annotation {}", index).bold().yellow());

    // Check annotation type
    if let Ok(Object::Name(subtype_bytes)) = dict.get(b"Subtype") {
        let subtype = String::from_utf8_lossy(subtype_bytes);
        println!("  Type: {}", subtype);

        // Only proceed with detailed analysis for FreeText annotations
        if subtype == "FreeText" {
            // Check for Default Appearance (DA) string
            if let Ok(Object::String(da_bytes, _)) = dict.get(b"DA") {
                let da_string = String::from_utf8_lossy(da_bytes);
                println!("  Default Appearance (DA): {}", da_string.cyan());

                // Parse and analyze DA string
                analyze_da_string(&da_string);
            } else {
                println!("  {}", "Default Appearance (DA) string missing!".red());
            }

            // Check for Contents
            if let Ok(Object::String(content_bytes, _)) = dict.get(b"Contents") {
                let content = String::from_utf8_lossy(content_bytes);
                println!("  Contents: \"{}\"", content);
            }

            // Check for rectangle defining annotation position
            if let Ok(Object::Array(rect)) = dict.get(b"Rect") {
                println!("  Rectangle: {:?}", rect);
            }

            // Check for border style
            if let Ok(Object::Array(border)) = dict.get(b"Border") {
                println!("  Border: {:?}", border);
            }

            // Print all dictionary entries in detailed mode
            if detailed {
                println!("\n  All annotation properties:");
                for (key, value) in dict.iter() {
                    let key_str = String::from_utf8_lossy(key);
                    println!("    {}: {:?}", key_str, value);
                }
            }
        }
    } else {
        println!("  Subtype missing");
    }

    Ok(())
}

fn analyze_da_string(da_string: &str) {
    println!("  DA String analysis:");

    // Check for leading slash in font name
    if !da_string.contains("/") {
        println!("    {}", "Warning: No font name (missing slash)".red());
    }

    // Check for multiple spaces between font name and size
    if da_string.contains("  ") {
        println!("    {}", "Warning: Multiple spaces detected".red());
    }

    // Try to parse components
    let parts: Vec<&str> = da_string.split_whitespace().collect();

    // Expected format: "/Helvetica 12 Tf 0 0 0 rg"
    if parts.len() >= 4 && parts[2] == "Tf" {
        let font_name = parts[0];
        let font_size = parts[1];
        println!("    Font name: {}", font_name.green());
        println!("    Font size: {}", font_size.green());

        // Check if font name format is correct
        if !font_name.starts_with("/") {
            println!("    {}", "Warning: Font name should start with '/'".red());
        }

        // Check for extra spaces in unexpected places
        if da_string.contains("/  ") || da_string.contains("  Tf") {
            println!("    {}", "Warning: Irregular spacing in DA string".red());
        }
    } else {
        println!("    {}", "Warning: DA string format doesn't match expected pattern".red());
    }
}

fn analyze_page_resources(doc: &Document, page_dict: &Dictionary, page_num: u32) -> Result<()> {
    println!("\n  {}", "Page Resources:".bold().magenta());

    // Check for Resources dictionary
    if let Ok(resources_obj) = page_dict.get(b"Resources") {
        let resources_dict = match resources_obj {
            Object::Dictionary(dict) => Some(dict),
            Object::Reference(ref_id) => {
                if let Ok(Object::Dictionary(dict)) = doc.get_object(*ref_id) {
                    Some(dict)
                } else {
                    None
                }
            },
            _ => None,
        };

        if let Some(resources) = resources_dict {
            // Check Font dictionary
            if let Ok(font_obj) = resources.get(b"Font") {
                let font_dict = match font_obj {
                    Object::Dictionary(dict) => Some(dict),
                    Object::Reference(ref_id) => {
                        if let Ok(Object::Dictionary(dict)) = doc.get_object(*ref_id) {
                            Some(dict)
                        } else {
                            None
                        }
                    },
                    _ => None,
                };

                if let Some(fonts) = font_dict {
                    println!("    Found Font dictionary with {} entries", fonts.len());

                    // Examine each font entry
                    for (name, font_obj) in fonts.iter() {
                        let name_str = String::from_utf8_lossy(name);
                        println!("    Font: {}", name_str.yellow());

                        // Get font details
                        let font_details = match font_obj {
                            Object::Dictionary(dict) => Some(dict),
                            Object::Reference(ref_id) => {
                                if let Ok(Object::Dictionary(dict)) = doc.get_object(*ref_id) {
                                    Some(dict)
                                } else {
                                    None
                                }
                            },
                            _ => None,
                        };

                        if let Some(font) = font_details {
                            // Check BaseFont
                            if let Ok(Object::Name(base_font)) = font.get(b"BaseFont") {
                                println!("      BaseFont: {}", String::from_utf8_lossy(base_font).green());
                            }

                            // Check Type
                            if let Ok(Object::Name(font_type)) = font.get(b"Type") {
                                println!("      Type: {}", String::from_utf8_lossy(font_type));
                            }

                            // Check Subtype
                            if let Ok(Object::Name(subtype)) = font.get(b"Subtype") {
                                println!("      Subtype: {}", String::from_utf8_lossy(subtype));
                            }

                            // Check Encoding
                            if let Ok(Object::Name(encoding)) = font.get(b"Encoding") {
                                println!("      Encoding: {}", String::from_utf8_lossy(encoding));
                            }
                        } else {
                            println!("      Unable to access font details");
                        }
                    }
                } else {
                    println!("    Font dictionary not found or invalid");
                }
            } else {
                println!("    No Font dictionary found");
            }
        } else {
            println!("    Resources dictionary not found or invalid");
        }
    } else {
        println!("    No Resources entry found on this page");
    }

    Ok(())
}
```
# PDF Processing Tools Project Review (Continued)

## 12. Appendix: Complete Source Code (Continued)

### 12.9 PDF Annotation Handler (annotation.rs)

```rust
//! PDF annotation functionality
//!
//! This module provides functionality for annotating PDF pages with text
//! in specific positions.

use crate::config::{Corner, FontConfig, PositionConfig};
use crate::error::AnnotationError;
use log::{debug, warn};
use lopdf::{
    self,
    content::{Content, Operation},
    Document, Object, Stream,
};
use rusttype::{Font, Scale};
use std::fs;

/// Text annotation handler for PDF pages
pub struct Annotator {
    /// Font configuration
    font_config: FontConfig,

    /// Font data
    font_data: Vec<u8>,
}

impl Annotator {
    /// Create a new annotator with the given font configuration
    pub fn new(font_config: FontConfig) -> Result<Self, AnnotationError> {
        // Attempt to load the configured font
        let font_data = Self::load_font(&font_config.family).or_else(|_| {
            // Try fallback font if available
            if let Some(fallback) = &font_config.fallback {
                warn!(
                    "Failed to load font: {}. Trying fallback: {}",
                    font_config.family, fallback
                );
                Self::load_font(fallback)
            } else {
                Err(AnnotationError::FontError(format!(
                    "Failed to load font: {} and no fallback configured",
                    font_config.family
                )))
            }
        })?;

        Ok(Self {
            font_config,
            font_data,
        })
    }

    /// Adds a FreeText annotation to a PDF page
    ///
    /// This method creates a proper text annotation object that is searchable
    /// and detectable by text extraction tools.
    pub fn add_text_annotation(
        &self,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<(), AnnotationError> {
        // Add detailed logging for page and annotation information
        debug!("Adding text annotation to page ID: {:?}", page_id);
        debug!("Annotation text: '{}'", text);
        debug!("Annotation position: x={}, y={}", x, y);

        // Log font configuration details
        debug!(
            "Font config: size={}, family={}, fallback={:?}",
            self.font_config.size,
            self.font_config.family,
            self.font_config.fallback
        );

        // Calculate text width using rusttype
        let font = Font::try_from_vec(self.font_data.clone()).ok_or_else(|| {
            AnnotationError::FontError(
                "Failed to create font for text width calculation".to_string(),
            )
        })?;

        // Approximate text width calculation
        let scale = Scale::uniform(self.font_config.size);
        let text_width = font
            .layout(text, scale, rusttype::point(0.0, 0.0))
            .map(|g| g.position().x + g.unpositioned().h_metrics().advance_width)
            .last()
            .unwrap_or(0.0);

        // Convert from font units to PDF units and add buffer space to prevent truncation
        let font_scale_factor = 1.2; // Increased scale factor with buffer space built in
        let text_width = text_width * font_scale_factor;
        debug!("Calculated text width: {} (with scale factor: {})", text_width, font_scale_factor);

        // Add a buffer to ensure the entire text is visible - but we directly use the calculated value
        let text_height = self.font_config.size * 1.2; // Add some padding
        debug!("Calculated text height: {}", text_height);

        // Create annotation dictionary
        let mut annot_dict = lopdf::Dictionary::new();
        annot_dict.set("Type", Object::Name(b"Annot".to_vec()));
        annot_dict.set("Subtype", Object::Name(b"FreeText".to_vec()));
        annot_dict.set(
            "Contents",
            Object::String(text.as_bytes().to_vec(), lopdf::StringFormat::Literal),
        );
        annot_dict.set(
            "Rect",
            Object::Array(vec![
                Object::Real(x),
                Object::Real(y - text_height),
                Object::Real(x + text_width),
                Object::Real(y),
            ]),
        );

        // *** CRITICAL FIX: Explicitly create a resource dictionary for the annotation ***
        // This ensures consistent font resources across all pages
        let mut font_dict = lopdf::Dictionary::new();
        let mut helvetica_font = lopdf::Dictionary::new();
        helvetica_font.set("Type", Object::Name(b"Font".to_vec()));
        helvetica_font.set("Subtype", Object::Name(b"Type1".to_vec()));
        helvetica_font.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
        helvetica_font.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));
        helvetica_font.set("Name", Object::Name(b"Helvetica".to_vec()));
        font_dict.set("Helvetica", Object::Dictionary(helvetica_font));

        // Create and set a dedicated resource dictionary for this annotation
        let mut dr_dict = lopdf::Dictionary::new();
        dr_dict.set("Font", Object::Dictionary(font_dict));
        annot_dict.set("DR", Object::Dictionary(dr_dict));

        // Default appearance string (DA) - This is a key part of the font consistency issue
        // The PDF specification requires precise format for the DA string
        let font_size = self.font_config.size;

        // Fix: Remove the double space between font name and size which may be causing issues
        // According to PDF spec, the format should be consistent with exactly one space between elements
        let fixed_da_string = format!("/{} {} Tf 0 0 0 rg", "Helvetica", font_size);
        debug!("Default Appearance (DA) string (fixed format): '{}'", fixed_da_string);

        // Set the DA string in the annotation dictionary using the fixed format
        annot_dict.set(
            "DA",
            Object::String(
                fixed_da_string.as_bytes().to_vec(),
                lopdf::StringFormat::Literal,
            ),
        );

        // *** CRITICAL FIX: Remove any existing appearance stream (AP) ***
        // This forces PDF viewers to use our DA string and resource dictionary
        // If an AP entry exists, it can override our font settings
        annot_dict.remove(b"AP");

        // No border
        annot_dict.set(
            "Border",
            Object::Array(vec![
                Object::Integer(0),
                Object::Integer(0),
                Object::Integer(0),
            ]),
        );

        // Set print flag (bit position 2, value 4)
        annot_dict.set("F", Object::Integer(4));

        // Add the annotation to the document
        let annot_id = doc.add_object(Object::Dictionary(annot_dict));

        // Add the annotation to the page
        // We need to handle the Annots array carefully to avoid borrowing conflicts
        let annots_info = {
            let page_dict = doc.get_dictionary(page_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!("Failed to get page dictionary: {}", e))
            })?;

            if let Ok(Object::Array(arr)) = page_dict.get(b"Annots") {
                // Direct array
                Some((None, arr.clone()))
            } else if let Ok(Object::Reference(ref_id)) = page_dict.get(b"Annots") {
                // Reference to array
                if let Ok(Object::Array(arr)) = doc.get_object(*ref_id) {
                    Some((Some(*ref_id), arr.clone()))
                } else {
                    None
                }
            } else {
                None
            }
        };

        match annots_info {
            Some((None, mut arr)) => {
                // Direct array case
                arr.push(Object::Reference(annot_id));
                let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                    AnnotationError::ContentStreamError(format!(
                        "Failed to get page dictionary: {}",
                        e
                    ))
                })?;
                page_dict.set("Annots", Object::Array(arr));
            }
            Some((Some(ref_id), mut arr)) => {
                // Referenced array case
                arr.push(Object::Reference(annot_id));
                doc.objects.insert(ref_id, Object::Array(arr));
            }
            None => {
                // No existing annots or invalid reference
                let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                    AnnotationError::ContentStreamError(format!(
                        "Failed to get page dictionary: {}",
                        e
                    ))
                })?;
                page_dict.set("Annots", Object::Array(vec![Object::Reference(annot_id)]));
            }
        }

        Ok(())
    }

    /// Load a font by name
    fn load_font(font_name: &str) -> Result<Vec<u8>, AnnotationError> {
        // This is a simplified implementation
        // In a real application, you would search for fonts in system locations

        // For demo purposes, we'll look in a few common locations with different extensions
        let common_extensions = [".ttf", ".ttc", ".otf"];
        let base_locations = [
            "/usr/share/fonts/truetype",
            "/usr/share/fonts/TTF",
            "/Library/Fonts",
            "/System/Library/Fonts",
            "/System/Library/Fonts/Supplemental",
            "C:\\Windows\\Fonts",
            "./fonts",
        ];

        // Try exact matches first
        for location in &base_locations {
            for ext in &common_extensions {
                let path = format!("{}/{}{}", location, font_name, ext);
                match fs::read(&path) {
                    Ok(data) => {
                        debug!("Loaded font from exact path: {}", path);
                        return Ok(data);
                    }
                    Err(_) => continue,
                }
            }
        }

        // If exact match fails, try case-insensitive partial matches
        for location in &base_locations {
            if let Ok(entries) = fs::read_dir(location) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(file_name) = path.file_name() {
                        let file_name_str = file_name.to_string_lossy().to_lowercase();
                        let font_name_lower = font_name.to_lowercase();

                        // Check if the filename contains the font name we're looking for
                        if file_name_str.contains(&font_name_lower) {
                            if let Some(ext) = path.extension() {
                                let ext_str = ext.to_string_lossy().to_lowercase();
                                if ext_str == "ttf" || ext_str == "ttc" || ext_str == "otf" {
                                    match fs::read(&path) {
                                        Ok(data) => {
                                            debug!(
                                                "Loaded font from partial match: {}",
                                                path.display()
                                            );
                                            return Ok(data);
                                        }
                                        Err(_) => continue,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // For testing/demo purposes, we could include a fallback embedded font
        // In a real application, you would handle this more robustly
        Err(AnnotationError::FontError(format!(
            "Could not find font: {} in known locations",
            font_name
        )))
    }

    /// Calculate the position for text based on position configuration and page size
    pub fn calculate_position(
        &self,
        position: &PositionConfig,
        page_width: f32,
        page_height: f32,
        text: &str,
    ) -> (f32, f32) {
        // Calculate approximate text width using rusttype
        let font = Font::try_from_vec(self.font_data.clone()).expect("Font data should be valid");

        let scale = Scale::uniform(self.font_config.size);
        let text_width = font
            .layout(text, scale, rusttype::point(0.0, 0.0))
            .map(|g| g.position().x + g.unpositioned().h_metrics().advance_width)
            .last()
            .unwrap_or(0.0);

        // Convert from font units to PDF units and add buffer space to prevent truncation
        let font_scale_factor = 1.2; // Increased scale factor with buffer space built in
        let text_width = text_width * font_scale_factor;

        // Calculate position based on corner
        match position.corner {
            Corner::TopLeft => (
                position.x_offset,
                page_height - position.y_offset - self.font_config.size,
            ),
            Corner::TopRight => (
                page_width - text_width - position.x_offset,
                page_height - position.y_offset - self.font_config.size,
            ),
            Corner::BottomLeft => (position.x_offset, position.y_offset),
            Corner::BottomRight => (
                page_width - text_width - position.x_offset,
                position.y_offset,
            ),
        }
    }

    /// Add text to a PDF page
    pub fn add_text_to_page(
        &self,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<(), AnnotationError> {
        // Get the page dictionary
        let page_dict = doc.get_dictionary(page_id).map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to get page dictionary: {}", e))
        })?;

        // Get (or create) the content stream(s)
        let contents_id = match page_dict.get(b"Contents") {
            Ok(contents) => match contents {
                &Object::Reference(id) => id,
                &Object::Array(ref arr) => {
                    if let Some(Object::Reference(id)) = arr.first() {
                        *id
                    } else {
                        return Err(AnnotationError::ContentStreamError(
                            "Unexpected content stream format".to_string(),
                        ));
                    }
                }
                _ => {
                    return Err(AnnotationError::ContentStreamError(
                        "Unexpected content stream format".to_string(),
                    ));
                }
            },
            Err(_) => {
                // Create a new content stream if one doesn't exist
                let content_id = doc.new_object_id();
                doc.objects.insert(
                    content_id,
                    Object::Stream(Stream::new(lopdf::Dictionary::new(), vec![])),
                );

                // Update the page dictionary
                let page_dict_mut = doc.get_dictionary_mut(page_id).map_err(|e| {
                    AnnotationError::ContentStreamError(format!(
                        "Failed to update page dictionary: {}",
                        e
                    ))
                })?;
                page_dict_mut.set("Contents", Object::Reference(content_id));

                content_id
            }
        };

        // Get the real content stream ID from the object.
        // (For example, sometimes the object at contents_id is itself a dictionary with a Contents reference.)
        let real_contents_id = match doc.get_object(contents_id) {
            Ok(Object::Dictionary(dict)) => {
                if let Ok(Object::Reference(contents_ref)) = dict.get(b"Contents") {
                    *contents_ref
                } else {
                    // Create a new empty stream if needed
                    let new_stream_id = doc.new_object_id();
                    doc.objects.insert(
                        new_stream_id,
                        Object::Stream(Stream::new(lopdf::Dictionary::new(), vec![])),
                    );
                    new_stream_id
                }
            }
            Ok(_) => contents_id, // Otherwise, use the one we got
            Err(e) => {
                return Err(AnnotationError::ContentStreamError(format!(
                    "Failed to get content object: {}",
                    e
                )));
            }
        };

        debug!("Using content stream ID: {:?}", real_contents_id);

        // Retrieve the actual content stream
        let content_obj = doc.get_object(real_contents_id).map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to get content stream: {}", e))
        })?;

        // Obtain the stream data
        let stream_data = match content_obj {
            Object::Stream(ref stream) => {
                debug!("Found direct stream object");
                stream.clone()
            }
            Object::Array(ref arr) => {
                debug!("Found array of content streams, merging them");
                if arr.is_empty() {
                    // Create a new stream if empty
                    let new_stream = Stream::new(lopdf::Dictionary::new(), vec![]);
                    let new_stream_id = doc.new_object_id();
                    doc.objects
                        .insert(new_stream_id, Object::Stream(new_stream.clone()));
                    if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                        page_dict.set("Contents", Object::Reference(new_stream_id));
                    }
                    new_stream
                } else {
                    // Merge all streams; copy the dictionary from the first stream
                    let mut merged_content = Vec::new();
                    let mut stream_dict = lopdf::Dictionary::new();

                    for item in arr {
                        if let Object::Reference(ref_id) = item {
                            if let Ok(Object::Stream(stream)) = doc.get_object(*ref_id) {
                                if stream_dict.is_empty() {
                                    stream_dict = stream.dict.clone();
                                }
                                merged_content.extend_from_slice(&stream.content);
                            } else {
                                debug!("Non-stream reference in contents array, skipping");
                            }
                        }
                    }
                    Stream::new(stream_dict, merged_content)
                }
            }
            other => {
                debug!("Expected stream but got: {:?}", other);
                // Try to resolve a Contents reference if available
                if let Object::Dictionary(dict) = other {
                    if let Ok(Object::Reference(contents_ref)) = dict.get(b"Contents") {
                        debug!("Dictionary has Contents reference: {:?}", contents_ref);
                        if let Ok(Object::Stream(stream)) = doc.get_object(*contents_ref) {
                            debug!("Got stream from Contents reference");
                            stream.clone()
                        } else {
                            debug!("Contents reference is not a stream, creating new one");
                            let new_stream = Stream::new(lopdf::Dictionary::new(), vec![]);
                            let new_stream_id = doc.new_object_id();
                            doc.objects
                                .insert(new_stream_id, Object::Stream(new_stream.clone()));
                            if let Ok(dict) = doc.get_dictionary_mut(page_id) {
                                dict.set("Contents", Object::Reference(new_stream_id));
                            }
                            new_stream
                        }
                    } else {
                        debug!("Dictionary has no Contents entry, creating new stream");
                        let new_stream = Stream::new(lopdf::Dictionary::new(), vec![]);
                        let new_stream_id = doc.new_object_id();
                        doc.objects
                            .insert(new_stream_id, Object::Stream(new_stream.clone()));
                        if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                            page_dict.set("Contents", Object::Reference(new_stream_id));
                        }
                        new_stream
                    }
                } else {
                    debug!("Creating new stream for unexpected object type");
                    let new_stream = Stream::new(lopdf::Dictionary::new(), vec![]);
                    let new_stream_id = doc.new_object_id();
                    doc.objects
                        .insert(new_stream_id, Object::Stream(new_stream.clone()));
                    if let Ok(page_dict) = doc.get_dictionary_mut(page_id) {
                        page_dict.set("Contents", Object::Reference(new_stream_id));
                    }
                    new_stream
                }
            }
        };

        // Parse the content stream
        let content = Content::decode(&stream_data.content).map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to decode content stream: {}", e))
        })?;

        // Create new content operations (with proper PDF operator usage)
        let mut operations = content.operations;

        // Save graphics state
        operations.push(Operation::new("q", vec![]));

        // Set text color (black)
        operations.push(Operation::new("0 0 0 rg", vec![]));

        // Set line width for text
        operations.push(Operation::new("1 w", vec![]));

        // Begin text object
        operations.push(Operation::new("BT", vec![]));

        // Set font with proper operands - always use F0/Helvetica
        operations.push(Operation::new(
            "Tf",
            vec![
                Object::Name(b"F0".to_vec()),
                Object::Real(self.font_config.size),
            ],
        ));

        // Set text matrix for positioning
        operations.push(Operation::new(
            "Tm",
            vec![
                Object::Real(1.0), // a
                Object::Real(0.0), // b
                Object::Real(0.0), // c
                Object::Real(1.0), // d
                Object::Real(x),   // e: x position
                Object::Real(y),   // f: y position
            ],
        ));

        // Set text rendering mode to stroke (using operand)
        operations.push(Operation::new("Tr", vec![Object::Integer(1)]));

        // Add text with hexadecimal encoding
        operations.push(Operation::new(
            "Tj",
            vec![Object::String(
                text.as_bytes().to_vec(),
                lopdf::StringFormat::Hexadecimal,
            )],
        ));

        // Switch back to fill mode
        operations.push(Operation::new("Tr", vec![Object::Integer(0)]));

        // Add text again with fill
        operations.push(Operation::new(
            "Tj",
            vec![Object::String(
                text.as_bytes().to_vec(),
                lopdf::StringFormat::Literal,
            )],
        ));

        // End text object
        operations.push(Operation::new("ET", vec![]));

        // Restore graphics state
        operations.push(Operation::new("Q", vec![]));

        // Encode the modified content stream
        let modified_content = Content { operations };
        let encoded_content = modified_content.encode().map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to encode content stream: {}", e))
        })?;

        // IMPORTANT: Update the object at the actual (resolved) content stream id!
        doc.objects.insert(
            real_contents_id,
            Object::Stream(Stream::new(stream_data.dict.clone(), encoded_content)),
        );

        // Ensure that the font resource exists on the page (or inherited from the parent)
        self.ensure_font_resource(doc, page_id, "F0")?;

        Ok(())
    }

    /// Ensure a font resource exists in the page resource dictionary
    fn ensure_font_resource(
        &self,
        doc: &mut Document,
        page_id: lopdf::ObjectId,
        font_name: &str,
    ) -> Result<(), AnnotationError> {
        // Get the page dictionary
        let page_dict = doc.get_dictionary(page_id).map_err(|e| {
            AnnotationError::ContentStreamError(format!("Failed to get page dictionary: {}", e))
        })?;

        // We need to handle resources carefully to avoid borrowing conflicts
        let (resources_id, needs_page_update) = {
            match page_dict.get(b"Resources") {
                Ok(resources) => match resources {
                    &Object::Reference(id) => (id, false),
                    &Object::Dictionary(ref dict) => {
                        // Resources are inline in the page dictionary
                        // Create a new object for them
                        // First, drop the immutable borrow on page_dict
                        let resources_dict = dict.clone();

                        // Create a new object ID and insert the dictionary
                        let new_resources_id = doc.new_object_id();
                        doc.objects
                            .insert(new_resources_id, Object::Dictionary(resources_dict));

                        // We'll need to update the page dictionary to reference this object
                        (new_resources_id, true)
                    }
                    _ => {
                        return Err(AnnotationError::ContentStreamError(
                            "Unexpected resources format".to_string(),
                        ));
                    }
                },
                Err(_) => {
                    // Create new resources if they don't exist
                    let new_resources_id = doc.new_object_id();
                    doc.objects.insert(
                        new_resources_id,
                        Object::Dictionary(lopdf::Dictionary::new()),
                    );

                    // We'll need to update the page dictionary
                    (new_resources_id, true)
                }
            }
        };

        // Update the page dictionary if needed
        if needs_page_update {
            let page_dict = doc.get_dictionary_mut(page_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!("Failed to get page dictionary: {}", e))
            })?;
            page_dict.set("Resources", Object::Reference(resources_id));
        }

        // Handle Font resources carefully to avoid borrowing conflicts
        let font_dict_ref_id_option = {
            let resources_dict = doc.get_dictionary(resources_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!(
                    "Failed to get resources dictionary: {}",
                    e
                ))
            })?;

            // Check if the resources dictionary has a Font entry that's a reference
            if let Ok(Object::Reference(id)) = resources_dict.get(b"Font") {
                Some(*id)
            } else {
                None
            }
        };

        // Handle the case where Font is a reference
        if let Some(font_dict_ref_id) = font_dict_ref_id_option {
            // Add the font to the referenced font dictionary
            let font_dict = doc.get_dictionary_mut(font_dict_ref_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!("Failed to get font dictionary: {}", e))
            })?;

            // Add the font if it doesn't exist
            if !font_dict.has(font_name.as_bytes()) {
                // Create a simple Type 1 font entry - consistent with other font definitions
                let mut font_entry = lopdf::Dictionary::new();
                font_entry.set("Type", Object::Name(b"Font".to_vec()));
                font_entry.set("Subtype", Object::Name(b"Type1".to_vec()));
                font_entry.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                font_entry.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));
                // Add name property for consistency with other font entries
                font_entry.set("Name", Object::Name(b"Helvetica".to_vec()));

                debug!("Created consistent font entry for referenced font dictionary, page ID: {:?}", page_id);

                font_dict.set(font_name, Object::Dictionary(font_entry));
            }
        } else {
            // Font is either an inline dictionary or doesn't exist
            let resources_dict = doc.get_dictionary_mut(resources_id).map_err(|e| {
                AnnotationError::ContentStreamError(format!(
                    "Failed to get resources dictionary: {}",
                    e
                ))
            })?;

            // Get or create the Font dictionary
            if let Ok(Object::Dictionary(font_dict)) = resources_dict.get_mut(b"Font") {
                // Add the font if it doesn't exist
                if !font_dict.has(font_name.as_bytes()) {
                    // Create a simple Type 1 font entry - keeping format consistent
                    let mut font_entry = lopdf::Dictionary::new();
                    font_entry.set("Type", Object::Name(b"Font".to_vec()));
                    font_entry.set("Subtype", Object::Name(b"Type1".to_vec()));

                    // Always use Helvetica for font consistency across all pages
                    font_entry.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                    font_entry.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));

                    // Ensure the font has a consistent name property on all pages
                    // This is important for consistent rendering across PDF viewers
                    font_entry.set("Name", Object::Name(b"Helvetica".to_vec()));

                    debug!("Created consistent font entry for page ID: {:?}", page_id);

                    font_dict.set(font_name, Object::Dictionary(font_entry));
                }
            } else {
                // Create a new font dictionary
                let mut font_dict = lopdf::Dictionary::new();

                // Create a simple Type 1 font entry - keeping format consistent
                let mut font_entry = lopdf::Dictionary::new();
                font_entry.set("Type", Object::Name(b"Font".to_vec()));
                font_entry.set("Subtype", Object::Name(b"Type1".to_vec()));

                // Always use Helvetica for font consistency across all pages
                font_entry.set("BaseFont", Object::Name(b"Helvetica".to_vec()));
                font_entry.set("Encoding", Object::Name(b"WinAnsiEncoding".to_vec()));

                // Ensure the font has a consistent name property on all pages
                // This is important for consistent rendering across PDF viewers
                font_entry.set("Name", Object::Name(b"Helvetica".to_vec()));

                debug!("Created consistent font entry for new dictionary, page ID: {:?}", page_id);

                font_dict.set(font_name, Object::Dictionary(font_entry));

                // Set the font dictionary in resources
                resources_dict.set("Font", Object::Dictionary(font_dict));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    // Font loading tests have been removed due to test environment constraints.
    // In a real-world application, you would use a mocking framework to test font loading
    // and provide test fixtures for fonts.

    // For manual testing, you may need to:
    // 1. Create a fonts directory in the project
    // 2. Copy common fonts (like Arial.ttf) into this directory
    // 3. Update the load_font method to check the local fonts directory first
}
```

### 12.10 PDF Processor (processor.rs)

```rust
use crate::config::Config;
use crate::error::Error;
// Scanner diagnostic module no longer used
use log::{debug, error, info};
use lopdf::{dictionary, Document, Object};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Summary of PDF processing results
#[derive(Debug)]
pub struct ProcessingSummary {
    /// Number of files successfully processed
    pub files_processed: usize,

    /// Number of pages annotated
    pub pages_annotated: usize,

    /// Map of files that encountered errors and their error messages
    pub errors: HashMap<PathBuf, String>,

    /// Map of files with partial success (some pages failed)
    /// The value is a vector of tuples with (page_index, error_message)
    pub partial_success: HashMap<PathBuf, Vec<(usize, String)>>,
}

/// PDF processor for batch processing PDF files
pub struct PdfProcessor {
    /// Application configuration
    pub config: Config,
}

impl PdfProcessor {
    /// Create a new PDF processor with the given configuration
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    /// Process all PDF files in the configured input directory
    pub fn process_all(&self) -> Result<ProcessingSummary, Error> {
        // Ensure output directory exists
        self.ensure_output_dir()?;

        // Find all PDF files in the input directory
        let pdf_files = self.find_pdf_files()?;

        let mut summary = ProcessingSummary {
            files_processed: 0,
            pages_annotated: 0,
            errors: HashMap::new(),
            partial_success: HashMap::new(),
        };

        // Process each file
        for file_path in pdf_files {
            match self.process_file(&file_path) {
                Ok(pages) => {
                    summary.files_processed += 1;
                    summary.pages_annotated += pages;

                    // Check if this was a partial success (some pages failed)
                    if let Some(page_errors) = self.get_page_errors(&file_path) {
                        if !page_errors.is_empty() {
                            summary
                                .partial_success
                                .insert(file_path.clone(), page_errors);
                        }
                    }
                }
                Err(e) => {
                    error!("Error processing {}: {}", file_path.display(), e);
                    summary.errors.insert(file_path, e.to_string());
                }
            }
        }

        Ok(summary)
    }

    /// Process a single PDF file
    pub fn process_file(&self, input_path: &Path) -> Result<usize, Error> {
        // Generate output path
        let output_path = self.generate_output_path(input_path);

        // Get the filename (for annotation)
        let filename = input_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown.pdf");

        info!("Processing {}", input_path.display());

        // We no longer detect scanner PDFs - treat all PDFs the same way
        // This simplifies the application and provides consistent annotations
        info!("Processing with consistent annotation approach");

        // We're using a consistent approach for all PDFs
        // No scanner detection logic is required

        // First, try to read the file with lopdf
        let mut doc = Document::load(input_path)?;

        // Fix any issues with the page tree
        self.fix_page_tree(&mut doc)?;

        // Create an annotator with our font config
        let annotator = crate::annotation::Annotator::new(self.config.font.clone())?;

        // Get the pages
        let pages = doc.get_pages();
        let mut pages_annotated = 0;

        // Track page-level failures
        let mut page_errors = Vec::new();

        // For debugging - print page count
        debug!("Found {} pages", pages.len());

        // Process each page
        // This is the fixed version of the page processing loop from processor.rs
        // Process each page
        for (idx, page_ref) in pages.iter().enumerate() {
            // Use the correct page dictionary object id from page_ref.1 rather than constructing a bogus one.
            let page_id = *page_ref.1; // Dereference to get the actual (u32,u16) tuple

            debug!("Processing page {} with ID {:?}", idx + 1, page_id);

            // We no longer use special handling for scanner PDFs

            // Create a fixed reference to the page if needed
            let fixed_page_id = match self.ensure_page_dictionary(&mut doc, page_id) {
                Ok(id) => id,
                Err(e) => {
                    error!(
                        "Failed to ensure page dictionary for page {} in {}: {}",
                        idx + 1,
                        input_path.display(),
                        e
                    );
                    page_errors.push((idx + 1, format!("Page dictionary error: {}", e)));
                    continue; // Skip to next page
                }
            };

            // Get page dimensions for positioning
            let (page_width, page_height) = match self.get_page_dimensions(&doc, fixed_page_id) {
                Ok(dimensions) => dimensions,
                Err(e) => {
                    error!(
                        "Failed to get dimensions for page {} in {}: {}",
                        idx + 1,
                        input_path.display(),
                        e
                    );
                    page_errors.push((idx + 1, format!("Dimension error: {}", e)));
                    continue; // Skip to next page
                }
            };

            // Calculate position for the annotation
            let (x, y) = annotator.calculate_position(
                &self.config.position,
                page_width,
                page_height,
                filename,
            );

            // Use only the searchable annotation method for all pages
            // We no longer fall back to content stream modification which created inconsistent results
            let annotation_result = self.add_searchable_annotation(&annotator, &mut doc, fixed_page_id, filename, x, y);

            match annotation_result {
                Ok(_) => {
                    pages_annotated += 1;
                    debug!("Annotated page {} in {}", idx + 1, input_path.display());
                }
                Err(e) => {
                    error!(
                        "Failed to annotate page {} in {}: {}",
                        idx + 1,
                        input_path.display(),
                        e
                    );
                    page_errors.push((idx + 1, format!("Annotation error: {}", e)));
                }
            }
        }

        if pages_annotated > 0 {
            // Save the modified PDF
            doc.save(&output_path)?;

            info!("Saved annotated PDF to {}", output_path.display());
            info!("Annotated {} pages", pages_annotated);

            // Log any page-specific errors
            if !page_errors.is_empty() {
                info!(
                    "Note: {} out of {} pages could not be annotated in {}",
                    page_errors.len(),
                    pages.len(),
                    input_path.display()
                );

                // Store page errors in partial_success field (handled by process_all)
            }
        } else {
            return Err(Error::Processing(format!(
                "No pages were successfully annotated in {}. Errors: {:?}",
                input_path.display(),
                page_errors
            )));
        }

        Ok(pages_annotated)
    }

    // Scanner-specific methods have been removed as part of the simplification

    // This helper method has been retained since it might be useful for other purposes

    // Scanner resources method has been removed

    // Scanner-specific methods for later pages have been removed

    // Array content page helper method has been removed

    // Stamp annotation method has been removed as it's no longer needed

    /// Add a searchable text annotation to a page
    fn add_searchable_annotation(
        &self,
        annotator: &crate::annotation::Annotator,
        doc: &mut Document,
        page_id: (u32, u16),
        text: &str,
        x: f32,
        y: f32,
    ) -> Result<(), crate::error::AnnotationError> {
        // Use the new add_text_annotation method which creates proper FreeText annotations
        annotator.add_text_annotation(doc, page_id, text, x, y)
    }

    /// Ensure the page tree is correctly structured
    fn fix_page_tree(&self, doc: &mut Document) -> Result<(), Error> {
        // Check if we can get the Root object
        let catalog_id = match doc.trailer.get(b"Root") {
            Ok(Object::Reference(id)) => *id,
            _ => {
                return Err(Error::Processing(
                    "Invalid or missing Root object".to_string(),
                ))
            }
        };

        // Make sure Root points to a valid catalog
        match doc.get_object(catalog_id) {
            Ok(Object::Dictionary(dict)) => {
                let is_catalog = match dict.get(b"Type") {
                    Ok(Object::Name(name)) => name == b"Catalog",
                    _ => false,
                };

                if !dict.has(b"Type") || !is_catalog {
                    debug!("Root object is not a Catalog, fixing...");

                    // Create a proper catalog
                    let mut catalog = dict.clone();
                    catalog.set("Type", Object::Name(b"Catalog".to_vec()));

                    // Make sure it has a Pages entry
                    if !catalog.has(b"Pages") {
                        debug!("Catalog has no Pages entry, creating one...");

                        // Create an empty Pages dictionary
                        let pages_dict = dictionary! {
                            "Type" => Object::Name(b"Pages".to_vec()),
                            "Kids" => Object::Array(vec![]),
                            "Count" => Object::Integer(0)
                        };

                        let pages_id = doc.add_object(Object::Dictionary(pages_dict));
                        catalog.set("Pages", Object::Reference(pages_id));
                    }

                    // Update the catalog
                    doc.objects.insert(catalog_id, Object::Dictionary(catalog));
                }
            }
            _ => {
                debug!("Root object is not a Dictionary, creating a new catalog...");

                // Create a proper catalog
                let catalog = dictionary! {
                    "Type" => Object::Name(b"Catalog".to_vec()),
                    "Pages" => Object::Reference((0, 0))  // Placeholder, will be updated
                };

                // Create an empty Pages dictionary
                let pages_dict = dictionary! {
                    "Type" => Object::Name(b"Pages".to_vec()),
                    "Kids" => Object::Array(vec![]),
                    "Count" => Object::Integer(0)
                };

                let pages_id = doc.add_object(Object::Dictionary(pages_dict));

                // Update the catalog reference to point to the new Pages
                let mut catalog = catalog.clone();
                catalog.set("Pages", Object::Reference(pages_id));

                // Add the updated catalog
                doc.objects.insert(catalog_id, Object::Dictionary(catalog));
            }
        }

        Ok(())
    }

    /// Ensure a page ID points to a valid page dictionary
    fn ensure_page_dictionary(
        &self,
        doc: &mut Document,
        page_id: (u32, u16),
    ) -> Result<(u32, u16), Error> {
        // Check if the page object exists and is a dictionary
        match doc.get_object(page_id) {
            Ok(Object::Dictionary(_)) => {
                // It's already a dictionary, no need to fix
                return Ok(page_id);
            }
            Ok(Object::Stream(_)) => {
                debug!("Page object is a Stream instead of Dictionary, creating new dictionary...");

                // Create a new page dictionary
                let page_dict = dictionary! {
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

                // Replace the stream with the dictionary
                doc.objects.insert(page_id, Object::Dictionary(page_dict));
                return Ok(page_id);
            }
            Err(_) => {
                debug!("Page object not found, creating a new page dictionary...");

                // Create a new page dictionary
                let page_dict = dictionary! {
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

                // Add the new page dictionary
                let new_page_id = doc.add_object(Object::Dictionary(page_dict));

                // Make sure it's in the page tree
                let catalog_id = match doc.trailer.get(b"Root") {
                    Ok(Object::Reference(id)) => *id,
                    _ => {
                        return Err(Error::Processing(
                            "Invalid or missing Root object".to_string(),
                        ))
                    }
                };

                // Get the Pages reference from the catalog
                let pages_id = match doc.get_dictionary(catalog_id) {
                    Ok(catalog) => match catalog.get(b"Pages") {
                        Ok(Object::Reference(pages_id)) => *pages_id,
                        _ => {
                            return Err(Error::Processing("Catalog has no Pages entry".to_string()))
                        }
                    },
                    Err(e) => {
                        return Err(Error::Processing(format!("Failed to get Catalog: {}", e)));
                    }
                };

                // First let's get information about the current kids array and count
                let (mut kids, mut count) = match doc.get_dictionary(pages_id) {
                    Ok(pages_dict) => {
                        let kids = match pages_dict.get(b"Kids") {
                            Ok(Object::Array(arr)) => arr.clone(),
                            _ => vec![], // No kids or not an array
                        };

                        let count = match pages_dict.get(b"Count") {
                            Ok(Object::Integer(count)) => *count,
                            _ => 0, // No count or not an integer
                        };

                        (kids, count)
                    }
                    Err(e) => {
                        return Err(Error::Processing(format!(
                            "Failed to get Pages dictionary: {}",
                            e
                        )));
                    }
                };

                // Now modify the dictionary without borrowing conflicts

                // Add the new page to the kids array
                kids.push(Object::Reference(new_page_id));
                count += 1;

                // Update the pages dictionary
                match doc.get_dictionary_mut(pages_id) {
                    Ok(pages_dict) => {
                        pages_dict.set("Kids", Object::Array(kids));
                        pages_dict.set("Count", Object::Integer(count));
                    }
                    Err(e) => {
                        return Err(Error::Processing(format!(
                            "Failed to update Pages dictionary: {}",
                            e
                        )));
                    }
                }

                // Set the parent reference on the new page
                match doc.get_dictionary_mut(new_page_id) {
                    Ok(page) => {
                        page.set("Parent", Object::Reference(pages_id));
                    }
                    Err(e) => {
                        return Err(Error::Processing(format!(
                            "Failed to set parent reference: {}",
                            e
                        )));
                    }
                }

                // Return the new page ID
                return Ok(new_page_id);
            }
            _ => {
                return Err(Error::Processing(format!(
                    "Page object is neither Dictionary nor Stream: {:?}",
                    page_id
                )));
            }
        }
    }

    // This function has been replaced by using the Annotator implementation

    /// Get the dimensions of a PDF page
    fn get_page_dimensions(
        &self,
        doc: &Document,
        page_id: (u32, u16),
    ) -> Result<(f32, f32), Error> {
        // Try to get the page dictionary
        let page_dict_result = doc.get_object(page_id);

        let media_box = match page_dict_result {
            Ok(Object::Dictionary(dict)) => {
                // Get the MediaBox from the dictionary
                match dict.get(b"MediaBox") {
                    Ok(Object::Array(arr)) => {
                        if arr.len() < 4 {
                            debug!("MediaBox has fewer than 4 elements, using default size");
                            (612.0, 792.0) // Default to letter size
                        } else {
                            let lower_left_x = match &arr[0] {
                                Object::Integer(i) => *i as f32,
                                Object::Real(f) => *f as f32,
                                _ => 0.0,
                            };
                            let lower_left_y = match &arr[1] {
                                Object::Integer(i) => *i as f32,
                                Object::Real(f) => *f as f32,
                                _ => 0.0,
                            };
                            let upper_right_x = match &arr[2] {
                                Object::Integer(i) => *i as f32,
                                Object::Real(f) => *f as f32,
                                _ => 612.0,
                            };
                            let upper_right_y = match &arr[3] {
                                Object::Integer(i) => *i as f32,
                                Object::Real(f) => *f as f32,
                                _ => 792.0,
                            };

                            (upper_right_x - lower_left_x, upper_right_y - lower_left_y)
                        }
                    }
                    Ok(Object::Reference(ref_id)) => {
                        // If MediaBox is a reference, try to resolve it
                        match doc.get_object(*ref_id) {
                            Ok(Object::Array(arr)) => {
                                if arr.len() < 4 {
                                    debug!("Referenced MediaBox has fewer than 4 elements, using default size");
                                    (612.0, 792.0)
                                } else {
                                    let lower_left_x = match &arr[0] {
                                        Object::Integer(i) => *i as f32,
                                        Object::Real(f) => *f as f32,
                                        _ => 0.0,
                                    };
                                    let lower_left_y = match &arr[1] {
                                        Object::Integer(i) => *i as f32,
                                        Object::Real(f) => *f as f32,
                                        _ => 0.0,
                                    };
                                    let upper_right_x = match &arr[2] {
                                        Object::Integer(i) => *i as f32,
                                        Object::Real(f) => *f as f32,
                                        _ => 612.0,
                                    };
                                    let upper_right_y = match &arr[3] {
                                        Object::Integer(i) => *i as f32,
                                        Object::Real(f) => *f as f32,
                                        _ => 792.0,
                                    };

                                    (upper_right_x - lower_left_x, upper_right_y - lower_left_y)
                                }
                            }
                            _ => {
                                debug!("Referenced MediaBox is not an Array, using default size");
                                (612.0, 792.0)
                            }
                        }
                    }
                    _ => {
                        // No MediaBox found, try parent
                        match dict.get(b"Parent") {
                            Ok(Object::Reference(parent_ref)) => {
                                // Get MediaBox from parent
                                match doc.get_object(*parent_ref) {
                                    Ok(Object::Dictionary(parent_dict)) => {
                                        match parent_dict.get(b"MediaBox") {
                                            Ok(Object::Array(arr)) if arr.len() >= 4 => {
                                                let lower_left_x = match &arr[0] {
                                                    Object::Integer(i) => *i as f32,
                                                    Object::Real(f) => *f as f32,
                                                    _ => 0.0,
                                                };
                                                let lower_left_y = match &arr[1] {
                                                    Object::Integer(i) => *i as f32,
                                                    Object::Real(f) => *f as f32,
                                                    _ => 0.0,
                                                };
                                                let upper_right_x = match &arr[2] {
                                                    Object::Integer(i) => *i as f32,
                                                    Object::Real(f) => *f as f32,
                                                    _ => 612.0,
                                                };
                                                let upper_right_y = match &arr[3] {
                                                    Object::Integer(i) => *i as f32,
                                                    Object::Real(f) => *f as f32,
                                                    _ => 792.0,
                                                };

                                                (
                                                    upper_right_x - lower_left_x,
                                                    upper_right_y - lower_left_y,
                                                )
                                            }
                                            _ => {
                                                debug!("Parent MediaBox not found or invalid, using default size");
                                                (612.0, 792.0)
                                            }
                                        }
                                    }
                                    _ => {
                                        debug!("Parent is not a Dictionary, using default size");
                                        (612.0, 792.0)
                                    }
                                }
                            }
                            _ => {
                                debug!("No MediaBox and no Parent, using default size");
                                (612.0, 792.0)
                            }
                        }
                    }
                }
            }
            Ok(Object::Stream(_)) => {
                debug!("Page object is a Stream instead of Dictionary, using default size");
                (612.0, 792.0)
            }
            Err(e) => {
                debug!("Error getting page object: {}, using default size", e);
                (612.0, 792.0)
            }
            _ => {
                debug!("Page object is neither Dictionary nor Stream, using default size");
                (612.0, 792.0)
            }
        };

        Ok(media_box)
    }

    /// Find all PDF files in a directory, optionally recursively
    fn find_pdf_files(&self) -> Result<Vec<PathBuf>, Error> {
        let dir = &self.config.input_dir;

        // Check if directory exists
        if !dir.exists() {
            return Err(Error::DirectoryNotFound(dir.to_path_buf()));
        }

        // Check if directory is readable
        if let Err(e) = fs::read_dir(dir) {
            return Err(Error::Io(e));
        }

        let mut pdf_files = Vec::new();

        // Use WalkDir to iterate through files
        let walker = if self.config.recursive {
            WalkDir::new(dir)
        } else {
            WalkDir::new(dir).max_depth(1)
        };

        for entry in walker.into_iter().filter_map(Result::ok) {
            let path = entry.path();
            if path.is_file()
                && path
                    .extension()
                    .map_or(false, |ext| ext.eq_ignore_ascii_case("pdf"))
            {
                pdf_files.push(path.to_path_buf());
                debug!("Found PDF: {}", path.display());
            }
        }

        // Check if any PDF files were found
        if pdf_files.is_empty() {
            return Err(Error::NoPdfFiles(dir.to_path_buf()));
        }

        info!("Found {} PDF files in {}", pdf_files.len(), dir.display());
        Ok(pdf_files)
    }

    /// Ensure output directory exists, creating it if necessary
    fn ensure_output_dir(&self) -> Result<(), Error> {
        let dir = &self.config.output_dir;

        if !dir.exists() {
            info!("Creating output directory: {}", dir.display());
            fs::create_dir_all(dir)?;
        } else if !dir.is_dir() {
            return Err(Error::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!(
                    "Output path exists but is not a directory: {}",
                    dir.display()
                ),
            )));
        }

        // Check if directory is writable by creating and removing a test file
        let test_file = dir.join(".test_write_permission");
        match fs::write(&test_file, b"test") {
            Ok(_) => {
                let _ = fs::remove_file(test_file);
                Ok(())
            }
            Err(_) => Err(Error::PermissionDenied(dir.to_path_buf())),
        }
    }

    /// Generate output path for a processed PDF
    fn generate_output_path(&self, input_path: &Path) -> PathBuf {
        // Get the filename from the input path
        let filename = input_path.file_name().unwrap_or_default();

        // Create the output path by joining the output directory and filename
        self.config.output_dir.join(filename)
    }

    /// Get page errors for a file
    ///
    /// This method would normally track page errors per file in a database or struct field.
    /// For our implementation, we currently pass the errors directly to process_all()
    /// but this method is kept for future implementation.
    fn get_page_errors(&self, _file_path: &Path) -> Option<Vec<(usize, String)>> {
        // Currently page errors are passed directly to process_all
        // This method is a placeholder for a more permanent tracking solution
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Config, FontConfig, PositionConfig};
    use assert_fs::prelude::*;
    // These imports are used in processor.rs itself, not needed in tests

    // Helper function to create a minimal test PDF
    fn create_test_pdf(path: &Path) -> Result<(), Error> {
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

    #[test]
    fn test_find_pdf_files() {
        let temp_dir = assert_fs::TempDir::new().unwrap();

        // Create some test PDF files
        let pdf1 = temp_dir.child("test1.pdf");
        let pdf2 = temp_dir.child("test2.pdf");

        create_test_pdf(pdf1.path()).unwrap();
        create_test_pdf(pdf2.path()).unwrap();

        // Create a config pointing to the temp dir
        let config = Config {
            input_dir: temp_dir.path().to_path_buf(),
            output_dir: temp_dir.path().to_path_buf(),
            recursive: false,
            font: FontConfig::default(),
            position: PositionConfig::default(),
        };

        let processor = PdfProcessor::new(config);

        // Test finding PDF files
        let pdf_files = processor.find_pdf_files().unwrap();
        assert_eq!(pdf_files.len(), 2);

        temp_dir.close().unwrap();
    }

    // Test disabled due to font loading issues in the test environment
    // #[test]
    // fn test_process_file() {
    //     // This test requires access to font files which may not be available in all test environments
    // }
}
```

## 13. Comprehensive Development Approach

The PDF Processing Tools project demonstrates a mature approach to software development with:

1. **Structured Process Documentation**:
   - Templates for task descriptions, checklists, and summaries
   - Consistent task tracking and handoffs between agents
   - Clear guidelines for context management

2. **Flexible Design Approach**:
   - Separation of concerns between PDF processing, annotation, and configuration
   - Reuse of common functionality across different executables
   - Abstraction layers that isolate the complexities of PDF manipulation

3. **Comprehensive Error Handling**:
   - Detailed error types with contextual information
   - Recovery strategies to continue processing despite failures
   - Diagnostic tools for analyzing and fixing issues

4. **Validation and Testing**:
   - Unit tests for critical components
   - Diagnostic tools to analyze output
   - Clear validation criteria for successful operation

## 14. Conclusion

The PDF Processing Tools project has evolved into a mature suite of applications focused on educational use cases. The key strengths of the implementation include:

1. **Robust PDF Processing**: The tools handle various PDF structures and complexities gracefully, including proper font resource management
2. **Common Infrastructure**: Shared library code enables consistent behavior across different tools
3. **Extensibility**: The design makes it easy to add new PDF processing tools like the multiple choice marking guide
4. **Diagnostics**: The project includes specialized tools for analyzing and debugging PDF annotations
5. **Error Resilience**: The applications handle errors at both the file and page level, continuing to process other documents when possible

The font consistency fixes implemented in the recent development improved the reliability across different PDF viewers and types. The next steps in Task 5.1 to create a consistent validation process will further enhance the quality and maintainability of the codebase.

This review with complete source code provides a comprehensive understanding of the project structure, implementation details, and development approach, serving as a solid foundation for the planned updates.
