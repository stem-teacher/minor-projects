#!/usr/bin/env python3
import os
import time
import argparse
from pathlib import Path
import shutil
import openai

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

# Read OpenAI API key location from file
def get_openai_key():
    key_location_file = "ai_key_location.txt"
    with open(key_location_file, 'r') as f:
        for line in f:
            if line.startswith("OPEN_AI_API_KEY="):
                key_path = line.strip().split('=', 1)[1].strip()
                return read_api_key(key_path)
    raise ValueError("OpenAI API key location not found in ai_key_location.txt")

# Configure OpenAI client - Works with both old and new OpenAI API versions
def setup_openai_client(api_key):
    try:
        # Try the newer API format first
        openai.api_key = api_key
        return openai
    except:
        # Fall back to older format if needed
        openai.api_key = api_key
        return openai

# Generate text using OpenAI API - Works with both old and new OpenAI API versions
def generate_text(client, prompt, model, max_tokens=14000):
    try:
        # Try the newer API format first
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an expert in educational content creation, specializing in high school science textbooks for gifted and neurodiverse students. You follow the NSW HSC curriculum guidelines and create content in LaTeX format using the Tufte-book class."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except (AttributeError, TypeError):
            # Fall back to older OpenAI API format
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an expert in educational content creation, specializing in high school science textbooks for gifted and neurodiverse students. You follow the NSW HSC curriculum guidelines and create content in LaTeX format using the Tufte-book class."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating text: {e}")
        time.sleep(5)  # Backoff before retry
        return None

# Read template files
def read_file(file_path):
    with open(file_path, 'r') as f:
        return f.read()

