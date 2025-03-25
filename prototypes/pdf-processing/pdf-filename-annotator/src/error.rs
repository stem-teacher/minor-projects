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
