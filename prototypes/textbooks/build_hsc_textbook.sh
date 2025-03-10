#!/bin/bash
# Script to build HSC textbooks incrementally
# Usage: ./build_hsc_textbook.sh [chemistry|physics]

set -e  # Exit on error

# Default to chemistry if no argument provided
SUBJECT=${1:-chemistry}

if [[ "$SUBJECT" != "chemistry" && "$SUBJECT" != "physics" ]]; then
    echo "Invalid subject. Use 'chemistry' or 'physics'"
    exit 1
fi

# Manually handle uppercase first letter (compatible with older bash versions)
if [[ "$SUBJECT" == "chemistry" ]]; then
    SUBJECT_TITLE="Chemistry"
else
    SUBJECT_TITLE="Physics"
fi

STAGE_DIR="stage6-${SUBJECT}"
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

# Check if the fix_openai_chapters.py script exists, if not create it
FIX_SCRIPT="fix_openai_chapters.py"
if [ ! -f "$FIX_SCRIPT" ]; then
    echo "Creating $FIX_SCRIPT..."
    cat > "$FIX_SCRIPT" << 'EOF'
#!/usr/bin/env python3
"""
Script to fix common LaTeX issues in OpenAI-generated HSC textbook chapters.
Usage: python fix_openai_chapters.py --dir stage6-chemistry [--fix]
"""

import argparse
import os
import re
import shutil
from pathlib import Path

