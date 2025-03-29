#!/bin/bash
set -e # Exit on error

TASK_ID="3.3-test-cli-add-multi-rect"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

INPUT_PDF="$PROJECT_ROOT/test_resources/input/sample_exam.pdf"
OUTPUT_PDF="$PROJECT_ROOT/test_resources/output/sample_exam_rgb_rects.pdf"
ADD_BIN="$PROJECT_ROOT/target/debug/add-annotation" # Assumes it's built

# Define common properties
PAGES="1,2,3,4,5,6"
BORDER_WIDTH="1.0" # Thin border

# Define properties for each rectangle (stacked vertically)
# Rect: [X1, Y1, X2, Y2] - Y1 is bottom edge
RED_LABEL="Rect_Red_p{page}"
RED_RECT="10,760,100,770" # Top one
RED_COLOR="1.0,0.0,0.0"

GREEN_LABEL="Rect_Green_p{page}"
GREEN_RECT="10,745,100,755" # Middle one
GREEN_COLOR="0.0,1.0,0.0"

BLACK_LABEL="Rect_Black_p{page}"
BLACK_RECT="10,730,100,740" # Bottom one
BLACK_COLOR="0.0,0.0,0.0"

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Add stacked Red, Green, Black rectangles to all pages of $INPUT_PDF." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Prerequisite: Check File & Binary ---
echo "[Check] Verifying input file and binary exist" | tee -a "$STEP_LOG"
if [ ! -f "$INPUT_PDF" ]; then echo "Error: Input PDF '$INPUT_PDF' not found!" | tee -a "$STEP_LOG"; exit 1; fi
if [ ! -f "$ADD_BIN" ]; then
    echo "Warning: Binary $ADD_BIN not found, attempting build..." | tee -a "$STEP_LOG"
    echo "Command: (cd \"$PROJECT_ROOT\" && cargo build --bin add-annotation)" >> "$COMMAND_LOG"
    (cd "$PROJECT_ROOT" && cargo build --bin add-annotation) >> "$COMMAND_LOG" 2>&1
    if [ $? -ne 0 ]; then echo "Error: Build failed" | tee -a "$STEP_LOG"; exit 1; fi
fi
echo "Result: Prerequisites met." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 1: Add Annotations using Temp File Ping-Pong ---
echo "[Action 1] Adding rectangle annotations..." | tee -a "$STEP_LOG"
rm -f "$OUTPUT_PDF" # Clean previous run

TEMP_PDF_1="$SCRIPT_DIR/temp1.pdf"
TEMP_PDF_2="$SCRIPT_DIR/temp2.pdf"
cp "$INPUT_PDF" "$TEMP_PDF_1"
CURRENT_IN="$TEMP_PDF_1"
CURRENT_OUT="$TEMP_PDF_2"

run_add_rect() {
    local color_desc="$1"; shift
    local cmd_args=("$@")
    echo "  -> Adding: $color_desc Rectangles" | tee -a "$STEP_LOG"
    # Note: No --interior-color is specified, so they should be clear inside
    local command="\"$ADD_BIN\" --input \"$CURRENT_IN\" --output \"$CURRENT_OUT\" --type rect ${cmd_args[*]}"
    echo "Command: $command" >> "$COMMAND_LOG"
    COMMAND_OUTPUT_FILE="$SCRIPT_DIR/cli_run_${color_desc}.output"
    eval "$command" > "$COMMAND_OUTPUT_FILE" 2>&1
    CMD_STATUS=$?
    cat "$COMMAND_OUTPUT_FILE" >> "$COMMAND_LOG"
    rm "$COMMAND_OUTPUT_FILE"
    if [ $CMD_STATUS -ne 0 ]; then echo "Error: Command failed for '$color_desc'" | tee -a "$STEP_LOG"; exit 1; fi
    # Swap input and output for next iteration
    local temp_swap="$CURRENT_IN"
    CURRENT_IN="$CURRENT_OUT"
    CURRENT_OUT="$temp_swap"
    echo "---" >> "$COMMAND_LOG"
}

# Add Red Rectangles
run_add_rect "Red" \
    --pages "$PAGES" \
    --label-template "$RED_LABEL" \
    --rect "$RED_RECT" \
    --color "$RED_COLOR" \
    --border-width "$BORDER_WIDTH"

# Add Green Rectangles
run_add_rect "Green" \
    --pages "$PAGES" \
    --label-template "$GREEN_LABEL" \
    --rect "$GREEN_RECT" \
    --color "$GREEN_COLOR" \
    --border-width "$BORDER_WIDTH"

# Add Black Rectangles
run_add_rect "Black" \
    --pages "$PAGES" \
    --label-template "$BLACK_LABEL" \
    --rect "$BLACK_RECT" \
    --color "$BLACK_COLOR" \
    --border-width "$BORDER_WIDTH"

# Move final result (which is in CURRENT_IN due to swap) to the actual output path
echo "Moving final temporary file $CURRENT_IN to $OUTPUT_PDF" | tee -a "$STEP_LOG" "$COMMAND_LOG"
mv "$CURRENT_IN" "$OUTPUT_PDF"
rm -f "$CURRENT_OUT" # Clean up the remaining temp file

echo "Result: Annotations added. Final file: $OUTPUT_PDF" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"


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
  echo "Validation: Successfully added Red, Green, Black rectangles to all pages." >> "$STEP_LOG"
  echo "Manual Verification Recommended: Please open $OUTPUT_PDF and check for 3 stacked, colored rectangles in the top-left of each page." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: Failed during annotation adding process or final file not found. See logs." >> "$STEP_LOG"
  exit 1
fi