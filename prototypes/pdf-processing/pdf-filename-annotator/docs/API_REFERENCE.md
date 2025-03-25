# API Reference for PDF Filename Annotator

This document provides a comprehensive reference for the APIs and data structures used in the PDF Filename Annotator application.

## Configuration Module

### `Config` Struct

The main configuration structure for the application.

```rust
pub struct Config {
    pub input_dir: PathBuf,
    pub output_dir: PathBuf,
    pub recursive: bool,
    pub font: FontConfig,
    pub position: PositionConfig,
}
```

#### Methods

```rust
impl Config {
    /// Load configuration from a JSON file
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self, ConfigError>;
    
    /// Create a default configuration
    pub fn default() -> Self;
    
    /// Validate the configuration values
    pub fn validate(&self) -> Result<(), ConfigError>;
}
```

### `FontConfig` Struct

Configuration for font settings.

```rust
pub struct FontConfig {
    pub family: String,
    pub size: f32,
    pub fallback: Option<String>,
}
```

### `PositionConfig` Struct

Configuration for position settings.

```rust
pub struct PositionConfig {
    pub corner: Corner,
    pub x_offset: f32,
    pub y_offset: f32,
}

pub enum Corner {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}
```

## FileSystem Module

### Directory Functions

```rust
/// Find all PDF files in a directory
pub fn find_pdf_files(
    dir: impl AsRef<Path>, 
    recursive: bool
) -> Result<Vec<PathBuf>, FileSystemError>;

/// Ensure output directory exists
pub fn ensure_output_dir(dir: impl AsRef<Path>) -> Result<(), FileSystemError>;

/// Generate output path for a processed PDF
pub fn generate_output_path(
    input_path: impl AsRef<Path>,
    output_dir: impl AsRef<Path>
) -> PathBuf;
```

## PDF Module

### `PdfProcessor` Struct

The main PDF processing structure.

```rust
pub struct PdfProcessor {
    pub config: Config,
}
```

#### Methods

```rust
impl PdfProcessor {
    /// Create a new PDF processor with the given configuration
    pub fn new(config: Config) -> Self;
    
    /// Process a single PDF file
    pub fn process_file(&self, input_path: impl AsRef<Path>) -> Result<(), PdfError>;
    
    /// Process all PDF files in the configured input directory
    pub fn process_all(&self) -> Result<ProcessingSummary, PdfError>;
}
```

### `PdfDocument` Struct

A wrapper around the PDF library for easier manipulation.

```rust
pub struct PdfDocument {
    inner_doc: lopdf::Document,
    metadata: PdfMetadata,
}
```

#### Methods

```rust
impl PdfDocument {
    /// Open a PDF document from a file
    pub fn open(path: impl AsRef<Path>) -> Result<Self, PdfError>;
    
    /// Get the number of pages in the document
    pub fn page_count(&self) -> usize;
    
    /// Add text annotation to a specific page
    pub fn annotate_page(
        &mut self,
        page_index: usize,
        text: &str,
        position: &PositionConfig,
        font: &FontConfig
    ) -> Result<(), PdfError>;
    
    /// Save the modified document to a file
    pub fn save(&self, path: impl AsRef<Path>) -> Result<(), PdfError>;
}
```

### `PdfMetadata` Struct

Metadata extracted from a PDF document.

```rust
pub struct PdfMetadata {
    pub title: Option<String>,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub keywords: Option<String>,
    pub creator: Option<String>,
    pub producer: Option<String>,
    pub creation_date: Option<String>,
    pub modification_date: Option<String>,
}
```

## Annotation Module

### `Annotator` Struct

Handles the annotation of PDF pages.

```rust
pub struct Annotator {
    pub font_config: FontConfig,
}
```

#### Methods

```rust
impl Annotator {
    /// Create a new annotator with the given font configuration
    pub fn new(font_config: FontConfig) -> Result<Self, AnnotationError>;
    
    /// Calculate the position for text based on position configuration and page size
    pub fn calculate_position(
        &self,
        position: &PositionConfig,
        page_width: f32,
        page_height: f32,
        text: &str
    ) -> (f32, f32);
    
    /// Add text to a PDF page
    pub fn add_text_to_page(
        &self,
        doc: &mut lopdf::Document,
        page_id: lopdf::ObjectId,
        text: &str,
        x: f32,
        y: f32
    ) -> Result<(), AnnotationError>;
}
```

## Error Types

### `ConfigError`

Errors related to configuration.

```rust
#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("Failed to read configuration file: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Failed to parse JSON: {0}")]
    JsonError(#[from] serde_json::Error),
    
    #[error("Invalid configuration: {0}")]
    ValidationError(String),
}
```

### `FileSystemError`

Errors related to file system operations.

```rust
#[derive(Debug, Error)]
pub enum FileSystemError {
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Directory not found: {0}")]
    DirectoryNotFound(PathBuf),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(PathBuf),
}
```

### `PdfError`

Errors related to PDF processing.

```rust
#[derive(Debug, Error)]
pub enum PdfError {
    #[error("Failed to open PDF file: {0}")]
    OpenError(#[from] std::io::Error),
    
    #[error("Failed to parse PDF: {0}")]
    ParseError(String),
    
    #[error("Failed to modify PDF: {0}")]
    ModificationError(String),
    
    #[error("Failed to save PDF: {0}")]
    SaveError(String),
    
    #[error("Annotation error: {0}")]
    AnnotationError(#[from] AnnotationError),
}
```

### `AnnotationError`

Errors related to PDF annotation.

```rust
#[derive(Debug, Error)]
pub enum AnnotationError {
    #[error("Font error: {0}")]
    FontError(String),
    
    #[error("Positioning error: {0}")]
    PositioningError(String),
    
    #[error("Content stream error: {0}")]
    ContentStreamError(String),
}
```
