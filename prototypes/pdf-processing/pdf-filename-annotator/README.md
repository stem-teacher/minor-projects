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

## Real-World Testing

### Test Configuration
Create a `test_config.json` file with the following structure:
```json
{
  "input_dir": "./test_subset",
  "output_dir": "./test_output",
  "recursive": false,
  "font": {
    "family": "Helvetica",
    "size": 12,
    "fallback": "Arial"
  },
  "position": {
    "corner": "TopRight",
    "x_offset": 50,
    "y_offset": 30
  }
}
```

### Testing Process
1. **Prepare Test PDFs**:
   - Add scanner-generated PDFs to the `test_subset` directory
   - Include a variety of sources (Epson, Canon, HP scanners, etc.)
   - Include multi-page documents if available

2. **Run the Application**:
   ```
   ./target/release/pdf-filename-annotator --config test_config.json
   ```

3. **Verify the Results**:
   - Check all pages visually for annotations (should appear in top-right corner)
   - Verify that original content (especially images) is preserved
   - Test PDF searchability with pdftotext or similar tools:
     ```
     pdftotext test_output/FILE.pdf - | grep "FILE.pdf"
     ```

4. **Check for Issues**:
   - First page blank/corrupted (content stream preservation issue)
   - Missing annotations on some pages (annotation strategy issue)
   - Annotations not searchable (FreeText annotation implementation issue)
   - Missing images or visual content (resource dictionary merging issue)

### Key Implemented Fixes
- Added proper FreeText annotations for searchability
- Fixed content stream preservation for scanner PDFs
- Improved resource dictionary merging to preserve images
- Fixed generation number handling for page references

### Command Reference
- Build: `cargo build --release`
- Run: `./target/release/pdf-filename-annotator --config test_config.json`
- Test: `cargo test`
- Check: `cargo check`

## License

MIT License