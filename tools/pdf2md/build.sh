#!/bin/bash

# pdf2md Production Build Script
# A wrapper script that adds additional features for production use:
# - Log file generation
# - Email notification on completion
# - Parallel processing of PDFs (optional)
# - Error recovery and detailed reporting
# v1.0.0

set -e  # Exit on error

# Default configurations
DEFAULT_INPUT_DIR="/Users/philiphaynes/devel/teaching/projects/emergentmind/workbooks/process/standards/swebok"
LOG_DIR="./logs"
PARALLEL_JOBS=2  # Number of parallel conversions (0 = disable parallel processing)
NOTIFY_EMAIL=""  # Email to send completion notification
BATCH_SIZE=5     # Number of files to process in one batch

# Function to show usage
usage() {
  echo "PDF to Markdown Production Build Tool"
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  --input <dir>          Input directory containing PDF files"
  echo "  --output <dir>         Output directory for markdown files"
  echo "  --log-dir <dir>        Directory for log files (default: ./logs)"
  echo "  --parallel <jobs>      Number of parallel jobs (default: $PARALLEL_JOBS, 0 = disable)"
  echo "  --timeout <seconds>    Timeout in seconds per file (default: 600)"
  echo "  --batch-size <num>     Number of files to process in one batch (default: $BATCH_SIZE)"
  echo "  --email <address>      Send notification email when complete"
  echo "  --format <style>       Markdown style: github or pandoc (default: github)"
  echo "  --extract-equations    Try to extract equations as LaTeX"
  echo "  --no-images            Skip image extraction"
  echo "  --verbose              Verbose output"
  echo "  --resume               Resume processing from last run"
  echo "  --help                 Show this help message"
  echo
}

# Parse command-line arguments
INPUT_DIR=""
OUTPUT_DIR=""
FORMAT="github"
TIMEOUT=600
EXTRACT_EQUATIONS=false
SKIP_IMAGES=false
VERBOSE=false
RESUME=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input)
      INPUT_DIR="$2"
      shift 2
      ;;
    --output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --log-dir)
      LOG_DIR="$2"
      shift 2
      ;;
    --parallel)
      PARALLEL_JOBS="$2"
      shift 2
      ;;
    --format)
      FORMAT="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --batch-size)
      BATCH_SIZE="$2"
      shift 2
      ;;
    --email)
      NOTIFY_EMAIL="$2"
      shift 2
      ;;
    --extract-equations)
      EXTRACT_EQUATIONS=true
      shift
      ;;
    --no-images)
      SKIP_IMAGES=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --resume)
      RESUME=true
      shift
      ;;
    --help)
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

# Use default input directory if none specified
if [ -z "$INPUT_DIR" ]; then
  INPUT_DIR="$DEFAULT_INPUT_DIR"
  echo "Using default input directory: $INPUT_DIR"
fi

# Set default output directory if none specified
if [ -z "$OUTPUT_DIR" ]; then
  OUTPUT_DIR="${INPUT_DIR}/markdown"
  echo "Using default output directory: $OUTPUT_DIR"
fi

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Set up log files
timestamp=$(date +"%Y%m%d_%H%M%S")
MAIN_LOG="${LOG_DIR}/pdf2md_${timestamp}.log"
ERROR_LOG="${LOG_DIR}/pdf2md_errors_${timestamp}.log"
PROGRESS_FILE="${LOG_DIR}/progress.txt"

# Initialize logs
echo "PDF to Markdown Conversion - Started at $(date)" | tee -a "$MAIN_LOG"
echo "Input directory: $INPUT_DIR" | tee -a "$MAIN_LOG"
echo "Output directory: $OUTPUT_DIR" | tee -a "$MAIN_LOG"
echo "Configuration:" | tee -a "$MAIN_LOG"
echo "  Format: $FORMAT" | tee -a "$MAIN_LOG"
echo "  Extract equations: $EXTRACT_EQUATIONS" | tee -a "$MAIN_LOG"
echo "  Skip images: $SKIP_IMAGES" | tee -a "$MAIN_LOG"
echo "  Parallel jobs: $PARALLEL_JOBS" | tee -a "$MAIN_LOG"
echo "  Timeout: ${TIMEOUT}s" | tee -a "$MAIN_LOG"
echo "  Batch size: $BATCH_SIZE" | tee -a "$MAIN_LOG"
echo "--------------------------------------------" | tee -a "$MAIN_LOG"

