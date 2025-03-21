#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script to generate sample filled-in exam papers for testing
"""

import os
import sys
import argparse
import random
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from config import Config

def main():
    parser = argparse.ArgumentParser(description='Generate sample filled-in exam papers')
    parser.add_argument('--template', default='exam_template.png', help='Path to blank exam template')
    parser.add_argument('--output', default='generated_exams', help='Output directory for generated exams')
    parser.add_argument('--count', type=int, default=5, help='Number of exams to generate')
    parser.add_argument('--answer-key', default=None, help='Path to save the generated answer key')
    parser.add_argument('--accuracy', type=float, default=0.7, help='Average accuracy of generated answers (0-1)')
    args = parser.parse_args()
    
    # Check if template exists
    if not os.path.exists(args.template):
        print(f"Error: Template file '{args.template}' not found.")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output, exist_ok=True)
    
    # Generate an answer key
    answer_key = generate_answer_key()
    
    # Save answer key if requested
    if args.answer_key:
        import json
        with open(args.answer_key, 'w') as f:
            json.dump(answer_key, f, indent=2)
        print(f"Saved answer key to {args.answer_key}")
    
    # Generate sample student names and classes
    student_names = generate_student_names(args.count)
    
    # Load template image
    template = Image.open(args.template)
    
    # Generate exams
    for i in range(args.count):
        student_name = student_names[i]
        class_name = random.choice(['G', 'O', 'S', 'F', 'R', 'D'])
        
        # Generate student answers with specified accuracy
        student_answers = generate_student_answers(answer_key, accuracy=args.accuracy)
        
        # Create filled-in exam
        exam_image = fill_exam_template(
            template.copy(), 
            student_name, 
            class_name, 
            student_answers
        )
        
        # Save the image
        output_file = os.path.join(args.output, f"exam_{i+1:02d}_{student_name.replace(' ', '_')}.png")
        exam_image.save(output_file)
        print(f"Generated exam for {student_name} (Class {class_name}) - {output_file}")
    
    print(f"Successfully generated {args.count} exam papers.")

def generate_answer_key():
    """Generate a random answer key"""
    options = ['A', 'B', 'C', 'D']
    answer_key = {}
    
    for i in range(1, Config.NUM_QUESTIONS + 1):
        answer_key[str(i)] = random.choice(options)
    
    return answer_key

def generate_student_names(count):
    """Generate a list of student names"""
    first_names = [
        "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
        "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
        "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
        "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
        "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
        "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa"
    ]
    
    last_names = [
        "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson",
        "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin",
        "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee",
        "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez",
        "Hill", "Scott", "Green", "Adams", "Baker", "Gonzalez", "Nelson", "Carter",
        "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans"
    ]
    
    names = []
    used_names = set()
    
    for _ in range(count):
        # Ensure we don't get duplicate names
        while True:
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            if name not in used_names:
                used_names.add(name)
                names.append(name)
                break
    
    return names

def generate_student_answers(answer_key, accuracy=0.7):
    """Generate student answers with a specified accuracy"""
    options = ['A', 'B', 'C', 'D']
    student_answers = {}
    
    for question, correct_answer in answer_key.items():
        # Randomly determine if this answer will be correct
        if random.random() < accuracy:
            student_answers[question] = correct_answer
        else:
            # Choose a random incorrect answer
            wrong_options = [opt for opt in options if opt != correct_answer]
            student_answers[question] = random.choice(wrong_options)
    
    return student_answers

def fill_exam_template(template, student_name, class_name, student_answers):
    """Fill in the exam template with student information and answers"""
    draw = ImageDraw.Draw(template)
    
    # Try to load a font, fall back to default if not available
    try:
        font = ImageFont.truetype("Arial.ttf", 20)
    except IOError:
        font = ImageFont.load_default()
    
    # Draw student name
    name_area = Config.STUDENT_NAME_AREA
    draw.text(
        (name_area['left'], name_area['top']),
        student_name,
        fill=(0, 0, 0),
        font=font
    )
    
    # Mark class checkbox
    class_boxes = {
        'G': (120, 155),
        'O': (190, 155),
        'S': (260, 155),
        'F': (330, 155),
        'R': (400, 155),
        'D': (470, 155)
    }
    
    # Draw X in the appropriate class box
    if class_name in class_boxes:
        x, y = class_boxes[class_name]
        draw.text((x, y), "X", fill=(0, 0, 0), font=font)
    
    # Mark answer grid
    grid_start = Config.ANSWER_GRID_START
    grid_spacing = Config.ANSWER_GRID_SPACING
    options = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
    
    for question, answer in student_answers.items():
        q_num = int(question)
        row_y = grid_start['top'] + (q_num - 1) * grid_spacing['row']
        
        if answer in options:
            col_x = grid_start['left'] + (options[answer] + 1) * grid_spacing['column']
            
            # Draw X in the selected answer cell
            draw.text((col_x, row_y), "X", fill=(0, 0, 0), font=font)
    
    return template

if __name__ == "__main__":
    main()