# Create main LaTeX file for the HSC textbook
def create_main_tex_file(subject, output_dir):
    target_path = f"{output_dir}/main-textbook.tex"
    subject_title = "Chemistry" if subject == "chemistry" else "Physics"
    
    # Create a new main TeX file
    content = f"""% Stage 6 {subject_title} Textbook (OpenAI Version)
% Using Tufte-LaTeX document class for elegant layout with margin notes

\\documentclass[justified]{{tufte-book}}

% Essential packages
\\usepackage[utf8]{{inputenc}}
\\usepackage[T1]{{fontenc}}
\\usepackage{{graphicx}}
\\graphicspath{{{{./images/}}}}
\\usepackage{{amsmath,amssymb}}
\\usepackage[version=4]{{mhchem}} % For chemistry notation
\\usepackage{{booktabs}} % For nice tables
\\usepackage{{microtype}} % Better typography
\\usepackage{{tikz}} % For diagrams
\\usepackage{{xcolor}} % For colored text
\\usepackage{{soul}} % For highlighting
\\usepackage{{tcolorbox}} % For colored boxes
\\usepackage{{enumitem}} % For better lists
\\usepackage{{wrapfig}} % For wrapping text around figures
\\usepackage{{hyperref}} % For links
\\hypersetup{{colorlinks=true, linkcolor=blue, urlcolor=blue}}

% Add float package for [H] placement option
\\usepackage{{float}}
\\usepackage{{placeins}} % For \\FloatBarrier
\\usepackage{{morefloats}}
\\extrafloats{{100}}

% Float adjustment to reduce figure/table drift
\\setcounter{{topnumber}}{{9}}          % Maximum floats at top of page
\\setcounter{{bottomnumber}}{{9}}       % Maximum floats at bottom
\\setcounter{{totalnumber}}{{16}}       % Maximum total floats on a page
\\renewcommand{{\\topfraction}}{{0.9}}   % Maximum page fraction for top floats
\\renewcommand{{\\bottomfraction}}{{0.9}}% Maximum page fraction for bottom floats
\\renewcommand{{\\textfraction}}{{0.05}} % Minimum text fraction on page
\\renewcommand{{\\floatpagefraction}}{{0.5}} % Minimum float page fill

% Process all floats at end of each chapter
\\makeatletter
\\AtBeginDocument{{
  \\let\\old@chapter\\@chapter
  \\def\\@chapter[#1]#2{{\\FloatBarrier\\old@chapter[{{#1}}]{{#2}}}}
}}
\\makeatother

% Custom colors
\\definecolor{{primary}}{{RGB}}{{0, 73, 144}} % Deep blue
\\definecolor{{secondary}}{{RGB}}{{242, 142, 43}} % Orange
\\definecolor{{highlight}}{{RGB}}{{255, 222, 89}} % Yellow highlight
\\definecolor{{success}}{{RGB}}{{46, 139, 87}} % Green
\\definecolor{{info}}{{RGB}}{{70, 130, 180}} % Steel blue
\\definecolor{{note}}{{RGB}}{{220, 220, 220}} % Light gray

% Custom commands for pedagogical elements
\\newcommand{{\\keyword}}[1]{{\\textbf{{#1}}\\marginnote{{\\textbf{{#1}}: }}}}

\\newcommand{{\\challengeicon}}{{*}}
\\newcommand{{\\challenge}}[1]{{\\marginnote{{\\textbf{{\\challengeicon\\ Challenge:}} #1}}}}

\\newcommand{{\\mathlink}}[1]{{\\marginnote{{\\textbf{{Math Link:}} #1}}}}

\\newcommand{{\\historylink}}[1]{{\\marginnote{{\\textbf{{History:}} #1}}}}

\\newenvironment{{investigation}}[1]{{%
    \\begin{{tcolorbox}}[colback=info!10,colframe=info,title=\\textbf{{Investigation: #1}}]
}}{{%
    \\end{{tcolorbox}}
}}

\\newenvironment{{keyconcept}}[1]{{%
    \\begin{{tcolorbox}}[colback=primary!5,colframe=primary,title=\\textbf{{Key Concept: #1}}]
}}{{%
    \\end{{tcolorbox}}
}}

\\newenvironment{{tieredquestions}}[1]{{%
    \\begin{{tcolorbox}}[colback=note!30,colframe=note!50,title=\\textbf{{Practice Questions - #1}}]
}}{{%
    \\end{{tcolorbox}}
}}

\\newenvironment{{stopandthink}}{{%
    \\begin{{tcolorbox}}[colback={{highlight!30}},colframe={{highlight!50}},title=\\textbf{{Stop and Think}}]
}}{{%
    \\end{{tcolorbox}}
}}

\\newenvironment{{example}}{{%
    \\par\\smallskip\\noindent\\textit{{Example:}}
}}{{%
    \\par\\smallskip
}}

\\title{{NSW HSC {subject_title}: A Comprehensive Guide\\\\
\\large For Gifted and Neurodiverse Learners}}
\\author{{The Curious Scientist}}
\\publisher{{Emergent Mind Press}}
\\date{{\\today}}

\\begin{{document}}

\\maketitle

\\tableofcontents

% Introduction
\\input{chapters/introduction}
\\FloatBarrier

% Add all chapters here
% They will be uncommented one by one during compilation

"""

    # Add placeholders for all chapters
    if subject == "chemistry":
        for i in range(1, 9):
            content += f"% \\input{{chapters/chapter{i}}}\n% \\FloatBarrier\n\n"
    else:  # physics
        for i in range(1, 9):
            content += f"% \\input{{chapters/chapter{i}}}\n% \\FloatBarrier\n\n"

    # End document
    content += "\\end{document}"

    # Write to file
    with open(target_path, 'w') as f:
        f.write(content)

    # Also create the subject-specific tex file
    subject_tex_path = f"{output_dir}/stage6-{subject}-textbook.tex"
    with open(subject_tex_path, 'w') as f:
        f.write(content)

# Generate introduction content
def generate_introduction(client, subject, model):
    subject_title = "Chemistry" if subject == "chemistry" else "Physics"
    
    prompt = f"""Create an introduction chapter for an HSC (Higher School Certificate) {subject_title} textbook designed for gifted and neurodiverse students following the NSW curriculum in Australia.

This introduction should:
1. Welcome students to the study of {subject_title} at the HSC level
2. Explain how the textbook is organized and how to use its features (main text, margin notes, investigations, etc.)
3. Provide an overview of what students will learn across the Year 11 (Preliminary) and Year 12 (HSC) modules
4. Include a section on how to use this book effectively (study tips, navigation, preparation for HSC examinations)
5. Discuss the nature of {subject_title} as a scientific discipline and why it's valuable

The introduction should be engaging, accessible, and considerate of diverse learning styles. It should also set high expectations while being supportive.

Format the content in LaTeX using the Tufte-book class with appropriate section headings, margin notes, and formatting.
The file should begin with a chapter heading (\\chapter{{Introduction}}) and should not include the document class or preamble.

Maximum length: 10000-11000 words, formatted in LaTeX.
"""
    return generate_text(client, prompt, model)

