#!/usr/bin/env python3
"""
Script to fix table of contents issues in the textbook.
"""

import os
import re
import sys

def fix_table_of_contents(file_path):
    """Fix the table of contents in a LaTeX file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix table of contents
    toc_pattern = r'\\tableofcontents'
    replacement_toc = r'''\\begingroup
\\setlength{\\parskip}{0pt}\\setlength{\\parindent}{0pt}
\\tableofcontents
\\endgroup
\\clearpage'''
    
    if re.search(toc_pattern, content):
        content = re.sub(toc_pattern, replacement_toc, content)
        
        # Write changes back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Fixed table of contents in {file_path}")
        return True
    else:
        print(f"Table of contents command not found in {file_path}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python fix_toc.py [chemistry|physics|both]")
        sys.exit(1)
    
    subject = sys.argv[1].lower()
    
    if subject == 'chemistry' or subject == 'both':
        tex_file = 'stage6-chemistry/main-textbook.tex'
        if os.path.exists(tex_file):
            fix_table_of_contents(tex_file)
    
    if subject == 'physics' or subject == 'both':
        tex_file = 'stage6-physics/main-textbook.tex'
        if os.path.exists(tex_file):
            fix_table_of_contents(tex_file)
    
    print("Done!")

if __name__ == "__main__":
    main()