def fix_tex_file(file_path, apply_fixes=False):
    """Fix common LaTeX issues in the given file."""
    print(f"Checking {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Keep original for comparison
    original_content = content
    
    # Fix 1: Correct stopandthink environment (remove title parameter)
    content = re.sub(r'\\begin{stopandthink}{([^}]*)}', r'\\begin{stopandthink}', content)
    
    # Fix 2: Add FloatBarrier after sections with multiple figures/margin notes
    content = re.sub(r'(\\section{[^}]*})', r'\1\n\\FloatBarrier', content)
    content = re.sub(r'(\\subsection{[^}]*})', r'\1\n\\FloatBarrier', content)
    
    # Fix 3: Ensure proper nesting of environments
    # This is a complex issue that might require manual intervention
    
    # Fix 4: Remove any \usepackage commands (they should be in the preamble)
    content = re.sub(r'\\usepackage(\[[^\]]*\])?{[^}]*}', '', content)
    
    # Fix 5: Ensure there's only one \chapter command at the beginning
    chapter_matches = list(re.finditer(r'\\chapter{([^}]*)}', content))
    if len(chapter_matches) > 1:
        # Keep only the first chapter command
        content = content[:chapter_matches[1].start()] + content[chapter_matches[1].end():]
    
    # Fix 6: Fix potential issues with mhchem
    content = re.sub(r'\\ce\s*{', r'\\ce{', content)  # Remove spaces between \ce and {
    
    # Fix 7: Fix issues with margin figures drift
    content = re.sub(r'\\begin{marginfigure}', r'\\begin{marginfigure}[0pt]', content)
    content = re.sub(r'\\begin{marginfigure}\[(\d+pt|.?\\baselineskip)\]', r'\\begin{marginfigure}[0pt]', content)
    
    # Check if any changes were made
    changes_made = original_content != content
    
    if apply_fixes and changes_made:
        # Create backup
        backup_path = f"{file_path}.bak"
        shutil.copy2(file_path, backup_path)
        print(f"Created backup at {backup_path}")
        
        # Write fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Applied fixes to {file_path}")
    elif changes_made:
        print(f"Issues found in {file_path} (run with --fix to apply fixes)")
    else:
        print(f"No issues found in {file_path}")
    
    return changes_made

def main():
    parser = argparse.ArgumentParser(description='Fix LaTeX issues in HSC textbook chapters')
    parser.add_argument('--dir', required=True, help='Directory containing chapters')
    parser.add_argument('--fix', action='store_true', help='Apply fixes (otherwise just report issues)')
    args = parser.parse_args()
    
    chapters_dir = os.path.join(args.dir, 'chapters')
    if not os.path.isdir(chapters_dir):
        print(f"Error: {chapters_dir} is not a directory")
        return
    
    # Process all .tex files in the chapters directory
    fixed_files = 0
    total_files = 0
    
    for file_path in Path(chapters_dir).glob('*.tex'):
        total_files += 1
        if fix_tex_file(file_path, args.fix):
            fixed_files += 1
    
    print(f"\nSummary: {fixed_files}/{total_files} files need fixes")

if __name__ == "__main__":
    main()
EOF
    chmod +x "$FIX_SCRIPT"
fi

# Create a new working copy of main-textbook.tex with only introduction
echo "Creating working copy of main-textbook.tex with only introduction..."
cat > "$MAIN_TEX" << EOF
% Stage 6 $SUBJECT_TITLE Textbook (OpenAI Version)
% Using Tufte-LaTeX document class for elegant layout with margin notes

\\documentclass[justified]{tufte-book}

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

\\title{NSW HSC $SUBJECT_TITLE: A Comprehensive Guide\\\\\\large For Gifted and Neurodiverse Learners}
\\author{The Curious Scientist}
\\publisher{Emergent Mind Press}
\\date{\\today}

\\begin{document}

\\maketitle

\\tableofcontents

% Introduction
\\input{chapters/introduction}
\\FloatBarrier

EOF

# Find all chapter files and sort them numerically
CHAPTERS=($(find "$CHAPTER_DIR" -name "chapter*.tex" | sort -V))

# Prompt for which chapters to include
echo "Found ${#CHAPTERS[@]} chapter files."
echo "Which chapters would you like to include? (Enter comma-separated numbers, e.g., 1,2,3 or 'all')"
read -r SELECTION

# Initialize chapter includes
CHAPTER_INCLUDES=""

if [[ "$SELECTION" == "all" ]]; then
    # Include all chapters
    for CHAPTER_PATH in "${CHAPTERS[@]}"; do
        CHAPTER_NAME=$(basename "$CHAPTER_PATH" .tex)
        CHAPTER_INCLUDES+="\\input{chapters/$CHAPTER_NAME}\n\\FloatBarrier\n\n"
    done
else
    # Include selected chapters
    IFS=',' read -ra SELECTED_CHAPTERS <<< "$SELECTION"
    for NUM in "${SELECTED_CHAPTERS[@]}"; do
        CHAPTER_NAME="chapter${NUM}"
        if [ -f "$CHAPTER_DIR/$CHAPTER_NAME.tex" ]; then
            CHAPTER_INCLUDES+="\\input{chapters/$CHAPTER_NAME}\n\\FloatBarrier\n\n"
        else
            echo "Warning: $CHAPTER_DIR/$CHAPTER_NAME.tex does not exist!"
        fi
    done
fi

# Add chapter includes and end document
echo -e "$CHAPTER_INCLUDES\\end{document}" >> "$MAIN_TEX"

echo "Main TeX file updated: $MAIN_TEX"

# Run our special fix script to ensure title and TOC is correct
if [ -f "fix_textbook_formatting.py" ]; then
    echo "Running fix_textbook_formatting.py to ensure consistent title and table of contents..."
    python3 fix_textbook_formatting.py "$SUBJECT"
fi

# Ask whether to fix chapters
echo "Would you like to fix LaTeX issues in chapters? (y/n)"
read -r FIX_CHAPTERS

if [[ "$FIX_CHAPTERS" == "y" ]]; then
    # Run the Python script to fix chapters
    python3 fix_openai_chapters.py --dir "$STAGE_DIR" --fix
fi

# Ask whether to compile the document
echo "Would you like to compile the document now? (y/n)"
read -r COMPILE_DOC

if [[ "$COMPILE_DOC" == "y" ]]; then
    echo "Compiling LaTeX document..."
    cd "$(dirname "$MAIN_TEX")" || exit
    
    # First compilation - generate .aux files
    pdflatex -interaction=nonstopmode "$(basename "$MAIN_TEX")"
    
    # Second compilation - generate TOC and references
    pdflatex -interaction=nonstopmode "$(basename "$MAIN_TEX")"
    
    # Third compilation - finalize document with all references
    pdflatex -interaction=nonstopmode "$(basename "$MAIN_TEX")"
    
    echo "Compilation complete!"
    
    # Go back to the original directory
    cd - || exit
    
    echo "PDF created: $STAGE_DIR/main-textbook.pdf"
fi

echo "Done!"
