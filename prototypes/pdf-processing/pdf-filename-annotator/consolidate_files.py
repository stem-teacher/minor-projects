#!/usr/bin/env python3
import os
import glob

def create_consolidated_doc(directories, output_file):
    with open(output_file, 'w') as outfile:
        # Write project overview
        outfile.write("# PDF Filename Annotator Project Context\n\n")
        outfile.write("## Overview\n\n")
        outfile.write("This document consolidates files from the process and project directories of the PDF Filename Annotator project.\n\n")
        outfile.write("## Directory Structure\n\n")
        
        # Process each directory
        for directory in directories:
            dir_name = os.path.basename(directory)
            outfile.write(f"## Directory: {dir_name}\n\n")
            
            # Get all markdown and script files
            md_files = glob.glob(os.path.join(directory, "*.md"))
            script_files = glob.glob(os.path.join(directory, "*.sh")) + \
                          glob.glob(os.path.join(directory, "*.py")) + \
                          glob.glob(os.path.join(directory, "*.js")) + \
                          glob.glob(os.path.join(directory, "*.rs"))
            
            # Sort files alphabetically
            all_files = sorted(md_files + script_files)
            
            for file_path in all_files:
                file_name = os.path.basename(file_path)
                file_ext = os.path.splitext(file_path)[1][1:]  # Get extension without dot
                outfile.write(f"### {file_name}\n\n")
                
                try:
                    with open(file_path, 'r') as infile:
                        content = infile.read()
                        
                        # Handle scripts vs markdown differently
                        if file_ext in ['sh', 'py', 'js', 'rs']:
                            outfile.write(f"```{file_ext}\n{content}\n```\n\n")
                        else:
                            # For markdown, just include the content directly
                            outfile.write(f"{content}\n\n")
                except Exception as e:
                    outfile.write(f"Error reading file: {str(e)}\n\n")

if __name__ == "__main__":
    base_dir = "/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator"
    directories = [
        os.path.join(base_dir, "process"),
        os.path.join(base_dir, "project")
    ]
    output_file = os.path.join(base_dir, "2025-march-29-process_and_project_context.md")
    create_consolidated_doc(directories, output_file)
    print(f"Consolidated document created: {output_file}")
