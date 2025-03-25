#!/usr/bin/env python3
"""
Verify PDF annotations tool

This script checks if a PDF contains text matching the filename,
which indicates that the annotation process was successful.
"""

import os
import sys
import subprocess
import glob

def check_pdf_content(pdf_path):
    """Check if a PDF contains text that matches its filename."""
    filename = os.path.basename(pdf_path)
    try:
        # Use pdftotext to extract text from the PDF
        result = subprocess.run(
            ['pdftotext', pdf_path, '-'],
            capture_output=True,
            text=True,
            check=True
        )
        content = result.stdout
        
        # Check if the filename appears in the content
        if filename in content:
            print(f"✅ {filename}: Annotation found")
            return True
        else:
            print(f"❌ {filename}: Annotation NOT found")
            return False
    except subprocess.CalledProcessError:
        print(f"⚠️  {filename}: Failed to extract text")
        return False

def main():
    """Main function to verify PDF annotations."""
    if len(sys.argv) < 2:
        print("Usage: python verify_annotations.py <directory>")
        sys.exit(1)
    
    directory = sys.argv[1]
    pdf_files = glob.glob(os.path.join(directory, "*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {directory}")
        sys.exit(1)
    
    success_count = 0
    total_files = len(pdf_files)
    
    for pdf_file in pdf_files:
        if check_pdf_content(pdf_file):
            success_count += 1
    
    print(f"\nSummary: {success_count}/{total_files} files successfully annotated")
    
    if success_count == total_files:
        print("All files were successfully annotated! 🎉")
        sys.exit(0)
    else:
        print("Some files were not properly annotated. 😟")
        sys.exit(1)

if __name__ == "__main__":
    main()