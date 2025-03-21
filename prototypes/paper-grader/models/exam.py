#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Data models for the exam marking system
"""

class ExamResult:
    """Class representing an exam result"""
    
    def __init__(self, student_name, class_name, answers=None, score=0, total=0, filename=None):
        """
        Initialize an exam result
        
        Args:
            student_name (str): Name of the student
            class_name (str): Class or group the student belongs to
            answers (dict, optional): Dictionary mapping question numbers to answers
            score (int, optional): Score achieved by the student
            total (int, optional): Total possible score
            filename (str, optional): Source filename of the exam
        """
        self.student_name = student_name
        self.class_name = class_name
        self.answers = answers or {}
        self.score = score
        self.total = total
        self.filename = filename
    
    def calculate_percentage(self):
        """
        Calculate the score as a percentage
        
        Returns:
            float: Score as a percentage
        """
        if self.total == 0:
            return 0
        return (self.score / self.total) * 100
    
    def to_dict(self):
        """
        Convert the exam result to a dictionary
        
        Returns:
            dict: Dictionary representation of the exam result
        """
        return {
            'student_name': self.student_name,
            'class': self.class_name,
            'answers': self.answers,
            'score': self.score,
            'total': self.total,
            'percentage': self.calculate_percentage(),
            'filename': self.filename
        }
    
    @classmethod
    def from_dict(cls, data):
        """
        Create an exam result from a dictionary
        
        Args:
            data (dict): Dictionary representation of an exam result
            
        Returns:
            ExamResult: New ExamResult instance
        """
        return cls(
            student_name=data.get('student_name', 'Unknown'),
            class_name=data.get('class', 'Unknown'),
            answers=data.get('answers', {}),
            score=data.get('score', 0),
            total=data.get('total', 0),
            filename=data.get('filename')
        )


class AnswerKey:
    """Class representing an answer key for an exam"""
    
    def __init__(self, answers=None):
        """
        Initialize an answer key
        
        Args:
            answers (dict, optional): Dictionary mapping question numbers to correct answers
        """
        self.answers = answers or {}
    
    def add_answer(self, question, answer):
        """
        Add or update an answer in the key
        
        Args:
            question (str): Question number or identifier
            answer (str): Correct answer for the question
        """
        self.answers[str(question)] = answer
    
    def remove_answer(self, question):
        """
        Remove an answer from the key
        
        Args:
            question (str): Question number or identifier
        """
        if str(question) in self.answers:
            del self.answers[str(question)]
    
    def get_answer(self, question):
        """
        Get the correct answer for a question
        
        Args:
            question (str): Question number or identifier
            
        Returns:
            str: Correct answer or None if not found
        """
        return self.answers.get(str(question))
    
    def to_dict(self):
        """
        Convert the answer key to a dictionary
        
        Returns:
            dict: Dictionary representation of the answer key
        """
        return dict(self.answers)
    
    @classmethod
    def from_dict(cls, data):
        """
        Create an answer key from a dictionary
        
        Args:
            data (dict): Dictionary mapping question numbers to correct answers
            
        Returns:
            AnswerKey: New AnswerKey instance
        """
        return cls(answers=data)
    
    def save(self, filename):
        """
        Save the answer key to a JSON file
        
        Args:
            filename (str): Path to save the answer key
        """
        import json
        with open(filename, 'w') as f:
            json.dump(self.answers, f)
    
    @classmethod
    def load(cls, filename):
        """
        Load an answer key from a JSON file
        
        Args:
            filename (str): Path to the answer key file
            
        Returns:
            AnswerKey: Loaded answer key
        """
        import json
        with open(filename, 'r') as f:
            data = json.load(f)
        return cls.from_dict(data)
