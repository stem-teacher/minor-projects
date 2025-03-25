# PDF Filename Annotator

A command-line tool written in Rust for annotating PDF files with their filenames in the corner of each page.

## Features

- Adds the filename as text in the corner of each page of a PDF
- Supports all four corners (top-left, top-right, bottom-left, bottom-right)
- Configurable font size and positioning
- Batch processing of multiple PDF files
- Robust handling of various PDF structures, including scanner-generated PDFs

## Installation

1. Make sure you have Rust installed. If not, get it from [https://rustup.rs/](https://rustup.rs/)

2. Clone this repository:
```
git clone https://github.com/yourusername/pdf-filename-annotator.git
cd pdf-filename-annotator
```

3. Build the project:
```
cargo build --release
```

The binary will be available at `target/release/pdf-filename-annotator`.

## Usage

1. Create a configuration file (see `config.example.json` for an example)

2. Run the tool:
```
pdf-filename-annotator --config /path/to/config.json
```

### Example Configuration

```json
{
  "input_dir": "/path/to/input/pdfs",
  "output_dir": "/path/to/output/pdfs",
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
}
```

## Implementation Note

This tool uses a novel approach to PDF annotation:

1. Initial implementation attempted to add annotations by manipulating content streams
2. Current approach uses the more standard annotation objects (text annotations) to ensure broader compatibility
3. Carefully handles PDF structure, especially with scanner-generated PDFs that can have unusual organization

## Recent Improvements

The code has been updated to use the Annotator class for PDF handling, which offers several benefits:
- More robust font handling with fallback options
- Better annotation positioning with proper text metrics
- Improved error handling and reporting
- Better compatibility with different PDF structures

## Development 

For testing purposes, you may need to copy font files into a local `fonts` directory.

## License

MIT License