#!/bin/bash

# Change to the textbooks directory
cd /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks

# Activate the Python virtual environment
source textbook_env/bin/activate

# Generate chapters 3-10 one by one to avoid timeouts
LOG_FILE="/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/stage4-OAI/stage4-openai-log.txt"
echo "Starting OpenAI chapter generation at $(date)" > $LOG_FILE

# The chapters to generate
CHAPTERS=(
  "3:Mixtures and Separation Techniques" 
  "4:Physical and Chemical Change"
  "5:Forces and Motion"
  "6:Energy Forms and Transfers"
  "7:Diversity of Life (Classification and Survival)"
  "8:Cells and Body Systems"
  "9:Earth's Resources and Geological Change"
  "10:Earth in Space"
)

# Generate each chapter individually
for chapter_info in "${CHAPTERS[@]}"; do
  IFS=":" read -r number title <<< "$chapter_info"
  echo "=======================================" >> $LOG_FILE
  echo "Generating Chapter $number: $title ($(date))" >> $LOG_FILE
  echo "=======================================" >> $LOG_FILE
  
  # Check if the chapter already exists and has content
  CHAPTER_FILE="/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks/stage4-OAI/chapters/chapter${number}.tex"
  if [ -f "$CHAPTER_FILE" ] && [ -s "$CHAPTER_FILE" ]; then
    echo "Chapter $number already exists, skipping..." >> $LOG_FILE
    continue
  fi
  
  # Generate the current chapter
  python -c "
import os
import time
import openai
import sys

# Get API key
def get_openai_key():
    key_location_file = 'ai_key_location.txt'
    with open(key_location_file, 'r') as f:
        for line in f:
            if line.startswith('OPEN_AI_API_KEY='):
                key_path = line.strip().split('=', 1)[1].strip()
                with open(os.path.expanduser(key_path), 'r') as key_file:
                    return key_file.read().strip()
    raise ValueError('OpenAI API key location not found')

def read_model_config(config_file):
    config = {}
    with open(config_file, 'r') as f:
        for line in f:
            if '=' in line:
                key, value = line.strip().split('=', 1)
                config[key] = value
    return config

# Generate chapter
def generate_chapter(chapter_num, chapter_title):
    api_key = get_openai_key()
    model_config = read_model_config('ai_model.conf')
    model = model_config.get('OPENAI_MODEL', 'gpt-4')
    
    openai.api_key = api_key
    
    # Read the plan.md file for chapter details
    with open('plan.md', 'r') as f:
        plan = f.read()
    
    # Extract chapter description
    stage_keyword = 'Stage 4 Science Textbook Plan'
    chapter_keyword = f'Chapter {chapter_num}: {chapter_title}'
    
    # Find the relevant section in the plan
    start_idx = plan.find(stage_keyword)
    if start_idx == -1:
        print(f'Could not find section for Stage 4 in plan.md')
        chapter_description = 'No detailed description available.'
    else:
        chapter_section = plan[start_idx:]
        chapter_start_idx = chapter_section.find(chapter_keyword)
        if chapter_start_idx == -1:
            print(f'Could not find description for Chapter {chapter_num} in plan.md')
            chapter_description = 'No detailed description available.'
        else:
            chapter_info = chapter_section[chapter_start_idx:]
            next_chapter_idx = chapter_info[1:].find('\t•\tChapter')
            if next_chapter_idx == -1:
                chapter_description = chapter_info
            else:
                chapter_description = chapter_info[:next_chapter_idx+1]
    
    # Create the prompt
    prompt = f\"\"\"Create Chapter {chapter_num}: {chapter_title} for a Stage 4 science textbook designed for gifted and neurodiverse students following the NSW curriculum.

Chapter details from the curriculum plan:
{chapter_description}

The chapter should include:
1. A clear introduction to the topic
2. Properly structured sections with headings and subheadings
3. Key concepts explained with clarity and depth
4. Margin notes for definitions, extensions, and historical context
5. 'Stop and Think' questions throughout to check understanding
6. Investigation activities that develop scientific skills
7. Tiered questions (basic, intermediate, advanced) at the end of each main section
8. Visual elements described in LaTeX (figures will be added later)

Format the content in LaTeX using the Tufte-book class with appropriate section headings, margin notes, and custom environments.
The file should begin with a chapter heading (\\chapter{{{chapter_title}}}) and should not include the document class or preamble.

Include these custom environments where appropriate:
- \\begin{{keyconcept}}{{Title}}...\\end{{keyconcept}}
- \\begin{{investigation}}{{Title}}...\\end{{investigation}}
- \\begin{{stopandthink}}...\\end{{stopandthink}}
- \\begin{{tieredquestions}}{{Level}}...\\end{{tieredquestions}}
- \\begin{{example}}...\\end{{example}}

And these custom commands:
- \\keyword{{term}} for introducing key terms
- \\challenge{{text}} for extension content in margins
- \\mathlink{{text}} for mathematical connections
- \\historylink{{text}} for historical context

Use the mhchem package (\\ce{{}}) for any chemical formulas or equations.

Maximum length: 10000-12000 words, formatted in LaTeX.
\"\"\"
    
    # Try to generate content
    try:
        # Try new API client format
        try:
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {'role': 'system', 'content': 'You are an expert in educational content creation, specializing in science textbooks for gifted and neurodiverse students. You follow the NSW curriculum guidelines and create content in LaTeX format using the Tufte-book class.'},
                    {'role': 'user', 'content': prompt}
                ],
                max_tokens=12000,
                temperature=0.7,
            )
            content = response.choices[0].message.content
        except (AttributeError, TypeError):
            # Try old API format
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {'role': 'system', 'content': 'You are an expert in educational content creation, specializing in science textbooks for gifted and neurodiverse students. You follow the NSW curriculum guidelines and create content in LaTeX format using the Tufte-book class.'},
                    {'role': 'user', 'content': prompt}
                ],
                max_tokens=12000,
                temperature=0.7,
            )
            content = response.choices[0].message.content
        
        # Write to file
        output_file = f'stage4-OAI/chapters/chapter{chapter_num}.tex'
        with open(output_file, 'w') as f:
            f.write(content)
        
        print(f'Successfully generated Chapter {chapter_num}: {chapter_title}')
        return True
    except Exception as e:
        print(f'Error generating Chapter {chapter_num}: {e}')
        return False

# Execute the generation
chapter_num = $number
chapter_title = '$title'
success = generate_chapter(chapter_num, chapter_title)
sys.exit(0 if success else 1)
" >> $LOG_FILE 2>&1

  # Wait between API calls to avoid rate limits
  echo "Sleeping for 30 seconds to avoid API rate limits..." >> $LOG_FILE
  sleep 30
done

echo "All chapters generation complete at $(date)" >> $LOG_FILE

# Optional: Compile the LaTeX document after generation
# cd /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/textbooks && python generate_openai_textbooks.py --compile --stage 4 >> $LOG_FILE 2>&1

# Deactivate the virtual environment
deactivate

echo "Finished generating Stage 4 chapters. Check the stage4-OAI directory for results."
echo "Check progress with: tail -f $LOG_FILE"