#!/bin/bash
# Script to compile a textbook with three LaTeX runs to ensure TOC is generated properly
# Usage: ./compile_textbook.sh [chemistry|physics]

set -e  # Exit on error

# Default to chemistry if no argument provided
SUBJECT=${1:-chemistry}

if [[ "$SUBJECT" != "chemistry" && "$SUBJECT" != "physics" ]]; then
    echo "Invalid subject. Use 'chemistry' or 'physics'"
    exit 1
fi

STAGE_DIR="stage6-${SUBJECT}"
MAIN_TEX="main-textbook.tex"

# Check if directory exists
if [ ! -d "$STAGE_DIR" ]; then
    echo "Directory $STAGE_DIR does not exist!"
    exit 1
fi

# Change to the appropriate directory
cd "$STAGE_DIR"

echo "Compiling $MAIN_TEX..."

# Fix table of contents
echo "Fixing table of contents in $MAIN_TEX..."
sed -i "" 's/\\tableofcontents/\\begingroup\n\\setlength{\\parskip}{0pt}\\setlength{\\parindent}{0pt}\n\\tableofcontents\n\\endgroup\n\\clearpage/' "$MAIN_TEX"

# Clean up any existing auxiliary files
rm -f *.aux *.toc *.log *.out

# Run pdflatex three times to ensure all references and TOC are updated
echo "First LaTeX run (generating auxiliary files)..."
pdflatex -interaction=nonstopmode "$MAIN_TEX"

echo "Second LaTeX run (updating table of contents)..."
pdflatex -interaction=nonstopmode "$MAIN_TEX"

echo "Third LaTeX run (finalizing document)..."
pdflatex -interaction=nonstopmode "$MAIN_TEX"

echo "Compilation complete! PDF created: $(pwd)/$MAIN_TEX"
cd ..

echo "Done!"