# Generate chapter content for Chemistry
def generate_chemistry_chapter(client, chapter_num, chapter_title, model):
    # Define the chapter descriptions based on the plan-hsc.md file
    chapter_descriptions = {
        1: """Module 1: Properties & Structure of Matter
- Atomic structure, electron configuration, periodic trends, bonding types
- In-depth look at intermolecular forces, metals vs. non-metals, allotropes
- Historical development of atomic models
""",
        2: """Module 2: Introduction to Quantitative Chemistry
- The mole concept, molar mass, balancing equations, stoichiometry
- Empirical & molecular formulas, percentage composition
- Gravimetric analysis basics
""",
        3: """Module 3: Reactive Chemistry
- Types of chemical reactions (combustion, precipitation, acid-base, redox)
- Reaction rates (qualitative introduction), collision theory fundamentals
- Practical investigations with reactivity series and displacement
""",
        4: """Module 4: Drivers of Reactions
- Thermodynamics (enthalpy, endothermic/exothermic), enthalpy calculations
- Entropy and spontaneity (introductory concepts), Gibbs free energy (qualitatively)
- Electrochemical and galvanic cells as real-world applications
""",
        5: """Module 5: Equilibrium & Acid Reactions
- Equilibrium principles (Le Châtelier's principle, equilibrium constants)
- Acid-base theories (Arrhenius, Brønsted-Lowry), pH, pOH, indicators
- Strength vs. concentration, buffer systems
""",
        6: """Module 6: Acid/Base Reactions
- Strong vs. weak acids/bases, quantitative pH calculations
- Titrations, volumetric analysis, standard solutions
- Industrial applications (e.g. ammonia production, chemical manufacturing)
""",
        7: """Module 7: Organic Chemistry
- Hydrocarbons, functional groups (alcohols, aldehydes, ketones, carboxylic acids, esters)
- IUPAC nomenclature, isomerism, reaction pathways (substitution, addition, condensation)
- Polymers, biofuels, and current advances in organic synthesis
""",
        8: """Module 8: Applying Chemical Ideas
- Instrumental analysis (spectroscopy, chromatography)
- Monitoring the environment (water/air quality)
- Qualitative & quantitative analysis of organic and inorganic substances
"""
    }
    
    chapter_description = chapter_descriptions.get(chapter_num, "No detailed description available.")
    
    # Determine if it's a Year 11 or Year 12 module
    year_level = "Preliminary (Year 11)" if chapter_num <= 4 else "HSC (Year 12)"
    
    prompt = f"""Create Chapter {chapter_num}: {chapter_title} for an HSC Chemistry textbook designed for gifted and neurodiverse students following the NSW curriculum. This is a {year_level} module.

Chapter details from the curriculum plan:
{chapter_description}

The chapter should include:
1. A clear introduction to the topic with real-world relevance
2. Properly structured sections with headings and subheadings that follow logical development
3. Key concepts explained with clarity and depth appropriate for HSC level
4. Margin notes for definitions, extensions, and historical context
5. 'Stop and Think' questions throughout to check understanding
6. Investigation activities that develop scientific and practical skills
7. Tiered questions (basic, intermediate, advanced) at the end of each main section
8. Visual elements described in LaTeX (figures will be added later)
9. Extension material for gifted students through margin notes and advanced question sections
10. Clear and systematic explanations of chemical principles, with appropriate mathematical rigor
11. References to current research or applications where relevant

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

Use the mhchem package (\\ce{{}}) for chemical formulas or equations.
Add \\FloatBarrier commands after sections that contain multiple figures or margin notes.
Remember to structure the content with diverse learners in mind, providing clear scaffolding while also challenging gifted students.

Maximum length: 12000-14000 words, formatted in LaTeX.
"""
    return generate_text(client, prompt, model)

