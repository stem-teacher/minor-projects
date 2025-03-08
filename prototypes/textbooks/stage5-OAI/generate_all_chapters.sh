#!/bin/bash

# Change to the stage5-OAI directory
cd /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/stage5-OAI

# Log file for tracking progress
LOG_FILE="generation_progress.log"
echo "Starting chapter generation at $(date)" > $LOG_FILE

# Activate virtual environment
source /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/textbook_env/bin/activate

# Step 1: Generate the introduction
echo "===============================================" | tee -a $LOG_FILE
echo "Generating Introduction ($(date))" | tee -a $LOG_FILE
echo "===============================================" | tee -a $LOG_FILE

# Check if introduction already exists
if [ -f "chapters/introduction.tex" ] && [ -s "chapters/introduction.tex" ]; then
  echo "Introduction already exists. Skipping..." | tee -a $LOG_FILE
else
  # Generate introduction
  python generate_introduction.py 2>&1 | tee -a $LOG_FILE

  # Wait between API calls
  echo "Waiting 30 seconds before the next generation..." | tee -a $LOG_FILE
  sleep 30
fi

# Step 2: Define and generate all chapters
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
  
  # Check if the chapter already exists
  if [ -f "chapters/chapter${number}.tex" ] && [ -s "chapters/chapter${number}.tex" ]; then
    echo "Chapter $number already exists and has content. Skipping..." | tee -a $LOG_FILE
    continue
  fi
  
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

echo "All content generation complete at $(date)" | tee -a $LOG_FILE
echo "Check chapters/ directory for the generated LaTeX files" | tee -a $LOG_FILE

# Step 3: Optionally compile the LaTeX document (commented out by default)
# echo "===============================================" | tee -a $LOG_FILE
# echo "Compiling LaTeX document ($(date))" | tee -a $LOG_FILE
# echo "===============================================" | tee -a $LOG_FILE
# cd ..
# python generate_openai_textbooks.py --compile --stage 5 2>&1 | tee -a stage5-OAI/$LOG_FILE