#!/usr/bin/env python3
import os
import time
import argparse
from pathlib import Path
import shutil
import google.generativeai as genai

# Read API key from file
def read_api_key(key_file_path):
    expanded_path = os.path.expanduser(key_file_path)
    with open(expanded_path, 'r') as f:
        return f.read().strip()

# Read the model configuration
def read_model_config(config_file):
    config = {}
    with open(config_file, 'r') as f:
        for line in f:
            if '=' in line:
                key, value = line.strip().split('=', 1)
                config[key] = value
    return config

# Read Gemini API key location from file
def get_gemini_key():
    key_location_file = "ai_key_location.txt"
    with open(key_location_file, 'r') as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                key_path = line.strip().split('=', 1)[1].strip()
                return read_api_key(key_path)
    raise ValueError("Gemini API key location not found in ai_key_location.txt")

# Configure Gemini API
def setup_gemini_client(api_key):
    genai.configure(api_key=api_key)
    return genai

# Generate text using Gemini API
def generate_text(client, prompt, model_name, max_tokens=3000):
    try:
        model = client.GenerativeModel(model_name)
        response = model.generate_content(
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": "You are an expert in educational content creation, specializing in science textbooks for gifted and neurodiverse students. You follow the NSW curriculum guidelines and create content in LaTeX format using the Tufte-book class."
                        },
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            generation_config={
                "max_output_tokens": max_tokens,
                "temperature": 0.7,
            }
        )
        return response.text
    except Exception as e:
        print(f"Error generating text: {e}")
        time.sleep(5)  # Backoff before retry
        return None

# Read template files
def read_file(file_path):
    with open(file_path, 'r') as f:
        return f.read()

# Create main LaTeX file for the textbook
def create_main_tex_file(stage, output_dir):
    source_path = f"stage-{stage}/main-textbook.tex"
    target_path = f"{output_dir}/main-textbook.tex"
    
    # Read the original file
    content = read_file(source_path)
    
    # Replace the title if needed for Gemini version
    if stage == "4":
        title_line = "\\title{Unlocking Science: Explorations for Stage 4 (Gemini Version)\\\\"
    else:
        title_line = "\\title{Advancing in Science: Pathways for Stage 5 (Gemini Version)\\\\"
    
    content = content.replace("\\title{Unlocking Science: Explorations for Stage 4\\\\", title_line)
    content = content.replace("\\title{Advancing in Science: Pathways for Stage 5\\\\", title_line)
    
    # Write the new file
    with open(target_path, 'w') as f:
        f.write(content)
    
    # Also create the stage-specific tex file
    stage_tex_path = f"{output_dir}/stage{stage}-gemini-textbook.tex"
    with open(stage_tex_path, 'w') as f:
        f.write(content)

# Copy images from source to target directory
def copy_images(stage, output_dir):
    source_dir = f"stage-{stage}/images"
    target_dir = f"{output_dir}/images"
    
    # Create target directory if it doesn't exist
    os.makedirs(target_dir, exist_ok=True)
    
    # Copy all files from source to target
    for filename in os.listdir(source_dir):
        source_path = os.path.join(source_dir, filename)
        target_path = os.path.join(target_dir, filename)
        if os.path.isfile(source_path):
            shutil.copy2(source_path, target_path)

# Generate introduction content
def generate_introduction(client, stage, model):
    prompt = f"""Create an introduction chapter for a Stage {stage} science textbook designed for gifted and neurodiverse students following the NSW curriculum. 

This introduction should:
1. Welcome students to the study of science at Stage {stage} level
2. Explain how the textbook is organized and how to use its features (main text, margin notes, investigations, etc.)
3. Provide an overview of what students will learn across the chapters
4. Include a section on how to use this book effectively (study tips, navigation)

The introduction should be engaging, accessible, and considerate of diverse learning styles. It should also set high expectations while being supportive.

Format the content in LaTeX using the Tufte-book class with appropriate section headings, margin notes, and formatting.
The file should begin with a chapter heading (\\chapter{{Introduction}}) and should not include the document class or preamble.

Maximum length: 1000-1500 words, formatted in LaTeX.
"""
    return generate_text(client, prompt, model)