# Generate chapter content for Physics
def generate_physics_chapter(client, chapter_num, chapter_title, model):
    # Define the chapter descriptions based on the plan-hsc.md file
    chapter_descriptions = {
        1: """Module 1: Kinematics
- Describing motion: displacement, velocity, acceleration
- Graphical analysis (displacement-time, velocity-time)
- Introduction to vectors vs. scalars
""",
        2: """Module 2: Dynamics
- Newton's laws of motion, force diagrams, free-body analysis
- Projectile motion, uniform circular motion (qualitatively)
- Momentum (impulse), collisions
""",
        3: """Module 3: Waves & Thermodynamics
- Wave properties (frequency, wavelength, amplitude), wave speed
- Sound waves, electromagnetic waves overview
- Thermodynamics basics: heat transfer, temperature vs. thermal energy
""",
        4: """Module 4: Electricity & Magnetism
- Electric fields, current, voltage, resistance, circuits
- Magnetic fields, electromagnetism fundamentals
- Intro to DC electric motors, electromagnetic induction basics
""",
        5: """Module 5: Advanced Mechanics
- Uniform circular motion (quantitative), centripetal force
- Rotational dynamics, torque, rotational inertia (qualitative to semi-quantitative)
- Gravitational fields, orbital motion (satellites, planetary orbits)
""",
        6: """Module 6: Electromagnetism
- Electromagnetic induction (Faraday's & Lenz's laws)
- Transformers, AC vs. DC current, power distribution
- Maxwell's equations (qualitative introduction)
""",
        7: """Module 7: The Nature of Light
- Wave-particle duality, photoelectric effect
- Spectra and atomic emission/absorption
- Special relativity (time dilation, length contraction)
""",
        8: """Module 8: From the Universe to the Atom
- Standard Model of particle physics (fundamental particles, quarks, leptons)
- Nuclear physics: stability, decay, applications (nuclear energy, radiation)
- Cosmology basics: Big Bang theory, cosmic background radiation, expansion of the universe
"""
    }
    
    chapter_description = chapter_descriptions.get(chapter_num, "No detailed description available.")
    
    # Determine if it's a Year 11 or Year 12 module
    year_level = "Preliminary (Year 11)" if chapter_num <= 4 else "HSC (Year 12)"
    
    prompt = f"""Create Chapter {chapter_num}: {chapter_title} for an HSC Physics textbook designed for gifted and neurodiverse students following the NSW curriculum. This is a {year_level} module.

Chapter details from the curriculum plan:
{chapter_description}

The chapter should include:
1. A clear introduction to the topic with real-world relevance
2. Properly structured sections with headings and subheadings that follow logical development
3. Key concepts explained with clarity and depth appropriate for HSC level
4. Margin notes for definitions, extensions, and historical context
5. 'Stop and Think' questions throughout to check understanding
6. Investigation activities that develop scientific and practical skills
7. Tiered questions (basic, intermediate, advanced) at the end of each main section
8. Visual elements described in LaTeX (figures will be added later)
9. Extension material for gifted students through margin notes and advanced question sections
10. Clear and systematic explanations of physical principles with mathematical derivations where appropriate
11. References to current research or applications where relevant

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

Add \\FloatBarrier commands after sections that contain multiple figures or margin notes.
Make sure to use proper mathematical notation and equations where needed.
Remember to structure the content with diverse learners in mind, providing clear scaffolding while also challenging gifted students.

Maximum length: 12000-14000 words, formatted in LaTeX.
"""
    return generate_text(client, prompt, model)

# Write content to file
def write_content(content, file_path):
    with open(file_path, 'w') as f:
        f.write(content)

