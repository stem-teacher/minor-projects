# Semi-Automated High School Exam Marking and Analysis System

## Implementation Status

✅ **SYSTEM DEPLOYED AND RUNNING**

The system has been successfully set up with:
- Tesseract OCR installed
- Python environment configured with all required dependencies
- Necessary directories created
- Flask web server running

To use the system:
1. Activate the virtual environment: `source venv/bin/activate`
2. Start the Flask application: `python app.py`
3. Access the web interface at: http://127.0.0.1:5000

## System Overview

This system provides a comprehensive solution for automating the marking of multiple-choice exam papers in educational environments. It uses Optical Character Recognition (OCR) to extract student information and answers from scanned exam papers, compares them with an answer key, and generates analytics for student performance.

## Key Features

- **OCR Processing**: Extract student information and marked answers from scanned exam papers
- **Automated Grading**: Compare answers with a predefined key to calculate scores
- **Manual Review Interface**: Review and correct any OCR or grading errors
- **Detailed Analytics**: Generate statistics and visualizations for student and class performance
- **Export Functionality**: Export results in various formats (CSV, JSON) for further analysis

## Setup Guide

### Prerequisites

- Python 3.9+ installed
- pip package manager
- Virtual environment (recommended)
- Tesseract OCR installed on your system

### Step 1: Install Tesseract OCR

Before installing the Python dependencies, you need to install Tesseract OCR on your system:

- **macOS**: 
  ```bash
  brew install tesseract
  ```

- **Ubuntu/Debian**: 
  ```bash
  sudo apt-get update
  sudo apt-get install tesseract-ocr
  ```

- **Windows**: 
  1. Download the installer from https://github.com/UB-Mannheim/tesseract/wiki
  2. Run the installer and remember the installation path
  3. Update the `TESSERACT_CMD` path in `config.py` with your installation path

### Step 2: Set Up Python Environment

1. Navigate to the project directory:
   ```bash
   cd /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/paper-grader
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Step 3: Prepare Sample Data (Optional)

If you want to test the system before using your own exam papers:

1. Generate sample exam papers:
   ```bash
   python generate_sample_exam.py --answer-key sample_answer_key.json
   ```

2. These sample exams will be created in the `generated_exams` directory.

## Using the System

### Method 1: Web Interface (Recommended)

1. Start the Flask application:
   ```bash
   python app.py
   ```

2. Open a web browser and navigate to http://localhost:5000

3. Follow the workflow:
   - Upload scanned exam papers
   - Define the answer key
   - Process the exam papers
   - Review and correct results
   - Generate and export analytics

### Method 2: Command Line Interface

For testing or batch processing without the web interface:

1. Test OCR functionality on a single exam paper:
   ```bash
   python test_ocr.py path/to/exam.jpg --display
   ```

2. Test the full system on a single exam paper:
   ```bash
   python test_full_system.py --image path/to/exam.jpg --key sample_answer_key.json --display --save-results
   ```

3. Process a batch of exam papers:
   ```bash
   python test_full_system.py --batch path/to/exams/directory --key sample_answer_key.json --save-results
   ```

## System Configuration

The system configuration is stored in `config.py`. You may need to adjust the following settings:

### OCR Settings

- `TESSERACT_CMD`: Path to the Tesseract executable
- `OCR_LANGUAGE`: Language for OCR (default: 'eng')

### Image Processing Settings

- `PREPROCESSING_ENABLED`: Enable/disable image preprocessing
- `CONTRAST_ENHANCEMENT`: Level of contrast enhancement
- `BRIGHTNESS_ADJUSTMENT`: Level of brightness adjustment
- `THRESHOLD_VALUE`: Threshold value for binarization

### Exam Form Layout

The system needs to know where to look for student information and answers on the exam paper. Update these coordinates based on your exam template:

- `STUDENT_NAME_AREA`: Coordinates for student name field
- `CLASS_AREA`: Coordinates for class field
- `ANSWER_GRID_START`: Top-left coordinates of the answer grid
- `ANSWER_GRID_SPACING`: Spacing between rows and columns in the grid

## Best Practices for Optimal Results

1. **Exam Template Design**:
   - Use a consistent template for all exams
   - Ensure clear boundaries between answer options
   - Include registration marks or borders for better alignment detection

2. **Scanning Quality**:
   - Use at least 300 DPI for scanned images
   - Ensure good lighting conditions
   - Make sure the paper is properly aligned
   - Avoid shadows, wrinkles, or folds

3. **Student Instructions**:
   - Instruct students to make clear, dark marks
   - Fill answer boxes completely (or use X marks consistently)
   - Not to make stray marks or corrections

4. **System Usage**:
   - Always review OCR results before finalizing
   - Calibrate coordinates in `config.py` for your specific form
   - Process a small batch first to verify settings

## Troubleshooting

### OCR Issues

- **Problem**: Student names or classes not recognized correctly
  - **Solution**: Adjust the coordinates in `config.py` to match your form layout
  - **Solution**: Ensure good scan quality with proper lighting and alignment

- **Problem**: Answer grid not correctly detected
  - **Solution**: Adjust `ANSWER_GRID_START` and `ANSWER_GRID_SPACING` in `config.py`
  - **Solution**: Ensure students are making clear, dark marks

### Processing Issues

- **Problem**: System running slowly when processing multiple exams
  - **Solution**: Reduce image resolution or disable some preprocessing steps
  - **Solution**: Process in smaller batches

- **Problem**: Errors when starting the application
  - **Solution**: Ensure all dependencies are installed correctly
  - **Solution**: Check that Tesseract OCR is installed and the path is correct in `config.py`

### Interface Issues

- **Problem**: Web interface not loading properly
  - **Solution**: Check for console errors in your browser
  - **Solution**: Ensure all static files are in the correct location

## Extending the System

The system is designed to be modular and extensible. Here are some ways you can extend it:

1. **Support for Additional Question Types**:
   - Modify `utils/ocr.py` to recognize other answer formats
   - Update the grading logic in `utils/grading.py`

2. **Enhanced Analytics**:
   - Add new visualizations in `utils/analytics.py`
   - Implement additional statistical measures

3. **Integration with LMS**:
   - Add export functions for learning management systems
   - Implement API endpoints for integration

4. **Multiple Choice with Multiple Answers**:
   - Modify the OCR detection to handle multiple marked answers
   - Update the grading logic to account for partial credit

## Maintenance and Updates

- Regularly backup the `results` directory to prevent data loss
- Keep Tesseract OCR and Python dependencies updated
- Monitor OCR accuracy over time and retrain/recalibrate as needed

For further assistance or feature requests, refer to the documentation or contact the development team.
