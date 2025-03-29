#!/bin/bash
set -e # Exit on error

TASK_ID="3.2-test-add-set-get-workflow"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

INPUT_PDF="$PROJECT_ROOT/test_resources/input/sample_exam.pdf"
# Intermediate file after adding annotations
ADDED_PDF="$PROJECT_ROOT/test_resources/output/sample_exam_added.pdf"
# Final file after setting values
SET_PDF="$PROJECT_ROOT/test_resources/output/sample_exam_set.pdf"

# Annotation details for add step
ADD_LABEL_TEMPLATE="ScoreField_p{page}"
ADD_CONTENTS_TEMPLATE="" # Start empty
ADD_RECT="500,772,580,782" # Top-rightish corner
ADD_PAGES="1,2,3,4,5,6"

# Details for set step
SET_LABEL_P1="ScoreField_p1"
SET_VALUE_P1="10 Points"
SET_LABEL_P4="ScoreField_p4"
SET_VALUE_P4="8/10"

# Details for get verification
GET_LABEL_P1="ScoreField_p1"
EXPECTED_VALUE_P1="10 Points"
GET_LABEL_P2="ScoreField_p2" # Should be empty
EXPECTED_VALUE_P2=""
GET_LABEL_P4="ScoreField_p4"
EXPECTED_VALUE_P4="8/10"


# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Test add, set, and get annotation value CLI tools together." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Prerequisite: Build tools ---
echo "[Build Step] Building required binaries" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo build --bins)" >> "$COMMAND_LOG"
BUILD_OUTPUT_FILE="$SCRIPT_DIR/cargo_build.output"
(cd "$PROJECT_ROOT" && cargo build --bins) > "$BUILD_OUTPUT_FILE" 2>&1
BUILD_STATUS=$?
cat "$BUILD_OUTPUT_FILE" >> "$COMMAND_LOG"
if [ $BUILD_STATUS -ne 0 ]; then
    echo "Error: Failed to build binaries. Check build log." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi
ADD_BIN="$PROJECT_ROOT/target/debug/add-annotation"
SET_BIN="$PROJECT_ROOT/target/debug/set-annotation-value"
GET_BIN="$PROJECT_ROOT/target/debug/get-annotation-value"
echo "Result: Binaries built successfully." >> "$STEP_LOG"
echo "Checking binary paths:" >> "$STEP_LOG"
echo "ADD_BIN: $ADD_BIN" >> "$STEP_LOG"
echo "SET_BIN: $SET_BIN" >> "$STEP_LOG"
echo "GET_BIN: $GET_BIN" >> "$STEP_LOG"
if [ ! -f "$ADD_BIN" ]; then echo "ERROR: $ADD_BIN does not exist" >> "$STEP_LOG"; fi
if [ ! -f "$SET_BIN" ]; then echo "ERROR: $SET_BIN does not exist" >> "$STEP_LOG"; fi
if [ ! -f "$GET_BIN" ]; then echo "ERROR: $GET_BIN does not exist" >> "$STEP_LOG"; fi
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 1: Add initial empty annotations ---
echo "[Action 1] Adding empty annotations to all pages" | tee -a "$STEP_LOG"
rm -f "$ADDED_PDF" "$SET_PDF" # Clean previous runs

ADD_CMD="$ADD_BIN --input $INPUT_PDF --output $ADDED_PDF --pages $ADD_PAGES --label-template $ADD_LABEL_TEMPLATE --rect $ADD_RECT --contents-template \"$ADD_CONTENTS_TEMPLATE\""
echo "Command: $ADD_CMD" >> "$COMMAND_LOG"
eval "$ADD_CMD" >> "$COMMAND_LOG" 2>&1
CMD_STATUS=$?
if [ $CMD_STATUS -ne 0 ]; then echo "Error: add-annotation command failed." | tee -a "$STEP_LOG" "$COMMAND_LOG"; exit 1; fi
echo "Result: Initial annotations added to $ADDED_PDF." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 2: Set values for specific annotations ---
echo "[Action 2] Setting annotation values" | tee -a "$STEP_LOG"
# Set value for Page 1
SET_CMD_P1="$SET_BIN --input $ADDED_PDF --output $SET_PDF --label \"$SET_LABEL_P1\" --value \"$SET_VALUE_P1\""
echo "Command (P1): $SET_CMD_P1" >> "$COMMAND_LOG"
eval "$SET_CMD_P1" >> "$COMMAND_LOG" 2>&1
CMD_STATUS=$?
if [ $CMD_STATUS -ne 0 ]; then echo "Error: set-annotation-value command failed for P1." | tee -a "$STEP_LOG" "$COMMAND_LOG"; exit 1; fi

