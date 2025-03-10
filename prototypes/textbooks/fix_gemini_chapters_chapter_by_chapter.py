#!/usr/bin/env python3
import os
import re
import shutil
import argparse
from datetime import datetime

def create_backup(directory):
    """Create a backup of the chapters directory"""
    chapters_dir = os.path.join(directory, "chapters")
    if not os.path.exists(chapters_dir):
        print(f"Chapters directory not found: {chapters_dir}")
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = f"{chapters_dir}_backup_{timestamp}"
    
    # Copy the contents
    shutil.copytree(chapters_dir, backup_dir)
    print(f"Created backup: {backup_dir}")

def fix_chapter_file(file_path):
    """Fix common LaTeX issues in Gemini-generated chapter files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Fix 1: Ensure stopandthink environment has correct braces
        content = re.sub(r'\\begin{stopandthink}{([^}]*)}',
                         r'\\begin{stopandthink}', content)
        
        # Fix 2: Fix any malformed environments
        for env in ['keyconcept', 'investigation', 'stopandthink', 'tieredquestions', 'example']:
            # Fix malformed begin tags
            pattern = r'\\begin\s+{' + env + r'}'
            content = re.sub(pattern, r'\\begin{' + env + r'}', content)
            
            # Fix malformed end tags
            pattern = r'\\end\s+{' + env + r'}'
            content = re.sub(pattern, r'\\end{' + env + r'}', content)
        
        # Fix 3: Fix highlight color usage if needed
        content = re.sub(r'\\hl{([^}]*)}', r'\\textcolor{highlight}{\\1}', content)
        
        # Fix 4: Add FloatBarrier at the end of each section
        content = re.sub(r'(\\section{[^}]*})', r'\\FloatBarrier\n\\1', content)
        
        # Fix 5: Add FloatBarrier at the end of document
        if not content.strip().endswith('\\FloatBarrier'):
            content += '\n\\FloatBarrier\n'
        
        # Save fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"Fixed: {file_path}")
        return True
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def update_gemini_prompt_template():
    """Create an improved template for Gemini prompts with better LaTeX guidance"""
    template_path = "gemini_chapter_template.md"
    
    template_content = """# Improved Gemini Chapter Generation Template

## System Instruction
You are an expert in educational content creation, specializing in science textbooks for gifted and neurodiverse students. You follow the NSW curriculum guidelines and create content in LaTeX format using the Tufte-book class.

## User Prompt Template
Create Chapter {chapter_num}: {chapter_title} for a Stage {stage} science textbook following the NSW curriculum. The content should be high-quality, accessible, and engaging for all students.

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
The file should begin with a chapter heading (\\chapter{{chapter_title}}) and should not include the document class or preamble.

## IMPORTANT LATEX GUIDELINES:

1. CORRECTLY IMPLEMENT THESE ENVIRONMENTS:
   ```latex
   \\begin{keyconcept}{Title}
   Content goes here...
   \\end{keyconcept}
   
   \\begin{investigation}{Title}
   Content goes here...
   \\end{investigation}
   
   \\begin{stopandthink}
   Content goes here...
   \\end{stopandthink}
   
   \\begin{tieredquestions}{Level}
   Content goes here...
   \\end{tieredquestions}
   
   \\begin{example}
   Content goes here...
   \\end{example}
   ```

2. CORRECTLY USE THESE COMMANDS:
   ```latex
   \\keyword{term} for introducing key terms
   \\challenge{text} for extension content in margins
   \\mathlink{text} for mathematical connections
   \\historylink{text} for historical context
   ```

3. FLOAT MANAGEMENT:
   - Add \\FloatBarrier at the end of each major section
   - Don't add too many margin figures or notes on a single page
   - Use [0pt] offset for margin figures:
     ```latex
     \\begin{marginfigure}[0pt]
       \\includegraphics[width=\\linewidth]{filename}
       \\caption{Caption text.}
     \\end{marginfigure}
     ```

