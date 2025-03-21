#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Semi-Automated High School Exam Marking and Analysis System
Main application file
"""

import os
import json
import datetime
from flask import Flask, request, render_template, redirect, url_for, flash, jsonify, send_file
from werkzeug.utils import secure_filename
from flask_bootstrap import Bootstrap

# Import utility modules
from utils.ocr import process_exam, extract_student_info, extract_answers
from utils.grading import grade_exam, calculate_statistics
from utils.analytics import generate_class_report, generate_question_analysis
from utils.image_processing import preprocess_image
from models.exam import ExamResult, AnswerKey
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
Bootstrap(app)

# Create necessary directories if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULTS_FOLDER'], exist_ok=True)

# Load existing results from JSON if available
def load_results():
    results_file = os.path.join(app.config['RESULTS_FOLDER'], 'results.json')
    if os.path.exists(results_file):
        with open(results_file, 'r') as f:
            return json.load(f)
    return []

# Save results to JSON
def save_results(results):
    results_file = os.path.join(app.config['RESULTS_FOLDER'], 'results.json')
    with open(results_file, 'w') as f:
        json.dump(results, f)

# Main route - dashboard
@app.route('/')
def index():
    results = load_results()
    return render_template('index.html', results=results, now=datetime.datetime.now())

# Upload exam papers
@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        # Check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part')
            return redirect(request.url)
        
        files = request.files.getlist('file')
        
        # If user submits empty form
        if not files or files[0].filename == '':
            flash('No selected file')
            return redirect(request.url)
        
        filenames = []
        for file in files:
            if file and file.filename.split('.')[-1].lower() in app.config['ALLOWED_EXTENSIONS']:
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                filenames.append(filename)
            else:
                flash(f'Unsupported file format: {file.filename}')
        
        if filenames:
            flash(f'Successfully uploaded {len(filenames)} files')
            return redirect(url_for('process_files'))
    
    return render_template('upload.html', now=datetime.datetime.now())

# Process uploaded files
@app.route('/process', methods=['GET', 'POST'])
def process_files():
    if request.method == 'POST':
        # Get answer key from form
        answer_key = {}
        for i in range(1, 17):  # For 16 questions
            key = request.form.get(f'q{i}')
            if key:
                answer_key[str(i)] = key
        
        # Save answer key
        with open(os.path.join(app.config['RESULTS_FOLDER'], 'answer_key.json'), 'w') as f:
            json.dump(answer_key, f)
        
        # Process all uploaded files
        uploads = [f for f in os.listdir(app.config['UPLOAD_FOLDER']) 
                  if os.path.isfile(os.path.join(app.config['UPLOAD_FOLDER'], f))]
        
        results = []
        for filename in uploads:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Process the exam
            try:
                # Preprocess image
                processed_image = preprocess_image(file_path)
                
                # Extract student info and answers
                student_info = extract_student_info(processed_image)
                answers = extract_answers(processed_image)
                
                # Grade the exam
                score, marked_answers = grade_exam(answers, answer_key)
                
                # Create result object
                result = {
                    'filename': filename,
                    'student_name': student_info.get('name', 'Unknown'),
                    'class': student_info.get('class', 'Unknown'),
                    'score': score,
                    'total': len(answer_key),
                    'answers': marked_answers,
                    'processed_at': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
                
                results.append(result)
                
            except Exception as e:
                flash(f'Error processing {filename}: {str(e)}')
        
        # Save all results
        all_results = load_results()
        all_results.extend(results)
        save_results(all_results)
        
        flash(f'Successfully processed {len(results)} exam papers')
        return redirect(url_for('results'))
    
    # GET request: show form to input answer key
    return render_template('process.html', now=datetime.datetime.now())

# View and edit results
@app.route('/results')
def results():
    results = load_results()
    return render_template('results.html', results=results, now=datetime.datetime.now())

# Edit a specific result
@app.route('/edit/<int:result_id>', methods=['GET', 'POST'])
def edit_result(result_id):
    results = load_results()
    
    if request.method == 'POST':
        # Update result with form data
        results[result_id]['student_name'] = request.form.get('student_name')
        results[result_id]['class'] = request.form.get('class')
        
        # Update answers
        for i in range(1, 17):  # For 16 questions
            q_key = f'q{i}'
            if q_key in request.form:
                results[result_id]['answers'][str(i)] = request.form.get(q_key)
        
        # Recalculate score
        correct_count = sum(1 for q, a in results[result_id]['answers'].items() 
                        if a == load_answer_key().get(q))
        results[result_id]['score'] = correct_count
        
        # Save updated results
        save_results(results)
        flash('Result updated successfully')
        return redirect(url_for('results'))
    
    return render_template('edit.html', result=results[result_id], result_id=result_id, now=datetime.datetime.now())

# Load answer key
def load_answer_key():
    key_file = os.path.join(app.config['RESULTS_FOLDER'], 'answer_key.json')
    if os.path.exists(key_file):
        with open(key_file, 'r') as f:
            return json.load(f)
    return {}

# Analytics page
@app.route('/analytics')
def analytics():
    results = load_results()
    
    if not results:
        flash('No results available for analysis')
        return redirect(url_for('index'))
    
    # Generate analytics
    class_stats = calculate_statistics(results)
    
    # Group by class
    classes = {}
    for result in results:
        class_name = result['class']
        if class_name not in classes:
            classes[class_name] = []
        classes[class_name].append(result)
    
    return render_template('analytics.html', 
                          stats=class_stats, 
                          classes=classes,
                          now=datetime.datetime.now())

# Export results
@app.route('/export/<format>')
def export_results(format):
    results = load_results()
    
    if format == 'csv':
        # Convert to CSV
        import pandas as pd
        import io
        
        # Convert results to DataFrame
        df = pd.DataFrame(results)
        
        # Create in-memory file
        output = io.StringIO()
        df.to_csv(output, index=False)
        
        # Create response
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'exam_results_{datetime.datetime.now().strftime("%Y%m%d")}.csv'
        )
    
    elif format == 'json':
        return jsonify(results)
    
    else:
        flash('Unsupported export format')
        return redirect(url_for('results'))

# Run the application
if __name__ == '__main__':
    app.run(debug=True)
