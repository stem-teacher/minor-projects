#!/bin/bash
set -e # Exit on error

TASK_ID="1.4-impl-add-annotation-to-page"
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
echo "Goal: Implement add_annotation_to_page function in $UTILS_FILE." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Action 1: Append Function ---
echo "[Action 1] Appending add_annotation_to_page function to $UTILS_FILE" | tee -a "$STEP_LOG"
echo "Command: Appending code block using cat >> (via temp file)" >> "$COMMAND_LOG"

# Function implementation - placed in temp file first
FUNCTION_FILE="$SCRIPT_DIR/func.tmp.rs"
cat <<'EOF' > "$FUNCTION_FILE"

/// Adds a reference to an existing annotation object to a page's /Annots array.
/// Creates the /Annots array if it doesn't exist. Handles direct and referenced arrays.
/// The annotation object itself MUST already be added to the document.
pub fn add_annotation_to_page(
    doc: &mut Document,
    page_num: u32,
    annotation_ref_id: ObjectId, // ID of the annotation *dictionary* object already added to doc
) -> Result<(), Error> {
    let page_id = doc.get_page_id(page_num)
        .ok_or_else(|| Error::Processing(format!("Page number {} not found", page_num)))?;

    // We need mutable access to the document's objects map later, so we get necessary info first.
    // Determine if Annots exists and if it's a reference or direct array.
    let annots_state = {
        let page_dict = doc.get_object(page_id).map_err(Error::Pdf)?
            .as_dict().map_err(|_| Error::Processing(format!("Page object {page_id:?} is not a dictionary")))?;

        match page_dict.get(b"Annots") {
             Ok(Object::Array(arr)) => Ok(Some((None, arr.clone()))), // Direct array
             Ok(Object::Reference(ref_id)) => Ok(Some((Some(*ref_id), vec![]))), // Will resolve later
             Ok(_) => Err(Error::Processing(format!("Page {page_num} /Annots field is not an Array or Reference"))),
             Err(_) => Ok(None), // No /Annots entry exists
        }
    }?; // Propagate potential error from the match

    let annotation_ref = Object::Reference(annotation_ref_id);

    match annots_state {
        // Case 1: Direct array found in page dictionary
        Some((None, mut direct_arr)) => {
            direct_arr.push(annotation_ref);
            // Get mutable access *now* to update the page dict
             let page_dict_mut = doc.get_dictionary_mut(page_id)
                .map_err(|_| Error::Processing(format!("Failed to get mutable dict for page {page_id:?}")))?;
             page_dict_mut.set("Annots", Object::Array(direct_arr));
             Ok(())
        }
        // Case 2: Reference to an array found
        Some((Some(ref_id), _)) => {
            // Try to get the referenced array mutably (might not exist in objects map yet if Cloned)
            // Safest approach: get object, clone if array, modify, update object map
            let annots_array = doc.get_object(ref_id)
                                  .map_err(Error::Pdf)?
                                  .as_array()
                                  .cloned() // Clone the potentially existing array
                                  .unwrap_or_else(|_| Vec::new()); // Or start fresh if not an array

            let mut updated_arr = annots_array;
            updated_arr.push(annotation_ref);
            doc.objects.insert(ref_id, Object::Array(updated_arr)); // Update or insert the object
            Ok(())
        }
        // Case 3: No /Annots entry exists
        None => {
            // Create a new array containing just our annotation ref
            let new_annots_arr = vec![annotation_ref];
            // Add this new array as a new object to the document
            let new_arr_id = doc.add_object(Object::Array(new_annots_arr));
            // Get mutable access to the page dict to add the reference
             let page_dict_mut = doc.get_dictionary_mut(page_id)
                 .map_err(|_| Error::Processing(format!("Failed to get mutable dict for page {page_id:?}")))?;
             page_dict_mut.set("Annots", Object::Reference(new_arr_id));
             Ok(())
        }
    }
}
EOF
# End of FUNCTION_FILE content

# Append the function from the temporary file to the end of the utils file
cat "$FUNCTION_FILE" >> "$UTILS_FILE"
rm "$FUNCTION_FILE" # Clean up temporary file

echo "Result: Function add_annotation_to_page appended to $UTILS_FILE." >> "$STEP_LOG"
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
