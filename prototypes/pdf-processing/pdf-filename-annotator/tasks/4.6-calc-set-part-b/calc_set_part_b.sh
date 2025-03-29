#!/bin/bash
set -e # Exit on error

TASK_ID="4.6-calc-set-part-b"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# --- !! Use the SCORED student exam from Task 4.5 !! ---
TARGET_PDF="$PROJECT_ROOT/test_resources/output/Y7SCID_smith_john-950786052_scored.pdf"
# We modify this file in-place

GET_BIN="$PROJECT_ROOT/target/debug/get-annotation-value"
SET_BIN="$PROJECT_ROOT/target/debug/set-annotation-value"

# Labels for individual question scores
Q_SCORE_LABELS=(
    "mark-q16-a" "mark-q16-b" "mark-q16-c"
    "mark-q16-d" "mark-q16-e" "mark-q16-f"
    "mark-q16-g" "mark-q16-h" "mark-q17"
    "mark-q18-a" "mark-q18-b"
    "mark-q19-a" "mark-q19-b"
)
# Label for the Part B total
PART_B_LABEL="mark-part-b"

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Calculate Part B total from individual scores and set '$PART_B_LABEL' in $TARGET_PDF." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Prerequisite: Check File & Binaries ---
echo "[Check] Verifying target file and binaries exist" | tee -a "$STEP_LOG"
if [ ! -f "$TARGET_PDF" ]; then echo "Error: Target PDF '$TARGET_PDF' not found!" | tee -a "$STEP_LOG"; exit 1; fi
if [ ! -f "$GET_BIN" ]; then echo "Error: Binary '$GET_BIN' not found! Build required." | tee -a "$STEP_LOG"; exit 1; fi
if [ ! -f "$SET_BIN" ]; then echo "Error: Binary '$SET_BIN' not found! Build required." | tee -a "$STEP_LOG"; exit 1; fi
echo "Result: Prerequisites met." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 1: Get individual scores ---
echo "[Action 1] Getting individual question scores..." | tee -a "$STEP_LOG"
PART_B_TOTAL=0
GET_ERRORS=0

for label in "${Q_SCORE_LABELS[@]}"; do
    GET_CMD="\"$GET_BIN\" --input \"$TARGET_PDF\" --label \"$label\""
    echo "Command: $GET_CMD" >> "$COMMAND_LOG"
    SCORE_STR=$($GET_BIN --input "$TARGET_PDF" --label "$label" 2>> "$COMMAND_LOG") # Capture stdout, append stderr to log
    STATUS=$?
    echo "Output: '$SCORE_STR'" >> "$COMMAND_LOG"
    echo "Status: $STATUS" >> "$COMMAND_LOG"
    echo "---" >> "$COMMAND_LOG"

    if [ $STATUS -ne 0 ]; then
        echo "Error: Failed to get value for label '$label'. Calculation cannot proceed." | tee -a "$STEP_LOG" "$COMMAND_LOG"
        GET_ERRORS=1
        # Continue trying to get others, but mark failure
    elif [[ "$SCORE_STR" =~ ^[0-9]+$ ]]; then # Basic check if it's an integer
        PART_B_TOTAL=$((PART_B_TOTAL + SCORE_STR))
        echo "  -> Got score $SCORE_STR for '$label'. Current total: $PART_B_TOTAL" | tee -a "$STEP_LOG"
    else
        echo "Warning: Value '$SCORE_STR' for label '$label' is not a valid integer. Skipping." | tee -a "$STEP_LOG" "$COMMAND_LOG"
        # Mark error? Or just skip? Let's mark error for robustness
        GET_ERRORS=1
    fi
done

if [ $GET_ERRORS -ne 0 ]; then
    echo "Error: Could not retrieve or parse all necessary scores. Cannot set Part B total." | tee -a "$STEP_LOG"
    exit 1 # Exit with failure if any score couldn't be retrieved/parsed
fi
echo "Result: Calculated Part B Total = $PART_B_TOTAL" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"

# --- Action 2: Set Part B Total ---
echo "[Action 2] Setting '$PART_B_LABEL' to $PART_B_TOTAL" | tee -a "$STEP_LOG"
# Make backup before modifying
BACKUP_SUFFIX=".bak-task4.6"
BACKUP_PATH="${TARGET_PDF}${BACKUP_SUFFIX}"
echo "Command: cp \"$TARGET_PDF\" \"$BACKUP_PATH\"" >> "$COMMAND_LOG"
cp "$TARGET_PDF" "$BACKUP_PATH"
if [ $? -ne 0 ]; then echo "Error: Failed to create backup." | tee -a "$STEP_LOG"; exit 1; fi
echo "  -> Created backup: $BACKUP_PATH" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# Set the value using --in-place
SET_CMD="\"$SET_BIN\" --input \"$TARGET_PDF\" --in-place --label \"$PART_B_LABEL\" --value \"$PART_B_TOTAL\""
echo "Command: $SET_CMD" >> "$COMMAND_LOG"
COMMAND_OUTPUT_FILE="$SCRIPT_DIR/cli_run_set.output"
eval "$SET_CMD" > "$COMMAND_OUTPUT_FILE" 2>&1
CMD_STATUS=$?
cat "$COMMAND_OUTPUT_FILE" >> "$COMMAND_LOG"
rm "$COMMAND_OUTPUT_FILE"

if [ $CMD_STATUS -ne 0 ]; then
    echo "Error: set-annotation-value command failed for label '$PART_B_LABEL'. See command log." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi
echo "Result: Successfully set value for '$PART_B_LABEL'." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"

# --- Action 3: Verify Part B Total (Optional but good) ---
echo "[Verify] Verifying value set for '$PART_B_LABEL'" | tee -a "$STEP_LOG"
VERIFY_CMD="\"$GET_BIN\" --input \"$TARGET_PDF\" --label \"$PART_B_LABEL\""
echo "Command: $VERIFY_CMD" >> "$COMMAND_LOG"
ACTUAL_VALUE=$($GET_BIN --input "$TARGET_PDF" --label "$PART_B_LABEL" 2>> "$COMMAND_LOG")
STATUS=$?
echo "Output: '$ACTUAL_VALUE'" >> "$COMMAND_LOG"
echo "Status: $STATUS" >> "$COMMAND_LOG"
echo "---" >> "$COMMAND_LOG"

FINAL_CHECK_STATUS=1 # Assume failure initially
if [ $STATUS -ne 0 ]; then
     echo "Error: Failed to get back value for '$PART_B_LABEL' for verification." | tee -a "$STEP_LOG"
elif [ "$ACTUAL_VALUE" != "$PART_B_TOTAL" ]; then
     echo "Error: Verification failed! Expected '$PART_B_TOTAL', Got '$ACTUAL_VALUE' for '$PART_B_LABEL'." | tee -a "$STEP_LOG"
else
     echo "Result: Verification successful. '$PART_B_LABEL' correctly set to '$PART_B_TOTAL'." | tee -a "$STEP_LOG"
     FINAL_CHECK_STATUS=0 # Mark success
fi
echo "" >> "$STEP_LOG"

# --- Log End ---
echo "---" >> "$COMMAND_LOG"
if [ $FINAL_CHECK_STATUS -eq 0 ]; then
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: Successfully calculated ($PART_B_TOTAL) and set $PART_B_LABEL." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: Failed to get scores, set total, or verify total. See logs." >> "$STEP_LOG"
  exit 1
fi