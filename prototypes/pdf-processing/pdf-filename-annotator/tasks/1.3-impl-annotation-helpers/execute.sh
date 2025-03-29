#!/bin/bash
set -e # Exit on error

TASK_ID="1.3-impl-annotation-helpers"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
LIB_CRATE_PATH="$PROJECT_ROOT/pdf_exam_tools_lib"
UTILS_FILE="$LIB_CRATE_PATH/src/annotation_utils.rs"
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Implement helper functions in $UTILS_FILE." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Action 1: Append Helper Functions ---
echo "[Action 1] Appending helper functions to $UTILS_FILE" | tee -a "$STEP_LOG"
echo "Command: Appending code block using cat >> (via temp file)" >> "$COMMAND_LOG"

# Function implementations as a heredoc - written to a temporary file first
HELPER_FUNCTIONS_FILE="$SCRIPT_DIR/helpers.tmp.rs"
cat <<'EOF' > "$HELPER_FUNCTIONS_FILE"

/// Helper to get an annotation's dictionary. Clones the dictionary for ownership.
pub fn get_annotation_dict(doc: &Document, obj_id: ObjectId) -> Result<Dictionary, Error> {
    doc.get_object(obj_id)
        .map_err(Error::Pdf)?
        .as_dict()
        .cloned() // Clone to return an owned Dictionary
        .map_err(|_| Error::Processing(format!("Object {:?} is not a dictionary", obj_id)))
}

// Note: Getting a mutable dictionary directly can be tricky with lopdf's borrowing.
// It's often safer to get an owned dictionary, modify it, and then update the object.
// We might skip get_annotation_dict_mut for now unless strictly needed later.

/// Extracts the /T (Title/Label) field value from an annotation dictionary.
pub fn get_annotation_label(dict: &Dictionary) -> Option<String> {
    dict.get(b"T").ok().and_then(|obj| match obj {
        Object::String(bytes, _) => Some(String::from_utf8_lossy(bytes).into_owned()),
        _ => None,
    })
}

/// Sets the /T (Title/Label) field value in an annotation dictionary.
pub fn set_annotation_label(dict: &mut Dictionary, label: &str) {
    dict.set("T", Object::String(label.as_bytes().to_vec(), lopdf::StringFormat::Literal));
}

/// Extracts the /Contents field value from an annotation dictionary.
pub fn get_annotation_contents(dict: &Dictionary) -> Option<String> {
    dict.get(b"Contents").ok().and_then(|obj| match obj {
        Object::String(bytes, _) => Some(String::from_utf8_lossy(bytes).into_owned()),
        _ => None,
    })
}

/// Sets the /Contents field value in an annotation dictionary.
pub fn set_annotation_contents(dict: &mut Dictionary, contents: &str) {
    // PDF Spec recommends using PDFDocEncoding or UTF-16BE for /Contents.
    // For simplicity with lopdf, Literal or Hexadecimal might work for ASCII/simple text.
    // Using Literal for now, might need adjustment if non-ASCII causes issues.
    dict.set("Contents", Object::String(contents.as_bytes().to_vec(), lopdf::StringFormat::Literal));
}

/// Extracts the /Rect [x1, y1, x2, y2] field value from an annotation dictionary.
pub fn get_annotation_rect(dict: &Dictionary) -> Result<[f32; 4], Error> {
    let rect_obj = dict.get(b"Rect").map_err(|_| Error::Processing("Missing /Rect field".to_string()))?;
    let rect_arr = rect_obj.as_array().map_err(|_| Error::Processing("/Rect is not an array".to_string()))?;

    if rect_arr.len() != 4 {
        return Err(Error::Processing(format!("/Rect array does not have 4 elements: {:?}", rect_arr)));
    }

    let mut rect = [0.0f32; 4];
    for (i, val) in rect_arr.iter().enumerate() {
        // Use as_float which handles both Integer and Real lopdf types
         rect[i] = val.as_float().map_err(|_| Error::Processing(format!("Invalid number in /Rect at index {}: {:?}", i, val)))?;
    }
    Ok(rect)
}
EOF
 # End of HELPER_FUNCTIONS_FILE content

# Verify utils file exists before appending
if [ ! -f "$UTILS_FILE" ]; then
    echo "Error: $UTILS_FILE not found! Cannot append functions." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi

# Append the functions from the temporary file to the end of the utils file
cat "$HELPER_FUNCTIONS_FILE" >> "$UTILS_FILE"
rm "$HELPER_FUNCTIONS_FILE" # Clean up temporary file

echo "Result: Helper functions appended to $UTILS_FILE." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 2: Format code ---
echo "[Action 2] Running cargo fmt for library" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo fmt --package pdf_exam_tools_lib)" >> "$COMMAND_LOG"
(cd "$PROJECT_ROOT" && cargo fmt --package pdf_exam_tools_lib) >> "$COMMAND_LOG" 2>&1
FMT_STATUS=$?
echo "Result: Formatting complete (Status: $FMT_STATUS)." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 3: Validation ---
echo "[Action 3] Running cargo check for library" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo check --package pdf_exam_tools_lib)" >> "$COMMAND_LOG"
CHECK_OUTPUT_FILE="$SCRIPT_DIR/cargo_check.output"
(cd "$PROJECT_ROOT" && cargo check --package pdf_exam_tools_lib) > "$CHECK_OUTPUT_FILE" 2>&1
CARGO_CHECK_STATUS=$?
# Capture check output into command log *before* adding final status to step log
cat "$CHECK_OUTPUT_FILE" >> "$COMMAND_LOG"
# rm "$CHECK_OUTPUT_FILE" # Keep output
echo "Result: cargo check finished (Status: $CARGO_CHECK_STATUS)." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"


# --- Log End ---
echo "---" >> "$COMMAND_LOG"
FINAL_STATUS_MESSAGE=""
if [ $CARGO_CHECK_STATUS -eq 0 ]; then
  FINAL_STATUS_MESSAGE="SUCCESS"
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: cargo check passed for pdf_exam_tools_lib." >> "$STEP_LOG"
  exit 0
else
  FINAL_STATUS_MESSAGE="FAILURE"
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: cargo check failed for pdf_exam_tools_lib. See command log ($COMMAND_LOG) and output file ($CHECK_OUTPUT_FILE) for details." >> "$STEP_LOG"
  exit 1
fi