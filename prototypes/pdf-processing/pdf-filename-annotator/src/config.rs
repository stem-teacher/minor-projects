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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_load_valid_config() {
        let json = r#"{
            "input_dir": "/tmp/input",
            "output_dir": "/tmp/output",
            "recursive": true,
            "font": {
                "size": 12.0,
                "family": "Helvetica",
                "fallback": "Arial"
            },
            "position": {
                "corner": "top-right",
                "x_offset": 10.0,
                "y_offset": 10.0
            }
        }"#;

        let mut file = NamedTempFile::new().unwrap();
        write!(file, "{}", json).unwrap();

        let config = Config::from_file(file.path()).unwrap();

        assert_eq!(config.input_dir, PathBuf::from("/tmp/input"));
        assert_eq!(config.output_dir, PathBuf::from("/tmp/output"));
        assert!(config.recursive);
        assert_eq!(config.font.size, 12.0);
        assert_eq!(config.font.family, "Helvetica");
        assert_eq!(config.font.fallback, Some("Arial".to_string()));
        assert_eq!(config.position.corner, Corner::TopRight);
        assert_eq!(config.position.x_offset, 10.0);
        assert_eq!(config.position.y_offset, 10.0);
    }

    #[test]
    fn test_default_config() {
        let config = Config::default();

        assert_eq!(config.input_dir, PathBuf::from("./input"));
        assert_eq!(config.output_dir, PathBuf::from("./output"));
        assert!(!config.recursive);
        assert_eq!(config.font.size, 12.0);
        assert_eq!(config.font.family, "Helvetica");
        assert_eq!(config.font.fallback, Some("Arial".to_string()));
        assert_eq!(config.position.corner, Corner::TopRight);
        assert_eq!(config.position.x_offset, 10.0);
        assert_eq!(config.position.y_offset, 10.0);
    }
}
