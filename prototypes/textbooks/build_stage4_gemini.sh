#!/bin/bash
# Build script for Stage 4 Gemini Textbook

set -e  # Exit on error

STAGE_DIR="stage4-gemini"
MAIN_TEX="$STAGE_DIR/main-textbook.tex"

# Check if directory exists
if [ ! -d "$STAGE_DIR" ]; then
    echo "Directory $STAGE_DIR does not exist!"
    exit 1
fi

# Backup main tex file if it exists
if [ -f "$MAIN_TEX" ]; then
    cp "$MAIN_TEX" "$MAIN_TEX.bak.$(date +%Y%m%d%H%M%S)"
    echo "Backed up $MAIN_TEX"
fi

# Function to compile the document
compile_document() {
    echo "Compiling LaTeX document..."
    cd "$STAGE_DIR" || exit
    pdflatex -interaction=nonstopmode main-textbook.tex
    pdflatex -interaction=nonstopmode main-textbook.tex
    echo "Compilation complete!"
    
    # Go back to the original directory
    cd - || exit
    
    echo "PDF created: $STAGE_DIR/main-textbook.pdf"
}

# Main menu function
main_menu() {
    clear
    echo "=== Stage 4 Gemini Textbook Builder ==="
    echo "1) Build textbook with just Introduction and Chapter 1-2 (stable)"
    echo "2) Build textbook with Introduction and Chapters 1-5"
    echo "3) Build complete textbook (all chapters - may have formatting issues)"
    echo "4) Fix LaTeX issues in chapters"
    echo "5) Exit"
    echo
    read -rp "Select an option: " choice
    
    case $choice in
        1)
            setup_chapters 2
            compile_document
            ;;
        2)
            setup_chapters 5
            compile_document
            ;;
        3)
            setup_chapters 10
            compile_document
            ;;
        4)
            fix_latex_issues
            ;;
        5)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option. Please try again."
            sleep 2
            main_menu
            ;;
    esac
    
    echo
    read -rp "Press Enter to return to the main menu..."
    main_menu
}

# Setup the main-textbook.tex file to include specified number of chapters
setup_chapters() {
    local num_chapters=$1
    echo "Setting up document with $num_chapters chapters..."
    
    # Modify the main-textbook.tex file to include the specified number of chapters
    awk -v num="$num_chapters" '
        /% Introduction/ { print; next }
        /% chapter[0-9]/ {
            chapter_num = substr($0, 11, 1)
            if (chapter_num ~ /^[0-9]$/ && chapter_num <= num) {
                gsub(/^%[ ]*/, "")
                print
                getline
                gsub(/^%[ ]*/, "")
                print
                getline
                gsub(/^%[ ]*/, "")
                print
            } else {
                print "% " $0
                getline
                print "% " $0
                getline
                print "% " $0
            }
            next
        }
        { print }
    ' "$MAIN_TEX" > "$MAIN_TEX.tmp" && mv "$MAIN_TEX.tmp" "$MAIN_TEX"
    
    echo "Document setup complete with $num_chapters chapters"
}

# Run the fix_gemini_chapters.py script
fix_latex_issues() {
    echo "Fixing LaTeX issues in chapters..."
    if [ -f "fix_gemini_chapters.py" ]; then
        python3 fix_gemini_chapters.py --dir "$STAGE_DIR" --fix
    else
        echo "Error: fix_gemini_chapters.py not found!"
    fi
}

# Start the program
main_menu