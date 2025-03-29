#!/bin/bash
# No set -e, we want to see which ones fail

TASK_ID="4.3.1-inspect-final-template"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# --- !! Ensure this is the MANUALLY ADJUSTED template !! ---
TEMPLATE_PDF="$PROJECT_ROOT/test_resources/input/sample_exam_marking_template_final.pdf"
GET_BIN="$PROJECT_ROOT/target/debug/get-annotation-value" # Assumes it's built

# List ALL the labels we EXPECTED to find
EXPECTED_LABELS=(
    "filename_stamp_p1" "filename_stamp_p2" "filename_stamp_p3"
    "filename_stamp_p4" "filename_stamp_p5" "filename_stamp_p6"
    "mark-part-a" "mark-part-b" "mark-total"
    "mark-q16-a" "mark-q16-b" "mark-q16-c"
    "mark-q16-d" "mark-q16-e" "mark-q16-f"
    "mark-q16-g" "mark-q16-h" "mark-q17"
    "mark-q18-a" "mark-q18-b"
    "mark-q19-a" "mark-q19-b"
)

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Attempt to read expected annotation labels from $TEMPLATE_PDF." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "Attempting to get value for each expected label. Errors indicate the label was not found." >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Prerequisite: Check File & Binary ---
echo "[Check] Verifying template file and binary exist" | tee -a "$STEP_LOG"
if [ ! -f "$TEMPLATE_PDF" ]; then echo "Error: Template '$TEMPLATE_PDF' not found!" | tee -a "$STEP_LOG"; exit 1; fi
if [ ! -f "$GET_BIN" ]; then
    echo "Warning: Binary $GET_BIN not found, attempting build..." | tee -a "$STEP_LOG"
    echo "Command: (cd \"$PROJECT_ROOT\" && cargo build --bin get-annotation-value)" >> "$COMMAND_LOG"
    (cd "$PROJECT_ROOT" && cargo build --bin get-annotation-value) >> "$COMMAND_LOG" 2>&1
    if [ $? -ne 0 ]; then echo "Error: Build failed" | tee -a "$STEP_LOG"; exit 1; fi
fi
echo "Result: Prerequisites met." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 1: Loop through labels and attempt get-annotation-value ---
echo "[Action 1] Attempting to get value for each expected label..." | tee -a "$STEP_LOG"
FOUND_COUNT=0
NOT_FOUND_COUNT=0

for label in "${EXPECTED_LABELS[@]}"; do
    COMMAND="$GET_BIN --input \"$TEMPLATE_PDF\" --label \"$label\""
    echo "Command: $COMMAND" >> "$COMMAND_LOG"
    # Execute and capture output/error; check exit status
    OUTPUT=$($COMMAND 2>> "$COMMAND_LOG") # Append stderr to command log
    STATUS=$?
    echo "Output: '$OUTPUT'" >> "$COMMAND_LOG"
    echo "Status: $STATUS" >> "$COMMAND_LOG"
    echo "---" >> "$COMMAND_LOG"

    if [ $STATUS -eq 0 ]; then
        echo "  -> Found label '$label'. Value: '$OUTPUT'" | tee -a "$STEP_LOG"
        FOUND_COUNT=$((FOUND_COUNT + 1))
    else
        echo "  -> Label '$label' NOT FOUND (or error occurred)." | tee -a "$STEP_LOG"
        NOT_FOUND_COUNT=$((NOT_FOUND_COUNT + 1))
    fi
done

echo "Result: Finished attempts. Found: $FOUND_COUNT, Not Found: $NOT_FOUND_COUNT." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"

# --- Log End ---
# Determine overall task status based on findings
FINAL_STATUS="INFO" # Neither success nor failure, just info gathering
if [ $FOUND_COUNT -gt 0 ] && [ $NOT_FOUND_COUNT -gt 0 ]; then
    FINAL_STATUS="PARTIAL_INFO"
    RESULT_MSG="Found some labels ($FOUND_COUNT), but others ($NOT_FOUND_COUNT) were missing or modified in the template PDF."
elif [ $FOUND_COUNT -gt 0 ]; then
     FINAL_STATUS="SUCCESS_INFO" # Success in the sense that labels *were* found
     RESULT_MSG="Found all expected labels ($FOUND_COUNT)."
else # $FOUND_COUNT == 0
     FINAL_STATUS="FAILURE_INFO" # Failure in the sense that *no* labels were found
     RESULT_MSG="Could not find ANY of the expected labels ($NOT_FOUND_COUNT) in the template PDF. Labels likely lost during manual edit."
fi

echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: ${FINAL_STATUS}" >> "$STEP_LOG"
echo "Validation: ${RESULT_MSG}" >> "$STEP_LOG"
exit 0 # Exit success even if labels weren't found, as the script itself ran correctly.
