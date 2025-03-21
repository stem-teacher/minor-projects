#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Configuration settings for the exam marking system
"""

import os
import secrets

class Config:
    # Application settings
    SECRET_KEY = secrets.token_hex(16)
    DEBUG = True
    
    # File upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    RESULTS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'results')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # OCR settings
    TESSERACT_CMD = 'tesseract'  # Path to tesseract executable, might need to be updated
    OCR_LANGUAGE = 'eng'  # OCR language
    
    # Image processing settings
    PREPROCESSING_ENABLED = True
    CONTRAST_ENHANCEMENT = 1.5
    BRIGHTNESS_ADJUSTMENT = 10
    THRESHOLD_VALUE = 127
    
    # Exam form settings
    STUDENT_NAME_AREA = {
        'top': 120,
        'left': 550,
        'width': 300,
        'height': 40
    }
    
    CLASS_AREA = {
        'top': 120,
        'left': 120,
        'width': 300,
        'height': 40
    }
    
    ANSWER_GRID_START = {
        'top': 440,  # Y-coordinate of the first answer row
        'left': 120  # X-coordinate of the first answer column
    }
    
    ANSWER_GRID_SPACING = {
        'row': 40,    # Vertical spacing between rows
        'column': 100 # Horizontal spacing between columns
    }
    
    # Number of questions and options
    NUM_QUESTIONS = 16
    OPTIONS = ['A', 'B', 'C', 'D']
    
    # Metrics for detecting marked answers
    MARKING_THRESHOLD = 30  # Threshold for considering a box as marked
    
    # Analytics settings
    GRADE_BOUNDARIES = {
        'A': 85,
        'B': 70,
        'C': 55,
        'D': 40,
        'E': 20,
        'F': 0
    }
