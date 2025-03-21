#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Analytics utility functions for exam results analysis
"""

import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import io
import base64
from collections import Counter, defaultdict

def generate_class_report(results, class_name=None):
    """
    Generate analytics report for a specific class or all classes
    
    Args:
        results (list): List of exam result dictionaries
        class_name (str, optional): Name of class to analyze, or None for all classes
        
    Returns:
        dict: Analytics report with various metrics and visualizations
    """
    # Filter results by class if specified
    if class_name:
        filtered_results = [r for r in results if r.get('class') == class_name]
    else:
        filtered_results = results
    
    if not filtered_results:
        return {'error': 'No results found for the specified class'}
    
    # Convert to DataFrame for easier analysis
    df = pd.DataFrame(filtered_results)
    
    # Calculate basic statistics
    stats = {
        'num_students': len(df),
        'avg_score': df['score'].mean(),
        'median_score': df['score'].median(),
        'min_score': df['score'].min(),
        'max_score': df['score'].max(),
        'std_dev': df['score'].std()
    }
    
    # Score distribution
    score_counts = Counter(df['score'])
    score_dist = {
        'scores': sorted(score_counts.keys()),
        'counts': [score_counts[score] for score in sorted(score_counts.keys())]
    }
    
    # Generate score distribution chart
    score_chart = generate_score_distribution_chart(score_counts)
    
    # Calculate performance by question
    question_performance = calculate_question_performance(filtered_results)
    
    # Generate question performance chart
    question_chart = generate_question_performance_chart(question_performance)
    
    return {
        'class_name': class_name if class_name else 'All Classes',
        'stats': stats,
        'score_distribution': score_dist,
        'score_chart': score_chart,
        'question_performance': question_performance,
        'question_chart': question_chart
    }

def generate_question_analysis(results):
    """
    Generate detailed analysis for each question
    
    Args:
        results (list): List of exam result dictionaries
        
    Returns:
        dict: Question-by-question analysis
    """
    if not results:
        return {}
    
    # Initialize question analysis dictionary
    question_analysis = {}
    
    # Get unique question numbers from all results
    all_questions = set()
    for result in results:
        if 'answers' in result and isinstance(result['answers'], dict):
            all_questions.update(result['answers'].keys())
    
    # For each question, analyze response patterns
    for question in sorted(all_questions, key=int):
        # Initialize counters
        total_responses = 0
        correct_responses = 0
        answer_counts = Counter()
        
        # Analyze each student's response
        for result in results:
            if ('answers' in result and 
                isinstance(result['answers'], dict) and 
                question in result['answers']):
                
                answer_data = result['answers'][question]
                
                # Handle both dictionary and string answer formats
                if isinstance(answer_data, dict):
                    student_answer = answer_data.get('student_answer')
                    is_correct = answer_data.get('is_correct', False)
                    correct_answer = answer_data.get('correct_answer')
                else:
                    student_answer = answer_data
                    # We can't determine correctness without the answer key
                    is_correct = None
                    correct_answer = None
                
                if student_answer:
                    total_responses += 1
                    answer_counts[student_answer] += 1
                    
                    if is_correct:
                        correct_responses += 1
        
        # Calculate correctness percentage
        correct_percentage = (correct_responses / total_responses * 100) if total_responses > 0 else 0
        
        # Store analysis for this question
        question_analysis[question] = {
            'total_responses': total_responses,
            'correct_responses': correct_responses,
            'correct_percentage': correct_percentage,
            'answer_distribution': dict(answer_counts),
            'correct_answer': correct_answer
        }
    
    return question_analysis

def calculate_question_performance(results):
    """
    Calculate performance by question across all students
    
    Args:
        results (list): List of exam result dictionaries
        
    Returns:
        dict: Question performance metrics
    """
    question_data = defaultdict(lambda: {'correct': 0, 'total': 0})
    
    for result in results:
        if 'answers' in result and isinstance(result['answers'], dict):
            for question, answer_data in result['answers'].items():
                question_data[question]['total'] += 1
                
                # Handle both dictionary and string answer formats
                if isinstance(answer_data, dict) and 'is_correct' in answer_data:
                    if answer_data['is_correct']:
                        question_data[question]['correct'] += 1
    
    # Calculate percentages
    question_performance = {}
    for question, data in question_data.items():
        if data['total'] > 0:
            correct_percentage = (data['correct'] / data['total']) * 100
        else:
            correct_percentage = 0
        
        question_performance[question] = {
            'correct': data['correct'],
            'total': data['total'],
            'percentage': correct_percentage
        }
    
    return question_performance

def generate_score_distribution_chart(score_counts):
    """
    Generate a base64 encoded image of the score distribution chart
    
    Args:
        score_counts (Counter): Counter object with scores and counts
        
    Returns:
        str: Base64 encoded PNG image
    """
    plt.figure(figsize=(10, 6))
    
    scores = sorted(score_counts.keys())
    counts = [score_counts[score] for score in scores]
    
    plt.bar(scores, counts, color='skyblue')
    plt.xlabel('Score')
    plt.ylabel('Number of Students')
    plt.title('Score Distribution')
    
    if len(scores) > 10:
        plt.xticks(rotation=45)
    
    plt.tight_layout()
    
    # Save figure to a bytes buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    
    # Encode the bytes buffer to base64
    buf.seek(0)
    img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    return f"data:image/png;base64,{img_str}"

def generate_question_performance_chart(question_performance):
    """
    Generate a base64 encoded image of the question performance chart
    
    Args:
        question_performance (dict): Dictionary with question performance metrics
        
    Returns:
        str: Base64 encoded PNG image
    """
    plt.figure(figsize=(12, 6))
    
    questions = sorted(question_performance.keys(), key=int)
    percentages = [question_performance[q]['percentage'] for q in questions]
    
    # Create bar colors based on performance
    colors = []
    for p in percentages:
        if p >= 75:
            colors.append('green')
        elif p >= 40:
            colors.append('orange')
        else:
            colors.append('red')
    
    plt.bar(questions, percentages, color=colors)
    plt.xlabel('Question Number')
    plt.ylabel('Percentage Correct (%)')
    plt.title('Performance by Question')
    
    # Add horizontal lines for performance categories
    plt.axhline(y=75, color='green', linestyle='--', alpha=0.7, label='Easy (≥75%)')
    plt.axhline(y=40, color='orange', linestyle='--', alpha=0.7, label='Medium (≥40%)')
    plt.axhline(y=0, color='red', alpha=0.3)
    
    plt.legend()
    plt.ylim(0, 100)
    
    if len(questions) > 10:
        plt.xticks(rotation=45)
    
    plt.tight_layout()
    
    # Save figure to a bytes buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    
    # Encode the bytes buffer to base64
    buf.seek(0)
    img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    return f"data:image/png;base64,{img_str}"
