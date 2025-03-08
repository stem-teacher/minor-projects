#!/bin/bash

# This script performs a clean build of the Stage 5 textbook
# It deletes existing content, regenerates all chapters, and compiles the LaTeX document

# Change to the stage5-OAI directory
cd /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/stage5-OAI

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

# Step 3: Generate the introduction
echo "===============================================" | tee -a $LOG_FILE
echo "Generating Introduction ($(date))" | tee -a $LOG_FILE
echo "===============================================" | tee -a $LOG_FILE

python generate_introduction.py 2>&1 | tee -a $LOG_FILE

# Wait between API calls
echo "Waiting 30 seconds before the next generation..." | tee -a $LOG_FILE
sleep 30

# Step 4: Generate all chapters
# Define chapters in order
CHAPTER_NUMBERS=(1 2 3 4 5 6 7 8 9 10)
CHAPTER_TITLES=(
  "Scientific Investigations and Research Skills"
  "Atoms, Elements and Compounds"
  "Ecosystems and Environmental Science"
  "Human Biology and Disease"
  "Genetics and Evolution"
  "Atomic Structure and the Periodic Table"
  "Chemical Reactions and Equations"
  "Applied Chemistry and Environmental Chemistry"
  "Motion and Mechanics"
  "Energy Conservation and Electricity"
)

# Generate each chapter
for i in "${!CHAPTER_NUMBERS[@]}"; do
  number="${CHAPTER_NUMBERS[$i]}"
  title="${CHAPTER_TITLES[$i]}"
  
  echo "===============================================" | tee -a $LOG_FILE
  echo "Processing Chapter $number: $title ($(date))" | tee -a $LOG_FILE
  echo "===============================================" | tee -a $LOG_FILE
  
  # Generate the chapter
  python generate_chapter.py "$number" "$title" 2>&1 | tee -a $LOG_FILE
  
  # Check if generation was successful
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "Successfully generated Chapter $number" | tee -a $LOG_FILE
  else
    echo "Failed to generate Chapter $number. Check the log file for details." | tee -a $LOG_FILE
  fi
  
  # Wait between API calls to avoid rate limits
  echo "Waiting 30 seconds before the next chapter..." | tee -a $LOG_FILE
  sleep 30
done

echo "===============================================" | tee -a $LOG_FILE
echo "All content generation complete at $(date)" | tee -a $LOG_FILE
echo "===============================================" | tee -a $LOG_FILE

# Step 5: Compile the LaTeX document
echo "===============================================" | tee -a $LOG_FILE
echo "Compiling LaTeX document ($(date))" | tee -a $LOG_FILE
echo "===============================================" | tee -a $LOG_FILE

cd ..
source /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/textbook_env/bin/activate
python generate_openai_textbooks.py --compile --stage 5 2>&1 | tee -a stage5-OAI/$LOG_FILE

echo "===============================================" | tee -a $LOG_FILE
echo "Clean build process completed at $(date)" | tee -a $LOG_FILE
echo "Check stage5-OAI/stage5-OAI-textbook.pdf for the output" | tee -a $LOG_FILE
echo "===============================================" | tee -a $LOG_FILE

# Go back to stage5-OAI directory
cd stage5-OAI

echo ""
echo "Clean build process completed!"
echo "The backup of previous chapters is stored in: $backup_dir"
echo "Check $LOG_FILE for detailed output"
echo "The compiled PDF should be available at: stage5-OAI-textbook.pdf"