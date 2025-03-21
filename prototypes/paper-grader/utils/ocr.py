#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
OCR utility functions for processing exam papers
"""

import os
import cv2
import numpy as np
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
from config import Config

# Set Tesseract command if configured
if hasattr(pytesseract, 'pytesseract'):
    pytesseract.pytesseract.tesseract_cmd = Config.TESSERACT_CMD

def process_exam(file_path):
    """
    Process an exam paper and extract all relevant information
    
    Args:
        file_path (str): Path to the exam file
        
    Returns:
        dict: Dictionary containing extracted information
    """
    # Convert PDF to image if necessary
    if file_path.lower().endswith('.pdf'):
        pages = convert_from_path(file_path)
        image = np.array(pages[0])  # Use first page
    else:
        # Load image
        image = cv2.imread(file_path)
    
    # Extract information
    student_info = extract_student_info(image)
    answers = extract_answers(image)
    
    return {
        'student_info': student_info,
        'answers': answers
    }

def extract_student_info(image):
    """
    Extract student name and class from the exam paper
    
    Args:
        image: OpenCV image object
        
    Returns:
        dict: Dictionary with student name and class
    """
    # Extract student name
    name_area = extract_region(
        image, 
        Config.STUDENT_NAME_AREA['top'],
        Config.STUDENT_NAME_AREA['left'],
        Config.STUDENT_NAME_AREA['width'],
        Config.STUDENT_NAME_AREA['height']
    )
    
    # Extract class
    class_area = extract_region(
        image, 
        Config.CLASS_AREA['top'],
        Config.CLASS_AREA['left'],
        Config.CLASS_AREA['width'],
        Config.CLASS_AREA['height']
    )
    
    # Use OCR to extract text
    student_name = ocr_extract_text(name_area).strip()
    class_name = ocr_extract_text(class_area).strip()
    
    # If class is not extracted correctly, try to detect which checkbox is marked
    if not class_name or len(class_name) > 5:
        class_name = detect_class_checkbox(image)
    
    return {
        'name': student_name if student_name else 'Unknown',
        'class': class_name if class_name else 'Unknown'
    }

def detect_class_checkbox(image):
    """
    Detect which class checkbox is marked (G, O, S, F, R, D)
    
    Args:
        image: OpenCV image object
        
    Returns:
        str: Detected class or empty string if none detected
    """
    # Define the area where class checkboxes are located
    # This will need to be adjusted based on the exact form layout
    checkbox_area = extract_region(
        image, 
        120,  # Approximate Y-coordinate for class checkboxes
        120,  # Approximate X-coordinate start
        400,  # Width to cover all checkboxes
        40    # Height of the checkbox area
    )
    
    # Convert to grayscale and threshold
    gray = cv2.cvtColor(checkbox_area, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Define the positions of each class checkbox (these need to be calibrated)
    checkbox_positions = {
        'G': (30, 20),   # X, Y coordinates relative to checkbox_area
        'O': (100, 20),
        'S': (170, 20),
        'F': (240, 20),
        'R': (310, 20),
        'D': (380, 20)
    }
    
    # Find the checkbox with the highest filled percentage
    max_fill = 0
    selected_class = ''
    
    for class_name, position in checkbox_positions.items():
        x, y = position
        # Define region around the checkbox
        roi = thresh[y-10:y+10, x-10:x+10]
        # Calculate filled percentage
        if roi.size > 0:  # Ensure ROI is not empty
            fill_percentage = np.sum(roi == 255) / roi.size
            if fill_percentage > max_fill and fill_percentage > 0.3:  # 30% threshold
                max_fill = fill_percentage
                selected_class = class_name
    
    return selected_class

def extract_answers(image):
    """
    Extract marked answers from the multiple choice grid
    
    Args:
        image: OpenCV image object
        
    Returns:
        dict: Dictionary mapping question numbers to selected options
    """
    answers = {}
    
    # Define grid parameters from config
    grid_start = Config.ANSWER_GRID_START
    grid_spacing = Config.ANSWER_GRID_SPACING
    num_questions = Config.NUM_QUESTIONS
    options = Config.OPTIONS
    
    # Convert image to grayscale and threshold
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, Config.THRESHOLD_VALUE, 255, cv2.THRESH_BINARY_INV)
    
    # Examine each question and option
    for q in range(1, num_questions + 1):
        question_row = grid_start['top'] + (q - 1) * grid_spacing['row']
        
        selected_option = None
        max_fill_percentage = 0
        
        for i, option in enumerate(options):
            option_col = grid_start['left'] + (i + 1) * grid_spacing['column']
            
            # Define region for this option
            option_roi = thresh[
                question_row - 15:question_row + 15,
                option_col - 15:option_col + 15
            ]
            
            # Calculate filled percentage
            if option_roi.size > 0:  # Ensure ROI is not empty
                fill_percentage = np.sum(option_roi == 255) / option_roi.size
                
                # If this option has higher fill percentage than previous max
                if fill_percentage > max_fill_percentage and fill_percentage > 0.1:  # 10% threshold
                    max_fill_percentage = fill_percentage
                    selected_option = option
        
        # Store the selected option for this question
        if selected_option:
            answers[str(q)] = selected_option
    
    return answers

def extract_region(image, top, left, width, height):
    """
    Extract a region from an image
    
    Args:
        image: OpenCV image object
        top, left, width, height: Region coordinates
        
    Returns:
        Region of the image
    """
    # Ensure coordinates are within image bounds
    h, w = image.shape[:2]
    top = max(0, min(top, h - 1))
    left = max(0, min(left, w - 1))
    width = min(width, w - left)
    height = min(height, h - top)
    
    return image[top:top+height, left:left+width]

def ocr_extract_text(image):
    """
    Use OCR to extract text from an image
    
    Args:
        image: Image region to extract text from
        
    Returns:
        str: Extracted text
    """
    # Convert OpenCV image to PIL Image
    pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    
    # Use Tesseract to extract text
    text = pytesseract.image_to_string(
        pil_image, 
        lang=Config.OCR_LANGUAGE,
        config='--psm 6'  # Assume a single uniform block of text
    )
    
    return text.strip()
