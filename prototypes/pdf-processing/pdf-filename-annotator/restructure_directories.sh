#!/bin/bash
# Script to restructure directories as requested

# Log file setup
LOG_FILE="/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator/restructure_log.txt"
echo "Directory Restructuring Log - $(date)" > $LOG_FILE

# Step 1: Rename original directory to -orig
echo "Renaming original directory to 2025-T1-orig..." | tee -a $LOG_FILE
mv "/Volumes/second-store/scan/2025-T1" "/Volumes/second-store/scan/2025-T1-orig"
if [ $? -eq 0 ]; then
    echo "Successfully renamed original directory" | tee -a $LOG_FILE
else
    echo "ERROR: Failed to rename original directory" | tee -a $LOG_FILE
    exit 1
fi

# Step 2: Rename annotated directory to 2025-T1
echo "Renaming annotated directory to 2025-T1..." | tee -a $LOG_FILE
mv "/Volumes/second-store/scan/2025-T1-annotated" "/Volumes/second-store/scan/2025-T1"
if [ $? -eq 0 ]; then
    echo "Successfully renamed annotated directory" | tee -a $LOG_FILE
else
    echo "ERROR: Failed to rename annotated directory" | tee -a $LOG_FILE
    exit 1
fi

# Step 3: Copy non-PDF files
echo "Copying non-PDF files from original to new structure..." | tee -a $LOG_FILE
classes=("7SCID" "7SCIF" "7SCIG" "7SCIO" "7SCIR" "7SCIS")

for class in "${classes[@]}"; do
    echo "Processing class $class..." | tee -a $LOG_FILE
    
    # Find non-PDF files in the original directory
    find "/Volumes/second-store/scan/2025-T1-orig/$class" -type f -not -name "*.pdf" | while read file; do
        # Get relative path
        rel_path=$(basename "$file")
        
        # Copy to new directory
        cp -p "$file" "/Volumes/second-store/scan/2025-T1/$class/$rel_path"
        
        if [ $? -eq 0 ]; then
            echo "  Copied: $rel_path" | tee -a $LOG_FILE
        else
            echo "  ERROR: Failed to copy $rel_path" | tee -a $LOG_FILE
        fi
    done
done

# Step 4: Verification
echo "Verifying directory structure..." | tee -a $LOG_FILE
for class in "${classes[@]}"; do
    orig_pdf_count=$(find "/Volumes/second-store/scan/2025-T1-orig/$class" -type f -name "*.pdf" | wc -l)
    new_pdf_count=$(find "/Volumes/second-store/scan/2025-T1/$class" -type f -name "*.pdf" | wc -l)
    
    orig_nonpdf_count=$(find "/Volumes/second-store/scan/2025-T1-orig/$class" -type f -not -name "*.pdf" | wc -l)
    new_nonpdf_count=$(find "/Volumes/second-store/scan/2025-T1/$class" -type f -not -name "*.pdf" | wc -l)
    
    echo "Class $class:" | tee -a $LOG_FILE
    echo "  PDF files: Original: $orig_pdf_count, New structure: $new_pdf_count" | tee -a $LOG_FILE
    echo "  Non-PDF files: Original: $orig_nonpdf_count, New structure: $new_nonpdf_count" | tee -a $LOG_FILE
done

echo "Directory restructuring completed at $(date)" | tee -a $LOG_FILE
