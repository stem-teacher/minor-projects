#!/bin/bash
set -e # Exit on error

TASK_ID="4.5-set-and-calculate-marks"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# Target PDF from previous step
TARGET_PDF="$PROJECT_ROOT/test_resources/output/Y7SCID_smith_john-950786052_annotated.pdf"

# Binaries needed
SET_BIN="$PROJECT_ROOT/target/debug/set-annotation-value"
GET_BIN="$PROJECT_ROOT/target/debug/get-annotation-value"

# Create temp files for the stages (to avoid overwriting the PDF too many times)
TEMP_PDF_1="${TARGET_PDF}.temp1"
TEMP_PDF_2="${TARGET_PDF}.temp2"
FINAL_PDF="${TARGET_PDF}"

# Pre-defined mark values (label-value pairs)
MARK_LABELS=("mark-q16-a" "mark-q16-b" "mark-q16-c" "mark-q16-d" "mark-q16-e" "mark-q16-f" "mark-q16-g" "mark-q16-h" "mark-q17" "mark-q18-a" "mark-q18-b" "mark-q19-a" "mark-q19-b" "mark-part-b")
MARK_VALUES=(1 2 2 1 3 2 3 1 4 2 2 2 2 16)  # Pre-defined values matching the labels

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" > "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Set mark values, calculate totals for parts A and overall total." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" > "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Prerequisite: Check File & Binary ---
echo "[Check] Verifying target file and binaries exist" | tee -a "$STEP_LOG"
if [ ! -f "$TARGET_PDF" ]; then echo "Error: Target PDF '$TARGET_PDF' not found!" | tee -a "$STEP_LOG"; exit 1; fi
if [ ! -f "$SET_BIN" ]; then echo "Error: Binary '$SET_BIN' not found! Build required." | tee -a "$STEP_LOG"; exit 1; fi
if [ ! -f "$GET_BIN" ]; then echo "Error: Binary '$GET_BIN' not found! Build required." | tee -a "$STEP_LOG"; exit 1; fi
echo "Result: Prerequisites met." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 1: Set values for all individual marks ---
echo "[Action 1] Setting values for individual marks" | tee -a "$STEP_LOG"

# Copy the original file to our first temp file
cp "$TARGET_PDF" "$TEMP_PDF_1"
echo "  -> Created working copy at $TEMP_PDF_1" | tee -a "$STEP_LOG"

# Iterate through all the marks and set their values
# We'll chain these changes into a single PDF to minimize file operations
for i in ${!MARK_LABELS[@]}; do
    label=${MARK_LABELS[$i]}
    value=${MARK_VALUES[$i]}
    echo "  -> Setting '$label' to '$value'" | tee -a "$STEP_LOG"
    
    # Set the value
    COMMAND="\"$SET_BIN\" --input \"$TEMP_PDF_1\" --output \"$TEMP_PDF_1\" --label \"$label\" --value \"$value\""
    echo "Command: $COMMAND" >> "$COMMAND_LOG"
    
    eval "$COMMAND" >> "$COMMAND_LOG" 2>&1
    if [ $? -ne 0 ]; then
        echo "Error: Failed to set value for '$label'. See command log." | tee -a "$STEP_LOG" "$COMMAND_LOG"
        exit 1
    fi
    
    echo "     Successfully set value for '$label'." >> "$STEP_LOG"
    echo "---" >> "$COMMAND_LOG"
done

echo "Result: All individual marks set successfully." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"

# --- Action 2: Calculate mark-part-a (sum of individual question marks) ---
echo "[Action 2] Calculating and setting mark-part-a (sum of individual question marks)" | tee -a "$STEP_LOG"
cp "$TEMP_PDF_1" "$TEMP_PDF_2"

