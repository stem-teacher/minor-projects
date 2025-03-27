# Multiple Choice Marking Guide

A tool for automatically applying marking guides to multiple-choice exam papers.

## Overview

This program extracts annotation patterns from a template PDF and applies them to the first page of target PDFs. This is useful for teachers who want to apply a consistent marking guide to multiple exam papers.

## Installation

Build the program using Cargo:

```
cargo build --release --bin multiple-choice-marking-guide
```

## Usage

```
multiple-choice-marking-guide --template TEMPLATE_FILE --input-dir INPUT_DIR --output-dir OUTPUT_DIR [OPTIONS]
```

### Required Arguments

- `--template <TEMPLATE_FILE>`: Path to the PDF containing the marking guide annotations
- `--input-dir <INPUT_DIR>`: Directory containing the PDFs to process
- `--output-dir <OUTPUT_DIR>`: Directory where the processed PDFs will be saved

### Optional Arguments

- `--recursive`: Process directories recursively
- `--pattern <PATTERN>`: File pattern to match (default: "*.pdf")
- `--force`: Overwrite existing files
- `--verbose`: Enable verbose output
- `--dry-run`: Simulate processing without making changes

## Example

```
multiple-choice-marking-guide --template marked_example.pdf --input-dir exams/ --output-dir graded/ --recursive
```

## Supported Annotation Types

The following annotation types are supported:

- Circle annotations (for multiple-choice selections)
- Square annotations
- Highlight annotations
- FreeText annotations (for comments)

## How It Works

1. The program loads the template PDF and extracts all annotations from the first page
2. It then processes each PDF in the input directory
3. For each input PDF, it applies the extracted annotations to the first page
4. The modified PDFs are saved to the output directory

## Limitations

- Only annotations on the first page of the template PDF are used
- The program assumes that all target PDFs have a compatible first page layout
- Complex annotation types might not be perfectly preserved