4. CORRECT SYNTAX:
   - Ensure all LaTeX commands have properly matched braces
   - Don't add extra parameters to environments that don't need them
   - The stopandthink environment does NOT take a title parameter
   - Use \\ce{} (from mhchem package) for chemical formulas

IMPORTANT: Each chapter must be comprehensive and substantial, with a minimum of 2500 words (approximately 5-7 pages of content).
Word count range: 2500-12000 words, formatted in LaTeX.
"""
    
    with open(template_path, 'w', encoding='utf-8') as f:
        f.write(template_content)
    
    print(f"Created improved template: {template_path}")

def create_validation_script():
    """Create a validation script that checks LaTeX files for common errors"""
    script_path = "validate_latex.py"
    
    script_content = """#!/usr/bin/env python3
import os
import re
import sys
import argparse

def validate_latex_file(file_path):
    \"\"\"Check LaTeX file for common errors\"\"\"
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    errors = []
    
    # Check for unmatched braces
    open_braces = content.count('{')
    close_braces = content.count('}')
    if open_braces != close_braces:
        errors.append(f"Unmatched braces: {open_braces} opening vs {close_braces} closing")
    
    # Check for malformed environment begins
    begin_env = re.findall(r'\\\\begin\s+{([^}]*)}', content)
    if begin_env:
        errors.append(f"Malformed begin environments: {', '.join(begin_env)}")
    
    # Check for malformed environment ends
    end_env = re.findall(r'\\\\end\s+{([^}]*)}', content)
    if end_env:
        errors.append(f"Malformed end environments: {', '.join(end_env)}")
    
    # Check for stopandthink with parameter
    stopandthink_params = re.findall(r'\\\\begin{stopandthink}{([^}]*)}', content)
    if stopandthink_params:
        errors.append("stopandthink environment should not have parameters")
    
    # Check for any undefined command patterns
    undefined_patterns = re.findall(r'undefined color', content)
    if undefined_patterns:
        errors.append("Found reference to undefined colors")
    
    return errors

def validate_directory(directory):
    \"\"\"Validate all .tex files in a directory\"\"\"
    has_errors = False
    for filename in os.listdir(directory):
        if filename.endswith('.tex'):
            file_path = os.path.join(directory, filename)
            errors = validate_latex_file(file_path)
            
            if errors:
                print(f"\\nErrors in {file_path}:")
                for error in errors:
                    print(f"  - {error}")
                has_errors = True
            else:
                print(f"✓ {file_path} - No errors detected")
    
    return not has_errors

