#!/usr/bin/env python3
"""
Verification Script for PDF Filename Annotator

This script verifies that PDF files have been properly annotated with
searchable text by:
1. Extracting text from the PDF files
2. Checking if the filename appears in the extracted text
3. Reporting success/failure for each file

Requirements:
- pdftotext command-line utility (part of poppler-utils)
- Python 3.6+

Usage:
python3 verify_annotations.py [directory]
"""

import os
import sys
import subprocess
import glob
from pathlib import Path
import argparse
import json
from typing import Dict, List, Tuple

def check_dependencies() -> bool:
    """Check if required dependencies are installed."""
    try:
        result = subprocess.run(['which', 'pdftotext'], 
                               capture_output=True, text=True)
        return bool(result.stdout.strip())
    except Exception:
        return False

def extract_text(pdf_path: str) -> str:
    """Extract text from a PDF file using pdftotext."""
    try:
        result = subprocess.run(['pdftotext', pdf_path, '-'],
                               capture_output=True, text=True)
        return result.stdout
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return ""

def check_filename_in_text(pdf_path: str, extracted_text: str) -> bool:
    """Check if the filename appears in the extracted text."""
    filename = os.path.basename(pdf_path)
    return filename in extracted_text

def count_annotations(extracted_text: str, filename: str) -> int:
    """Count how many times the filename appears in the extracted text."""
    return extracted_text.count(filename)

def verify_file(pdf_path: str) -> Tuple[bool, str, int]:
    """Verify that a PDF file has been properly annotated."""
    if not os.path.exists(pdf_path):
        return False, f"File does not exist: {pdf_path}", 0
    
    if not os.path.isfile(pdf_path):
        return False, f"Not a file: {pdf_path}", 0
    
    if not pdf_path.lower().endswith('.pdf'):
        return False, f"Not a PDF file: {pdf_path}", 0
    
    extracted_text = extract_text(pdf_path)
    filename = os.path.basename(pdf_path)
    success = check_filename_in_text(pdf_path, extracted_text)
    annotation_count = count_annotations(extracted_text, filename)
    
    if success:
        message = f"SUCCESS: Filename found in extracted text {annotation_count} times"
    else:
        message = f"FAILURE: Filename not found in extracted text"
    
    return success, message, annotation_count

def verify_directory(directory: str) -> Dict:
    """Verify all PDF files in a directory."""
    if not os.path.isdir(directory):
        print(f"Error: {directory} is not a directory")
        return {}
    
    results = {
        "directory": directory,
        "total_files": 0,
        "successful_files": 0,
        "failed_files": 0,
        "total_annotations": 0,
        "details": []
    }
    
    pdf_files = glob.glob(os.path.join(directory, "*.pdf"))
    results["total_files"] = len(pdf_files)
    
    for pdf_path in pdf_files:
        success, message, annotation_count = verify_file(pdf_path)
        
        if success:
            results["successful_files"] += 1
            results["total_annotations"] += annotation_count
        else:
            results["failed_files"] += 1
        
        results["details"].append({
            "file": os.path.basename(pdf_path),
            "success": success,
            "message": message,
            "annotation_count": annotation_count
        })
    
    return results

def main():
    parser = argparse.ArgumentParser(description='Verify PDF annotations')
    parser.add_argument('directory', nargs='?', default='.',
                        help='Directory containing PDF files to verify')
    parser.add_argument('--output', '-o', help='Output JSON report to file')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Show detailed output for each file')
    
    args = parser.parse_args()
    
    # Check dependencies
    if not check_dependencies():
        print("Error: pdftotext command not found. Please install poppler-utils.")
        return 1
    
    # Verify the directory
    results = verify_directory(args.directory)
    
    # Print summary
    print(f"\nVerification Results for {results['directory']}:")
    print(f"Total PDF files: {results['total_files']}")
    print(f"Successfully annotated: {results['successful_files']}")
    print(f"Failed: {results['failed_files']}")
    print(f"Total annotations found: {results['total_annotations']}")
    
    # Print details if verbose
    if args.verbose:
        print("\nDetailed Results:")
        for detail in results["details"]:
            print(f"{detail['file']}: {detail['message']}")
    
    # Output to JSON file if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {args.output}")
    
    # Return exit code based on success
    return 0 if results["failed_files"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())