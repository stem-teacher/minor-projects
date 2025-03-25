# PDF Filename Annotator: Detailed Specification

## Core Purpose
The PDF Filename Annotator is a command-line tool that processes PDF files by stamping each page with its filename in the top-right corner. This tool is primarily designed for educational purposes, helping teachers label exam papers and other documents for easy identification after printing.

## Functional Requirements

### Primary Functions
1. **Find PDF Files**: Locate all PDF files in a specified input directory
   - Support optional recursive searching of subdirectories
   - Filter for .pdf extensions (case-insensitive)

2. **Filename Annotation**: Add the filename as text to each PDF page
   - Position: Top-right corner of each page
   - Font: Calibri, 12-point (with fallback options if unavailable)
   - Content: Exact filename including extension
   - Appearance: Black text, no background

3. **File Processing**: Handle batches of PDF files
   - Read from configured input directory
   - Write to configured output directory
   - Preserve original files
   - Support processing multiple files in sequence

### Configuration Options
- Input and output directory paths
- Recursive directory searching (true/false)
- Font settings (name, size, fallback options)
- Text position settings (corner, x/y offsets)

## Technical Requirements

### File Format Support
- Process standard PDF files (PDF 1.3 - 1.7)
- Support various page sizes (A4, Letter, etc.)
- Handle multi-page documents

### Error Handling
- Gracefully handle missing directories
- Provide fallback for missing fonts
- Report errors for corrupted or password-protected PDFs
- Proper error reporting for file access issues

### Performance Considerations
- Optimize for batch processing
- Minimize memory usage for large files
- Use appropriate error recovery to continue batch processing

## Sample Usage

### Command Line
```
pdf-filename-annotator --config config.json
```

### Configuration File (config.json)
```json
{
  "input_dir": "/path/to/input/pdfs",
  "output_dir": "/path/to/output/pdfs",
  "recursive": true,
  "font": {
    "name": "Calibri",
    "size": 12,
    "fallback": ["Arial", "Helvetica"]
  },
  "position": {
    "corner": "TopRight",
    "x_offset": 50,
    "y_offset": 30
  }
}
```

## Future Extensions
- OCR integration for text extraction
- Automated exam marking capabilities
- Advanced placement options for text
- Support for additional annotation types (page numbers, dates, etc.)

## Development Priorities
1. Core PDF processing functionality with filename annotation
2. Robust error handling and recovery
3. Configuration flexibility
4. Performance optimization for large batches
5. Documentation and examples

This specification serves as the authoritative source for the PDF Filename Annotator project requirements.
