#!/usr/bin/env python3
"""
Script to switch from tufte-book to standard book class
"""

import os
import re
import sys

def switch_document_class(file_path):
    """Switch from tufte-book to standard book class."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Change document class
    content = re.sub(
        r'\\documentclass\[justified\]{tufte-book}',
        r'\\documentclass[12pt,a4paper]{book}',
        content
    )
    
    # Remove any tufte-specific environments or commands
    content = re.sub(r'\\begin{marginfigure}.*?\\end{marginfigure}', '', content, flags=re.DOTALL)
    
    # Adapt margin notes
    content = re.sub(r'\\marginnote{([^}]*)}', r'\\marginpar{\\footnotesize \\textit{\1}}', content)
    
    # Write changes back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Switched document class in {file_path}")
    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python switch_to_book_class.py [chemistry|physics|both]")
        sys.exit(1)
    
    subject = sys.argv[1].lower()
    
    if subject == 'chemistry' or subject == 'both':
        tex_file = 'stage6-chemistry/main-textbook.tex'
        if os.path.exists(tex_file):
            switch_document_class(tex_file)
    
    if subject == 'physics' or subject == 'both':
        tex_file = 'stage6-physics/main-textbook.tex'
        if os.path.exists(tex_file):
            switch_document_class(tex_file)
    
    print("Done!")

if __name__ == "__main__":
    main()
