# PDF Filename Annotator: User Guide

This comprehensive guide explains how to effectively use the PDF Filename Annotator tool for labeling PDF documents with their filenames.

## Introduction

PDF Filename Annotator is a specialized tool for educators and document processors who need to stamp each page of PDF files with the filename for identification and tracking purposes. This is particularly useful for:

- Exam papers that need identification when printed
- Research documents that require source tracking
- Document collections that need easy identification after printing
- Teaching materials that need to be labeled with source information

## Basic Usage

The simplest way to use the annotator is:

```bash
pdf-filename-annotator --config config.json
```

This will:
1. Read the configuration from `config.json`
2. Find all PDF files in the specified input directory
3. Add the filename as text in the top-right corner of each page
4. Save the annotated PDFs to the output directory

## Configuration Options

The configuration file controls all aspects of the annotation process. Here's a detailed explanation of each option:

### Core Settings

```json
{
  "input_dir": "/path/to/input/pdfs",
  "output_dir": "/path/to/output/pdfs",
  "recursive": true
}
```

- **input_dir**: The directory containing PDF files to process
- **output_dir**: The directory where annotated PDFs will be saved
- **recursive**: Whether to search for PDFs in subdirectories (default: false)

### Font Settings

```json
"font": {
  "family": "Calibri",
  "size": 12.0,
  "fallback": "Arial"
}
```

- **family**: Preferred font name (e.g., "Calibri", "Times New Roman")
- **size**: Font size in points (default: 12.0)
- **fallback**: Alternative font to use if the primary font is not available

### Position Settings

```json
"position": {
  "corner": "top-right",
  "x_offset": 10.0,
  "y_offset": 10.0
}
```

- **corner**: Where to position the text: "top-right", "top-left", "bottom-right", or "bottom-left"
- **x_offset**: Horizontal distance from the corner in points
- **y_offset**: Vertical distance from the corner in points

## Advanced Usage

### Processing Specific Files

To process a subset of files, organize them in a separate directory and point the configuration to that directory.

### Custom Font Selection

For consistent appearance across different systems:

1. Place TTF font files in a `fonts` directory in your project
2. Use the exact filename (without extension) in your configuration:

```json
"font": {
  "family": "CustomFont",
  "size": 12.0
}
```

### Batch Processing

For processing large collections of PDFs, consider:

1. Creating multiple configuration files for different sets of documents
2. Using shell scripts to run the annotator with different configurations
3. Scheduling regular processing with cron jobs (Linux/macOS) or Task Scheduler (Windows)

## Command Line Arguments

The tool supports the following command-line arguments:

- `--config, -c`: Path to the configuration file (required)
- `--verbose, -v`: Enable verbose output for debugging
- `--help, -h`: Display help information
- `--version`: Display version information

## Example Scenarios

### Scenario 1: Processing Exam Papers

For a collection of exam papers in nested directories:

```json
{
  "input_dir": "/Teachers/exams/term1",
  "output_dir": "/Teachers/exams/term1_labeled",
  "recursive": true,
  "font": {
    "family": "Calibri",
    "size": 10.0
  },
  "position": {
    "corner": "top-right",
    "x_offset": 15.0,
    "y_offset": 15.0
  }
}
```

### Scenario 2: Research Paper Collection

For a flat directory of research papers:

```json
{
  "input_dir": "/Research/papers",
  "output_dir": "/Research/papers_labeled",
  "recursive": false,
  "font": {
    "family": "Times New Roman",
    "size": 8.0
  },
  "position": {
    "corner": "bottom-left",
    "x_offset": 10.0,
    "y_offset": 10.0
  }
}
```

## Troubleshooting

### Issue: Font Not Found

**Symptom**: Error message about missing font

**Solution**:
1. Specify a more common font in your configuration
2. Add the `fallback` option
3. Place TTF files in the `fonts` directory

### Issue: No PDFs Found

**Symptom**: "No PDF files found in directory" error

**Solution**:
1. Verify the input directory path
2. Check if the files have `.pdf` extension (case insensitive)
3. Set `recursive: true` if PDFs are in subdirectories

### Issue: Permission Errors

**Symptom**: Unable to read or write files

**Solution**:
1. Ensure you have appropriate file system permissions
2. Check that the output directory exists or can be created
3. Run the application with elevated privileges if necessary

## Best Practices

1. **Backup Your Files**: Always keep a backup of original PDFs
2. **Test First**: Process a small batch before running on all files
3. **Use Descriptive Filenames**: The annotation displays the filename, so use descriptive names
4. **Check Output**: Periodically verify output quality, especially with different PDF sources

## Future Features

The following features are planned for future releases:

- OCR capabilities for text extraction
- Automated exam marking features
- Additional annotation types beyond simple text
- Customizable annotation templates
- PDF metadata extraction and display
