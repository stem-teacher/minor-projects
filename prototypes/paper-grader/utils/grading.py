#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Grading utility functions for the exam marking system
"""

import os
import json
import statistics
from collections import Counter
from config import Config

def grade_exam(student_answers, answer_key):
    """
    Grade an exam by comparing student answers with the answer key
    
    Args:
        student_answers (dict): Dictionary mapping question numbers to student's selected options
        answer_key (dict): Dictionary mapping question numbers to correct options
        
    Returns:
        tuple: (score, marked_answers) where score is the number of correct answers
               and marked_answers is a dictionary with student answers and correctness
    """
    correct_count = 0
    marked_answers = {}
    
    for question, correct_option in answer_key.items():
        student_option = student_answers.get(question)
        is_correct = student_option == correct_option
        
        marked_answers[question] = {
            'student_answer': student_option,
            'correct_answer': correct_option,
            'is_correct': is_correct
        }
        
        if is_correct:
            correct_count += 1
    
    return correct_count, marked_answers

def calculate_score_percentage(score, total):
    """
    Calculate score as a percentage
    
    Args:
        score (int): The raw score
        total (int): The total possible score
        
    Returns:
        float: Score as a percentage
    """
    if total == 0:
        return 0
    return (score / total) * 100

def assign_grade(percentage):
    """
    Assign a letter grade based on percentage score
    
    Args:
        percentage (float): Score as a percentage
        
    Returns:
        str: Letter grade
    """
    boundaries = Config.GRADE_BOUNDARIES
    
    for grade, boundary in sorted(boundaries.items(), key=lambda x: x[1], reverse=True):
        if percentage >= boundary:
            return grade
    
    return 'F'  # Default to F if no boundary matches

def calculate_statistics(results):
    """
    Calculate statistics for a set of exam results
    
    Args:
        results (list): List of exam result dictionaries
        
    Returns:
        dict: Statistics including average, median, highest, lowest scores, etc.
    """
    if not results:
        return {}
    
    scores = [result['score'] for result in results]
    percentages = [calculate_score_percentage(result['score'], result['total']) for result in results]
    
    # Calculate grades
    grades = [assign_grade(percentage) for percentage in percentages]
    grade_distribution = Counter(grades)
    
    # Calculate question statistics
    question_stats = {}
    for result in results:
        for q_num, ans_data in result.get('answers', {}).items():
            if isinstance(ans_data, dict) and 'is_correct' in ans_data:
                if q_num not in question_stats:
                    question_stats[q_num] = {'correct': 0, 'total': 0}
                
                question_stats[q_num]['total'] += 1
                if ans_data['is_correct']:
                    question_stats[q_num]['correct'] += 1
    
    # Convert question stats to percentages
    for q_num, stats in question_stats.items():
        if stats['total'] > 0:
            stats['percentage'] = (stats['correct'] / stats['total']) * 100
        else:
            stats['percentage'] = 0
    
    # Calculate difficulty levels
    easy_questions = []
    medium_questions = []
    hard_questions = []
    
    for q_num, stats in question_stats.items():
        if stats['percentage'] >= 75:
            easy_questions.append(q_num)
        elif stats['percentage'] >= 40:
            medium_questions.append(q_num)
        else:
            hard_questions.append(q_num)
    
    return {
        'num_students': len(results),
        'average_score': statistics.mean(scores) if scores else 0,
        'median_score': statistics.median(scores) if scores else 0,
        'highest_score': max(scores) if scores else 0,
        'lowest_score': min(scores) if scores else 0,
        'average_percentage': statistics.mean(percentages) if percentages else 0,
        'grade_distribution': grade_distribution,
        'question_stats': question_stats,
        'difficulty': {
            'easy': sorted(easy_questions, key=int),
            'medium': sorted(medium_questions, key=int),
            'hard': sorted(hard_questions, key=int)
        }
    }