part_a_total=0
for i in ${!MARK_LABELS[@]}; do
    label=${MARK_LABELS[$i]}
    
    # Skip mark-part-b which isn't part of the Part A calculation
    if [ "$label" = "mark-part-b" ]; then
        continue
    fi

    # Get the current value
    COMMAND="\"$GET_BIN\" --input \"$TEMP_PDF_2\" --label \"$label\""
    echo "Command: $COMMAND" >> "$COMMAND_LOG"
    
    mark_value=$(eval "$COMMAND" 2>> "$COMMAND_LOG")
    
    # Check if we got a valid number
    if ! [[ "$mark_value" =~ ^[0-9]+$ ]]; then
        echo "Error: Got non-numeric value '$mark_value' for '$label'. Skipping in sum." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    else
        part_a_total=$((part_a_total + mark_value))
        echo "  -> Read value for '$label': $mark_value (Running total: $part_a_total)" | tee -a "$STEP_LOG"
    fi
    
    echo "---" >> "$COMMAND_LOG"
done

# Set the mark-part-a value
echo "  -> Setting 'mark-part-a' to '$part_a_total'" | tee -a "$STEP_LOG"
COMMAND="\"$SET_BIN\" --input \"$TEMP_PDF_2\" --output \"$TEMP_PDF_2\" --label \"mark-part-a\" --value \"$part_a_total\""
echo "Command: $COMMAND" >> "$COMMAND_LOG"

eval "$COMMAND" >> "$COMMAND_LOG" 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Failed to set value for 'mark-part-a'. See command log." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi

echo "Result: Successfully calculated and set mark-part-a to $part_a_total." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 3: Calculate mark-total (sum of part A and part B) ---
echo "[Action 3] Calculating and setting mark-total (sum of part A and part B)" | tee -a "$STEP_LOG"

# Get mark-part-a value
COMMAND="\"$GET_BIN\" --input \"$TEMP_PDF_2\" --label \"mark-part-a\""
echo "Command: $COMMAND" >> "$COMMAND_LOG"
part_a_value=$(eval "$COMMAND" 2>> "$COMMAND_LOG")
echo "  -> Read value for 'mark-part-a': $part_a_value" | tee -a "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# Get mark-part-b value
COMMAND="\"$GET_BIN\" --input \"$TEMP_PDF_2\" --label \"mark-part-b\""
echo "Command: $COMMAND" >> "$COMMAND_LOG"
part_b_value=$(eval "$COMMAND" 2>> "$COMMAND_LOG")
echo "  -> Read value for 'mark-part-b': $part_b_value" | tee -a "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# Calculate total
total_mark=$((part_a_value + part_b_value))
echo "  -> Calculated total mark: $part_a_value + $part_b_value = $total_mark" | tee -a "$STEP_LOG"

# Set the mark-total value
echo "  -> Setting 'mark-total' to '$total_mark'" | tee -a "$STEP_LOG"
COMMAND="\"$SET_BIN\" --input \"$TEMP_PDF_2\" --output \"$FINAL_PDF\" --label \"mark-total\" --value \"$total_mark\""
echo "Command: $COMMAND" >> "$COMMAND_LOG"

eval "$COMMAND" >> "$COMMAND_LOG" 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Failed to set value for 'mark-total'. See command log." | tee -a "$STEP_LOG" "$COMMAND_LOG"
    exit 1
fi

echo "Result: Successfully calculated and set mark-total to $total_mark." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# Clean up temporary files
rm -f "$TEMP_PDF_1"
echo "  -> Cleaned up temporary file: $TEMP_PDF_1" | tee -a "$STEP_LOG"
rm -f "$TEMP_PDF_2"
echo "  -> Cleaned up temporary file: $TEMP_PDF_2" | tee -a "$STEP_LOG"

# --- Log End ---
echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
echo "Validation: Successfully set all marks and calculated totals." >> "$STEP_LOG"
echo "Summary:" >> "$STEP_LOG"
echo "  - Part A Total (Individual Questions): $part_a_total" >> "$STEP_LOG"
echo "  - Part B Total (Pre-defined): $part_b_value" >> "$STEP_LOG"
echo "  - Overall Total: $total_mark" >> "$STEP_LOG"
echo "Manual Verification Recommended: Please open $FINAL_PDF and check the marks." >> "$STEP_LOG"
exit 0
