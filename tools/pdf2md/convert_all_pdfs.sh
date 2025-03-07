#!/bin/bash

# pdf2md Production Build Script
# Converts PDF files to markdown with section detection and better formatting
# v1.0.0

# Default configurations
INPUT_DIR="/Users/philiphaynes/devel/teaching/projects/emergentmind/workbooks/process/standards/swebok"
OUTPUT_DIR="${INPUT_DIR}/markdown"
IMAGES_DIR="${OUTPUT_DIR}/images"
FORMAT="github"
TIMEOUT=600  # 10 minutes timeout
EXTRACT_EQUATIONS=false
SKIP_IMAGES=false
VERBOSE=false

# Function to show usage
usage() {
  echo "PDF to Markdown Batch Conversion Tool"
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -i, --input <dir>       Input directory containing PDF files (default: ${INPUT_DIR})"
  echo "  -o, --output <dir>      Output directory for markdown files (default: \${INPUT_DIR}/markdown)"
  echo "  -f, --format <style>    Markdown style: github or pandoc (default: github)"
  echo "  -t, --timeout <seconds> Timeout in seconds per file (default: 600)"
  echo "  -e, --equations         Try to extract equations as LaTeX"
  echo "  --no-images             Skip image extraction"
  echo "  -v, --verbose           Verbose output"
  echo "  -r, --resume <file>     Resume processing from a specific file"
  echo "  -h, --help              Show this help message"
  echo
}

# Parse command-line arguments
RESUME_FROM=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i|--input)
      INPUT_DIR="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -f|--format)
      FORMAT="$2"
      shift 2
      ;;
    -t|--timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -e|--equations)
      EXTRACT_EQUATIONS=true
      shift
      ;;
    --no-images)
      SKIP_IMAGES=true
      shift
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -r|--resume)
      RESUME_FROM="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# Update IMAGES_DIR if OUTPUT_DIR has changed
if [ "$OUTPUT_DIR" != "${INPUT_DIR}/markdown" ]; then
  IMAGES_DIR="${OUTPUT_DIR}/images"
fi

# Create output directories if they don't exist
mkdir -p "$OUTPUT_DIR"
mkdir -p "$IMAGES_DIR"

# Validate input directory
if [ ! -d "$INPUT_DIR" ]; then
  echo "Error: Input directory '$INPUT_DIR' does not exist."
  exit 1
fi

# Find all PDF files in the input directory
pdfs=()
while IFS= read -r file; do
  pdfs+=("$file")
done < <(find "$INPUT_DIR" -type f -name "*.pdf" -print)

total_files=${#pdfs[@]}
echo "Found $total_files PDF files to process"

# Flag to indicate whether we've reached the resume point
resume_found=false
if [ -z "$RESUME_FROM" ]; then
  resume_found=true
fi

# Current script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Build basic command options
PDF2MD_OPTS=()
if [ "$FORMAT" != "github" ]; then
  PDF2MD_OPTS+=(--format "$FORMAT")
fi
if [ "$EXTRACT_EQUATIONS" = true ]; then
  PDF2MD_OPTS+=(--extract-equations)
fi
if [ "$SKIP_IMAGES" = true ]; then
  PDF2MD_OPTS+=(--no-images)
fi
if [ "$VERBOSE" = true ]; then
  PDF2MD_OPTS+=(-v)
fi

# Add output directory
PDF2MD_OPTS+=(-o "$IMAGES_DIR")

# Process counter
processed=0
success=0
failed=0

# Convert each PDF to Markdown
for pdf in "${pdfs[@]}"; do
  # Get just the filename for display
  filename=$(basename "$pdf")
  
  # Skip until we reach the resume point
  if [ "$resume_found" = false ]; then
    if [ "$filename" = "$RESUME_FROM" ]; then
      resume_found=true
    else
      echo "Skipping $filename (already processed)"
      continue
    fi
  fi

  if [ -f "$pdf" ]; then
    processed=$((processed + 1))
    progress=$((processed * 100 / total_files))
    echo -e "\n[$progress%] Processing $filename ($processed/$total_files)..."
    
    # Change to output directory before processing
    cd "$OUTPUT_DIR"
    
    # Run the conversion - using perl to add a timeout
    if command -v perl > /dev/null; then
      perl -e "
        eval {
          local \$SIG{ALRM} = sub { die \"Timeout\\n\" };
          alarm $TIMEOUT;
          system(\"python3\", \"$SCRIPT_DIR/pdf2md.py\", @ARGV);
          alarm 0;
        };
        if (\$@ eq \"Timeout\\n\") {
          print \"WARNING: Processing timed out for '$filename' after $TIMEOUT seconds\\n\";
          exit 1;
        }
      " "${PDF2MD_OPTS[@]}" "$pdf"

      if [ $? -ne 0 ]; then
        echo "❌ Conversion failed or timed out for $filename"
        failed=$((failed + 1))
      else
        echo "✅ Successfully converted $filename"
        success=$((success + 1))
      fi
    else
      # Fallback if perl is not available
      python3 "$SCRIPT_DIR/pdf2md.py" "${PDF2MD_OPTS[@]}" "$pdf"
      if [ $? -ne 0 ]; then
        echo "❌ Conversion failed for $filename"
        failed=$((failed + 1))
      else
        echo "✅ Successfully converted $filename"
        success=$((success + 1))
      fi
    fi
    echo "-----------------------------------"
  else
    echo "File not found: $pdf"
    failed=$((failed + 1))
  fi

  # Add a small delay between processing to allow system to recover
  sleep 1
done

echo -e "\n===== Conversion Complete ====="
echo "Total files processed: $processed"
echo "Successfully converted: $success"
echo "Failed conversions: $failed"
echo "All successful conversions are in: $OUTPUT_DIR"
