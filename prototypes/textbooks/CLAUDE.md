# Stage 4 & 5 NSW Science Curriculum Textbook System

The goal of this project is to produce two high-quality science textbooks for the NSW Science Curriculum Stages 4 and 5 using best practice methodologies.

## Project Files
1. Input research: "Best Practices in Science Textbook Design for Gift - Report.pdf"
2. Prompt to plan out research: textbook-prompts.md
3. Textbook development plan: plan.md
4. Produced pdf file products. This directory and may be ignored.
5. Task-history.md contains the history of different runs.

Files in the tests directory are prototype tests and should be ignored.
Previously generated textbooks are located in the output directory.

## Stage 4 Textbook
- Location: `/stage-4` subdirectory
- Current structure: Modular design with separate chapter files
- Main files:
  - `main-textbook.tex` - Main LaTeX file that imports all chapters
  - `/chapters/` directory containing:
    - `introduction.tex` - Book introduction
    - `chapter1.tex` - Introduction to Scientific Inquiry
    - `chapter2.tex` - Properties of Matter (Particle Theory)
    - (Chapters 3-10 planned but not yet implemented)
  - `/images/` directory for figures (currently contains placeholder files)

## Current State (Stage 4)
- Successfully restructured from single file to modular chapter structure
- First two chapters fully implemented with proper LaTeX formatting
- Main file contains commented-out references to future chapters (3-10)
- Document compiles correctly to PDF with proper formatting
- Image references temporarily commented out due to empty image files

## Stage 5 Textbook
- Location: `/stage-5` subdirectory
- Successfully restructured into modular format (March 2025)
- Main files:
  - `main-textbook.tex` - Main LaTeX file that imports all chapters
  - `/chapters/` directory containing:
    - `introduction.tex` - Book introduction
    - `chapter1.tex` - Scientific Investigations and Research Skills
    - `chapter2.tex` - Atoms, Elements and Compounds
    - (Chapters 3-10 planned but not yet implemented)
  - `/images/` directory for figures (currently contains placeholder files from Stage 4)

## Current State (Stage 5)
- Successfully restructured from single file to modular chapter structure
- First two chapters fully implemented with proper LaTeX formatting
- Main file contains commented-out references to future chapters (3-10)
- Document compiles correctly to PDF with proper formatting
- Image references temporarily commented out due to empty image files

## LaTeX Float Management for Tufte-Style Textbooks

When using the Tufte-LaTeX class for textbooks, follow these guidelines to prevent "Float(s) lost" errors and ensure proper placement of figures and margin notes:

1. **Enhanced Float Settings in Preamble**:
   ```latex
   % Float adjustment to reduce figure/table drift
   \setcounter{topnumber}{9}          % Maximum floats at top of page
   \setcounter{bottomnumber}{9}       % Maximum floats at bottom
   \setcounter{totalnumber}{16}       % Maximum total floats on a page
   \renewcommand{\topfraction}{0.9}   % Maximum page fraction for top floats
   \renewcommand{\bottomfraction}{0.9}% Maximum page fraction for bottom floats
   \renewcommand{\textfraction}{0.05} % Minimum text fraction on page
   \renewcommand{\floatpagefraction}{0.5} % Minimum float page fill

   % Increase float storage capacity
   \usepackage{morefloats}
   \extrafloats{100}

   % Add float package for [H] placement option
   \usepackage{float}
   \usepackage{placeins} % For \FloatBarrier
   ```

2. **Strategic Placement of Float Barriers**:
   - Add `\FloatBarrier` at the end of each section with floats
   - Process all floats at end of each chapter:
     ```latex
     \makeatletter
     \AtBeginDocument{
       \let\old@chapter\@chapter
       \def\@chapter[#1]#2{\FloatBarrier\old@chapter[{#1}]{#2}}
     }
     \makeatother
     ```
   - Add explicit barriers in the document:
     ```latex
     \input{chapters/chapter1}
     \FloatBarrier
     ```

3. **Margin Figure Best Practices**:
   - Use `[0pt]` offset to prevent vertical drift:
     ```latex
     \begin{marginfigure}[0pt]
       \includegraphics[width=\linewidth]{image.png}
       \caption{Caption text.}
     \end{marginfigure}
     ```
   - Limit number of margin figures per page (3-4 max)
   - Add `\FloatBarrier` after sections with multiple margin figures

4. **Troubleshooting Approaches**:
   - For critical figures, use `[H]` placement option: `\begin{figure}[H]`
   - Create tcolorbox environments instead of floats for some content
   - Consider compiling chapters individually for complex documents
   - Check for recursive calls in margin note commands

5. **Working Examples**:
   - See `chapter3-tufte.tex` for a tested implementation
   - Use `simple-full-textbook.tex` as a fallback approach

## Next Steps
1. ✅ Apply same modular structure to Stage 5 textbook (COMPLETED)
2. ✅ Apply the same process, but instead using the OpenAI api to enable a comparison. Files should output to a "stage {4 |5}-OAI" instead. (COMPLETED)
3. ✅ Apply the same process, but instead using the Google Gemini API. Files should output to a "stage {4 |5}-gemini" instead. (COMPLETED)
4. Compare text book versions produced by the different AI's and depending on which is best, this will become responsive for primary generation of content, with the other AI's reviewers
5. Create the remaining chapter files for Stage 4 (Chapters 3-10)
6. Create the remaining chapter files for Stage 5 (Chapters 3-10)
7. Review content & incorporate feed back into text book.
8. Add actual image content to replace empty placeholders
9. Uncomment image references once real images are available
