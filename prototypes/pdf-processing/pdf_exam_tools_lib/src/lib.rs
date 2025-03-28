pub mod error;
pub mod config;
pub mod file_utils; // No re-export needed unless specific functions are very commonly used directly
pub mod annotation;

// Re-export the main error types for convenience
pub use error::{Error, AnnotationError};
// Re-export the config types for convenience
pub use config::{Config, Corner, FontConfig, PositionConfig};
// Re-export the annotation types for convenience
pub use annotation::Annotator;

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
