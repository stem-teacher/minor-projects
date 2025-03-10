# HSC Chemistry & Physics Textbooks Creation Guide

This guide will walk you through the process of creating the NSW HSC Chemistry and Physics textbooks using the OpenAI API. The workflow is designed to be systematic and modular, allowing you to generate content incrementally and validate it at each step.

## Prerequisites

- Python 3.6+
- OpenAI API key configured in `ai_key_location.txt`
- LaTeX installed on your system (including pdflatex)
- Required Python packages: `openai`

## Project Overview

The HSC textbook project builds on the successful implementation of Stage 4 and 5 science textbooks, extending the same methodologies to create comprehensive resources for Stage 6 (Years 11-12) Chemistry and Physics.

These textbooks are specifically designed for gifted and neurodiverse students following the NSW curriculum, with features like:
- Clear, structured content with appropriate scaffolding
- Margin notes for extensions and contextual information
- Tiered questions for differentiated learning
- Integration of real-world examples and applications
- Mathematical rigor appropriate for HSC level

## Directory Structure

- `stage6-chemistry/` - Chemistry textbook files
  - `chapters/` - LaTeX chapter files
  - `images/` - Image files (will be added later)
- `stage6-physics/` - Physics textbook files
  - `chapters/` - LaTeX chapter files
  - `images/` - Image files (will be added later)

## Step 1: Generate Textbook Content

The `generate_hsc_textbooks.py` script will create the initial LaTeX files for each chapter using the OpenAI API. You can generate content for Chemistry, Physics, or both.

```bash
# Make the script executable (if needed)
chmod +x generate_hsc_textbooks.py

# Generate all chapters for both textbooks
./generate_hsc_textbooks.py --generate --subject both

# Generate only Chemistry textbook
./generate_hsc_textbooks.py --generate --subject chemistry

# Generate only Physics textbook
./generate_hsc_textbooks.py --generate --subject physics

# Generate specific number of chapters (e.g., just 2 chapters)
./generate_hsc_textbooks.py --generate --subject both --chapters 2
```

This process will:
1. Create the necessary directory structure if it doesn't exist
2. Generate an introduction for each textbook
3. Generate each chapter according to the NSW HSC syllabus
4. Save all files in the appropriate chapter directories

**Note:** Content generation may take several hours depending on the number of chapters and the OpenAI API's response time. The script includes pauses between requests to avoid rate limits.

## Step 2: Review and Fix LaTeX Issues

The AI-generated LaTeX might have some issues that need fixing. You can use the `fix_openai_chapters.py` script to identify and correct common problems:

```bash
# Check for issues without fixing
python fix_openai_chapters.py --dir stage6-chemistry

# Apply fixes automatically
python fix_openai_chapters.py --dir stage6-chemistry --fix
```

Common issues that will be fixed:
- Incorrect usage of the `stopandthink` environment (removing title parameters)
- Missing `\FloatBarrier` commands after sections
- Duplicate chapter commands
- Improper spacing in chemical formulas
- Issues with margin figure positioning

## Step 3: Incremental Compilation

Instead of compiling the entire textbook at once (which may lead to errors), use the `build_hsc_textbook.sh` script to compile incrementally:

```bash
# Make the script executable (if needed)
chmod +x build_hsc_textbook.sh

# Build Chemistry textbook
./build_hsc_textbook.sh chemistry

# Build Physics textbook
./build_hsc_textbook.sh physics
```

The interactive script will:
1. Create a working copy of the main LaTeX file with only the introduction
2. Prompt you for which chapters to include (e.g., "1,2,3" or "all")
3. Ask if you want to fix LaTeX issues
4. Ask if you want to compile the document

This incremental approach helps isolate LaTeX errors to specific chapters, making them easier to fix.

## Step 4: Validate LaTeX Files

You can use the `validate_latex.py` script to check for common LaTeX errors:

```bash
python validate_latex.py stage6-chemistry/chapters/chapter1.tex
python validate_latex.py stage6-chemistry/chapters/
```

