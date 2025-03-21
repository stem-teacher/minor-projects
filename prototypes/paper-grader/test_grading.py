#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Test script for grading functionality in the exam marking system
"""

import os
import sys
import json
import argparse
from utils.grading import grade_exam, calculate_statistics
from utils.analytics import generate_class_report
from models.exam import AnswerKey, ExamResult

def main():
    parser = argparse.ArgumentParser(description='Test grading functionality')
    parser.add_argument('--answers', help='Path to test answers JSON file')
    parser.add_argument('--key', help='Path to answer key JSON file')
    parser.add_argument('--create-sample', action='store_true', help='Create sample files instead of testing')
    args = parser.parse_args()
    
    if args.create_sample:
        create_sample_files()
        sys.exit(0)
    
    # Check if files exist
    if not args.answers or not os.path.exists(args.answers):
        print("Error: Please provide a valid test answers file.")
        sys.exit(1)
    
    if not args.key or not os.path.exists(args.key):
        print("Error: Please provide a valid answer key file.")
        sys.exit(1)
    
    # Load answer key
    with open(args.key, 'r') as f:
        answer_key = json.load(f)
    
    # Load test answers
    with open(args.answers, 'r') as f:
        student_answers = json.load(f)
    
    print("Answer Key:")
    print_dict(answer_key)
    
    print("\nStudent Answers:")
    print_dict(student_answers.get('answers', {}))
    
    # Grade the exam
    score, marked_answers = grade_exam(student_answers.get('answers', {}), answer_key)
    
    print(f"\nScore: {score}/{len(answer_key)} ({score/len(answer_key)*100:.1f}%)")
    
    print("\nMarked Answers:")
    for q, data in sorted(marked_answers.items(), key=lambda x: int(x[0])):
        correct_mark = "✓" if data['is_correct'] else "✗"
        print(f"Q{q}: {data['student_answer']} {correct_mark} (Correct: {data['correct_answer']})")
    
    # Create and print exam result
    result = ExamResult(
        student_name=student_answers.get('student_name', 'Test Student'),
        class_name=student_answers.get('class', 'Test Class'),
        answers=marked_answers,
        score=score,
        total=len(answer_key)
    )
    
    print("\nExam Result Object:")
    print(f"Student: {result.student_name}")
    print(f"Class: {result.class_name}")
    print(f"Score: {result.score}/{result.total} ({result.calculate_percentage():.1f}%)")
    
    # Test statistics with a batch of results
    print("\nGenerating batch statistics...")
    batch_results = generate_test_batch(answer_key)
    stats = calculate_statistics(batch_results)
    
    print("\nBatch Statistics:")
    print(f"Number of Students: {stats['num_students']}")
    print(f"Average Score: {stats['average_score']:.2f}")
    print(f"Median Score: {stats['median_score']:.2f}")
    print(f"Highest Score: {stats['highest_score']}")
    print(f"Lowest Score: {stats['lowest_score']}")
    
    print("\nGrade Distribution:")
    for grade, count in stats['grade_distribution'].items():
        print(f"{grade}: {count} students ({count/stats['num_students']*100:.1f}%)")
    
    print("\nQuestion Analysis:")
    for q, q_stats in sorted(stats['question_stats'].items(), key=lambda x: int(x[0])):
        print(f"Q{q}: {q_stats['correct']}/{q_stats['total']} correct ({q_stats['percentage']:.1f}%)")

def print_dict(d):
    for k, v in sorted(d.items(), key=lambda x: int(x[0]) if x[0].isdigit() else x[0]):
        print(f"{k}: {v}")

def create_sample_files():
    # Create sample answer key
    answer_key = {
        "1": "A", "2": "B", "3": "C", "4": "D", "5": "A",
        "6": "B", "7": "C", "8": "D", "9": "A", "10": "B",
        "11": "C", "12": "D", "13": "A", "14": "B", "15": "C", "16": "D"
    }
    
    # Create sample student answers
    student_answers = {
        "student_name": "Jane Smith",
        "class": "G",
        "answers": {
            "1": "A", "2": "B", "3": "A", "4": "D", "5": "A",
            "6": "C", "7": "C", "8": "D", "9": "B", "10": "B",
            "11": "C", "12": "A", "13": "A", "14": "B", "15": "D", "16": "D"
        }
    }
    
    # Save files
    with open('sample_answer_key.json', 'w') as f:
        json.dump(answer_key, f, indent=2)
    
    with open('sample_student_answers.json', 'w') as f:
        json.dump(student_answers, f, indent=2)
    
    print("Created sample files:")
    print("- sample_answer_key.json")
    print("- sample_student_answers.json")
    print("\nUse these files to test the grading functionality:")
    print("python test_grading.py --answers sample_student_answers.json --key sample_answer_key.json")

def generate_test_batch(answer_key, num_students=20):
    """Generate a batch of random test results for statistics testing"""
    import random
    
    results = []
    classes = ['G', 'O', 'S', 'F', 'R', 'D']
    
    for i in range(num_students):
        # Create random answers with varying accuracy levels
        student_answers = {}
        marked_answers = {}
        
        for q, correct_answer in answer_key.items():
            # Higher probability of correct answer (70%)
            if random.random() < 0.7:
                student_answer = correct_answer
                is_correct = True
            else:
                # Pick a random wrong answer
                options = ['A', 'B', 'C', 'D']
                options.remove(correct_answer)
                student_answer = random.choice(options)
                is_correct = False
            
            student_answers[q] = student_answer
            marked_answers[q] = {
                'student_answer': student_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct
            }
        
        # Calculate score
        score = sum(1 for a in marked_answers.values() if a['is_correct'])
        
        # Create result
        result = {
            'student_name': f"Student {i+1}",
            'class': random.choice(classes),
            'score': score,
            'total': len(answer_key),
            'answers': marked_answers,
            'processed_at': "2023-01-01 12:00:00"
        }
        
        results.append(result)
    
    return results

if __name__ == "__main__":
    main()
