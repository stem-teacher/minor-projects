# PDF Filename Annotator Project Execution

This document provides instructions for building and executing the PDF Filename Annotator tool.

## Project Overview
The PDF Filename Annotator is a Rust application that processes PDF files by stamping their filenames in the top-right corner of each page. This tool is primarily designed for educators who need to label exam papers and other documents for easy identification after printing.

## Startup Instructions

### Initial Setup
1. Start Claude Code by typing `claude` in your terminal
2. Copy and paste the following instruction:

```
# PDF Filename Annotator Build Instructions

## BUILD GOAL
Build a working executable that annotates PDF files with their filenames. Focus ONLY on fixing the specific compilation errors to achieve a working build. Do not explore tangential improvements.

## Initial Context
Read these files in exact order:
- /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator/project/CURRENT_STATE.md
- /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator/TASK.md

## Working Directory
cd /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator

## Build Process - FOLLOW EXACTLY
1. Run 'cargo check' to confirm current errors
2. Fix ONLY the ObjectId type issues in processor.rs:
   - Locate line 94 with the type mismatch error
   - Update to use proper ObjectId construction
   - Make minimal changes to fix this specific error
3. Run 'cargo check' to verify the fix
4. Fix ONLY the borrowing issues in processor.rs:
   - Locate lines 185-211 with borrowing conflicts
   - Restructure to avoid multiple mutable borrows
   - Make minimal changes to fix this specific error
5. Run 'cargo check' to verify all fixes
6. Run 'cargo test' to verify functionality
7. Run 'cargo build --release' to build the executable

## SUCCESS CRITERIA
1. All cargo check errors are resolved
2. All tests pass
3. A working executable is built in target/release/
4. The program can successfully annotate PDF files with filenames

## Progress Reporting
Report progress after each major step (1-7) with specific details on changes made.

## Error Recovery
If you encounter unexpected errors:
1. Focus ONLY on the specific error, not conceptual improvements
2. Verify each fix individually with 'cargo check'
3. Return immediately to the main build process after fixing errors

DO NOT get sidetracked with tangential improvements or exploration. Your ONLY task is to fix the specific errors and build a working executable.
```

### Expected Process
Claude Code will:
1. Assess the current code with cargo check
2. Fix the ObjectId type issues in processor.rs
3. Fix the borrowing issues in processor.rs
4. Verify fixes with cargo check and cargo test
5. Build the executable

### Expected Outcome
Upon successful completion:
- The compilation errors in processor.rs will be fixed
- The PDF filename annotation functionality will work correctly
- All tests will pass
- An executable will be built in target/release/

## Using the Built Application

After building, the application can be run with:

```
./target/release/pdf-filename-annotator --config config.json
```

Where config.json contains:
```json
{
  "input_dir": "/path/to/input/pdfs",
  "output_dir": "/path/to/output/pdfs",
  "recursive": true,
  "font": {
    "name": "Calibri",
    "size": 12,
    "fallback": ["Arial", "Helvetica"]
  },
  "position": {
    "corner": "TopRight",
    "x_offset": 50,
    "y_offset": 30
  }
}
```

## Troubleshooting
If Claude Code encounters issues:
- Verify all required dependencies are installed
- Ensure file paths are correct
- Check that font files are accessible
- Review API_CORRECTIONS.md for known API discrepancies