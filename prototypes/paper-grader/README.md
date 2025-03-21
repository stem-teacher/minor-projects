# Semi-Automated High School Exam Marking and Analysis System

This system automates the process of marking multiple-choice exam papers using Optical Character Recognition (OCR) technology, reducing the time and effort required by teachers while providing detailed analytics and insights.

## Features

- **OCR Processing**: Extract student information and answers from scanned exam papers
- **Automated Grading**: Compare student answers with answer keys to calculate scores
- **Manual Review**: Review and correct any misrecognized information through a user-friendly interface
- **Detailed Analytics**: Generate statistics, visualizations, and insights about student performance
- **Export Functionality**: Export results in various formats (CSV, JSON) for further analysis
- **Batch Processing**: Process multiple exam papers at once

## Technical Architecture

The system is built with the following components:

- **Backend**: Python with Flask web framework
- **OCR Engine**: Tesseract OCR for text recognition
- **Image Processing**: OpenCV for image preprocessing and analysis
- **Data Analysis**: Pandas and NumPy for data manipulation
- **Visualization**: Matplotlib for generating charts and graphs
- **Frontend**: HTML, CSS, JavaScript with Bootstrap framework

## Getting Started

### Prerequisites

- Python 3.9 or higher
- Tesseract OCR installed on your system
- Virtual environment (recommended)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd paper-grader
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install required dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Install Tesseract OCR:
   - On macOS: `brew install tesseract`
   - On Ubuntu/Debian: `sudo apt-get install tesseract-ocr`
   - On Windows: Download and install from [https://github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)

### Configuration

The system configuration is stored in `config.py`. You may need to adjust settings such as:

- Path to Tesseract executable
- OCR language settings
- Image preprocessing parameters
- Exam form layout coordinates

### Usage

1. Start the Flask application:
   ```
   python app.py
   ```

2. Open a web browser and navigate to `http://localhost:5000`

3. Follow the workflow:
   - Upload scanned exam papers
   - Define the answer key
   - Process the exams
   - Review and correct results if necessary
   - Analyze performance and export data

### Testing

The system includes several test scripts to verify functionality:

- `test_ocr.py`: Test OCR functionality on an exam paper
- `test_grading.py`: Test grading functionality with sample data
- `test_full_system.py`: Test the complete workflow
- `generate_sample_exam.py`: Generate sample filled-in exam papers for testing

Use the Makefile for common tasks:
```
make test-ocr FILE=path/to/exam.jpg DISPLAY=--display
make test-grading
make test-system ARGS="--image path/to/exam.jpg --display"
make generate-samples
```

## Project Structure

```
paper-grader/
├── app.py                 # Main Flask application
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── README.md              # This documentation file
├── Makefile               # Build and run commands
├── static/                # Static assets for web UI
│   ├── css/               # CSS stylesheets
│   ├── js/                # JavaScript files
│   └── img/               # Images and icons
├── templates/             # HTML templates for web UI
├── uploads/               # Directory for uploaded exam scans
├── results/               # Directory for processed results
├── models/                # Data models
└── utils/                 # Utility functions
    ├── ocr.py             # OCR processing functions
    ├── grading.py         # Grading functions
    ├── analytics.py       # Analytics functions
    └── image_processing.py # Image preprocessing functions
```

## Best Practices for Exam Scanning

For optimal OCR results:

1. Ensure good lighting conditions when scanning
2. Use at least 300 DPI for scanned images
3. Ensure the paper is properly aligned
4. Make sure student markings are clear and dark
5. Avoid wrinkles, folds, or stains on the paper

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Tesseract OCR for text recognition
- OpenCV for image processing
- Flask for web framework
