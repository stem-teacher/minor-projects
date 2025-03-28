pub mod error;
pub mod config;

// Re-export the main error types for convenience
pub use error::{Error, AnnotationError};
// Re-export the main config struct for convenience
pub use config::Config;

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
