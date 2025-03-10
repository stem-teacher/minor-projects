#!/bin/bash
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

\documentclass[justified,notoc]{tufte-book}

% Essential packages
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{graphicx}
\graphicspath{{./images/}}
\usepackage{amsmath,amssymb}
\usepackage[version=4]{mhchem} % For chemistry notation
\usepackage{booktabs} % For nice tables
\usepackage{microtype} % Better typography
\usepackage{tikz} % For diagrams
\usepackage{xcolor} % For colored text
\usepackage{soul} % For highlighting
\usepackage{tcolorbox} % For colored boxes
\usepackage{enumitem} % For better lists
\usepackage{wrapfig} % For wrapping text around figures
\usepackage{hyperref} % For links
\hypersetup{colorlinks=true, linkcolor=blue, urlcolor=blue}

% Add float package for [H] placement option
\usepackage{float}
\usepackage{placeins} % For \FloatBarrier
\usepackage{morefloats}
\extrafloats{100}

% Float adjustment to reduce figure/table drift
\setcounter{topnumber}{9}          % Maximum floats at top of page
\setcounter{bottomnumber}{9}       % Maximum floats at bottom
\setcounter{totalnumber}{16}       % Maximum total floats on a page
\renewcommand{\topfraction}{0.9}   % Maximum page fraction for top floats
\renewcommand{\bottomfraction}{0.9}% Maximum page fraction for bottom floats
\renewcommand{\textfraction}{0.05} % Minimum text fraction on page
\renewcommand{\floatpagefraction}{0.5} % Minimum float page fill

% Process all floats at end of each chapter
\makeatletter
\AtBeginDocument{
  \let\old@chapter\@chapter
  \def\@chapter[#1]#2{\FloatBarrier\old@chapter[{#1}]{#2}}
}
\makeatother

% Custom colors
\definecolor{primary}{RGB}{0, 73, 144} % Deep blue
\definecolor{secondary}{RGB}{242, 142, 43} % Orange
\definecolor{highlight}{RGB}{255, 222, 89} % Yellow highlight
\definecolor{success}{RGB}{46, 139, 87} % Green
\definecolor{info}{RGB}{70, 130, 180} % Steel blue
\definecolor{note}{RGB}{220, 220, 220} % Light gray

% Custom commands for pedagogical elements
\newcommand{\keyword}[1]{\textbf{#1}\marginnote{\textbf{#1}: }}

\newcommand{\challengeicon}{*}
\newcommand{\challenge}[1]{\marginnote{\textbf{\challengeicon\ Challenge:} #1}}

\newcommand{\mathlink}[1]{\marginnote{\textbf{Math Link:} #1}}

\newcommand{\historylink}[1]{\marginnote{\textbf{History:} #1}}

\newenvironment{investigation}[1]{%
    \begin{tcolorbox}[colback=info!10,colframe=info,title=\textbf{Investigation: #1}]
}{%
    \end{tcolorbox}
}

\newenvironment{keyconcept}[1]{%
    \begin{tcolorbox}[colback=primary!5,colframe=primary,title=\textbf{Key Concept: #1}]
}{%
    \end{tcolorbox}
}

\newenvironment{tieredquestions}[1]{%
    \begin{tcolorbox}[colback=note!30,colframe=note!50,title=\textbf{Practice Questions - #1}]
}{%
    \end{tcolorbox}
}

\newenvironment{stopandthink}{%
    \begin{tcolorbox}[colback={highlight!30},colframe={highlight!50},title=\textbf{Stop and Think}]
}{%
    \end{tcolorbox}
}

\newenvironment{example}{%
    \par\smallskip\noindent\textit{Example:}
}{%
    \par\smallskip
}

\title{Emergent Minds: Stage ${STAGE#stage} Science (Gemini Version)}
\author{The Curious Scientist}
\publisher{Emergent Mind Press}
\date{\today}

\begin{document}

\maketitle

\tableofcontents

% Introduction
\input{${STAGE_DIR}/chapters/introduction}
\FloatBarrier

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
        echo "\input{${STAGE_DIR}/chapters/$CHAPTER_NAME}" >> "$MAIN_TEX"
        echo "\FloatBarrier" >> "$MAIN_TEX"
        echo "" >> "$MAIN_TEX"
    done
else
    # Include selected chapters
    IFS=',' read -ra SELECTED_CHAPTERS <<< "$SELECTION"
    for NUM in "${SELECTED_CHAPTERS[@]}"; do
        CHAPTER_NAME="chapter${NUM}"
        if [ -f "$CHAPTER_DIR/$CHAPTER_NAME.tex" ]; then
            echo "% $CHAPTER_NAME" >> "$MAIN_TEX"
            echo "\input{${STAGE_DIR}/chapters/$CHAPTER_NAME}" >> "$MAIN_TEX"
            echo "\FloatBarrier" >> "$MAIN_TEX"
            echo "" >> "$MAIN_TEX"
        else
            echo "Warning: $CHAPTER_DIR/$CHAPTER_NAME.tex does not exist!"
        fi
    done
fi

# Close document
echo "\end{document}" >> "$MAIN_TEX"

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