This will check for issues like:
- Unmatched braces
- Malformed environment begins/ends
- Incorrect use of the `stopandthink` environment
- References to undefined colors

## Step 5: Manual Review and Edits

After generating and compiling the textbooks, you should:

1. Review the PDF outputs for content accuracy and formatting
2. Check that all mathematical formulas are rendered correctly
3. Ensure that chemical equations (using `\ce{}`) are formatted properly
4. Verify that margin notes and figures appear in appropriate positions
5. Confirm that the differentiated learning elements (basic, intermediate, advanced) are clearly distinguished

Make manual edits to the LaTeX files as needed to address any issues.

## Step 6: Adding Images

The textbooks are generated with placeholder comments for images. To add actual images:

1. Place image files in the `stage6-chemistry/images/` or `stage6-physics/images/` directories
2. Edit the chapter files to uncomment and properly reference image files:
   ```latex
   % Uncomment and update:
   % \begin{figure}
   %   \includegraphics[width=\linewidth]{atomic_structure.png}
   %   \caption{Structure of an atom showing electron shells.}
   %   \label{fig:atom_structure}
   % \end{figure}
   ```

## Step 7: Final Compilation

Once you've added all content and images, and fixed any LaTeX issues, you can do a final compilation:

```bash
# Compile Chemistry textbook
cd stage6-chemistry
pdflatex stage6-chemistry-textbook.tex
pdflatex stage6-chemistry-textbook.tex

# Compile Physics textbook
cd stage6-physics
pdflatex stage6-physics-textbook.tex
pdflatex stage6-physics-textbook.tex
```

Running `pdflatex` twice ensures that all references, table of contents, and indices are properly updated.

## Content Structure

### Chemistry Textbook

The Chemistry textbook consists of 8 modules following the NSW HSC syllabus:

**Year 11 (Preliminary):**
1. Properties & Structure of Matter
2. Introduction to Quantitative Chemistry
3. Reactive Chemistry
4. Drivers of Reactions

**Year 12 (HSC):**
5. Equilibrium & Acid Reactions
6. Acid/Base Reactions
7. Organic Chemistry
8. Applying Chemical Ideas

### Physics Textbook

The Physics textbook consists of 8 modules following the NSW HSC syllabus:

**Year 11 (Preliminary):**
1. Kinematics
2. Dynamics
3. Waves & Thermodynamics
4. Electricity & Magnetism

**Year 12 (HSC):**
5. Advanced Mechanics
6. Electromagnetism
7. The Nature of Light
8. From the Universe to the Atom

## Customization and Improvements

To further enhance the textbooks:

1. **Custom diagrams:** Create and add TikZ diagrams for complex concepts
2. **Real-world applications:** Add margin notes with current research or industry connections
3. **Additional investigations:** Develop practical investigations aligned with lab resources
4. **Extension material:** Include supplementary content for gifted students
5. **Examination preparation:** Add HSC-style practice questions and worked solutions

## Troubleshooting Common Issues

- **"LaTeX Error: Float(s) lost":** Add more `\FloatBarrier` commands, reduce the number of floats per section, or adjust float parameters in the preamble
- **Chemical formula issues:** Ensure proper syntax with the `mhchem` package, e.g., `\ce{H2SO4}` instead of `\ce{H_2SO_4}`
- **Margin notes overflow:** Reduce the length of margin notes or distribute them more evenly
- **Compilation fails:** Try compiling individual chapters to isolate the problem, check for missing closing braces or environments

## Next Steps

After creating these initial textbooks, consider:

1. User testing with teachers and students
2. Iterative refinement based on feedback
3. Development of accompanying teacher resources
4. Creation of digital interactive versions
5. Expansion to other HSC science subjects (Biology, Earth & Environmental Science)

---

**Note:** This guide assumes familiarity with LaTeX and the general structure of the project. Refer to `CLAUDE.md` and `plan-hsc.md` for more detailed information about the project's background and design principles.
