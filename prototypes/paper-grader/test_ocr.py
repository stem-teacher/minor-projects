#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Test script for OCR functionality in the exam marking system
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image
import pytesseract
import argparse
from utils.image_processing import preprocess_image
from utils.ocr import extract_student_info, extract_answers, process_exam
from config import Config

def main():
    parser = argparse.ArgumentParser(description='Test OCR functionality on exam papers')
    parser.add_argument('file', help='Path to exam paper image or PDF file')
    parser.add_argument('--display', action='store_true', help='Display processed image with detected regions')
    args = parser.parse_args()
    
    if not os.path.exists(args.file):
        print(f"Error: File '{args.file}' not found.")
        sys.exit(1)
    
    print(f"Processing file: {args.file}")
    
    try:
        # Preprocess the image
        processed_image = preprocess_image(args.file)
        
        if args.display:
            # Display the processed image
            cv2.imshow('Processed Image', processed_image)
            cv2.waitKey(0)
        
        # Extract student information
        print("\nExtracting student information...")
        student_info = extract_student_info(processed_image)
        print(f"Student Name: {student_info.get('name', 'Not detected')}")
        print(f"Class: {student_info.get('class', 'Not detected')}")
        
        # Extract answers
        print("\nExtracting answers...")
        answers = extract_answers(processed_image)
        print("Detected answers:")
        
        if answers:
            for question, answer in sorted(answers.items(), key=lambda x: int(x[0])):
                print(f"Question {question}: {answer}")
        else:
            print("No answers detected.")
        
        # If display mode is enabled, show the detected regions
        if args.display:
            display_image = processed_image.copy()
            
            # Highlight student name area
            cv2.rectangle(
                display_image,
                (Config.STUDENT_NAME_AREA['left'], Config.STUDENT_NAME_AREA['top']),
                (Config.STUDENT_NAME_AREA['left'] + Config.STUDENT_NAME_AREA['width'], 
                 Config.STUDENT_NAME_AREA['top'] + Config.STUDENT_NAME_AREA['height']),
                (0, 255, 0),  # Green
                2
            )
            
            # Highlight class area
            cv2.rectangle(
                display_image,
                (Config.CLASS_AREA['left'], Config.CLASS_AREA['top']),
                (Config.CLASS_AREA['left'] + Config.CLASS_AREA['width'], 
                 Config.CLASS_AREA['top'] + Config.CLASS_AREA['height']),
                (255, 0, 0),  # Blue
                2
            )
            
            # Highlight answer grid
            grid_start = Config.ANSWER_GRID_START
            grid_spacing = Config.ANSWER_GRID_SPACING
            
            for q in range(1, Config.NUM_QUESTIONS + 1):
                row_y = grid_start['top'] + (q - 1) * grid_spacing['row']
                
                for i, _ in enumerate(Config.OPTIONS):
                    col_x = grid_start['left'] + (i + 1) * grid_spacing['column']
                    
                    # Draw box around each answer option
                    cv2.rectangle(
                        display_image,
                        (col_x - 15, row_y - 15),
                        (col_x + 15, row_y + 15),
                        (0, 0, 255),  # Red
                        1
                    )
                    
                    # If this is the detected answer, fill it
                    if str(q) in answers and Config.OPTIONS[i] == answers[str(q)]:
                        cv2.rectangle(
                            display_image,
                            (col_x - 12, row_y - 12),
                            (col_x + 12, row_y + 12),
                            (0, 0, 255),  # Red
                            -1  # Fill
                        )
            
            # Show image with detected regions
            cv2.imshow('Detected Regions', display_image)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        
        print("\nOCR processing completed successfully.")
    
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
