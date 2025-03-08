#!/bin/bash

# This script performs a clean build of the Stage 4 textbook with Gemini
# It deletes existing content, regenerates all chapters, and compiles the LaTeX document

# Change to the stage4-gemini directory
cd /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/stage4-gemini

# Log file for tracking progress
LOG_FILE="clean_build.log"
echo "Starting clean build at $(date)" > $LOG_FILE

# Step 1: Confirm the clean build (safety check)
echo "This will delete all existing chapter content and regenerate the entire textbook."
echo "Are you sure you want to proceed? (y/n)"
read -r answer

if [[ "$answer" != "y" ]]; then
  echo "Clean build cancelled."
  exit 0
fi

# Step 2: Clean up existing content
echo "===============================================" | tee -a $LOG_FILE
echo "Cleaning up existing content ($(date))" | tee -a $LOG_FILE
echo "===============================================" | tee -a $LOG_FILE

# Make a backup of the existing content
echo "Creating backup of existing chapters..." | tee -a $LOG_FILE
backup_dir="chapters_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"
cp -r chapters/* "$backup_dir/" 2>/dev/null || true
echo "Backup created in $backup_dir" | tee -a $LOG_FILE

# Clean the chapters directory
echo "Deleting existing chapter content..." | tee -a $LOG_FILE
rm -f chapters/*.tex

# Step 3: Generate all content using the main generation script
echo "===============================================" | tee -a $LOG_FILE
echo "Running Gemini content generation ($(date))" | tee -a $LOG_FILE
echo "===============================================" | tee -a $LOG_FILE

cd ..
source /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/textbook_env/bin/activate
python generate_gemini_textbooks.py --generate --stage 4 2>&1 | tee -a stage4-gemini/$LOG_FILE

# Check if generation was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "Successfully generated textbook content" | tee -a stage4-gemini/$LOG_FILE
else
  echo "Error during content generation. Check the log for details." | tee -a stage4-gemini/$LOG_FILE
  exit 1
fi

# Step 4: Compile the LaTeX document
echo "===============================================" | tee -a $LOG_FILE
echo "Compiling LaTeX document ($(date))" | tee -a $LOG_FILE
echo "===============================================" | tee -a $LOG_FILE

source /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/textbook_env/bin/activate
python generate_gemini_textbooks.py --compile --stage 4 2>&1 | tee -a stage4-gemini/$LOG_FILE

echo "===============================================" | tee -a stage4-gemini/$LOG_FILE
echo "Clean build process completed at $(date)" | tee -a stage4-gemini/$LOG_FILE
echo "Check stage4-gemini/stage4-gemini-textbook.pdf for the output" | tee -a stage4-gemini/$LOG_FILE
echo "===============================================" | tee -a stage4-gemini/$LOG_FILE

# Go back to stage4-gemini directory
cd stage4-gemini

echo ""
echo "Clean build process completed!"
echo "The backup of previous chapters is stored in: $backup_dir"
echo "Check $LOG_FILE for detailed output"
echo "The compiled PDF should be available at: stage4-gemini-textbook.pdf"