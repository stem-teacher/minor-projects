#!/usr/bin/env python3
"""
Script to restore the original tufte-book class and clean up any TOC modifications.
"""

import os
import re
import sys

def restore_tufte_book(file_path):
    """Restore the original tufte-book class in a LaTeX file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Restore tufte-book if it was changed
    content = re.sub(
        r'\\documentclass\[(.*?)\]{book}',
        r'\\documentclass[justified]{tufte-book}',
        content
    )
    
    # Clean up TOC modifications
    content = re.sub(
        r'\\newcommand\\printcontents{\\tableofcontents}.*?\\makeatother',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Clean up the manual table of contents
    content = re.sub(
        r'\\chapter\*{Table of Contents}.*?\\clearpage',
        '\\tableofcontents',
        content,
        flags=re.DOTALL
    )
    
    # Clean up any labels we added
    content = re.sub(r'\\label{(intro|chap\d)}', '', content)
    
    # Restore original margin note commands if they were changed
    if '\\marginpar' in content and '\\marginnote' not in content:
        content = content.replace('\\marginpar', '\\marginnote')
    
    # Write changes back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Restored tufte-book class in {file_path}")
    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python restore_tufte.py [chemistry|physics|both]")
        sys.exit(1)
    
    subject = sys.argv[1].lower()
    
    if subject == 'chemistry' or subject == 'both':
        tex_file = 'stage6-chemistry/main-textbook.tex'
        if os.path.exists(tex_file):
            restore_tufte_book(tex_file)
    
    if subject == 'physics' or subject == 'both':
        tex_file = 'stage6-physics/main-textbook.tex'
        if os.path.exists(tex_file):
            restore_tufte_book(tex_file)
    
    print("Done!")

if __name__ == "__main__":
    main()
