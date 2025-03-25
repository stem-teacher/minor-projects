# PDF Filename Annotator - Real-World Testing Guide

## Project Context
The PDF Filename Annotator is a Rust application that adds filename annotations to PDF files. We've just implemented major improvements to handle scanner-generated PDFs and make annotations searchable with text extraction tools.

## Setup Instructions
1. Ensure Rust 1.82.0+ is installed
2. Run `cargo build --release` to compile the application
3. Create a test configuration file (see below)

## Test Configuration
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

## Real-World Testing Process
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

## Key Implemented Fixes
- Added proper FreeText annotations for searchability
- Fixed content stream preservation for scanner PDFs
- Improved resource dictionary merging to preserve images
- Fixed generation number handling for page references

## Next Implementation Tasks
- Enhance error reporting with detailed diagnostics
- Create comprehensive test suite for scanner PDFs
- Implement visual verification system

## Command Reference
- Build: `cargo build --release`
- Run: `./target/release/pdf-filename-annotator --config test_config.json`
- Test: `cargo test`
- Check: `cargo check`
