#!/bin/bash
set -e # Exit on error

TASK_ID="4.9-copy-mc-rects-to-exam"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# --- !! Use the confirmed marking template with MC annotations !! ---
SOURCE_PDF="$PROJECT_ROOT/test_resources/input/sample_exam_marking_template_confirmed.pdf"
# --- !! Use the CLEAN student exam !! ---
TARGET_PDF="$PROJECT_ROOT/test_resources/input/Y7SCID_smith_john-950786052.pdf"
# --- Output specifically for this MC step ---
OUTPUT_PDF="$PROJECT_ROOT/test_resources/output/Y7SCID_smith_john-950786052_mc_guide.pdf"
CP_BIN="$PROJECT_ROOT/target/debug/cp-annotation" # Assumes it's built

# List ONLY the MC answer labels
MC_LABELS=(
    "mc-q1-c" "mc-q2-d" "mc-q3-b" "mc-q4-d" "mc-q5-b" "mc-q6-c" "mc-q7-a" "mc-q8-d"
    "mc-q9-a" "mc-q10-b" "mc-q11-a" "mc-q12-a" "mc-q13-c" "mc-q14-d" "mc-q15-b" "mc-q16-d"
)

# Convert bash array to comma-separated string
LABELS_ARG=$(printf ",%s" "${MC_LABELS[@]}")
LABELS_ARG=${LABELS_ARG:1} # Remove leading comma

# Define the target page in the student exam document
TARGET_PAGE_NUM=1

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Copy MC key rectangles from template ($SOURCE_PDF) to page $TARGET_PAGE_NUM of exam ($TARGET_PDF)." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Prerequisite: Check Source/Target Files ---
echo "[Check] Verifying input files exist" | tee -a "$STEP_LOG"
if [ ! -f "$SOURCE_PDF" ]; then echo "Error: Source template '$SOURCE_PDF' not found!" | tee -a "$STEP_LOG"; exit 1; fi
if [ ! -f "$TARGET_PDF" ]; then echo "Error: Target exam '$TARGET_PDF' not found!" | tee -a "$STEP_LOG"; exit 1; fi
echo "Result: Input files found." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Prerequisite: Build cp-annotation binary ---
if [ ! -f "$CP_BIN" ]; then
    echo "[Build Step] Building cp-annotation binary" | tee -a "$STEP_LOG"
    echo "Command: (cd \"$PROJECT_ROOT\" && cargo build --bin cp-annotation)" >> "$COMMAND_LOG"
    (cd "$PROJECT_ROOT" && cargo build --bin cp-annotation) >> "$COMMAND_LOG" 2>&1
    if [ $? -ne 0 ]; then echo "Error: Build failed" | tee -a "$STEP_LOG"; exit 1; fi
    echo "Result: Build complete." >> "$STEP_LOG"
else
    echo "[Build Step] Binary $CP_BIN already exists." | tee -a "$STEP_LOG"
fi
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 1: Run cp-annotation command ---
echo "[Action 1] Running cp-annotation for MC labels: $LABELS_ARG" | tee -a "$STEP_LOG"
rm -f "$OUTPUT_PDF" # Clean previous run

# Use --target-page to force all annotations onto page 1 of the output
COMMAND="\"$CP_BIN\" --source \"$SOURCE_PDF\" --target \"$TARGET_PDF\" --output \"$OUTPUT_PDF\" --labels \"$LABELS_ARG\" --target-page $TARGET_PAGE_NUM"
echo "Command: $COMMAND" >> "$COMMAND_LOG"

COMMAND_OUTPUT_FILE="$SCRIPT_DIR/cli_run.output"
eval "$COMMAND" > "$COMMAND_OUTPUT_FILE" 2>&1
CMD_STATUS=$?
cat "$COMMAND_OUTPUT_FILE" >> "$COMMAND_LOG"
# rm "$COMMAND_OUTPUT_FILE" # Keep output

if [ $CMD_STATUS -ne 0 ]; then
    echo "Error: cp-annotation command failed. See command log and output file." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi
# Check the command output for potential warnings (like labels not found)
if grep -q "Warning: Annotation '.*' not found" "$COMMAND_OUTPUT_FILE"; then
    echo "Warning: Some labels specified were not found in the source template. Check command output." | tee -a "$STEP_LOG"
elif grep -q "Failed to copy annotation" "$COMMAND_OUTPUT_FILE"; then
     echo "Warning: Some annotations failed during the copy process. Check command output." | tee -a "$STEP_LOG"
fi
echo "Result: cp-annotation command finished." >> "$STEP_LOG"
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
  echo "Validation: Successfully ran cp-annotation for MC key rectangles. Final file: $OUTPUT_PDF." >> "$STEP_LOG"
  echo "Manual Verification Required: Please open $OUTPUT_PDF and check that the 16 green MC key rectangles appear correctly positioned ONLY on page 1." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: Failed during annotation copying or final file not found. See logs." >> "$STEP_LOG"
  exit 1
fi