def modified_fix_chapter10():
    """Special fix for chapter 10 with deep nesting and other issues"""
    file_path = 'stage4-gemini/chapters/chapter10.tex'
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix specific issues in chapter 10
        # 1. Fix deeply nested lists by using enumitem package options
        content = content.replace('\begin{itemize}
                \item', '\begin{itemize}[label=$\bullet$]
        \item')
        
        # 2. Remove problematic marginfigures without proper images
        content = content.replace('\begin{marginfigure}[0pt]
    \includegraphics[width=\marginparwidth]{placeholder-', '%\begin{marginfigure}[0pt]
    %\includegraphics[width=\marginparwidth]{placeholder-')
        content = content.replace('\caption{', '%\caption{')
        content = content.replace('\end{marginfigure}', '%\end{marginfigure}')
        
        # 3. Fix bad tieredquestions environment
        content = content.replace('\tieredquestions}', '\begin{tieredquestions}{Basic}
\end{tieredquestions}')
        
        # Save the fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f'Special fix applied to {file_path}')
        return True
    return False

def main():
    parser = argparse.ArgumentParser(description='Validate LaTeX files for common errors')
    parser.add_argument('path', help='Path to LaTeX file or directory containing LaTeX files')
    args = parser.parse_args()
    
    if os.path.isdir(args.path):
        success = validate_directory(args.path)
    elif os.path.isfile(args.path) and args.path.endswith('.tex'):
        errors = validate_latex_file(args.path)
        if errors:
            print(f"\\nErrors in {args.path}:")
            for error in errors:
                print(f"  - {error}")
            success = False
        else:
            print(f"✓ {args.path} - No errors detected")
            success = True
    else:
        print(f"Invalid path: {args.path}")
        success = False
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
"""
    
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    # Make the script executable
    os.chmod(script_path, 0o755)
    print(f"Created validation script: {script_path}")

def create_build_script():
    """Create a script to build Gemini textbooks incrementally"""
    script_path = "build_gemini_textbook.sh"
    
    script_content = """#!/bin/bash
# Script to build Gemini textbooks incrementally
# Usage: ./build_gemini_textbook.sh [stage4|stage5]

set -e  # Exit on error

# Default to stage4 if no argument provided
STAGE=${1:-stage4}

if [[ "$STAGE" != "stage4" && "$STAGE" != "stage5" ]]; then
    echo "Invalid stage. Use 'stage4' or 'stage5'"
    exit 1
fi

STAGE_DIR="${STAGE}-gemini"
MAIN_TEX="$STAGE_DIR/main-textbook.tex"
CHAPTER_DIR="$STAGE_DIR/chapters"

# Check if directory exists
if [ ! -d "$STAGE_DIR" ]; then
    echo "Directory $STAGE_DIR does not exist!"
    exit 1
fi

# Backup main tex file if it exists
if [ -f "$MAIN_TEX" ]; then
    cp "$MAIN_TEX" "$MAIN_TEX.bak"
    echo "Backed up $MAIN_TEX to $MAIN_TEX.bak"
fi

# Create a new working copy of main-textbook.tex
echo "Creating working copy of main-textbook.tex..."
cat > "$MAIN_TEX" << EOF
% Stage ${STAGE#stage} Science Textbook (Gemini Version)
% Using Tufte-LaTeX document class for elegant layout with margin notes

\\documentclass[justified,notoc]{tufte-book}

% Essential packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{graphicx}
\\graphicspath{{./images/}}
\\usepackage{amsmath,amssymb}
\\usepackage[version=4]{mhchem} % For chemistry notation
\\usepackage{booktabs} % For nice tables
\\usepackage{microtype} % Better typography
\\usepackage{tikz} % For diagrams
\\usepackage{xcolor} % For colored text
\\usepackage{soul} % For highlighting
\\usepackage{tcolorbox} % For colored boxes
\\usepackage{enumitem} % For better lists
\\usepackage{wrapfig} % For wrapping text around figures
\\usepackage{hyperref} % For links
\\hypersetup{colorlinks=true, linkcolor=blue, urlcolor=blue}

% Add float package for [H] placement option
\\usepackage{float}
\\usepackage{placeins} % For \\FloatBarrier
\\usepackage{morefloats}
\\extrafloats{100}

% Float adjustment to reduce figure/table drift
\\setcounter{topnumber}{9}          % Maximum floats at top of page
\\setcounter{bottomnumber}{9}       % Maximum floats at bottom
\\setcounter{totalnumber}{16}       % Maximum total floats on a page
\\renewcommand{\\topfraction}{0.9}   % Maximum page fraction for top floats
\\renewcommand{\\bottomfraction}{0.9}% Maximum page fraction for bottom floats
\\renewcommand{\\textfraction}{0.05} % Minimum text fraction on page
\\renewcommand{\\floatpagefraction}{0.5} % Minimum float page fill

% Process all floats at end of each chapter
\\makeatletter
\\AtBeginDocument{
  \\let\\old@chapter\\@chapter
  \\def\\@chapter[#1]#2{\\FloatBarrier\\old@chapter[{#1}]{#2}}
}
\\makeatother

% Custom colors
\\definecolor{primary}{RGB}{0, 73, 144} % Deep blue
\\definecolor{secondary}{RGB}{242, 142, 43} % Orange
\\definecolor{highlight}{RGB}{255, 222, 89} % Yellow highlight
\\definecolor{success}{RGB}{46, 139, 87} % Green
\\definecolor{info}{RGB}{70, 130, 180} % Steel blue
\\definecolor{note}{RGB}{220, 220, 220} % Light gray

% Custom commands for pedagogical elements
\\newcommand{\\keyword}[1]{\\textbf{#1}\\marginnote{\\textbf{#1}: }}

\\newcommand{\\challengeicon}{*}
\\newcommand{\\challenge}[1]{\\marginnote{\\textbf{\\challengeicon\\ Challenge:} #1}}

\\newcommand{\\mathlink}[1]{\\marginnote{\\textbf{Math Link:} #1}}

\\newcommand{\\historylink}[1]{\\marginnote{\\textbf{History:} #1}}

\\newenvironment{investigation}[1]{%
    \\begin{tcolorbox}[colback=info!10,colframe=info,title=\\textbf{Investigation: #1}]
}{%
    \\end{tcolorbox}
}

\\newenvironment{keyconcept}[1]{%
    \\begin{tcolorbox}[colback=primary!5,colframe=primary,title=\\textbf{Key Concept: #1}]
}{%
    \\end{tcolorbox}
}

\\newenvironment{tieredquestions}[1]{%
    \\begin{tcolorbox}[colback=note!30,colframe=note!50,title=\\textbf{Practice Questions - #1}]
}{%
    \\end{tcolorbox}
}

\\newenvironment{stopandthink}{%
    \\begin{tcolorbox}[colback={highlight!30},colframe={highlight!50},title=\\textbf{Stop and Think}]
}{%
    \\end{tcolorbox}
}

\\newenvironment{example}{%
    \\par\\smallskip\\noindent\\textit{Example:}
}{%
    \\par\\smallskip
}

\\title{Emergent Minds: Stage ${STAGE#stage} Science (Gemini Version)}
\\author{The Curious Scientist}
\\publisher{Emergent Mind Press}
\\date{\\today}

\\begin{document}

\\maketitle

\\tableofcontents

% Introduction
\\input{${STAGE_DIR}/chapters/introduction}
\\FloatBarrier

EOF

# Find all chapter files and sort them numerically
CHAPTERS=($(find "$CHAPTER_DIR" -name "chapter*.tex" | sort -V))

# Prompt for which chapters to include
echo "Found ${#CHAPTERS[@]} chapter files."
echo "Which chapters would you like to include? (Enter comma-separated numbers, e.g., 1,2,3 or 'all')"
read -r SELECTION

if [[ "$SELECTION" == "all" ]]; then
    # Include all chapters
    for CHAPTER_PATH in "${CHAPTERS[@]}"; do
        CHAPTER_NAME=$(basename "$CHAPTER_PATH" .tex)
        echo "% $CHAPTER_NAME" >> "$MAIN_TEX"
        echo "\\input{${STAGE_DIR}/chapters/$CHAPTER_NAME}" >> "$MAIN_TEX"
        echo "\\FloatBarrier" >> "$MAIN_TEX"
        echo "" >> "$MAIN_TEX"
    done
else
    # Include selected chapters
    IFS=',' read -ra SELECTED_CHAPTERS <<< "$SELECTION"
    for NUM in "${SELECTED_CHAPTERS[@]}"; do
        CHAPTER_NAME="chapter${NUM}"
        if [ -f "$CHAPTER_DIR/$CHAPTER_NAME.tex" ]; then
            echo "% $CHAPTER_NAME" >> "$MAIN_TEX"
            echo "\\input{${STAGE_DIR}/chapters/$CHAPTER_NAME}" >> "$MAIN_TEX"
            echo "\\FloatBarrier" >> "$MAIN_TEX"
            echo "" >> "$MAIN_TEX"
        else
            echo "Warning: $CHAPTER_DIR/$CHAPTER_NAME.tex does not exist!"
        fi
    done
fi

# Close document
echo "\\end{document}" >> "$MAIN_TEX"

echo "Main TeX file updated: $MAIN_TEX"

# Ask whether to fix chapters
echo "Would you like to fix LaTeX issues in chapters? (y/n)"
read -r FIX_CHAPTERS

if [[ "$FIX_CHAPTERS" == "y" ]]; then
    # Run the Python script to fix chapters
    python3 fix_gemini_chapters.py --dir "$STAGE_DIR" --fix
fi

# Ask whether to compile the document
echo "Would you like to compile the document now? (y/n)"
read -r COMPILE_DOC

if [[ "$COMPILE_DOC" == "y" ]]; then
    echo "Compiling LaTeX document..."
    cd "$(dirname "$MAIN_TEX")" || exit
    pdflatex -interaction=nonstopmode "$(basename "$MAIN_TEX")"
    pdflatex -interaction=nonstopmode "$(basename "$MAIN_TEX")"
    echo "Compilation complete!"
    
    # Go back to the original directory
    cd - || exit
    
    echo "PDF created: $STAGE_DIR/main-textbook.pdf"
fi

echo "Done!"
"""
    
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    # Make the script executable
    os.chmod(script_path, 0o755)
    print(f"Created build script: {script_path}")

def modified_fix_chapter10():
    """Special fix for chapter 10 with deep nesting and other issues"""
    file_path = 'stage4-gemini/chapters/chapter10.tex'
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix specific issues in chapter 10
        # 1. Fix deeply nested lists by using enumitem package options
        content = content.replace('\begin{itemize}
                \item', '\begin{itemize}[label=$\bullet$]
        \item')
        
        # 2. Remove problematic marginfigures without proper images
        content = content.replace('\begin{marginfigure}[0pt]
    \includegraphics[width=\marginparwidth]{placeholder-', '%\begin{marginfigure}[0pt]
    %\includegraphics[width=\marginparwidth]{placeholder-')
        content = content.replace('\caption{', '%\caption{')
        content = content.replace('\end{marginfigure}', '%\end{marginfigure}')
        
        # 3. Fix bad tieredquestions environment
        content = content.replace('\tieredquestions}', '\begin{tieredquestions}{Basic}
\end{tieredquestions}')
        
        # Save the fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f'Special fix applied to {file_path}')
        return True
    return False

def main():
    parser = argparse.ArgumentParser(description='Fix Gemini-generated LaTeX chapters and create helper scripts')
    parser.add_argument('--dir', required=False, default="stage4-gemini", help='Directory containing Gemini-generated textbook')
    parser.add_argument('--fix', action='store_true', help='Fix LaTeX issues in chapter files')
    parser.add_argument('--create-templates', action='store_true', help='Create improved templates for Gemini prompts')
    parser.add_argument('--create-scripts', action='store_true', help='Create helper scripts for validation and building')
    
    args = parser.parse_args()
    
    if args.fix:
        # Always apply special fix for chapter 10
        modified_fix_chapter10()
        # Create backup before making changes
        create_backup(args.dir)
        
        # Fix chapter files
        chapters_dir = os.path.join(args.dir, "chapters")
        if os.path.exists(chapters_dir):
            fixed_count = 0
            for filename in os.listdir(chapters_dir):
                if filename.endswith('.tex'):
                    file_path = os.path.join(chapters_dir, filename)
                    if fix_chapter_file(file_path):
                        fixed_count += 1
            print(f"Fixed {fixed_count} chapter files")
        else:
            print(f"Chapters directory not found: {chapters_dir}")
    
    if args.create_templates or not (args.fix or args.create_scripts):
        update_gemini_prompt_template()
    
    if args.create_scripts or not (args.fix or args.create_templates):
        create_validation_script()
        create_build_script()
    
    print("\nDone! Additional instructions for using these tools:")
    print("1. Use gemini_chapter_template.md to enhance your Gemini prompts for better LaTeX output")
    print("2. Run ./validate_latex.py [file_or_directory] to check for common LaTeX errors")
    print("3. Run ./build_gemini_textbook.sh [stage4|stage5] to build textbooks incrementally")

if __name__ == "__main__":
    main()