# Current script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Build conversion options for convert_all_pdfs.sh
CONVERT_OPTS=()
CONVERT_OPTS+=(--input "$INPUT_DIR")
CONVERT_OPTS+=(--output "$OUTPUT_DIR")
CONVERT_OPTS+=(--format "$FORMAT") 
CONVERT_OPTS+=(--timeout "$TIMEOUT")

if [ "$EXTRACT_EQUATIONS" = true ]; then
  CONVERT_OPTS+=(--equations)
fi
if [ "$SKIP_IMAGES" = true ]; then
  CONVERT_OPTS+=(--no-images)
fi
if [ "$VERBOSE" = true ]; then
  CONVERT_OPTS+=(--verbose)
fi

# If resuming, use the latest progress file to determine where to start
if [ "$RESUME" = true ] && [ -f "$PROGRESS_FILE" ]; then
  LAST_FILE=$(tail -1 "$PROGRESS_FILE" | cut -d'|' -f1)
  if [ -n "$LAST_FILE" ]; then
    CONVERT_OPTS+=(--resume "$LAST_FILE")
    echo "Resuming from $LAST_FILE" | tee -a "$MAIN_LOG"
  fi
fi

# Function to process a batch of PDFs
process_batch() {
  local batch_files=("$@")
  local batch_cmd="$SCRIPT_DIR/convert_all_pdfs.sh ${CONVERT_OPTS[@]}"
  
  if [ ${#batch_files[@]} -gt 0 ]; then
    # Process specific files in this batch
    for file in "${batch_files[@]}"; do
      "$SCRIPT_DIR/convert_all_pdfs.sh" "${CONVERT_OPTS[@]}" --input "$(dirname "$file")" --resume "$(basename "$file")" 2>> "$ERROR_LOG" | tee -a "$MAIN_LOG"
      echo "$(basename "$file")|$(date +"%Y-%m-%d %H:%M:%S")" >> "$PROGRESS_FILE"
    done
  else
    # Process all files
    "$SCRIPT_DIR/convert_all_pdfs.sh" "${CONVERT_OPTS[@]}" 2>> "$ERROR_LOG" | tee -a "$MAIN_LOG"
  fi
}

# Main execution
start_time=$(date +%s)

if [ "$PARALLEL_JOBS" -gt 1 ]; then
  echo "Starting parallel processing with $PARALLEL_JOBS jobs..." | tee -a "$MAIN_LOG"
  
  # Find all PDFs and split into batches
  mapfile -t all_pdfs < <(find "$INPUT_DIR" -type f -name "*.pdf" -print)
  
  if [ ${#all_pdfs[@]} -eq 0 ]; then
    echo "No PDF files found in $INPUT_DIR" | tee -a "$MAIN_LOG" "$ERROR_LOG"
    exit 1
  fi
  
  echo "Found ${#all_pdfs[@]} PDF files to process" | tee -a "$MAIN_LOG"
  
  # Process in batches using parallel
  if command -v parallel &> /dev/null; then
    # GNU Parallel is available
    echo "Using GNU Parallel for processing" | tee -a "$MAIN_LOG"
    
    # Create a temporary job file
    JOB_FILE="${LOG_DIR}/jobs_${timestamp}.txt"
    for pdf in "${all_pdfs[@]}"; do
      echo "$pdf" >> "$JOB_FILE"
    done
    
    # Run parallel processing
    cat "$JOB_FILE" | parallel -j "$PARALLEL_JOBS" "$SCRIPT_DIR/pdf2md.py -o \"$OUTPUT_DIR/images\" {} 2>> \"$ERROR_LOG\" | tee -a \"$MAIN_LOG\"; echo \"{} | $(date +\"%Y-%m-%d %H:%M:%S\")\" >> \"$PROGRESS_FILE\""
    
    # Clean up
    rm -f "$JOB_FILE"
  else
    # Fallback to basic parallelism with background processes
    echo "GNU Parallel not found, using basic background processing" | tee -a "$MAIN_LOG"
    
    # Split files into batches
    total_batches=$(( (${#all_pdfs[@]} + BATCH_SIZE - 1) / BATCH_SIZE ))
    active_jobs=0
    
    for ((i=0; i<${#all_pdfs[@]}; i+=BATCH_SIZE)); do
      batch_end=$((i + BATCH_SIZE))
      if [ $batch_end -gt ${#all_pdfs[@]} ]; then
        batch_end=${#all_pdfs[@]}
      fi
      
      # Extract batch of files
      batch_files=("${all_pdfs[@]:i:batch_end-i}")
      
      # Process batch in background
      {
        for pdf in "${batch_files[@]}"; do
          echo "Processing $pdf"
          "$SCRIPT_DIR/pdf2md.py" -o "$OUTPUT_DIR/images" "$pdf" 2>> "$ERROR_LOG" | tee -a "$MAIN_LOG"
          echo "$(basename "$pdf")|$(date +"%Y-%m-%d %H:%M:%S")" >> "$PROGRESS_FILE"
        done
      } &
      
      active_jobs=$((active_jobs + 1))
      
      # Wait if we've reached the maximum number of parallel jobs
      if [ $active_jobs -ge $PARALLEL_JOBS ]; then
        wait -n  # Wait for any job to finish
        active_jobs=$((active_jobs - 1))
      fi
      
      # Progress report
      current_progress=$((i * 100 / ${#all_pdfs[@]}))
      echo "Progress: $current_progress% (Batch $((i/BATCH_SIZE + 1))/$total_batches)" | tee -a "$MAIN_LOG"
    done
    
    # Wait for all remaining jobs to finish
    wait
  fi
else
  # Sequential processing
  echo "Starting sequential processing..." | tee -a "$MAIN_LOG"
  process_batch
fi

# Calculate duration
end_time=$(date +%s)
duration=$((end_time - start_time))
hours=$((duration / 3600))
minutes=$(( (duration % 3600) / 60 ))
seconds=$((duration % 60))

# Generate summary
echo "" | tee -a "$MAIN_LOG"
echo "====== Conversion Summary ======" | tee -a "$MAIN_LOG"
echo "Completed at: $(date)" | tee -a "$MAIN_LOG"
echo "Total duration: ${hours}h ${minutes}m ${seconds}s" | tee -a "$MAIN_LOG"

# Count successes and failures
if [ -f "$ERROR_LOG" ]; then
  error_count=$(grep -c "Conversion failed\|Error\|WARNING" "$ERROR_LOG" || echo 0)
  echo "Errors encountered: $error_count (see $ERROR_LOG for details)" | tee -a "$MAIN_LOG"
else
  error_count=0
  echo "No errors were logged" | tee -a "$MAIN_LOG"
fi

# Count total processed files
if [ -f "$PROGRESS_FILE" ]; then
  processed_count=$(wc -l < "$PROGRESS_FILE")
  echo "Total files processed: $processed_count" | tee -a "$MAIN_LOG"
else
  processed_count=0
  echo "No progress was recorded" | tee -a "$MAIN_LOG"
fi

# Send email notification if requested
if [ -n "$NOTIFY_EMAIL" ]; then
  if command -v mail &> /dev/null; then
    {
      echo "PDF to Markdown Conversion Complete"
      echo ""
      echo "Total files processed: $processed_count"
      echo "Errors encountered: $error_count"
      echo "Duration: ${hours}h ${minutes}m ${seconds}s"
      echo ""
      echo "Output directory: $OUTPUT_DIR"
      echo "Log file: $MAIN_LOG"
      if [ $error_count -gt 0 ]; then
        echo ""
        echo "=== First 10 Errors ==="
        head -n 10 "$ERROR_LOG"
      fi
    } | mail -s "PDF Conversion Complete - $processed_count files" "$NOTIFY_EMAIL"
    echo "Notification email sent to $NOTIFY_EMAIL" | tee -a "$MAIN_LOG"
  else
    echo "mail command not found - could not send notification" | tee -a "$MAIN_LOG" "$ERROR_LOG"
  fi
fi

echo "Conversion process complete. See $MAIN_LOG for details." | tee -a "$MAIN_LOG"
echo "Output files located in: $OUTPUT_DIR" | tee -a "$MAIN_LOG"

# Set permissions for output files
chmod -R 755 "$OUTPUT_DIR"

exit 0