# Set value for Page 4 (using the output of the P1 step as input)
SET_CMD_P4="$SET_BIN --input $SET_PDF --output $SET_PDF --label \"$SET_LABEL_P4\" --value \"$SET_VALUE_P4\""
echo "Command (P4): $SET_CMD_P4" >> "$COMMAND_LOG"
eval "$SET_CMD_P4" >> "$COMMAND_LOG" 2>&1
CMD_STATUS=$?
if [ $CMD_STATUS -ne 0 ]; then echo "Error: set-annotation-value command failed for P4." | tee -a "$STEP_LOG" "$COMMAND_LOG"; exit 1; fi

echo "Result: Annotation values set in $SET_PDF." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 3: Get values and verify ---
echo "[Action 3] Verifying annotation values using get-annotation-value" | tee -a "$STEP_LOG"
VERIFICATION_STATUS=0 # 0 = success

# Verify P1
GET_CMD_P1="$GET_BIN --input $SET_PDF --label \"$GET_LABEL_P1\""
echo "Command (Get P1): $GET_CMD_P1" >> "$COMMAND_LOG"
ACTUAL_VALUE_P1=$(eval "$GET_CMD_P1")
echo "Expected P1: '$EXPECTED_VALUE_P1'" >> "$COMMAND_LOG"
echo "Actual P1:   '$ACTUAL_VALUE_P1'" >> "$COMMAND_LOG"
if [ "$ACTUAL_VALUE_P1" != "$EXPECTED_VALUE_P1" ]; then
    echo "Error: Verification failed for $GET_LABEL_P1. Expected '$EXPECTED_VALUE_P1', Got '$ACTUAL_VALUE_P1'" | tee -a "$STEP_LOG" "$COMMAND_LOG"
    VERIFICATION_STATUS=1
else
    echo "  -> Verified $GET_LABEL_P1 successfully." | tee -a "$STEP_LOG"
fi

# Verify P2 (should be empty)
GET_CMD_P2="$GET_BIN --input $SET_PDF --label \"$GET_LABEL_P2\""
echo "Command (Get P2): $GET_CMD_P2" >> "$COMMAND_LOG"
ACTUAL_VALUE_P2=$(eval "$GET_CMD_P2")
echo "Expected P2: '$EXPECTED_VALUE_P2'" >> "$COMMAND_LOG"
echo "Actual P2:   '$ACTUAL_VALUE_P2'" >> "$COMMAND_LOG"
 if [ "$ACTUAL_VALUE_P2" != "$EXPECTED_VALUE_P2" ]; then
    echo "Error: Verification failed for $GET_LABEL_P2. Expected '$EXPECTED_VALUE_P2', Got '$ACTUAL_VALUE_P2'" | tee -a "$STEP_LOG" "$COMMAND_LOG"
    VERIFICATION_STATUS=1
else
    echo "  -> Verified $GET_LABEL_P2 successfully." | tee -a "$STEP_LOG"
fi

# Verify P4
GET_CMD_P4="$GET_BIN --input $SET_PDF --label \"$GET_LABEL_P4\""
echo "Command (Get P4): $GET_CMD_P4" >> "$COMMAND_LOG"
ACTUAL_VALUE_P4=$(eval "$GET_CMD_P4")
echo "Expected P4: '$EXPECTED_VALUE_P4'" >> "$COMMAND_LOG"
echo "Actual P4:   '$ACTUAL_VALUE_P4'" >> "$COMMAND_LOG"
 if [ "$ACTUAL_VALUE_P4" != "$EXPECTED_VALUE_P4" ]; then
    echo "Error: Verification failed for $GET_LABEL_P4. Expected '$EXPECTED_VALUE_P4', Got '$ACTUAL_VALUE_P4'" | tee -a "$STEP_LOG" "$COMMAND_LOG"
    VERIFICATION_STATUS=1
else
    echo "  -> Verified $GET_LABEL_P4 successfully." | tee -a "$STEP_LOG"
fi

echo "Result: Verification checks complete." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"


# --- Log End ---
echo "---" >> "$COMMAND_LOG"
if [ $VERIFICATION_STATUS -eq 0 ]; then
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: Add, Set, Get workflow completed and verified successfully." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: Verification of annotation values failed. See logs." >> "$STEP_LOG"
  exit 1
fi