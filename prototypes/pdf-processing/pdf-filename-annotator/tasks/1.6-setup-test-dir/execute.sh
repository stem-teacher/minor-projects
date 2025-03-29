#!/bin/bash
set -e # Exit on error

TASK_ID="1.6-setup-test-dir"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

TEST_RESOURCES_DIR="$PROJECT_ROOT/test_resources"
INPUT_DIR="$TEST_RESOURCES_DIR/input"
OUTPUT_DIR="$TEST_RESOURCES_DIR/output"
SAMPLE_FILE="$INPUT_DIR/sample_exam.pdf" # Assumed filename

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Create test directory structure and verify sample PDF exists." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"

echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Action 1: Create Directories ---
echo "[Action 1] Ensuring test directories exist" | tee -a "$STEP_LOG"
echo "Command: mkdir -p \"$INPUT_DIR\" \"$OUTPUT_DIR\"" >> "$COMMAND_LOG"
mkdir -p "$INPUT_DIR"
mkdir -p "$OUTPUT_DIR"
echo "Result: Directories ensured." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"

echo "---" >> "$COMMAND_LOG"

# --- Action 2: Verify Sample File ---
echo "[Action 2] Verifying sample file exists: $SAMPLE_FILE" | tee -a "$STEP_LOG"
echo "Command: test -f \"$SAMPLE_FILE\"" >> "$COMMAND_LOG"
if [ -f "$SAMPLE_FILE" ]; then
    echo "Result: Sample file $SAMPLE_FILE found." >> "$STEP_LOG"
    FILE_CHECK_STATUS=0
else
    echo "Error: Sample file $SAMPLE_FILE not found. Please ensure it was placed manually in $INPUT_DIR." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    FILE_CHECK_STATUS=1
    # Don't exit immediately, allow final logging
fi
echo "" >> "$STEP_LOG"

# --- Log End ---
echo "---" >> "$COMMAND_LOG"

if [ $FILE_CHECK_STATUS -eq 0 ]; then
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: Test directories created and sample file verified." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: Sample PDF file was not found at the expected location." >> "$STEP_LOG"
  exit 1
fi