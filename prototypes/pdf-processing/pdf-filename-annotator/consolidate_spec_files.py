#!/usr/bin/env python3
import os
import glob

def create_consolidated_doc(source_directory, output_file):
    with open(output_file, 'w') as outfile:
        # Write document overview
        outfile.write("# Software Requirements Specification Documents\n\n")
        outfile.write("## Overview\n\n")
        outfile.write("This document consolidates the software requirements specification documents from the agentic-software-process repository.\n\n")
        
        # Get all markdown files
        md_files = glob.glob(os.path.join(source_directory, "*.md"))
        
        # Sort files alphabetically, but put _index.md first if it exists
        md_files.sort()
        index_file = os.path.join(source_directory, "_index.md")
        if index_file in md_files:
            md_files.remove(index_file)
            md_files.insert(0, index_file)
        
        # Process each file
        for file_path in md_files:
            file_name = os.path.basename(file_path)
            outfile.write(f"## {file_name}\n\n")
            
            try:
                with open(file_path, 'r') as infile:
                    content = infile.read()
                    outfile.write(f"{content}\n\n")
            except Exception as e:
                outfile.write(f"Error reading file: {str(e)}\n\n")

if __name__ == "__main__":
    source_dir = "/Users/philiphaynes/devel/teaching/hugo/mentormind/agentic-software-process/content/process/specification"
    target_dir = "/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator"
    output_file = os.path.join(target_dir, "SRC_SPEC.md")
    
    create_consolidated_doc(source_dir, output_file)
    print(f"Consolidated document created: {output_file}")
