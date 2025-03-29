#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

TASK_ID="1.2-impl-find-annotation-by-label"
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
echo "Goal: Implement find_annotation_by_label function in $UTILS_FILE." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Action 1: Implement the function ---
echo "[Action 1] Implementing find_annotation_by_label in $UTILS_FILE" | tee -a "$STEP_LOG"
echo "Command: Replacing placeholder comment with function implementation using awk/cat" >> "$COMMAND_LOG"

# Function implementation as a heredoc (or equivalent method to store multi-line string)
FUNCTION_IMPL='
/// Searches all pages for the first annotation whose /T (Title) field matches the label.
/// Returns the ObjectId of the annotation dictionary and the 1-based page number.
pub fn find_annotation_by_label(doc: &Document, label: &str) -> Result<Option<(ObjectId, u32)>, Error> {
    for (page_num, page_id) in doc.get_pages() {
        let page_dict = match doc.get_object(page_id) {
            Ok(Object::Dictionary(dict)) => dict,
            Ok(_) => {
                // Log warning or error? For now, skip non-dictionary page objects
                // log::warn!("Page object {:?} for page {} is not a dictionary, skipping.", page_id, page_num);
                continue;
            },
            Err(e) => return Err(Error::Pdf(e)),
        };

        if let Ok(annots_obj) = page_dict.get(b"Annots") {
            let annots_array_obj_ids: Vec<ObjectId> = match annots_obj {
                Object::Array(arr) => {
                    // Handle cases where Annots contains direct references
                    arr.iter().filter_map(|obj| obj.as_reference().ok()).collect()
                },
                Object::Reference(ref_id) => {
                    match doc.get_object(*ref_id) {
                        Ok(Object::Array(arr)) => {
                            // Handle cases where Annots points to an array of references
                            arr.iter().filter_map(|obj| obj.as_reference().ok()).collect()
                        },
                        Ok(_) => {
                            // log::warn!("Annots reference {:?} for page {} did not resolve to an array, skipping.", ref_id, page_num);
                            vec![]
                        },
                        Err(e) => return Err(Error::Pdf(e)), // Propagate error if reference resolution fails
                    }
                },
                _ => {
                     // log::warn!("Annots for page {} is not an array or reference, skipping.", page_num);
                     vec![]
                } // Skip page if Annots is not an array or reference
            };


            for annot_id in annots_array_obj_ids {
                match doc.get_object(annot_id) {
                     Ok(Object::Dictionary(annot_dict)) => {
                        if let Ok(title_obj) = annot_dict.get(b"T") {
                            // Handle both String and HexString formats potentially used for /T
                            let title_str = match title_obj {
                                 Object::String(bytes, _format) => String::from_utf8_lossy(bytes).into_owned(),
                                 _ => continue, // Skip if /T is not a string type
                            };

                            if title_str == label {
                                return Ok(Some((annot_id, page_num)));
                            }
                        }
                    },
                    Ok(_) => { /* log::warn!("Annotation object {:?} is not a dictionary.", annot_id); */ continue; },
                    Err(_) => { /* Propagate or log error? For now, skip unresolvable annotation objects */ continue; }
                }
            }
        }
    }
    Ok(None) // Not found after checking all pages
}
' # End of FUNCTION_IMPL variable

# Check if utils file exists
if [ ! -f "$UTILS_FILE" ]; then
    echo "Error: $UTILS_FILE not found!" | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi

# Replace the placeholder comment with the function implementation
# Use awk for safer replacement
TEMP_UTILS_FILE="$SCRIPT_DIR/annotation_utils.rs.tmp"
awk -v impl="$FUNCTION_IMPL" '
BEGIN { inserted=0 }
/\/\/ Functions will be added here in subsequent tasks/ {
    if (!inserted) { print impl; inserted=1 }
    next # Skip the placeholder line
}
{ print }
END { if (!inserted) print impl } # Add at end if placeholder not found
' "$UTILS_FILE" > "$TEMP_UTILS_FILE" && mv "$TEMP_UTILS_FILE" "$UTILS_FILE"

echo "Result: Function body inserted into $UTILS_FILE." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 2: Format code ---
echo "[Action 2] Running cargo fmt for library" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo fmt --package pdf_exam_tools_lib)" >> "$COMMAND_LOG"
(cd "$PROJECT_ROOT" && cargo fmt --package pdf_exam_tools_lib) >> "$COMMAND_LOG" 2>&1
FMT_STATUS=$?
# Ignore fmt errors for now if check passes
echo "Result: Formatting complete (Status: $FMT_STATUS)." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 3: Validation ---
echo "[Action 3] Running cargo check for library" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo check --package pdf_exam_tools_lib)" >> "$COMMAND_LOG"
CHECK_OUTPUT_FILE="$SCRIPT_DIR/cargo_check.output"
(cd "$PROJECT_ROOT" && cargo check --package pdf_exam_tools_lib) > "$CHECK_OUTPUT_FILE" 2>&1
CARGO_CHECK_STATUS=$?
cat "$CHECK_OUTPUT_FILE" >> "$COMMAND_LOG"
# rm "$CHECK_OUTPUT_FILE" # Keep output for inspection
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