#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

TASK_ID="1.1-setup-annotation-utils"
SCRIPT_DIR=$(dirname "$0")
# Navigate up three levels from pdf-filename-annotator/tasks/<id>/execute.sh to get project root
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
LIB_CRATE_PATH="$PROJECT_ROOT/pdf_exam_tools_lib"
# Logs are relative to script execution dir
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root Detected: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Library Path: $LIB_CRATE_PATH" >> "$STEP_LOG"
echo "Goal: Create annotation_utils.rs module in library and export it." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"


# --- Action 1: Create annotation_utils.rs ---
UTILS_FILE="$LIB_CRATE_PATH/src/annotation_utils.rs"
echo "[Action 1] Creating empty file with initial use statements: $UTILS_FILE" | tee -a "$STEP_LOG"
echo "Command: touch \"$UTILS_FILE\" && echo ... > \"$UTILS_FILE\"" >> "$COMMAND_LOG"
# Ensure parent directory exists
mkdir -p "$(dirname "$UTILS_FILE")"
touch "$UTILS_FILE"
# Add initial necessary use statements and placeholder comment
cat << EOF > "$UTILS_FILE"
use lopdf::{Document, Object, ObjectId, Dictionary, Error as LopdfError};
use crate::error::Error; // Assuming library error enum is here
use std::str;

// Functions will be added here in subsequent tasks
EOF
echo "Result: Created ${UTILS_FILE}." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 2: Modify lib.rs to export the module ---
LIB_FILE="$LIB_CRATE_PATH/src/lib.rs"
MODULE_DECL="pub mod annotation_utils;"
echo "[Action 2] Ensuring '$MODULE_DECL' is declared in $LIB_FILE" | tee -a "$STEP_LOG"
echo "Command: grep, awk, mv" >> "$COMMAND_LOG"
# Ensure lib file exists first
if [ ! -f "$LIB_FILE" ]; then
    echo "Error: $LIB_FILE not found!" | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi
if ! grep -qF "$MODULE_DECL" "$LIB_FILE"; then
  echo "          -> Adding '$MODULE_DECL' to $LIB_FILE." | tee -a "$STEP_LOG"
  # Add it after the last existing 'pub mod' or 'pub use' line, or at the start if none exist
  # Create temporary file in script dir to avoid permission issues in source tree potentially
  TEMP_LIB_FILE="$SCRIPT_DIR/lib.rs.tmp"
  awk -v decl="$MODULE_DECL" '
  /^(pub mod|pub use)/ { last_pub_line=NR }
  { lines[NR] = $0 }
  END {
    if (last_pub_line > 0) {
      found=0
      for (i=1; i<=NR; i++) {
         print lines[i];
         if (i==last_pub_line && !found) { print decl; found=1}
       }
    } else {
      print decl; for (i=1; i<=NR; i++) { print lines[i] }
    }
  }' "$LIB_FILE" > "$TEMP_LIB_FILE" && mv "$TEMP_LIB_FILE" "$LIB_FILE"
  echo "Result: Added module declaration." >> "$STEP_LOG"
else
  echo "Result: Module '$MODULE_DECL' already declared in $LIB_FILE." | tee -a "$STEP_LOG"
fi
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 3: Format code ---
echo "[Action 3] Running cargo fmt for library" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo fmt --package pdf_exam_tools_lib)" >> "$COMMAND_LOG"
# Run commands from project root to ensure workspace context
(cd "$PROJECT_ROOT" && cargo fmt --package pdf_exam_tools_lib) >> "$COMMAND_LOG" 2>&1
FMT_STATUS=$?
if [ $FMT_STATUS -ne 0 ]; then
    echo "Warning: cargo fmt failed or produced warnings." | tee -a "$STEP_LOG"
fi
echo "Result: Formatting complete (Status: $FMT_STATUS)." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 4: Validation ---
echo "[Action 4] Running cargo check for library" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo check --package pdf_exam_tools_lib)" >> "$COMMAND_LOG"
# Create temporary file in script dir for output
CHECK_OUTPUT_FILE="$SCRIPT_DIR/cargo_check.output"
# Run commands from project root
(cd "$PROJECT_ROOT" && cargo check --package pdf_exam_tools_lib) > "$CHECK_OUTPUT_FILE" 2>&1
CARGO_CHECK_STATUS=$?
cat "$CHECK_OUTPUT_FILE" >> "$COMMAND_LOG"
# rm "$CHECK_OUTPUT_FILE" # Keep output for inspection if needed
echo "Result: cargo check finished (Status: $CARGO_CHECK_STATUS)." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"


# --- Log End ---
echo "---" >> "$COMMAND_LOG"
if [ $CARGO_CHECK_STATUS -eq 0 ]; then
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: cargo check passed for pdf_exam_tools_lib." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: cargo check failed for pdf_exam_tools_lib. See command log ($COMMAND_LOG) and output file ($CHECK_OUTPUT_FILE) for details." >> "$STEP_LOG"
  exit 1
fi