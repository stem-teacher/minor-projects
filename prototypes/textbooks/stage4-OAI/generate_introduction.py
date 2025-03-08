#!/usr/bin/env python3
import os
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

# Generate introduction using direct API call via requests
def generate_introduction():
    api_key = get_openai_key()
    model_config = read_model_config('../ai_model.conf')
    model = model_config.get('OPENAI_MODEL', 'gpt-4')
    
    # Create the prompt
    prompt = """Create an introduction chapter for a Stage 4 science textbook following the NSW curriculum. The content should be high-quality, accessible, and engaging for all students.

This introduction should:
1. Welcome students to the study of science at Stage 4 level
2. Explain how the textbook is organized and how to use its features (main text, margin notes, investigations, etc.)
3. Provide an overview of what students will learn across the chapters
4. Include a section on how to use this book effectively (study tips, navigation)
5. Use British English spelling consistently throughout (e.g., 'colour' not 'color', 'centre' not 'center')

The introduction should be engaging, accessible, and considerate of diverse learning styles. It should also set high expectations while being supportive.

Format the content in LaTeX using the Tufte-book class with appropriate section headings, margin notes, and formatting.
The file should begin with a chapter heading (\\chapter{Introduction}) and should not include the document class or preamble.

Use the Tufte-book class with proper handling of floats:

IMPORTANT TUFTE FLOAT HANDLING GUIDELINES:
1. Use [0pt] offset for margin figures to prevent vertical drift:
   \\begin{marginfigure}[0pt]
     \\includegraphics[width=\\linewidth]{filename}
     \\caption{Caption text.}
   \\end{marginfigure}

2. Limit margin figures to maximum 3-4 per page

3. Add explicit \\FloatBarrier commands at the end of each major section with floats

4. For critical figures that must appear at specific locations, use:
   \\begin{figure}[H]
     ...
   \\end{figure}

5. Use \\marginpar{} sparingly (max 5-6 per page) to avoid float build-up

IMPORTANT: The introduction should be comprehensive and substantial, with a minimum of 2500 words (approximately 5-7 pages of content).
Word count range: 2500-11000 words, formatted in LaTeX.
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
        "max_tokens": 12000,
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
        output_file = 'chapters/introduction.tex'
        with open(output_file, 'w') as f:
            f.write(content)
        
        print(f'Successfully generated introduction')
        print(f'Content length: {len(content)} characters')
        return True
    
    except Exception as e:
        print(f'Error generating introduction: {e}')
        return False

if __name__ == "__main__":
    print("Generating introduction...")
    success = generate_introduction()
    sys.exit(0 if success else 1)