# Generate chapter content
def generate_chapter(client, stage, chapter_num, chapter_title, model):
    # Read the plan.md file for chapter details
    plan = read_file("plan.md")
    
    # Extract chapter description based on chapter number and stage
    stage_keyword = f"Stage {stage} Science Textbook Plan"
    chapter_keyword = f"Chapter {chapter_num}: {chapter_title}"
    
    # Find the relevant section in the plan
    start_idx = plan.find(stage_keyword)
    if start_idx == -1:
        print(f"Could not find section for Stage {stage} in plan.md")
        chapter_description = "No detailed description available."
    else:
        chapter_section = plan[start_idx:]
        chapter_start_idx = chapter_section.find(chapter_keyword)
        if chapter_start_idx == -1:
            print(f"Could not find description for Chapter {chapter_num} in plan.md")
            chapter_description = "No detailed description available."
        else:
            chapter_info = chapter_section[chapter_start_idx:]
            next_chapter_idx = chapter_info[1:].find("\t•\tChapter")
            if next_chapter_idx == -1:
                chapter_description = chapter_info
            else:
                chapter_description = chapter_info[:next_chapter_idx+1]
    
    prompt = f"""Create Chapter {chapter_num}: {chapter_title} for a Stage {stage} science textbook designed for gifted and neurodiverse students following the NSW curriculum.

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

Maximum length: 2500-3000 words, formatted in LaTeX.
"""
    return generate_text(client, prompt, model)

# Write content to file
def write_content(content, file_path):
    with open(file_path, 'w') as f:
        f.write(content)

# Generate a full textbook
def generate_textbook(stage, chapters=2):
    # Prepare paths
    output_dir = f"stage{stage}-gemini"
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(f"{output_dir}/chapters", exist_ok=True)
    
    # Read configuration
    api_key = get_gemini_key()
    model_config = read_model_config("ai_model.conf")
    model = model_config.get("GEMINI_MODEL", "gemini-2.0-flash-thinking-exp-01-21")
    
    # Set up API client
    client = setup_gemini_client(api_key)
    
    # Create main textbook file
    create_main_tex_file(stage, output_dir)
    
    # Copy images
    copy_images(stage, output_dir)
    
    # Generate introduction
    print(f"Generating introduction for Stage {stage}...")
    intro_content = generate_introduction(client, stage, model)
    write_content(intro_content, f"{output_dir}/chapters/introduction.tex")
    
    # Generate chapters
    if stage == "4":
        chapter_titles = [
            "Introduction to Scientific Inquiry",
            "Properties of Matter (Particle Theory)"
        ]
    else:  # stage 5
        chapter_titles = [
            "Scientific Investigations and Research Skills",
            "Atoms, Elements and Compounds"
        ]
    
    for i in range(1, chapters + 1):
        if i <= len(chapter_titles):
            chapter_title = chapter_titles[i-1]
            print(f"Generating Chapter {i}: {chapter_title}...")
            chapter_content = generate_chapter(client, stage, i, chapter_title, model)
            write_content(chapter_content, f"{output_dir}/chapters/chapter{i}.tex")
            time.sleep(5)  # Adding a delay to avoid rate limits
    
    print(f"Stage {stage} textbook content generation complete!")

# Compile LaTeX document
def compile_latex(tex_file):
    try:
        # Run pdflatex twice to resolve references
        os.system(f"pdflatex -interaction=nonstopmode {tex_file}")
        os.system(f"pdflatex -interaction=nonstopmode {tex_file}")
        print(f"Successfully compiled {tex_file}")
        return True
    except Exception as e:
        print(f"Error compiling {tex_file}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Generate science textbooks using Google Gemini API')
    parser.add_argument('--stage', choices=['4', '5', 'both'], default='both',
                        help='Which stage textbook to generate (4, 5, or both)')
    parser.add_argument('--generate', action='store_true', help='Generate textbook content using Gemini API')
    parser.add_argument('--compile', action='store_true', help='Compile LaTeX documents')
    args = parser.parse_args()
    
    if args.generate:
        if args.stage in ['4', 'both']:
            generate_textbook('4')
            
        if args.stage in ['5', 'both']:
            generate_textbook('5')
    
    if args.compile:
        if args.stage in ['4', 'both']:
            os.chdir('stage4-gemini')
            compile_latex('stage4-gemini-textbook.tex')
            os.chdir('..')
            
        if args.stage in ['5', 'both']:
            os.chdir('stage5-gemini')
            compile_latex('stage5-gemini-textbook.tex')
            os.chdir('..')

if __name__ == "__main__":
    main()