#!/bin/bash
set -e # Exit on error

TASK_ID="4.3-copy-confirmed-template-to-exam"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# --- !! Use the CONFIRMED manually adjusted template !! ---
SOURCE_PDF="$PROJECT_ROOT/test_resources/input/sample_exam_marking_template_confirmed.pdf"
TARGET_PDF="$PROJECT_ROOT/test_resources/input/Y7SCID_smith_john-950786052.pdf"
OUTPUT_PDF="$PROJECT_ROOT/test_resources/output/Y7SCID_smith_john-950786052_annotated.pdf"
CP_BIN="$PROJECT_ROOT/target/debug/cp-annotation" # Assumes it's built

# List ALL the labels we expect to copy
LABELS_TO_COPY=(
    "filename_stamp_p1" "filename_stamp_p2" "filename_stamp_p3"
    "filename_stamp_p4" "filename_stamp_p5" "filename_stamp_p6"
    "mark-part-a" "mark-part-b" "mark-total"
    "mark-q16-a" "mark-q16-b" "mark-q16-c"
    "mark-q16-d" "mark-q16-e" "mark-q16-f"
    "mark-q16-g" "mark-q16-h" "mark-q17"
    "mark-q18-a" "mark-q18-b"
    "mark-q19-a" "mark-q19-b"
)

# Convert bash array to comma-separated string for the CLI argument
LABELS_ARG=$(printf ",%s" "${LABELS_TO_COPY[@]}")
LABELS_ARG=${LABELS_ARG:1} # Remove leading comma

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Copy annotations from CONFIRMED template ($SOURCE_PDF) to exam ($TARGET_PDF)." >> "$STEP_LOG"
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
echo "[Action 1] Running cp-annotation for labels: $LABELS_ARG" | tee -a "$STEP_LOG"
rm -f "$OUTPUT_PDF" # Clean previous run

# Omit --target-page, so annotations are copied to the same page number
COMMAND="\"$CP_BIN\" --source \"$SOURCE_PDF\" --target \"$TARGET_PDF\" --output \"$OUTPUT_PDF\" --labels \"$LABELS_ARG\""
echo "Command: $COMMAND" >> "$COMMAND_LOG"

COMMAND_OUTPUT_FILE="$SCRIPT_DIR/cli_run.output"
eval "$COMMAND" > "$COMMAND_OUTPUT_FILE" 2>&1
CMD_STATUS=$?
cat "$COMMAND_OUTPUT_FILE" >> "$COMMAND_LOG"
# rm "$COMMAND_OUTPUT_FILE" # Keep output

if [ $CMD_STATUS -ne 0 ]; then
    # Check specific error message if possible (e.g., grep output file)
    if grep -q "Annotation .* not found" "$COMMAND_OUTPUT_FILE"; then
         echo "Error: cp-annotation command failed because one or more labels were STILL not found in the source. Check $SOURCE_PDF again." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    else
         echo "Error: cp-annotation command failed for unknown reason. See command log and output file." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    fi
    exit 1
fi
echo "Result: cp-annotation command finished successfully." >> "$STEP_LOG"
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
  echo "Validation: Successfully ran cp-annotation using the confirmed template. Final file: $OUTPUT_PDF." >> "$STEP_LOG"
  echo "Manual Verification Recommended: Please open $OUTPUT_PDF and check that annotations from the template appear correctly positioned on the relevant pages of the student exam." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: Failed during annotation copying or final file not found. See logs." >> "$STEP_LOG"
  exit 1
fi