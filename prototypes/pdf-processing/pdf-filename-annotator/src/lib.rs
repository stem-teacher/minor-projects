//! PDF Filename Annotator Library
//!
//! This library provides functionality for annotating PDF files with their filenames
//! in the top-right corner of each page.

pub mod annotation;
pub mod config;
pub mod error;
pub mod processor;
pub mod scanner_diagnostic;

// Re-export main types for convenience
pub use annotation::Annotator;
pub use config::Config;
pub use error::Error;
pub use processor::PdfProcessor;
