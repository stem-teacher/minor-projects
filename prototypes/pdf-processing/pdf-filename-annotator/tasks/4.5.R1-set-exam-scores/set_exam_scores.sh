#!/bin/bash
set -e # Exit on error

TASK_ID="4.5.R1-set-exam-scores"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# Backup suffix for creating our initial backup
BACKUP_SUFFIX=".bak-task4.5.R1"

# --- !! Use the ANNOTATED student exam from Task 4.3.R1 !! ---
ORIGINAL_PDF="$PROJECT_ROOT/test_resources/output/Y7SCID_smith_john-950786052_annotated.pdf"
SCORED_PDF="$PROJECT_ROOT/test_resources/output/Y7SCID_smith_john-950786052_scored.pdf"

# Check which file exists and use that as the TARGET_PDF
if [ -f "$ORIGINAL_PDF" ]; then
    TARGET_PDF="$ORIGINAL_PDF"
    echo "Using original annotated PDF: $TARGET_PDF" | tee -a "$STEP_LOG"
elif [ -f "$SCORED_PDF" ]; then
    # If we're rerunning, we might need to use the scored PDF as input
    TARGET_PDF="$SCORED_PDF"
    echo "Original annotated PDF not found, using previously scored PDF: $TARGET_PDF" | tee -a "$STEP_LOG"
    # Restore backup if available
    BACKUP_PATH="${ORIGINAL_PDF}${BACKUP_SUFFIX}"
    if [ -f "$BACKUP_PATH" ]; then
        echo "Restoring from backup: $BACKUP_PATH to $ORIGINAL_PDF" | tee -a "$STEP_LOG" "$COMMAND_LOG"
        cp "$BACKUP_PATH" "$ORIGINAL_PDF"
        TARGET_PDF="$ORIGINAL_PDF"
    fi
else
    echo "Error: Neither original nor scored PDF found!" | tee -a "$STEP_LOG"
    exit 1
fi

# Define output name for this step, always the same
OUTPUT_PDF_STEP_NAME="$PROJECT_ROOT/test_resources/output/Y7SCID_smith_john-950786052_scored.pdf"

SET_BIN="$PROJECT_ROOT/target/debug/set-annotation-value" # Assumes it's built

# Define Scores as individual variables instead of associative array
# For Mac OS compatibility
LABELS=("mark-part-a" "mark-q16-a" "mark-q16-b" "mark-q16-c" "mark-q16-d" "mark-q16-e" "mark-q16-f" "mark-q16-g" "mark-q16-h" "mark-q17" "mark-q18-a" "mark-q18-b" "mark-q19-a" "mark-q19-b")
VALUES=("15" "1" "2" "2" "1" "3" "2" "3" "1" "4" "2" "2" "2" "2")

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Set individual score values in $TARGET_PDF using --in-place." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Prerequisite: Check File & Binary ---
echo "[Check] Verifying target file and binary exist" | tee -a "$STEP_LOG"
if [ ! -f "$TARGET_PDF" ]; then echo "Error: Target PDF '$TARGET_PDF' not found!" | tee -a "$STEP_LOG"; exit 1; fi
if [ ! -f "$SET_BIN" ]; then echo "Error: Binary '$SET_BIN' not found! Build required." | tee -a "$STEP_LOG"; exit 1; fi
echo "Result: Prerequisites met." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 1: Create ONE initial backup ---
# It's good practice even if the tool doesn't do it internally now
BACKUP_PATH="${TARGET_PDF}${BACKUP_SUFFIX}"
echo "[Action 1] Creating initial backup for safety" | tee -a "$STEP_LOG"
echo "Command: cp \"$TARGET_PDF\" \"$BACKUP_PATH\"" >> "$COMMAND_LOG"
cp "$TARGET_PDF" "$BACKUP_PATH"
if [ $? -ne 0 ]; then echo "Error: Failed to create initial backup." | tee -a "$STEP_LOG"; exit 1; fi
echo "Result: Created initial backup: $BACKUP_PATH" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 2: Loop through scores and set values ---
echo "[Action 2] Setting score values using set-annotation-value --in-place" | tee -a "$STEP_LOG"
SUCCESS_COUNT=0
FAIL_COUNT=0

# Loop through the indices of the LABELS array
for i in ${!LABELS[@]}; do
    label=${LABELS[$i]}
    value=${VALUES[$i]}
    echo "  -> Setting '$label' to '$value'" | tee -a "$STEP_LOG"

    COMMAND="\"$SET_BIN\" --input \"$TARGET_PDF\" --in-place --label \"$label\" --value \"$value\""
    echo "Command: $COMMAND" >> "$COMMAND_LOG"

    COMMAND_OUTPUT_FILE="$SCRIPT_DIR/cli_run_${label}.output"
    eval "$COMMAND" > "$COMMAND_OUTPUT_FILE" 2>&1
    CMD_STATUS=$?
    cat "$COMMAND_OUTPUT_FILE" >> "$COMMAND_LOG"
    rm "$COMMAND_OUTPUT_FILE" # Clean up output file

    if [ $CMD_STATUS -ne 0 ]; then
        echo "Error: set-annotation-value command failed for label '$label'. See command log." | tee -a "$STEP_LOG" "$COMMAND_LOG"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        # Decide whether to stop or continue? Let's continue for this task.
    else
        echo "     Successfully set value for '$label'." >> "$STEP_LOG"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi
    echo "---" >> "$COMMAND_LOG"
done

# Rename the final modified file for clarity in this workflow step
# Check if the original target exists before renaming
if [ -f "$TARGET_PDF" ]; then
    echo "Renaming final modified file $TARGET_PDF to $OUTPUT_PDF_STEP_NAME" | tee -a "$STEP_LOG" "$COMMAND_LOG"
    mv "$TARGET_PDF" "$OUTPUT_PDF_STEP_NAME"
    if [ $? -ne 0 ]; then echo "Error: Failed to rename final file." | tee -a "$STEP_LOG"; exit 1; fi
else
    echo "Error: Expected final modified file $TARGET_PDF not found after operations!" | tee -a "$STEP_LOG"; exit 1;
fi

echo "Result: Finished setting scores. Success: $SUCCESS_COUNT, Failed: $FAIL_COUNT." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"

# --- Action 3: Final Verification ---
echo "[Verify] Checking final file existence: $OUTPUT_PDF_STEP_NAME" | tee -a "$STEP_LOG"
 if [ ! -f "$OUTPUT_PDF_STEP_NAME" ]; then echo "Error: Final scored PDF '$OUTPUT_PDF_STEP_NAME' not found!" | tee -a "$STEP_LOG"; FAIL_COUNT=$((FAIL_COUNT + 1)); fi
 echo "Result: Final scored PDF exists." >> "$STEP_LOG"


# --- Log End ---
echo "---" >> "$COMMAND_LOG"
if [ $FAIL_COUNT -eq 0 ]; then
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: Successfully ran set-annotation-value --in-place for all score fields." >> "$STEP_LOG"
  echo "Manual Verification Recommended: Open $OUTPUT_PDF_STEP_NAME and check the values set for mark-* annotations." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: PARTIAL_FAILURE" >> "$STEP_LOG"
  echo "Validation: Failed to set $FAIL_COUNT score field(s). See logs. Final file may be incomplete." >> "$STEP_LOG"
  exit 1 # Exit with error if any set operation failed
fi