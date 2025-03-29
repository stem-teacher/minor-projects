#!/bin/bash
# No set -e, we want to see output for each attempt

TASK_ID="4.3.2-verify-confirmed-template-labels"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# --- !! Use the CONFIRMED manually edited template !! ---
TEMPLATE_PDF="$PROJECT_ROOT/test_resources/input/sample_exam_marking_template_confirmed.pdf"
GET_BIN="$PROJECT_ROOT/target/debug/get-annotation-value"

# List the labels we expect to find
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
echo "Goal: Verify expected annotation labels can be read from $TEMPLATE_PDF using $GET_BIN." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "Attempting to get value for each expected label. Errors indicate the label was not found." >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Prerequisite: Check File & Binary ---
echo "[Check] Verifying template file and binary exist" | tee -a "$STEP_LOG"
if [ ! -f "$TEMPLATE_PDF" ]; then echo "Error: Confirmed template '$TEMPLATE_PDF' not found! Please ensure it exists." | tee -a "$STEP_LOG"; exit 1; fi
if [ ! -f "$GET_BIN" ]; then echo "Error: Binary '$GET_BIN' not found! Build required." | tee -a "$STEP_LOG"; exit 1; fi
echo "Result: Prerequisites met." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 1: Attempt to read each label ---
echo "[Action 1] Reading value for each expected label..." | tee -a "$STEP_LOG"
FOUND_COUNT=0
NOT_FOUND_COUNT=0

for label in "${EXPECTED_LABELS[@]}"; do
    COMMAND="\"$GET_BIN\" --input \"$TEMPLATE_PDF\" --label \"$label\""
    echo "Command: $COMMAND" >> "$COMMAND_LOG"
    # Execute and capture output/error; check exit status
    # Use temporary files for stdout/stderr to avoid polluting command log here
    STDOUT_TMP=$(mktemp)
    STDERR_TMP=$(mktemp)
    set +e # Temporarily disable exit on error for this command
    eval "$COMMAND" > "$STDOUT_TMP" 2> "$STDERR_TMP"
    STATUS=$?
    set -e # Re-enable exit on error

    # Log results
    echo "--- Label: $label ---" >> "$COMMAND_LOG"
    echo "Exit Status: $STATUS" >> "$COMMAND_LOG"
    echo "** Stdout:" >> "$COMMAND_LOG"
    cat "$STDOUT_TMP" >> "$COMMAND_LOG"
    echo "** Stderr:" >> "$COMMAND_LOG"
    cat "$STDERR_TMP" >> "$COMMAND_LOG"
    echo "--------------------" >> "$COMMAND_LOG"
    rm "$STDOUT_TMP" "$STDERR_TMP" # Clean up temp files

    if [ $STATUS -eq 0 ]; then
        # Command succeeded, label was found (value might be empty)
        FOUND_COUNT=$((FOUND_COUNT + 1))
        echo "  -> SUCCESS: Found label '$label'." | tee -a "$STEP_LOG"
    else
        # Command failed, label likely not found
        NOT_FOUND_COUNT=$((NOT_FOUND_COUNT + 1))
        echo "  -> FAILURE: Label '$label' NOT FOUND or error occurred (Exit Status: $STATUS)." | tee -a "$STEP_LOG"
    fi
done

echo "Result: Finished read attempts. Found: $FOUND_COUNT, Not Found: $NOT_FOUND_COUNT." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"

# --- Log End ---
FINAL_STATUS="INFO"
if [ $FOUND_COUNT -eq ${#EXPECTED_LABELS[@]} ]; then
    FINAL_STATUS="SUCCESS"
    RESULT_MSG="Successfully found ALL ${FOUND_COUNT} expected labels in the template PDF."
elif [ $FOUND_COUNT -gt 0 ]; then
     FINAL_STATUS="PARTIAL_FAILURE"
     RESULT_MSG="Found $FOUND_COUNT labels, but FAILED to find $NOT_FOUND_COUNT expected labels. Check template/labels."
else # $FOUND_COUNT == 0
     FINAL_STATUS="FAILURE"
     RESULT_MSG="Could not find ANY of the ${#EXPECTED_LABELS[@]} expected labels. Template likely missing labels or tool error."
fi

echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: ${FINAL_STATUS}" >> "$STEP_LOG"
echo "Validation: ${RESULT_MSG}" >> "$STEP_LOG"

# Exit with 0 if script ran, even if labels weren't found (status is in the log)
exit 0