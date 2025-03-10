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
