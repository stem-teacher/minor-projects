Good Morning Claude. Today's goal is to enhance the PDF processing project. With the outcom of setting up the `annotation_utils.rs` module within the `pdf_exam_tools_lib` library.

**Working Directory Context:** We are working within the project root directory: `/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/`  It contains the `pdf-filename-annotator` and `pdf_exam_tools_lib` sub directories.

Project tracking is performed within the `pdf-filename-annotator` direcctory.




Okay Claude, let's start refactoring the PDF processing project. We'll begin by setting up the `annotation_utils.rs` module within the `pdf_exam_tools_lib` library.

**Working Directory Context:** We are working within the project root directory: `/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator/` (Please adjust this path if the actual root containing both `pdf-filename-annotator` and `pdf_exam_tools_lib` is different).

**Task ID:** `1.1-setup-annotation-utils`

**Instructions:**

Please use your MCP tooling to perform the following sequence of actions:

1.  **Create Task Directory (if not already done):** Ensure the directory `tasks/1.1-setup-annotation-utils` exists within the project root directory.

2.  **Create Log Files:** Create empty files named `1.1-setup-annotation-utils-STEP_LOG.md` and `1.1-setup-annotation-utils-COMMAND_LOG.md` inside the `tasks/1.1-setup-annotation-utils` directory.

3.  **Create Execution Script:** Create a file named `execute.sh` inside the `tasks/1.1-setup-annotation-utils` directory with the exact following bash script content:

    ```bash
    #!/bin/bash
    set -e # Exit immediately if a command exits with a non-zero status.

    TASK_ID="1.1-setup-annotation-utils"
    SCRIPT_DIR=$(dirname "$0")
    PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../..") # Assumes tasks/<task-id>/execute.sh
    LIB_CRATE_PATH="$PROJECT_ROOT/pdf_exam_tools_lib"
    STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
    COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
    CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

    # --- Log Start ---
    echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
    echo "Goal: Create annotation_utils.rs module in library and export it." >> "$STEP_LOG"
    echo "Executing script: $0" >> "$STEP_LOG"
    echo "" >> "$STEP_LOG"
    echo "---" >> "$COMMAND_LOG"
    echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
    echo "" >> "$COMMAND_LOG"


    # --- Action 1: Create annotation_utils.rs ---
    UTILS_FILE="$LIB_CRATE_PATH/src/annotation_utils.rs"
    echo "[Action 1] Creating empty file with initial use statements: $UTILS_FILE" | tee -a "$STEP_LOG"
    echo "Command: touch \"$UTILS_FILE\" && echo ... > \"$UTILS_FILE\"" >> "$COMMAND_LOG"
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
    if ! grep -qF "$MODULE_DECL" "$LIB_FILE"; then
      echo "          -> Adding '$MODULE_DECL' to $LIB_FILE." | tee -a "$STEP_LOG"
      # Add it after the last existing 'pub mod' or 'pub use' line, or at the start if none exist
      awk -v decl="$MODULE_DECL" '
      /^(pub mod|pub use)/ { last_pub_line=NR }
      { lines[NR] = $0 }
      END {
        if (last_pub_line > 0) {
          for (i=1; i<=NR; i++) { print lines[i]; if (i==last_pub_line) print decl; }
        } else {
          print decl; for (i=1; i<=NR; i++) { print lines[i] }
        }
      }' "$LIB_FILE" > "$LIB_FILE.tmp" && mv "$LIB_FILE.tmp" "$LIB_FILE"
      echo "Result: Added module declaration." >> "$STEP_LOG"
    else
      echo "Result: Module '$MODULE_DECL' already declared in $LIB_FILE." | tee -a "$STEP_LOG"
    fi
    echo "" >> "$STEP_LOG"
    echo "---" >> "$COMMAND_LOG"


    # --- Action 3: Format code ---
    echo "[Action 3] Running cargo fmt for library" | tee -a "$STEP_LOG"
    echo "Command: cargo fmt --package pdf_exam_tools_lib" >> "$COMMAND_LOG"
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
    echo "Command: cargo check --package pdf_exam_tools_lib" >> "$COMMAND_LOG"
    CHECK_OUTPUT_FILE=$(mktemp)
    (cd "$PROJECT_ROOT" && cargo check --package pdf_exam_tools_lib) >> "$CHECK_OUTPUT_FILE" 2>&1
    CARGO_CHECK_STATUS=$?
    cat "$CHECK_OUTPUT_FILE" >> "$COMMAND_LOG"
    rm "$CHECK_OUTPUT_FILE"
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
      echo "Validation: cargo check failed for pdf_exam_tools_lib. See command log for details." >> "$STEP_LOG"
      exit 1
    fi
    ```

4.  **Make Executable:** Make the script `tasks/1.1-setup-annotation-utils/execute.sh` executable (e.g., `chmod +x tasks/1.1-setup-annotation-utils/execute.sh`).

5.  **Execute Script:** Execute the script `tasks/1.1-setup-annotation-utils/execute.sh` from the project root directory. Ensure the execution captures standard output and standard error.

6.  **Return Logs:** After the script finishes, please return the **full contents** of the following two files:
    *   `tasks/1.1-setup-annotation-utils/1.1-setup-annotation-utils-STEP_LOG.md`
    *   `tasks/1.1-setup-annotation-utils/1.1-setup-annotation-utils-COMMAND_LOG.md`
