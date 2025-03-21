#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Test script to demonstrate full functionality of the exam marking system
"""

import os
import sys
import json
import argparse
import cv2
import numpy as np
from PIL import Image
from datetime import datetime

from utils.image_processing import preprocess_image
from utils.ocr import extract_student_info, extract_answers
from utils.grading import grade_exam, calculate_statistics
from utils.analytics import generate_class_report, generate_question_analysis
from models.exam import ExamResult, AnswerKey
from config import Config

def main():
    parser = argparse.ArgumentParser(description='Test full exam marking system')
    parser.add_argument('--image', help='Path to exam image file')
    parser.add_argument('--key', help='Path to answer key file')
    parser.add_argument('--batch', help='Directory containing multiple exam images')
    parser.add_argument('--save-results', action='store_true', help='Save results to JSON file')
    parser.add_argument('--display', action='store_true', help='Display processed images')
    args = parser.parse_args()
    
    # Load or create answer key
    answer_key = {}
    if args.key and os.path.exists(args.key):
        with open(args.key, 'r') as f:
            answer_key = json.load(f)
    else:
        # Create a sample answer key
        answer_key = create_sample_answer_key()
        with open('sample_answer_key.json', 'w') as f:
            json.dump(answer_key, f, indent=2)
        print("Created sample answer key: sample_answer_key.json")
    
    results = []
    
    # Process a single image
    if args.image and os.path.exists(args.image):
        result = process_single_exam(args.image, answer_key, display=args.display)
        if result:
            results.append(result)
            print_result(result)
    
    # Process a batch of images
    elif args.batch and os.path.isdir(args.batch):
        print(f"Processing batch of exam papers from {args.batch}")
        for filename in os.listdir(args.batch):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.pdf')):
                file_path = os.path.join(args.batch, filename)
                print(f"\nProcessing {filename}...")
                result = process_single_exam(file_path, answer_key, display=args.display)
                if result:
                    results.append(result)
                    print_result(result)
    
    else:
        print("Error: Please provide either an image file or a batch directory.")
        parser.print_help()
        sys.exit(1)
    
    # Generate statistics if we have results
    if results:
        print("\n================ BATCH STATISTICS ================")
        stats = calculate_statistics(results)
        print(f"Processed {len(results)} exam papers")
        print(f"Average Score: {stats['average_score']:.2f}/{len(answer_key)}")
        print(f"Median Score: {stats['median_score']:.2f}")
        print(f"Highest Score: {stats['highest_score']}/{len(answer_key)}")
        print(f"Lowest Score: {stats['lowest_score']}/{len(answer_key)}")
        print(f"Average Percentage: {stats['average_percentage']:.2f}%")
        
        print("\nGrade Distribution:")
        for grade, count in stats['grade_distribution'].items():
            print(f"{grade}: {count} students ({count/len(results)*100:.1f}%)")
        
        print("\nQuestion Analysis:")
        for q, q_stats in sorted(stats['question_stats'].items(), key=lambda x: int(x[0])):
            difficulty = "Easy" if q_stats['percentage'] >= 75 else "Medium" if q_stats['percentage'] >= 40 else "Hard"
            print(f"Q{q}: {q_stats['correct']}/{q_stats['total']} correct ({q_stats['percentage']:.1f}%) - {difficulty}")
        
        # Save results if requested
        if args.save_results:
            results_file = f"exam_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(results_file, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\nSaved results to {results_file}")

def process_single_exam(file_path, answer_key, display=False):
    """Process a single exam paper"""
    try:
        # Preprocess the image
        processed_image = preprocess_image(file_path)
        
        # Extract student information
        student_info = extract_student_info(processed_image)
        
        # Extract answers
        answers = extract_answers(processed_image)
        
        # Grade the exam
        score, marked_answers = grade_exam(answers, answer_key)
        
        # Create result object
        result = {
            'filename': os.path.basename(file_path),
            'student_name': student_info.get('name', 'Unknown'),
            'class': student_info.get('class', 'Unknown'),
            'score': score,
            'total': len(answer_key),
            'answers': marked_answers,
            'processed_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Display processed image with annotations if requested
        if display:
            display_image = processed_image.copy()
            
            # Add text with student info and score
            cv2.putText(
                display_image,
                f"Name: {student_info.get('name', 'Unknown')}",
                (20, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2
            )
            
            cv2.putText(
                display_image,
                f"Class: {student_info.get('class', 'Unknown')}",
                (20, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2
            )
            
            cv2.putText(
                display_image,
                f"Score: {score}/{len(answer_key)} ({score/len(answer_key)*100:.1f}%)",
                (20, 90),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2
            )
            
            # Highlight answers on the grid
            grid_start = Config.ANSWER_GRID_START
            grid_spacing = Config.ANSWER_GRID_SPACING
            
            for q in range(1, Config.NUM_QUESTIONS + 1):
                q_str = str(q)
                row_y = grid_start['top'] + (q - 1) * grid_spacing['row']
                
                for i, option in enumerate(Config.OPTIONS):
                    col_x = grid_start['left'] + (i + 1) * grid_spacing['column']
                    
                    # Check if this option was selected
                    if q_str in answers and answers[q_str] == option:
                        # Draw marked answer
                        color = (0, 255, 0) if q_str in marked_answers and marked_answers[q_str]['is_correct'] else (0, 0, 255)
                        cv2.rectangle(
                            display_image,
                            (col_x - 15, row_y - 15),
                            (col_x + 15, row_y + 15),
                            color,
                            2
                        )
                    
                    # Draw correct answer with different color if not selected
                    elif q_str in answer_key and answer_key[q_str] == option and (q_str not in answers or answers[q_str] != option):
                        cv2.rectangle(
                            display_image,
                            (col_x - 15, row_y - 15),
                            (col_x + 15, row_y + 15),
                            (255, 255, 0),  # Yellow
                            1
                        )
            
            # Show the annotated image
            cv2.imshow('Processed Exam', display_image)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        
        return result
    
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")
        return None

def print_result(result):
    """Print a formatted exam result"""
    print("=" * 50)
    print(f"Student: {result['student_name']}")
    print(f"Class: {result['class']}")
    print(f"Score: {result['score']}/{result['total']} ({result['score']/result['total']*100:.1f}%)")
    print(f"Processed: {result['processed_at']}")
    print("-" * 50)
    print("Answers:")
    
    for q, data in sorted(result['answers'].items(), key=lambda x: int(x[0])):
        if isinstance(data, dict):
            correct_mark = "✓" if data['is_correct'] else "✗"
            print(f"Q{q}: {data['student_answer']} {correct_mark} (Correct: {data['correct_answer']})")
        else:
            print(f"Q{q}: {data}")

def create_sample_answer_key():
    """Create a sample answer key for testing"""
    return {
        "1": "A", "2": "B", "3": "C", "4": "D", "5": "A",
        "6": "B", "7": "C", "8": "D", "9": "A", "10": "B",
        "11": "C", "12": "D", "13": "A", "14": "B", "15": "C", "16": "D"
    }

if __name__ == "__main__":
    main()
