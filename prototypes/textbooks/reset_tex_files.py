#!/usr/bin/env python3
"""
Script to create a clean version of the main TeX files
"""

import os
import sys

def create_clean_file(subject, output_dir):
    """Create a clean LaTeX file with a manual TOC."""
    title = "Chemistry" if subject == "chemistry" else "Physics"
    
    # Create a template with a manual table of contents
    content = f"""% Stage 6 {title} Textbook (Clean Version)
% Using standard book class to avoid tufte-book TOC issues

\\documentclass[12pt,a4paper]{{book}}

% Essential packages
\\usepackage[utf8]{{inputenc}}
\\usepackage[T1]{{fontenc}}
\\usepackage{{graphicx}}
\\graphicspath{{{{./images/}}}}
\\usepackage{{amsmath,amssymb}}
\\usepackage[version=4]{{mhchem}} % For chemistry notation
\\usepackage{{booktabs}} % For nice tables
\\usepackage{{microtype}} % Better typography
\\usepackage{{tikz}} % For diagrams
\\usepackage{{xcolor}} % For colored text
\\usepackage{{soul}} % For highlighting
\\usepackage{{tcolorbox}} % For colored boxes
\\usepackage{{enumitem}} % For better lists
\\usepackage{{wrapfig}} % For wrapping text around figures
\\usepackage{{hyperref}} % For links
\\hypersetup{{colorlinks=true, linkcolor=blue, urlcolor=blue}}

% Add float package for [H] placement option
\\usepackage{{float}}
\\usepackage{{placeins}} % For \\FloatBarrier
\\usepackage{{morefloats}}
\\extrafloats{{100}}

% Float adjustment to reduce figure/table drift
\\setcounter{{topnumber}}{{9}}          % Maximum floats at top of page
\\setcounter{{bottomnumber}}{{9}}       % Maximum floats at bottom
\\setcounter{{totalnumber}}{{16}}       % Maximum total floats on a page
\\renewcommand{{\\topfraction}}{{0.9}}   % Maximum page fraction for top floats
\\renewcommand{{\\bottomfraction}}{{0.9}}% Maximum page fraction for bottom floats
\\renewcommand{{\\textfraction}}{{0.05}} % Minimum text fraction on page
\\renewcommand{{\\floatpagefraction}}{{0.5}} % Minimum float page fill

% Custom colors
\\definecolor{{primary}}{{RGB}}{{0, 73, 144}} % Deep blue
\\definecolor{{secondary}}{{RGB}}{{242, 142, 43}} % Orange
\\definecolor{{highlight}}{{RGB}}{{255, 222, 89}} % Yellow highlight
\\definecolor{{success}}{{RGB}}{{46, 139, 87}} % Green
\\definecolor{{info}}{{RGB}}{{70, 130, 180}} % Steel blue
\\definecolor{{note}}{{RGB}}{{220, 220, 220}} % Light gray

% Custom environments for pedagogical elements
\\newenvironment{{investigation}}[1]{{%
    \\begin{{tcolorbox}}[colback=info!10,colframe=info,title=\\textbf{{Investigation: #1}}]
}}{{%
    \\end{{tcolorbox}}
}}

\\newenvironment{{keyconcept}}[1]{{%
    \\begin{{tcolorbox}}[colback=primary!5,colframe=primary,title=\\textbf{{Key Concept: #1}}]
}}{{%
    \\end{{tcolorbox}}
}}

\\newenvironment{{tieredquestions}}[1]{{%
    \\begin{{tcolorbox}}[colback=note!30,colframe=note!50,title=\\textbf{{Practice Questions - #1}}]
}}{{%
    \\end{{tcolorbox}}
}}

\\newenvironment{{stopandthink}}{{%
    \\begin{{tcolorbox}}[colback={{highlight!30}},colframe={{highlight!50}},title=\\textbf{{Stop and Think}}]
}}{{%
    \\end{{tcolorbox}}
}}

\\newenvironment{{example}}{{%
    \\par\\smallskip\\noindent\\textit{{Example:}}
}}{{%
    \\par\\smallskip
}}

% Add marginpar replacement for tufte margin notes
\\newcommand{{\\keyword}}[1]{{\\textbf{{#1}}\\marginpar{{\\footnotesize\\textbf{{#1}}: }}}}
\\newcommand{{\\challenge}}[1]{{\\marginpar{{\\footnotesize\\textbf{{*\\ Challenge:}} #1}}}}
\\newcommand{{\\mathlink}}[1]{{\\marginpar{{\\footnotesize\\textbf{{Math Link:}} #1}}}}
\\newcommand{{\\historylink}}[1]{{\\marginpar{{\\footnotesize\\textbf{{History:}} #1}}}}

\\title{{NSW HSC {title}: A Comprehensive Guide\\\\
For Gifted and Neurodiverse Learners}}
\\author{{The Curious Scientist}}
\\date{{\\today}}

\\begin{{document}}

\\maketitle

\\chapter*{{Table of Contents}}
\\addcontentsline{{toc}}{{chapter}}{{Table of Contents}}

\\begin{{center}}
\\begin{{tabular}}{{p{{4in}}r}}
\\textbf{{Introduction}} & \\pageref{{intro}} \\\\
\\textbf{{Chapter 1}} & \\pageref{{chap1}} \\\\
\\textbf{{Chapter 2}} & \\pageref{{chap2}} \\\\
\\textbf{{Chapter 3}} & \\pageref{{chap3}} \\\\
\\textbf{{Chapter 4}} & \\pageref{{chap4}} \\\\
\\textbf{{Chapter 5}} & \\pageref{{chap5}} \\\\
\\textbf{{Chapter 6}} & \\pageref{{chap6}} \\\\
\\textbf{{Chapter 7}} & \\pageref{{chap7}} \\\\
\\textbf{{Chapter 8}} & \\pageref{{chap8}} \\\\
\\end{{tabular}}
\\end{{center}}

\\clearpage

% Introduction
\\label{{intro}}
\\input{{chapters/introduction}}
\\FloatBarrier

\\label{{chap1}}
\\input{{chapters/chapter1}}
\\FloatBarrier

\\label{{chap2}}
\\input{{chapters/chapter2}}
\\FloatBarrier

\\label{{chap3}}
\\input{{chapters/chapter3}}
\\FloatBarrier

\\label{{chap4}}
\\input{{chapters/chapter4}}
\\FloatBarrier

\\label{{chap5}}
\\input{{chapters/chapter5}}
\\FloatBarrier

\\label{{chap6}}
\\input{{chapters/chapter6}}
\\FloatBarrier

\\label{{chap7}}
\\input{{chapters/chapter7}}
\\FloatBarrier

\\label{{chap8}}
\\input{{chapters/chapter8}}
\\FloatBarrier

\\end{{document}}
"""
    
    # Write to file
    main_tex = f"{output_dir}/main-textbook.tex"
    with open(main_tex, 'w') as f:
        f.write(content)
    
    print(f"Created clean file: {main_tex}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python reset_tex_files.py [chemistry|physics|both]")
        sys.exit(1)
    
    subject = sys.argv[1].lower()
    
    if subject == 'chemistry' or subject == 'both':
        create_clean_file('chemistry', 'stage6-chemistry')
    
    if subject == 'physics' or subject == 'both':
        create_clean_file('physics', 'stage6-physics')
    
    print("Done!")

if __name__ == "__main__":
    main()
