#!/bin/bash
# Build script for Stage 6 textbooks with proper TOC

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display status messages
status() {
  echo -e "${BLUE}[STATUS]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to compile a textbook
compile_textbook() {
  local subject=$1
  local tex_file="stage6-${subject}-textbook.tex"
  local dir="stage6-${subject}"
  
  status "Building stage6-${subject} textbook..."
  
  # Move to the textbook directory
  cd "/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/${dir}"
  
  # Ensure file exists
  if [ ! -f "$tex_file" ]; then
    error "Cannot find ${tex_file} in ${dir} directory!"
    return 1
  fi
  
  # Compile the textbook
  status "Running first pdflatex pass..."
  pdflatex -interaction=nonstopmode "$tex_file"
  
  if [ ! -f "${tex_file%.tex}.pdf" ]; then
    error "PDF was not generated after first LaTeX run despite completion."
    return 1
  else
    success "First LaTeX pass completed."
  fi
  
  status "Running second pdflatex pass for TOC..."
  pdflatex -interaction=nonstopmode "$tex_file"
  
  # Verify the output PDF exists
  local pdf_file="${tex_file%.tex}.pdf"
  if [ -f "$pdf_file" ]; then
    success "PDF generated: ${pdf_file}"
    
    # Copy to pdfs directory
    mkdir -p "/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/pdfs"
    cp "$pdf_file" "/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/pdfs/"
    success "PDF copied to pdfs directory"
  else
    error "PDF file not found after compilation."
    return 1
  fi
}

# Main script execution
if [ "$#" -eq 0 ]; then
  # If no arguments provided, show usage
  echo "Usage: $0 [physics|chemistry|all]"
  exit 1
fi

subject="$1"

case "$subject" in
  "physics")
    compile_textbook "physics"
    ;;
  "chemistry")
    compile_textbook "chemistry"
    ;;
  "all")
    compile_textbook "physics"
    compile_textbook "chemistry"
    ;;
  *)
    error "Unknown subject: $subject. Use 'physics', 'chemistry', or 'all'."
    exit 1
    ;;
esac

exit 0
