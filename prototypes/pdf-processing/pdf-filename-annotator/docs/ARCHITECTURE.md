# PDF Filename Annotator: Architecture Overview

This document provides a comprehensive overview of the PDF Filename Annotator's architecture, design principles, and implementation details.

## System Architecture

The PDF Filename Annotator follows a modular, layered architecture to promote separation of concerns, maintainability, and extensibility.

```
┌─────────────────────────────────────────────────────────────┐
│                     Command Line Interface                   │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                    Configuration Management                  │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                    PDF Processing Pipeline                   │
├─────────────────┬─────────────┬────────────────┬────────────┤
│  File Discovery │  PDF Loading│   Annotation   │ PDF Saving │
└─────────────────┴─────────────┴────────────────┴────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                     Error Handling Layer                     │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                        Logging System                        │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Command Line Interface (`main.rs`)

The entry point for the application that:
- Parses command-line arguments using `clap`
- Initializes logging framework
- Loads configuration
- Orchestrates the PDF processing workflow
- Reports results and errors

### 2. Configuration Management (`config.rs`)

Handles application configuration via:
- JSON file parsing with `serde_json`
- Configuration validation and normalization
- Default values for optional settings
- Type-safe configuration structures

### 3. File System Operations (`filesystem.rs`)

Manages file system interactions:
- Recursive directory traversal
- PDF file identification
- Output directory management
- Path normalization and validation

### 4. PDF Processing (`pdf.rs`)

Core PDF functionality:
- PDF document loading and parsing
- Page extraction and analysis
- PDF structure manipulation
- Document saving and optimization

### 5. Annotation Engine (`annotation.rs`)

Handles the actual annotation process:
- Font loading and management
- Text positioning and layout
- PDF content stream manipulation
- Resource dictionary management

### 6. Error Handling (`error.rs`)

Comprehensive error management:
- Custom error types for each subsystem
- Error context enrichment
- User-friendly error messages
- Error recovery strategies

## Data Flow

1. **Configuration Loading**:
   - Read JSON configuration file
   - Parse into structured configuration objects
   - Validate settings and apply defaults

2. **PDF Discovery**:
   - Scan input directory (recursively if configured)
   - Filter for PDF files
   - Prepare processing queue

3. **Processing Loop**:
   - For each PDF file:
     - Open and parse PDF structure
     - For each page:
       - Calculate annotation position
       - Add filename text
     - Save modified PDF to output directory

4. **Result Reporting**:
   - Count files processed
   - Count pages annotated
   - Report any errors encountered
   - Display summary statistics

## Design Patterns

The application utilizes several design patterns:

### 1. Builder Pattern

Used for constructing complex objects step by step, particularly in the `PdfProcessor` and `Annotator` classes.

```rust
// Example:
let processor = PdfProcessor::new(config)
    .with_font_directory("./fonts")
    .with_logging(LogLevel::Debug)
    .build();
```

### 2. Strategy Pattern

Applied for interchangeable annotation strategies:

```rust
// Defined in the architecture:
trait AnnotationStrategy {
    fn annotate(&self, page: &mut PdfPage, text: &str) -> Result<(), AnnotationError>;
}

struct FilenameAnnotator { /* ... */ }
struct TimestampAnnotator { /* ... */ }

impl AnnotationStrategy for FilenameAnnotator { /* ... */ }
impl AnnotationStrategy for TimestampAnnotator { /* ... */ }
```

### 3. Factory Method Pattern

Used for creating PDF and font objects with appropriate initialization:

```rust
// Conceptual implementation:
fn create_font(config: &FontConfig) -> Result<Box<dyn Font>, FontError> {
    match config.family.as_str() {
        "Calibri" => Ok(Box::new(SystemFont::load("Calibri")?)),
        "Arial" => Ok(Box::new(SystemFont::load("Arial")?)),
        _ => Ok(Box::new(FallbackFont::default()?)),
    }
}
```

## Error Handling Strategy

The application uses a multi-layered approach to error handling:

1. **Low-Level Library Errors**: Converted to application-specific errors
2. **Domain-Specific Errors**: Organized by subsystem (PDF, Font, File, etc.)
3. **Context Enrichment**: Using `anyhow` for adding context to errors
4. **Error Recovery**: Where possible, continue processing despite non-fatal errors

Example error propagation:

```rust
fn process_file(&self, path: &Path) -> Result<(), PdfError> {
    let file = File::open(path)
        .context(format!("Failed to open PDF file: {}", path.display()))?;
    
    let document = Document::load(file)
        .context(format!("Failed to parse PDF: {}", path.display()))?;
    
    // Processing logic...
    
    Ok(())
}
```

## Concurrency Model

The current implementation is single-threaded, but the architecture allows for future concurrency enhancements:

1. **File-Level Parallelism**: Process multiple PDF files concurrently
2. **Pipeline Parallelism**: Split processing stages across different threads
3. **Data Parallelism**: Process pages of a single document in parallel

Planned implementation using Rust's concurrency primitives:

```rust
// Conceptual implementation for file-level parallelism:
use rayon::prelude::*;

fn process_all_parallel(&self) -> Result<ProcessingSummary, PdfError> {
    let results: Vec<_> = self.pdf_files.par_iter()
        .map(|file| self.process_file(file))
        .collect();
    
    // Aggregate results...
    Ok(summary)
}
```

## Extensibility Points

The architecture includes several well-defined extension points:

1. **Annotation Strategies**: Add new ways to annotate documents
2. **Font Providers**: Support for additional font sources and formats
3. **Output Formatters**: Support for different output formats and optimizations
4. **Processing Steps**: Pipeline architecture allows adding/removing steps

## Performance Considerations

Key performance optimizations in the design:

1. **Lazy Loading**: PDF pages are loaded on-demand
2. **Memory Management**: Careful control of document object lifetimes
3. **Buffer Reuse**: Reuse buffers for file operations
4. **Streaming Processing**: Process large files without loading entirely into memory

## Future Architecture Enhancements

Planned architectural improvements:

1. **Plugin System**: Load custom processors at runtime
2. **Distributed Processing**: Split work across multiple machines
3. **Progressive Processing**: Start processing files as they're discovered
4. **Reactive Architecture**: Event-driven processing for better responsiveness

## Technology Stack

The application is built on:

- **Rust**: Core programming language
- **lopdf**: Low-level PDF manipulation
- **pdf-rs**: PDF parsing and analysis
- **clap**: Command-line argument parsing
- **serde**: Configuration deserialization
- **rusttype**: Font loading and metrics
- **walkdir**: Filesystem traversal
- **anyhow/thiserror**: Error handling
- **log/env_logger**: Logging infrastructure

## Testing Strategy

The codebase includes several types of tests:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Process actual PDF files
4. **Property-Based Tests**: Test with randomized inputs
5. **Benchmark Tests**: Measure performance characteristics

## Conclusion

The PDF Filename Annotator architecture is designed for modularity, extensibility, and maintainability. The layered approach allows for future enhancements while maintaining a clean separation of concerns.

Each component has a single responsibility, communicating through well-defined interfaces. This design supports the current features while providing a solid foundation for the future roadmap.
