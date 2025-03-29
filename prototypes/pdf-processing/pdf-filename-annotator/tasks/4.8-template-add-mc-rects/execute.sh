#!/bin/bash

# Task 4.8: Add MC Placeholders to Marking Template
# Script to add 16 labeled rectangle annotations to the marking template

# Exit on error
set -e

# Set up environment variables
PROJECT_ROOT="/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing"
TARGET_PDF="$PROJECT_ROOT/test_resources/input/sample_exam_marking_template_confirmed.pdf"
BACKUP_PDF="$PROJECT_ROOT/test_resources/input/sample_exam_marking_template_confirmed.backup.pdf"
TEMP_PDF="$PROJECT_ROOT/test_resources/input/temp_marking_template.pdf"
TOOL="$PROJECT_ROOT/target/debug/add-annotation"
LOG_FILE="$PROJECT_ROOT/pdf-filename-annotator/tasks/4.8-template-add-mc-rects/execution.log"

# Check if the target PDF exists
if [ ! -f "$TARGET_PDF" ]; then
    echo "Error: Target PDF not found at $TARGET_PDF" | tee -a "$LOG_FILE"
    exit 1
fi

# Check if the add-annotation tool exists
if [ ! -f "$TOOL" ]; then
    echo "Error: add-annotation tool not found at $TOOL" | tee -a "$LOG_FILE"
    exit 1
fi

# Create a backup of the original PDF if it doesn't exist already
if [ ! -f "$BACKUP_PDF" ]; then
    echo "Creating backup of original PDF..." | tee -a "$LOG_FILE"
    cp "$TARGET_PDF" "$BACKUP_PDF"
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create backup of the target PDF" | tee -a "$LOG_FILE"
        exit 1
    fi
    echo "Backup created: $BACKUP_PDF" | tee -a "$LOG_FILE"
else
    echo "Backup already exists: $BACKUP_PDF" | tee -a "$LOG_FILE"
fi

# Function to add a rectangle annotation
add_rect_annotation() {
    local label=$1
    local rect=$2
    local input_file=$3
    local output_file=$4
    
    echo "Adding annotation with label '$label' and rect $rect..." | tee -a "$LOG_FILE"
    
    "$TOOL" \
        --input "$input_file" \
        --output "$output_file" \
        --pages 1 \
        --type rect \
        --rect "$rect" \
        --label-template "$label" \
        --color "0.0,1.0,0.0" \
        --border-width 1.0
    
    if [ $? -eq 0 ]; then
        echo "Successfully added annotation '$label'" | tee -a "$LOG_FILE"
    else
        echo "Error: Failed to add annotation '$label'" | tee -a "$LOG_FILE"
        exit 1
    fi
}

# Array of MC question labels
MC_LABELS=(
    "mc-q1-c"
    "mc-q2-d"
    "mc-q3-b"
    "mc-q4-d"
    "mc-q5-b"
    "mc-q6-c"
    "mc-q7-a"
    "mc-q8-d"
    "mc-q9-a"
    "mc-q10-b"
    "mc-q11-a"
    "mc-q12-a"
    "mc-q13-c"
    "mc-q14-d"
    "mc-q15-b"
    "mc-q16-d"
)

# Base rectangle coordinates
BASE_X1=10
BASE_Y1=700
BASE_X2=50
BASE_Y2=710
Y_DECREMENT=15

# Add all rectangle annotations
echo "Starting to add rectangle annotations..." | tee -a "$LOG_FILE"

# Copy the original PDF to use as the first input
cp "$TARGET_PDF" "$TEMP_PDF"

for i in "${!MC_LABELS[@]}"; do
    # Calculate the current rectangle coordinates
    # We decrement the Y values for each subsequent rectangle
    CURRENT_Y1=$((BASE_Y1 - i * Y_DECREMENT))
    CURRENT_Y2=$((BASE_Y2 - i * Y_DECREMENT))
    CURRENT_RECT="$BASE_X1,$CURRENT_Y1,$BASE_X2,$CURRENT_Y2"
    
    # For each iteration, the input is the current state of the file (either the original or the result of the previous iteration)
    # and the output is the target file.
    if [ $i -eq 0 ]; then
        # First iteration: input is the backup, output is the target
        add_rect_annotation "${MC_LABELS[$i]}" "$CURRENT_RECT" "$TEMP_PDF" "$TARGET_PDF"
    else
        # Subsequent iterations: input is the target (modified by the previous iteration), output is also the target
        add_rect_annotation "${MC_LABELS[$i]}" "$CURRENT_RECT" "$TARGET_PDF" "$TARGET_PDF"
    fi
done

# Clean up the temporary file
rm -f "$TEMP_PDF"

# Verify the final file exists
if [ -f "$TARGET_PDF" ]; then
    echo "Task completed successfully. Modified PDF: $TARGET_PDF" | tee -a "$LOG_FILE"
else
    echo "Error: Final PDF file not found at $TARGET_PDF" | tee -a "$LOG_FILE"
    exit 1
fi

# Print summary
echo "Added 16 rectangle annotations to the PDF." | tee -a "$LOG_FILE"
echo "Task 4.8 completed successfully." | tee -a "$LOG_FILE"