# Generate a full HSC textbook
def generate_hsc_textbook(subject, chapters=8):
    # Check valid subject
    if subject not in ["chemistry", "physics"]:
        print(f"Invalid subject: {subject}. Use 'chemistry' or 'physics'.")
        return
    
    # Prepare paths
    output_dir = f"stage6-{subject}"
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(f"{output_dir}/chapters", exist_ok=True)
    os.makedirs(f"{output_dir}/images", exist_ok=True)

    # Read configuration
    api_key = get_openai_key()
    model_config = read_model_config("ai_model.conf")
    model = model_config.get("OPENAI_MODEL", "gpt-4")

    # Set up API client
    client = setup_openai_client(api_key)

    # Create main textbook file
    create_main_tex_file(subject, output_dir)

    # Generate introduction
    print(f"Generating introduction for HSC {subject}...")
    intro_content = generate_introduction(client, subject, model)
    write_content(intro_content, f"{output_dir}/chapters/introduction.tex")

    # Define chapter titles
    if subject == "chemistry":
        chapter_titles = [
            "Properties & Structure of Matter",
            "Introduction to Quantitative Chemistry",
            "Reactive Chemistry",
            "Drivers of Reactions",
            "Equilibrium & Acid Reactions",
            "Acid/Base Reactions",
            "Organic Chemistry",
            "Applying Chemical Ideas"
        ]
    else:  # physics
        chapter_titles = [
            "Kinematics",
            "Dynamics",
            "Waves & Thermodynamics",
            "Electricity & Magnetism",
            "Advanced Mechanics",
            "Electromagnetism",
            "The Nature of Light",
            "From the Universe to the Atom"
        ]

    # Generate chapters
    for i in range(1, chapters + 1):
        if i <= len(chapter_titles):
            chapter_title = chapter_titles[i-1]
            print(f"Generating Chapter {i}: {chapter_title}...")
            
            if subject == "chemistry":
                chapter_content = generate_chemistry_chapter(client, i, chapter_title, model)
            else:  # physics
                chapter_content = generate_physics_chapter(client, i, chapter_title, model)
                
            if chapter_content:
                write_content(chapter_content, f"{output_dir}/chapters/chapter{i}.tex")
                print(f"Chapter {i} generated successfully!")
            else:
                print(f"Failed to generate Chapter {i}. Please try again.")
                
            # Wait between API calls to avoid rate limits
            time.sleep(20)

    print(f"HSC {subject} textbook content generation complete!")

# Compile LaTeX document
def compile_latex(tex_file, working_dir):
    try:
        # Change to the directory containing the tex file
        original_dir = os.getcwd()
        os.chdir(working_dir)
        
        # Run pdflatex twice to resolve references
        os.system(f"pdflatex -interaction=nonstopmode {os.path.basename(tex_file)}")
        os.system(f"pdflatex -interaction=nonstopmode {os.path.basename(tex_file)}")
        
        # Go back to original directory
        os.chdir(original_dir)
        
        print(f"Successfully compiled {tex_file}")
        return True
    except Exception as e:
        print(f"Error compiling {tex_file}: {e}")
        # Go back to original directory in case of error
        os.chdir(original_dir)
        return False

def main():
    parser = argparse.ArgumentParser(description='Generate HSC science textbooks using OpenAI API')
    parser.add_argument('--subject', choices=['chemistry', 'physics', 'both'], default='both',
                        help='Which subject textbook to generate (chemistry, physics, or both)')
    parser.add_argument('--generate', action='store_true', help='Generate textbook content using OpenAI API')
    parser.add_argument('--compile', action='store_true', help='Compile LaTeX documents')
    parser.add_argument('--chapters', type=int, default=8, 
                        help='Number of chapters to generate (default: 8)')
    args = parser.parse_args()

    if args.generate:
        if args.subject in ['chemistry', 'both']:
            generate_hsc_textbook('chemistry', chapters=args.chapters)

        if args.subject in ['physics', 'both']:
            generate_hsc_textbook('physics', chapters=args.chapters)

    if args.compile:
        if args.subject in ['chemistry', 'both']:
            compile_latex('stage6-chemistry-textbook.tex', 'stage6-chemistry')

        if args.subject in ['physics', 'both']:
            compile_latex('stage6-physics-textbook.tex', 'stage6-physics')

if __name__ == "__main__":
    main()
