#!/bin/bash
set -e # Exit on error

TASK_ID="3.1-test-cli-add-annotation"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

INPUT_PDF="$PROJECT_ROOT/test_resources/input/sample_exam.pdf"
OUTPUT_PDF="$PROJECT_ROOT/test_resources/output/sample_exam_stamped.pdf"

# Define the annotation properties
ANNOTATION_LABEL_TEMPLATE="TestStamp_p{page}"
ANNOTATION_CONTENTS_TEMPLATE="Page {page}"
# Top-left corner approx rect: [10, 772, 100, 782]
ANNOTATION_RECT="10,772,100,782"
ANNOTATION_FONT_SIZE="10.0"
# Specify all 6 pages
PAGES_LIST="1,2,3,4,5,6"

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Add annotations to all pages of $INPUT_PDF using updated add-annotation CLI." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Action 1: Build the add-annotation binary ---
echo "[Action 1] Building add-annotation binary (Debug)" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo build --bin add-annotation)" >> "$COMMAND_LOG"
BUILD_OUTPUT_FILE="$SCRIPT_DIR/cargo_build.output"
(cd "$PROJECT_ROOT" && cargo build --bin add-annotation) > "$BUILD_OUTPUT_FILE" 2>&1
BUILD_STATUS=$?
cat "$BUILD_OUTPUT_FILE" >> "$COMMAND_LOG"
if [ $BUILD_STATUS -ne 0 ]; then
    echo "Error: Failed to build add-annotation binary. Check build log." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi
BINARY_PATH="$PROJECT_ROOT/target/debug/add-annotation"
echo "Result: Binary built successfully at $BINARY_PATH." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 2: Run the add-annotation command ---
echo "[Action 2] Running add-annotation for pages $PAGES_LIST" | tee -a "$STEP_LOG"
# Remove previous output file if it exists
rm -f "$OUTPUT_PDF"

COMMAND="\"$BINARY_PATH\" --input \"$INPUT_PDF\" --output \"$OUTPUT_PDF\" --pages \"$PAGES_LIST\" --label-template \"$ANNOTATION_LABEL_TEMPLATE\" --rect \"$ANNOTATION_RECT\" --contents-template \"$ANNOTATION_CONTENTS_TEMPLATE\" --font-size $ANNOTATION_FONT_SIZE"
echo "Command: $COMMAND" >> "$COMMAND_LOG"

# Execute the command
COMMAND_OUTPUT_FILE="$SCRIPT_DIR/cli_run.output"
eval "$COMMAND" > "$COMMAND_OUTPUT_FILE" 2>&1
CMD_STATUS=$?
cat "$COMMAND_OUTPUT_FILE" >> "$COMMAND_LOG"
# rm "$COMMAND_OUTPUT_FILE" # Keep output

if [ $CMD_STATUS -ne 0 ]; then
    echo "Error: add-annotation command failed. See command log and output file." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi
echo "Result: add-annotation command finished successfully." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 3: Verify Final Output ---
echo "[Action 3] Verifying final output file $OUTPUT_PDF exists" | tee -a "$STEP_LOG"
echo "Command: test -f \"$OUTPUT_PDF\"" >> "$COMMAND_LOG"
if [ -f "$OUTPUT_PDF" ]; then
    echo "Result: Final output file found." >> "$STEP_LOG"
    FINAL_CHECK_STATUS=0
else
    echo "Error: Final output file $OUTPUT_PDF was not created." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    FINAL_CHECK_STATUS=1
fi
echo "" >> "$STEP_LOG"


# --- Log End ---
echo "---" >> "$COMMAND_LOG"
if [ $FINAL_CHECK_STATUS -eq 0 ]; then
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: Successfully ran add-annotation for all pages. Final file: $OUTPUT_PDF." >> "$STEP_LOG"
  echo "Manual Verification Recommended: Please open $OUTPUT_PDF and check annotations on pages 1 through 6." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: Failed during annotation process or final file not found. See logs." >> "$STEP_LOG"
  exit 1
fi