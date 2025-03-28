// Export library modules
// file_utils has been moved to pdf_exam_tools_lib
// annotation has been moved to pdf_exam_tools_lib
pub mod pdf_utils;
pub mod mc_pdf_utils;
pub mod processor;
// pub mod pdf_annotation_utils; // Temporarily removed due to type conflicts

// Re-export types from pdf_utils - only for original functionality
// Re-export types used by main binary
pub use processor::PdfProcessor;

// Re-export types for multiple choice marking guide
pub use mc_pdf_utils::McPdfAnnotation;