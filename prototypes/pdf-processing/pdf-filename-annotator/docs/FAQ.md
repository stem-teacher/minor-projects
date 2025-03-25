# Frequently Asked Questions

## General Questions

### What is PDF Filename Annotator?
PDF Filename Annotator is a specialized tool written in Rust that adds filename annotations to PDF documents. It stamps the filename in the top-right corner (or other configurable positions) of every page in the PDF.

### Who is this tool designed for?
This tool is primarily designed for educators, teachers, and educational administrators who need to track the source of printed documents. It's particularly useful for labeling exam papers, teaching materials, and research documents.

### Is this tool free to use?
Yes, PDF Filename Annotator is open-source software released under the MIT License. You can use, modify, and distribute it freely.

### What operating systems are supported?
The tool is cross-platform and works on Windows, macOS, and Linux systems where Rust can be compiled.

## Installation and Setup

### How do I install PDF Filename Annotator?
Follow these steps:
1. Ensure you have Rust installed (version 1.70 or later)
2. Clone the repository: `git clone https://github.com/your-username/pdf-filename-annotator.git`
3. Build the project: `cargo build --release`
4. The executable will be available at `target/release/pdf-filename-annotator`

### What dependencies does the tool require?
The tool requires:
- Rust compiler and Cargo package manager
- Basic system libraries (detailed in the INSTALLATION.md file)
- No external runtime dependencies are needed once compiled

### How do I configure the tool?
Create a JSON configuration file with your settings. See `config.example.json` for a template. The key settings include:
- Input and output directories
- Font settings (family, size)
- Positioning options
- Whether to process subdirectories

### Does the tool require any special permissions?
The tool only needs standard file system permissions:
- Read access to the input directory
- Write access to the output directory

## Usage

### How do I run the tool?
Run it from the command line:
```
pdf-filename-annotator --config config.json
```

### Can I process multiple directories at once?
Not directly with a single command. However, you can:
1. Create multiple configuration files
2. Run the tool multiple times with different configurations
3. Use the included `process_pdfs.sh` script for batch processing

### How long does processing take?
Processing speed depends on:
- The number of PDF files
- The number of pages per file
- The complexity of the PDFs
- Your hardware

Typically, it processes around 5-10 PDFs per second on modern hardware.

### Will the tool modify my original PDFs?
No, the tool never modifies original files. It creates annotated copies in the specified output directory, keeping your originals intact.

## Font and Formatting

### What fonts can I use?
The tool attempts to use the font specified in your configuration file. By default, it uses Calibri with Arial as a fallback. You can specify any font installed on your system.

### What if the specified font isn't available on my system?
The tool implements a fallback mechanism:
1. It tries to use the primary font specified in your configuration
2. If that fails, it tries the fallback font you specified
3. If both fail, it falls back to a standard built-in font

### Can I customize the text position?
Yes, you can specify:
- Which corner to place the text (top-right, top-left, bottom-right, bottom-left)
- X and Y offsets from the corner in points
- Font size

### Can I add text other than the filename?
The current version only supports the filename. Future versions will allow custom text templates, timestamps, and other metadata.

## Troubleshooting

### The tool cannot find my PDF files
Check that:
- The input directory path is correct
- The files have a `.pdf` extension (case insensitive)
- You have the correct permissions to read the files
- If files are in subdirectories, make sure `recursive` is set to `true` in your config

### The tool cannot create the output files
Verify that:
- The output directory path is correct
- You have permission to write to the output directory
- There's enough disk space available
- The output directory can be created if it doesn't exist

### The text is not appearing in the correct position
This could be due to:
- PDF page size differences
- Font metrics variations
- Custom PDF structures

Try adjusting the X and Y offsets in your configuration.

### Error: "Failed to load font"
This means:
- The specified font is not available on your system
- The font file is corrupted or in an unsupported format

Solutions:
- Use a more common font
- Specify a fallback font
- Place custom fonts in a `fonts` directory in the project root

## Technical Questions

### How does the tool handle PDF structures?
The tool uses the `pdf-rs` and `lopdf` Rust libraries to:
1. Parse the PDF structure
2. Access page content streams
3. Add text annotations to each page
4. Preserve the original PDF structure and metadata

### Can the tool handle encrypted or password-protected PDFs?
No, the current version cannot process encrypted or password-protected PDFs. You need to decrypt/unlock them before processing.

### How does the tool handle different page sizes?
The tool calculates positions relative to each page's dimensions, ensuring consistent placement regardless of page size.

### Does the tool support PDF/A compliance?
The tool tries to maintain compliance with the original PDF's format, but it doesn't specifically target PDF/A compliance. Future versions may include this option.

## Future Development

### Is OCR functionality planned?
Yes, OCR (Optical Character Recognition) is on our roadmap. A prototype implementation is available in the `prototypes` directory.

### Will there be a graphical user interface?
There are no immediate plans for a GUI, but the architecture allows for this extension in the future.

### How can I contribute to the project?
You can contribute by:
- Reporting bugs and issues
- Suggesting new features
- Submitting pull requests
- Improving documentation
- Testing on different platforms

### How do I report bugs or request features?
Please open an issue on the GitHub repository with detailed information about your bug or feature request.
