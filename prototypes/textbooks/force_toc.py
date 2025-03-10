#!/usr/bin/env python3
"""
Script to create a custom table of contents for the textbooks
"""

import os
import re
import sys

def create_manual_toc(file_path):
    """Create a manual table of contents in a LaTeX file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all chapter references
    chapter_files = re.findall(r'\\input{chapters/([^}]*)}', content)
    
    # Create the manual toc
    manual_toc = r'''\newpage
\chapter*{Table of Contents}

'''
    
    # Add Introduction
    if 'introduction' in chapter_files:
        manual_toc += r'\textbf{Introduction}\dotfill\pageref{introduction}\\[0.5em]' + '\n'
        chapter_files.remove('introduction')
    
    # Add chapters
    for chapter in sorted(chapter_files):
        manual_toc += f'\\textbf{{Chapter {chapter[7:]}}}\\dotfill\\pageref{{{chapter}}}\\\\[0.5em]\n'
    
    # Extract the \begin{document} block
    doc_match = re.search(r'\\begin{document}.*?\\maketitle', content, re.DOTALL)
    if doc_match:
        doc_start = doc_match.group(0)
        
        # Create modified content with labels for each chapter
        modified_content = content.replace(doc_start, doc_start + '\n' + manual_toc)
        
        # Add labels to chapters
        modified_content = re.sub(
            r'\\input{chapters/([^}]*)}',
            r'\\label{\1}\\input{chapters/\1}',
            modified_content
        )
        
        # Remove any existing tableofcontents commands
        modified_content = re.sub(r'\\tableofcontents.*?\\clearpage', '', modified_content, flags=re.DOTALL)
        
        # Write changes back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(modified_content)
        
        print(f"Added manual table of contents to {file_path}")
        return True
    else:
        print(f"Could not find document start in {file_path}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python force_toc.py [chemistry|physics|both]")
        sys.exit(1)
    
    subject = sys.argv[1].lower()
    
    if subject == 'chemistry' or subject == 'both':
        tex_file = 'stage6-chemistry/main-textbook.tex'
        if os.path.exists(tex_file):
            create_manual_toc(tex_file)
    
    if subject == 'physics' or subject == 'both':
        tex_file = 'stage6-physics/main-textbook.tex'
        if os.path.exists(tex_file):
            create_manual_toc(tex_file)
    
    print("Done!")

if __name__ == "__main__":
    main()
