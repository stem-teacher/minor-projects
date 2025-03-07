#!/bin/bash

echo "Building PDFs from LaTeX files..."

# Create output directory if it doesn't exist
mkdir -p output

# Convert stage4 textbook
echo "Building stage4 textbook..."
pdflatex -interaction=batchmode -output-directory=output stage4-proto-claude.tex

# Convert stage5 textbook
echo "Building stage5 textbook..."
pdflatex -interaction=batchmode -output-directory=output stage5-proto-gpt4-5.tex

echo "PDF build completed. Check the output directory for the PDF files."
