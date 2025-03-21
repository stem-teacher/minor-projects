#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Image processing utilities for enhancing scanned exam papers
"""

import os
import cv2
import numpy as np
from PIL import Image
from pdf2image import convert_from_path
from config import Config

def preprocess_image(file_path):
    """
    Preprocess image to improve OCR accuracy
    
    Args:
        file_path (str): Path to image or PDF file
        
    Returns:
        numpy.ndarray: Preprocessed image
    """
    # Load the image or convert PDF to image
    if file_path.lower().endswith('.pdf'):
        pages = convert_from_path(file_path)
        image = np.array(pages[0])  # Use first page
    else:
        image = cv2.imread(file_path)
    
    # Check if image is loaded properly
    if image is None or image.size == 0:
        raise ValueError(f"Could not load image from {file_path}")
    
    # Apply preprocessing if enabled in config
    if Config.PREPROCESSING_ENABLED:
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            blurred, 
            255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV if is_dark_form(gray) else cv2.THRESH_BINARY, 
            11, 
            2
        )
        
        # Invert if necessary (ensure dark text on light background)
        if is_dark_form(gray):
            thresh = cv2.bitwise_not(thresh)
        
        # Convert back to BGR for consistent return type
        processed = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    else:
        # Return original image if preprocessing is disabled
        processed = image
    
    return processed

def is_dark_form(gray_image):
    """
    Determine if the form has dark background or light background
    
    Args:
        gray_image: Grayscale image
        
    Returns:
        bool: True if the form has dark background, False otherwise
    """
    # Calculate the mean pixel value
    mean_value = np.mean(gray_image)
    
    # If mean value is less than 127, consider it a dark form
    return mean_value < 127

def deskew_image(image):
    """
    Deskew (straighten) an image
    
    Args:
        image: OpenCV image object
        
    Returns:
        numpy.ndarray: Deskewed image
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Threshold
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Find all contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    # Find largest contour and its angle
    largest_contour = max(contours, key=cv2.contourArea)
    _, _, angle = cv2.minAreaRect(largest_contour)
    
    # Correct the angle to be between -45 and 45 degrees
    if angle < -45:
        angle = 90 + angle
    
    # Rotate the image to deskew
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    
    return rotated

def enhance_contrast(image):
    """
    Enhance contrast of an image for better OCR
    
    Args:
        image: OpenCV image object
        
    Returns:
        numpy.ndarray: Contrast-enhanced image
    """
    # Convert to LAB color space
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    
    # Split the LAB channels
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(l)
    
    # Merge the channels back
    enhanced_lab = cv2.merge((enhanced_l, a, b))
    
    # Convert back to BGR
    enhanced_image = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    
    return enhanced_image

def remove_noise(image):
    """
    Remove noise from an image
    
    Args:
        image: OpenCV image object
        
    Returns:
        numpy.ndarray: Denoised image
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply median blur
    denoised = cv2.medianBlur(gray, 5)
    
    # Convert back to BGR
    denoised_bgr = cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)
    
    return denoised_bgr

def detect_grid(image):
    """
    Detect answer grid on the exam paper
    
    Args:
        image: OpenCV image object
        
    Returns:
        tuple: (top_left_x, top_left_y, width, height) of the detected grid
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    
    # Detect lines using Hough transform
    lines = cv2.HoughLines(edges, 1, np.pi/180, 200)
    
    # Extract horizontal and vertical lines
    horizontal_lines = []
    vertical_lines = []
    
    if lines is not None:
        for line in lines:
            rho, theta = line[0]
            if theta < 0.1 or theta > np.pi - 0.1:
                # Vertical line
                vertical_lines.append((rho, theta))
            elif abs(theta - np.pi/2) < 0.1:
                # Horizontal line
                horizontal_lines.append((rho, theta))
    
    # Find grid boundaries
    if horizontal_lines and vertical_lines:
        # Sort by rho value
        horizontal_lines.sort()
        vertical_lines.sort()
        
        # Get top and bottom horizontal lines
        top_line = horizontal_lines[0][0]
        bottom_line = horizontal_lines[-1][0]
        
        # Get leftmost and rightmost vertical lines
        left_line = vertical_lines[0][0]
        right_line = vertical_lines[-1][0]
        
        return (int(left_line), int(top_line), int(right_line - left_line), int(bottom_line - top_line))
    
    # Return default grid area if detection fails
    h, w = image.shape[:2]
    return (0, 0, w, h)
