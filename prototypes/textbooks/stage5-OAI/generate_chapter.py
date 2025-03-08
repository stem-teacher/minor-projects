#!/usr/bin/env python3
import os
import time
import json
import sys
import requests

# Get API key
def get_openai_key():
    key_location_file = '../ai_key_location.txt'
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

# Generate chapter using direct API call via requests
def generate_chapter(chapter_num, chapter_title):
    api_key = get_openai_key()
    model_config = read_model_config('../ai_model.conf')
    model = model_config.get('OPENAI_MODEL', 'gpt-4')

    # Read the plan.md file for chapter details
    with open('../plan.md', 'r') as f:
        plan = f.read()

    # Extract chapter description
    stage_keyword = 'Stage 5 Science Textbook Plan'
    chapter_keyword = f'Chapter {chapter_num}: {chapter_title}'

    # Find the relevant section in the plan
    start_idx = plan.find(stage_keyword)
    if start_idx == -1:
        print(f'Could not find section for Stage 5 in plan.md')
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
    prompt = f"""Create Chapter {chapter_num}: {chapter_title} for a Stage 5 science textbook following the NSW curriculum. The content should be high-quality, accessible, and engaging for all students.

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
9. Use British English spelling

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

IMPORTANT: Each chapter must be comprehensive and substantial, with a minimum of 2500 words (approximately 5-7 pages of content).
Word count range: 2500-12000 words, formatted in LaTeX.
"""

    # Call the OpenAI API directly with requests
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert in educational content creation, specializing in high-quality science textbooks. You follow the NSW curriculum guidelines and create content in LaTeX format using the Tufte-book class. Your content is accessible and engaging for all students, with varying levels of challenge embedded throughout."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 15000,
        "temperature": 0.7
    }

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload
        )

        if response.status_code != 200:
            print(f"API error: {response.status_code}")
            print(response.text)
            return False

        # Parse the JSON response
        result = response.json()

        if 'choices' not in result or len(result['choices']) == 0:
            print("No content returned from API")
            print(result)
            return False

        content = result['choices'][0]['message']['content']

        # Write to file
        output_file = f'chapters/chapter{chapter_num}.tex'
        with open(output_file, 'w') as f:
            f.write(content)

        print(f'Successfully generated Chapter {chapter_num}: {chapter_title}')
        print(f'Content length: {len(content)} characters')
        return True

    except Exception as e:
        print(f'Error generating Chapter {chapter_num}: {e}')
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python generate_chapter.py <chapter_number> <chapter_title>")
        sys.exit(1)

    chapter_num = sys.argv[1]
    chapter_title = sys.argv[2]

    print(f"Generating Chapter {chapter_num}: {chapter_title}")
    success = generate_chapter(chapter_num, chapter_title)
    sys.exit(0 if success else 1)