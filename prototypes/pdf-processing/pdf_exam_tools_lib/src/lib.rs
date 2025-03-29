pub mod annotation;
pub mod annotation_utils;
pub mod config;
pub mod error;
pub mod file_utils; // No re-export needed unless specific functions are very commonly used directly
pub mod pdf_ops; // Module for PDF operations like recreating annotations

// Re-export the main error types for convenience
pub use error::{AnnotationError, Error};
// Re-export the config types for convenience
pub use config::{Config, Corner, FontConfig, PositionConfig};
// Re-export the annotation types for convenience
pub use annotation::{
    add_labeled_freetext, add_labeled_freetext_multi, add_labeled_rect, add_labeled_rect_multi,
    Annotator, BorderStyle, Color,
};
// Re-export PDF operations for convenience
pub use pdf_ops::recreate_annotation_by_label;
// Re-export annotation utilities for convenience
pub use annotation_utils::{get_annotation_properties, AnnotationProperties};

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
