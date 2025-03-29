#!/bin/bash
set -e # Exit on error

TASK_ID="4.1.R1-template-add-placeholders"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

INPUT_PDF="$PROJECT_ROOT/test_resources/input/sample_exam_marking_template.pdf"
OUTPUT_PDF="$PROJECT_ROOT/test_resources/output/sample_exam_marking_template_annotated.pdf"
ADD_BIN="$PROJECT_ROOT/target/debug/add-annotation" # Assumes it's built

# Default Rect for initial placement (e.g., top-left) - User will move these later
DEFAULT_RECT="10,772,100,782"
RIGHT_RECT="500,772,580,782" # Approx Top-Right

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Add placeholder annotations to $INPUT_PDF." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Prerequisite: Check/Build Binary ---
if [ ! -f "$ADD_BIN" ]; then
    echo "[Build Step] Building add-annotation binary" | tee -a "$STEP_LOG"
    echo "Command: (cd \"$PROJECT_ROOT\" && cargo build --bin add-annotation)" >> "$COMMAND_LOG"
    (cd "$PROJECT_ROOT" && cargo build --bin add-annotation) >> "$COMMAND_LOG" 2>&1
    if [ $? -ne 0 ]; then echo "Error: Build failed" | tee -a "$STEP_LOG"; exit 1; fi
    echo "Result: Build complete." >> "$STEP_LOG"
else
    echo "[Build Step] Binary $ADD_BIN already exists." | tee -a "$STEP_LOG"
fi
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 1: Add Annotations ---
echo "[Action 1] Adding annotations..." | tee -a "$STEP_LOG"
rm -f "$OUTPUT_PDF" # Clean previous run

# Use a temporary file for intermediate steps to avoid issues with modifying input
TEMP_PDF_1="$SCRIPT_DIR/temp1.pdf"
TEMP_PDF_2="$SCRIPT_DIR/temp2.pdf"
cp "$INPUT_PDF" "$TEMP_PDF_1"
CURRENT_IN="$TEMP_PDF_1"
CURRENT_OUT="$TEMP_PDF_2"

run_add_annotation() {
    local cmd_desc="$1"; shift
    local cmd_args=("$@")
    echo "  -> Adding: $cmd_desc" | tee -a "$STEP_LOG"
    local command="\"$ADD_BIN\" --input \"$CURRENT_IN\" --output \"$CURRENT_OUT\" ${cmd_args[*]}"
    echo "Command: $command" >> "$COMMAND_LOG"
    eval "$command" >> "$COMMAND_LOG" 2>&1
    if [ $? -ne 0 ]; then echo "Error: Command failed for '$cmd_desc'" | tee -a "$STEP_LOG"; exit 1; fi
    # Swap input and output for next iteration
    local temp_swap="$CURRENT_IN"
    CURRENT_IN="$CURRENT_OUT"
    CURRENT_OUT="$temp_swap"
}

# Filename Stamp Placeholders (All Pages)
run_add_annotation "Filename Stamp Placeholders" \
    --pages "1,2,3,4,5,6" \
    --label-template "filename_stamp_p{page}" \
    --rect "$RIGHT_RECT" \
    --contents-template "FILENAME_PLACEHOLDER"

# Page 1 Score Fields
run_add_annotation "Mark Part A" --pages "1" --label-template "mark-part-a" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Part B" --pages "1" --label-template "mark-part-b" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Total"  --pages "1" --label-template "mark-total"  --rect "$DEFAULT_RECT" --contents-template "0"

# Page 2 Score Fields
run_add_annotation "Mark Q16a" --pages "2" --label-template "mark-q16-a" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Q16b" --pages "2" --label-template "mark-q16-b" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Q16c" --pages "2" --label-template "mark-q16-c" --rect "$DEFAULT_RECT" --contents-template "0"

# Page 3 Score Fields
run_add_annotation "Mark Q16d" --pages "3" --label-template "mark-q16-d" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Q16e" --pages "3" --label-template "mark-q16-e" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Q16f" --pages "3" --label-template "mark-q16-f" --rect "$DEFAULT_RECT" --contents-template "0"

# Page 4 Score Fields
run_add_annotation "Mark Q16g" --pages "4" --label-template "mark-q16-g" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Q16h" --pages "4" --label-template "mark-q16-h" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Q17"  --pages "4" --label-template "mark-q17"  --rect "$DEFAULT_RECT" --contents-template "0"

# Page 5 Score Fields
run_add_annotation "Mark Q18a" --pages "5" --label-template "mark-q18-a" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Q18b" --pages "5" --label-template "mark-q18-b" --rect "$DEFAULT_RECT" --contents-template "0"

# Page 6 Score Fields
run_add_annotation "Mark Q19a" --pages "6" --label-template "mark-q19-a" --rect "$DEFAULT_RECT" --contents-template "0"
run_add_annotation "Mark Q19b" --pages "6" --label-template "mark-q19-b" --rect "$DEFAULT_RECT" --contents-template "0"

# Move final result (which is in CURRENT_IN due to swap) to the actual output path
echo "Moving final temporary file $CURRENT_IN to $OUTPUT_PDF" | tee -a "$STEP_LOG" "$COMMAND_LOG"
mkdir -p $(dirname "$OUTPUT_PDF") # Make sure output directory exists
mv "$CURRENT_IN" "$OUTPUT_PDF"
rm -f "$CURRENT_OUT" # Clean up the remaining temp file

echo "Result: Annotations added. Final file: $OUTPUT_PDF" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 2: Verify Output ---
echo "[Action 2] Verifying output file $OUTPUT_PDF exists" | tee -a "$STEP_LOG"
echo "Command: test -f \"$OUTPUT_PDF\"" >> "$COMMAND_LOG"
if [ -f "$OUTPUT_PDF" ]; then
    echo "Result: Output file found." >> "$STEP_LOG"
    FINAL_CHECK_STATUS=0
else
    echo "Error: Output file $OUTPUT_PDF was not created." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    FINAL_CHECK_STATUS=1
fi
echo "" >> "$STEP_LOG"

# --- Log End ---
echo "---" >> "$COMMAND_LOG"
if [ $FINAL_CHECK_STATUS -eq 0 ]; then
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: Successfully added all placeholder annotations." >> "$STEP_LOG"
  echo "Manual Action Required: Please open $OUTPUT_PDF and manually adjust the position and size of all added annotations (labels starting with 'filename_stamp_p' and 'mark-'). Save the adjusted file." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: Failed during annotation adding process or final file not found. See logs." >> "$STEP_LOG"
  exit 1
fi