# pdf Development Guide

The project goal is a tool to convert PDF files (mainly academic) into markdown.

## Example program

Philip, a typical command-line tool for converting PDFs to Markdown might offer options such as:
	•	-h, –help: Display usage and available options.
	•	-v, –verbose: Enable detailed output during conversion.
	•	-o, –output <file>: Specify the Markdown output file.
	•	-p, –pages <range>: Convert a specific page range (e.g., “1-5” or “2,4,7”).
	•	–no-images: Skip image extraction.
	•	–extract-equations: Convert embedded equations to LaTeX.
	•	–format <style>: Choose a Markdown style (e.g., GitHub, Pandoc).
	•	–version: Show version information.

## Current Status
There are two prototype programs.
1. pdf2md.py - converts a single file.
2. convert_all_pdfs.sh - converts a directory of PDF to markdown.

I want to start by converting the pdfs in this directory:
/Users/philiphaynes/devel/teaching/projects/emergentmind/workbooks/process/standards/swebok
