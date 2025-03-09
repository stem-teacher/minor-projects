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

## AI-Generated Textbook Versions
- Standard version: `/stage-4` and `/stage-5` subdirectories
- OpenAI version: `/stage4-OAI` and `/stage5-OAI` subdirectories
- Gemini version: `/stage4-gemini` and `/stage5-gemini` subdirectories

## Helper Scripts
- `fix_gemini_chapters.py` - Fixes common LaTeX issues in Gemini-generated chapters
- `validate_latex.py` - Checks LaTeX files for syntax errors
- `build_gemini_textbook.sh` - Interactive script to build textbooks incrementally
- `gemini_chapter_template.md` - Improved prompt template for Gemini LaTeX generation

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

## Gemini LaTeX Issue Resolution

When working with Gemini-generated LaTeX, these common issues and fixes should be applied:

1. **Incorrect Environment Syntax**:
   - The `stopandthink` environment should not have a title parameter
   - Fix with: `\begin{stopandthink}{Title}` → `\begin{stopandthink}`

2. **Missing FloatBarriers**:
   - Add `\FloatBarrier` at the end of major sections and after chapters
   - Use incremental build approach - add chapters one by one

3. **Too Many Margin Figures**:
   - Limit to 3-4 margin figures per page
   - Use `[0pt]` offset consistently

4. **Deep Nesting Issues**:
   - Use `enumitem` package options for deeply nested lists
   - Replace: `\begin{itemize}\item` → `\begin{itemize}[label=$\bullet$]\item`

5. **Build Process**:
   1. Edit `main-textbook.tex` to include only introduction
   2. Compile and verify it works
   3. Uncomment chapter1 and compile again
   4. Continue adding chapters one by one
   5. If compilation fails, run the validation script

## Improving Gemini LaTeX Output

When generating LaTeX with Gemini:

1. Use the improved template in `gemini_chapter_template.md`
2. Provide explicit examples of correctly formatted environments
3. Emphasize that `stopandthink` takes no title parameter
4. Request explicit `\FloatBarrier` commands after sections
5. Limit number of margin figures per page

## Next Steps
1. ✅ Apply same modular structure to Stage 5 textbook (COMPLETED)
2. ✅ Apply the same process, but instead using the OpenAI api to enable a comparison. Files should output to a "stage {4 |5}-OAI" instead. (COMPLETED)
3. ✅ Apply the same process, but instead using the Google Gemini API. Files should output to a "stage {4 |5}-gemini" instead. (COMPLETED)
4. ✅ Standardize the build processes across all versions (OpenAI and Gemini) with consistent scripts. (COMPLETED)
5. ✅ Fix LaTeX compilation issues in Gemini-generated chapters (COMPLETED)
6. Compare text book versions produced by the different AI's and determine which is best for primary generation
7. Create the remaining chapter files for Stage 4 (Chapters 3-10)
8. Create the remaining chapter files for Stage 5 (Chapters 3-10)
9. Review content & incorporate feedback into text book
10. Add actual image content to replace empty placeholders
11. Uncomment image references once real images are available