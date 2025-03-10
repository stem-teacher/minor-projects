#!/usr/bin/env python3
"""
Script to fix common formatting issues in HSC textbooks.
"""

import os
import re
import sys

def fix_title_and_toc(file_path, subject):
    """Fix the title formatting and ensure table of contents works."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove notoc option if present
    content = re.sub(r'\\documentclass\[justified,notoc\]', r'\\documentclass[justified]', content)
    
    # Fix the title to ensure consistent formatting
    title_pattern = r'\\title{[^}]*}'
    replacement_title = f'\\title{{NSW HSC {subject}: A Comprehensive Guide\\\\\\\\large For Gifted and Neurodiverse Learners}}'
    content = re.sub(title_pattern, replacement_title, content)
    
    # Write changes back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed title and table of contents in {file_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python fix_textbook_formatting.py [chemistry|physics|both]")
        sys.exit(1)
    
    subject = sys.argv[1].lower()
    
    if subject == 'chemistry' or subject == 'both':
        tex_file = 'stage6-chemistry/main-textbook.tex'
        if os.path.exists(tex_file):
            fix_title_and_toc(tex_file, 'Chemistry')
    
    if subject == 'physics' or subject == 'both':
        tex_file = 'stage6-physics/main-textbook.tex'
        if os.path.exists(tex_file):
            fix_title_and_toc(tex_file, 'Physics')
    
    print("Done!")

if __name__ == "__main__":
    main()
