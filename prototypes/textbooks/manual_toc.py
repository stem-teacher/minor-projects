#!/usr/bin/env python3
"""
Script to create a completely manual table of contents
"""

import os
import re
import sys

def add_manual_toc(file_path):
    """Add a completely manual table of contents to the LaTeX file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create a completely manual table of contents
    manual_toc = r"""
\chapter*{Table of Contents}
\addcontentsline{toc}{chapter}{Table of Contents}

\begin{center}
\begin{tabular}{p{4in}r}
\textbf{Introduction} & \pageref{intro} \\
\textbf{Chapter 1} & \pageref{chap1} \\
\textbf{Chapter 2} & \pageref{chap2} \\
\textbf{Chapter 3} & \pageref{chap3} \\
\textbf{Chapter 4} & \pageref{chap4} \\
\textbf{Chapter 5} & \pageref{chap5} \\
\textbf{Chapter 6} & \pageref{chap6} \\
\textbf{Chapter 7} & \pageref{chap7} \\
\textbf{Chapter 8} & \pageref{chap8} \\
\end{tabular}
\end{center}
\clearpage
"""
    
    # Find the \maketitle command
    maketitle_match = re.search(r'\\maketitle\s+', content)
    if maketitle_match:
        # Insert the manual TOC after \maketitle, replacing any existing TOC
        start = maketitle_match.end()
        toc_start = content.find(r'\tableofcontents', start)
        toc_end = content.find(r'\clearpage', toc_start) + len(r'\clearpage')
        
        if toc_start != -1 and toc_end != -1:
            content = content[:toc_start] + manual_toc + content[toc_end:]
        else:
            content = content[:start] + '\n' + manual_toc + content[start:]
        
        # Add labels to chapters
        content = content.replace(r'\input{chapters/introduction}', r'\label{intro}\input{chapters/introduction}')
        content = content.replace(r'\input{chapters/chapter1}', r'\label{chap1}\input{chapters/chapter1}')
        content = content.replace(r'\input{chapters/chapter2}', r'\label{chap2}\input{chapters/chapter2}')
        content = content.replace(r'\input{chapters/chapter3}', r'\label{chap3}\input{chapters/chapter3}')
        content = content.replace(r'\input{chapters/chapter4}', r'\label{chap4}\input{chapters/chapter4}')
        content = content.replace(r'\input{chapters/chapter5}', r'\label{chap5}\input{chapters/chapter5}')
        content = content.replace(r'\input{chapters/chapter6}', r'\label{chap6}\input{chapters/chapter6}')
        content = content.replace(r'\input{chapters/chapter7}', r'\label{chap7}\input{chapters/chapter7}')
        content = content.replace(r'\input{chapters/chapter8}', r'\label{chap8}\input{chapters/chapter8}')
        
        # Write the modified content back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Added manual table of contents to {file_path}")
        return True
    else:
        print(f"Could not find \\maketitle in {file_path}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python manual_toc.py [chemistry|physics|both]")
        sys.exit(1)
    
    subject = sys.argv[1].lower()
    
    if subject == 'chemistry' or subject == 'both':
        tex_file = 'stage6-chemistry/main-textbook.tex'
        if os.path.exists(tex_file):
            add_manual_toc(tex_file)
    
    if subject == 'physics' or subject == 'both':
        tex_file = 'stage6-physics/main-textbook.tex'
        if os.path.exists(tex_file):
            add_manual_toc(tex_file)
    
    print("Done!")

if __name__ == "__main__":
    main()
