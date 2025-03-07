# PDF to Markdown Converter

A tool for converting PDF textbooks into sectioned Markdown files with extracted text and images.

## Features

- Convert PDF files to well-formatted Markdown
- Extract and include images from PDF files
- Detect and organize content by sections
- Process multiple PDF files in parallel
- Support for resuming interrupted conversions
- Detailed logging and error reporting
- Email notifications for batch completion

## Requirements

- Python 3.6 or higher
- `pdftotext` and `pdftoppm` utilities (from poppler)
- `pdfinfo` utility (from poppler)
- GNU Parallel (optional, for faster processing)

## Installation

1. Clone this repository
2. Ensure that poppler utilities are installed on your system:
   - For macOS: `brew install poppler`
   - For Ubuntu/Debian: `apt install poppler-utils`
   - For Windows: Install through Cygwin or download precompiled binaries

## Usage

### Single File Conversion

To convert a single PDF file to Markdown:

```bash
./pdf2md.py -o output/images input.pdf
```

Available options:
```
  -h, --help                Display help message
  -v, --verbose             Enable detailed output during conversion
  -o, --output <dir>        Specify the output directory (default: images)
  -p, --pages <range>       Convert specific page range (e.g. '1-5' or '2,4,7')
  --no-images               Skip image extraction
  --extract-equations       Convert embedded equations to LaTeX
  --format <style>          Choose Markdown style (github or pandoc)
  --version                 Show version information
```

### Batch Processing

To process multiple PDF files:

```bash
./convert_all_pdfs.sh --input /path/to/pdfs --output /path/to/output
```

Available options:
```
  -i, --input <dir>       Input directory containing PDF files
  -o, --output <dir>      Output directory for markdown files
  -f, --format <style>    Markdown style: github or pandoc (default: github)
  -t, --timeout <seconds> Timeout in seconds per file (default: 600)
  -e, --equations         Try to extract equations as LaTeX
  --no-images             Skip image extraction
  -v, --verbose           Verbose output
  -r, --resume <file>     Resume processing from a specific file
  -h, --help              Show this help message
```

### Production Build

For production use with advanced features:

```bash
./build.sh --input /path/to/pdfs --output /path/to/output --parallel 4
```

This script provides additional features:
```
  --input <dir>          Input directory containing PDF files
  --output <dir>         Output directory for markdown files
  --log-dir <dir>        Directory for log files (default: ./logs)
  --parallel <jobs>      Number of parallel jobs (default: 2, 0 = disable)
  --timeout <seconds>    Timeout in seconds per file (default: 600)
  --batch-size <num>     Number of files to process in one batch (default: 5)
  --email <address>      Send notification email when complete
  --format <style>       Markdown style: github or pandoc (default: github)
  --extract-equations    Try to extract equations as LaTeX
  --no-images            Skip image extraction
  --verbose              Verbose output
  --resume               Resume processing from last run
```

## Examples

1. Convert a single PDF with equations:

```bash
./pdf2md.py --extract-equations -o output/images textbook.pdf
```

2. Convert all PDFs in a directory with verbose output:

```bash
./convert_all_pdfs.sh -i ~/Documents/textbooks -o ~/Documents/markdown -v
```

3. Process textbooks in parallel with email notification:

```bash
./build.sh --input ~/textbooks --parallel 4 --email user@example.com --extract-equations
```

## Output Format

The conversion process produces:
- A markdown file for each PDF
- Each markdown file is organized into sections detected from the PDF
- Each section contains pages with extracted text and images
- A table of contents for easy navigation
- Images stored in the specified output directory

## Customization

You can modify the section detection patterns in the `pdf2md.py` file to better match your specific PDF structure.

## License

MIT License