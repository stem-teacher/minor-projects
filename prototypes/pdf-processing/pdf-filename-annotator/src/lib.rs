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