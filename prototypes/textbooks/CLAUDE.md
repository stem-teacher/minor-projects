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

## Next Steps
1. ✅ Apply same modular structure to Stage 5 textbook (COMPLETED)
2. Apply the same process, but instead using the OpenAI api to enable a comparison. Files should output to a "stage {4 |5}-OAI" instead.
3. Apply the same process, but instead using the Google Gemini API. Files should output to a "stage {4 |5}-gemini" instead.
4. Compare text book versions produced by the different AI's and depending on which is best, this will become responsive for primary generation of content, with the other AI's reviewers
5. Create the remaining chapter files for Stage 4 (Chapters 3-10)
6. Create the remaining chapter files for Stage 5 (Chapters 3-10)
7. Review content & incorporate feed back into text book.
8. Add actual image content to replace empty placeholders
9. Uncomment image references once real images are available
