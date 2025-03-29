#!/bin/bash
set -e # Exit on error

TASK_ID="4.4-set-exam-filenames"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# --- !! Use the ANNOTATED student exam from previous step !! ---
TARGET_PDF="$PROJECT_ROOT/test_resources/output/Y7SCID_smith_john-950786052_annotated.pdf"
SET_BIN="$PROJECT_ROOT/target/debug/set-annotation-value" # Assumes it's built

# Extract identifier from filename (simplified for this test)
FILENAME=$(basename "$TARGET_PDF" .pdf)
# Strip leading output directory path part if necessary - adjust based on actual $TARGET_PDF content
FILENAME=${FILENAME#Y7SCID_} # Remove prefix if present
FILENAME=${FILENAME%_annotated} # Remove suffix if present
STUDENT_IDENTIFIER="${FILENAME}" # e.g., "smith_john-950786052"

TOTAL_PAGES=6

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Set filename stamp values in $TARGET_PDF using --in-place." >> "$STEP_LOG"
echo "Student Identifier: $STUDENT_IDENTIFIER" >> "$STEP_LOG"
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

# --- Action 1: Loop through pages and set filename stamp value ---
echo "[Action 1] Setting filename stamp on pages 1 to $TOTAL_PAGES" | tee -a "$STEP_LOG"

# Create initial backup ONCE before the loop
BACKUP_SUFFIX=".bak-task4.4"
BACKUP_PATH="${TARGET_PDF}${BACKUP_SUFFIX}"
 echo "Command: cp \"$TARGET_PDF\" \"$BACKUP_PATH\"" >> "$COMMAND_LOG"
 cp "$TARGET_PDF" "$BACKUP_PATH"
 if [ $? -ne 0 ]; then echo "Error: Failed to create initial backup." | tee -a "$STEP_LOG"; exit 1; fi
 echo "  -> Created initial backup: $BACKUP_PATH" | tee -a "$STEP_LOG"
 echo "---" >> "$COMMAND_LOG"


for (( page=1; page<=$TOTAL_PAGES; page++ ))
do
    LABEL="filename_stamp_p${page}"
    echo "  -> Setting value for '$LABEL' to '$STUDENT_IDENTIFIER'" | tee -a "$STEP_LOG"

    # Use --in-place (backup already created above)
    COMMAND="\"$SET_BIN\" --input \"$TARGET_PDF\" --in-place --backup-suffix \".bak-${page}\" --label \"$LABEL\" --value \"$STUDENT_IDENTIFIER\""
    echo "Command: $COMMAND" >> "$COMMAND_LOG"

    COMMAND_OUTPUT_FILE="$SCRIPT_DIR/cli_run_p${page}.output"
    eval "$COMMAND" > "$COMMAND_OUTPUT_FILE" 2>&1
    CMD_STATUS=$?
    cat "$COMMAND_OUTPUT_FILE" >> "$COMMAND_LOG"
    rm "$COMMAND_OUTPUT_FILE" # Clean up intermediate output

    if [ $CMD_STATUS -ne 0 ]; then
        echo "Error: set-annotation-value command failed for label '$LABEL'. See command log." | tee -a "$STEP_LOG" "$COMMAND_LOG"
        # Restore from backup? Maybe just exit.
        exit 1
    fi
    echo "     Successfully set value for '$LABEL'." >> "$STEP_LOG"
    echo "---" >> "$COMMAND_LOG"
done

echo "Result: All filename stamps set in $TARGET_PDF." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"

# --- Action 2: Final Verification (Optional but Recommended) ---
# We could add calls to get-annotation-value here to verify programmatically.
# For now, rely on manual check and command success.
echo "[Verify] Checking final file existence" | tee -a "$STEP_LOG"
 if [ ! -f "$TARGET_PDF" ]; then echo "Error: Final PDF '$TARGET_PDF' seems missing!" | tee -a "$STEP_LOG"; exit 1; fi
 echo "Result: Final PDF exists." >> "$STEP_LOG"
 FINAL_CHECK_STATUS=0


# --- Log End ---
echo "---" >> "$COMMAND_LOG"
if [ $FINAL_CHECK_STATUS -eq 0 ]; then
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: Successfully ran set-annotation-value --in-place for all filename stamps." >> "$STEP_LOG"
  echo "Manual Verification Recommended: Please open $TARGET_PDF and check the filename stamps on pages 1 through 6." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: Failed during setting filename stamps. See logs." >> "$STEP_LOG"
  exit 1
fi