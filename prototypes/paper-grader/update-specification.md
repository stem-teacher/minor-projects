# Specification for Enhancing the Semi-Automated Examination Marking System

## Introduction

The existing semi-automated examination marking system has demonstrated effectiveness in processing multiple-choice questions through OCR technology. However, to meet the evolving requirements of the educational institution, several enhancements are necessary to improve configurability, implement class-based directory structures, enhance student identification, and support written-response processing. This document outlines detailed specifications for implementing these improvements to create a more robust, flexible, and comprehensive examination marking solution.

## 1. Configuration Capability Improvements

### 1.1 Configuration File Structure

The system requires a centralized configuration mechanism to specify critical operational parameters through a JSON file.

#### 1.1.1 Configuration File Location and Format
```json
{
  "system": {
    "base_directory": "/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/paper-grader",
    "debug_mode": true,
    "log_level": "INFO"
  },
  "directories": {
    "exams_root": "/path/to/exams",
    "results_output": "/path/to/results",
    "temp_files": "/path/to/temp"
  },
  "exam_structure": {
    "marking_rubric_path": "/path/to/rubric.json",
    "multiple_choice_key": "/path/to/answer_key.json"
  },
  "ocr_settings": {
    "engine": "tesseract",
    "language": "eng",
    "preprocessing": {
      "contrast_enhancement": 1.5,
      "noise_reduction": true,
      "deskew": true
    }
  }
}
```

#### 1.1.2 Implementation Steps

1. Create a new module `config_manager.py` responsible for:
   - Loading the configuration file at system startup
   - Providing a centralized access point for configuration values
   - Validating configuration parameters
   - Falling back to default values when configuration is incomplete

2. Add configuration loading to the application startup process:
```python
def load_configuration(config_path=None):
    """
    Load system configuration from JSON file

    Args:
        config_path (str, optional): Path to configuration file

    Returns:
        dict: System configuration dictionary
    """
    # Default configuration path if not specified
    if not config_path:
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')

    # Load configuration from file
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
            return config
    except Exception as e:
        # Log error and use default configuration
        logging.error(f"Error loading configuration: {str(e)}")
        return DEFAULT_CONFIG
```

## 2. Class-based Directory Structure

### 2.1 Directory Hierarchy

The system should support scanning for examination papers organized by class, where each class has its own subdirectory.

#### 2.1.1 Directory Structure Example

```
exams_root/
├── 7SCI1/
│   ├── class_list.json
│   ├── student1_exam.pdf
│   ├── student2_exam.pdf
│   └── ...
├── 7SCI2/
│   ├── class_list.json
│   ├── student1_exam.pdf
│   ├── student2_exam.pdf
│   └── ...
└── ...
```

#### 2.1.2 Implementation Steps

1. Enhance the directory scanning functionality in `app.py`:

```python
def scan_exam_directories():
    """
    Scan the exam directories structure and identify class directories

    Returns:
        dict: Dictionary mapping class names to their directories and file lists
    """
    config = get_configuration()
    exams_root = config['directories']['exams_root']

    class_directories = {}

    # Scan for class directories
    for item in os.listdir(exams_root):
        class_dir = os.path.join(exams_root, item)
        if os.path.isdir(class_dir):
            # Check for class_list.json existence
            class_list_path = os.path.join(class_dir, 'class_list.json')
            if os.path.exists(class_list_path):
                # Get PDF files in this directory
                exam_files = [f for f in os.listdir(class_dir)
                             if f.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png'))]

                class_directories[item] = {
                    'path': class_dir,
                    'class_list': class_list_path,
                    'exam_files': exam_files
                }

    return class_directories
```

## 3. Class JSON List Integration

### 3.1 JSON Schema and Implementation

Each class directory will contain a `class_list.json` file with student information to be used for matching OCR-extracted student names.

#### 3.1.1 Detailed JSON Schema

```json
{
  "class": "7SCI1",
  "students": [
    {
      "name": "John Smith",
      "studentNumber": "S12345"
    },
    {
      "name": "Jane Doe",
      "studentNumber": "S12346"
    }
  ]
}
```

#### 3.1.2 Implementation Steps

1. Create a new module `class_list_manager.py` to handle class list operations:

```python
class ClassListManager:
    """Class for managing class lists and student information"""

    def __init__(self, class_list_path):
        """
        Initialize the class list manager

        Args:
            class_list_path (str): Path to class list JSON file
        """
        self.class_list_path = class_list_path
        self.class_info = self._load_class_list()
        self.students = self.class_info.get('students', [])

    def _load_class_list(self):
        """
        Load the class list from JSON file

        Returns:
            dict: Class information dictionary
        """
        try:
            with open(self.class_list_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Error loading class list: {str(e)}")
            return {'class': 'Unknown', 'students': []}

    def get_class_name(self):
        """Get the class name"""
        return self.class_info.get('class', 'Unknown')

    def get_students(self):
        """Get the list of students"""
        return self.students

    def match_student_name(self, ocr_name):
        """
        Match OCR-extracted name with students in the class list

        Args:
            ocr_name (str): OCR-extracted student name

        Returns:
            dict: Matched student information or None if no match found
        """
        if not ocr_name:
            return None

        # Normalize names for comparison
        ocr_name_normalized = self._normalize_name(ocr_name)

        # Try exact match first
        for student in self.students:
            if self._normalize_name(student['name']) == ocr_name_normalized:
                return student

        # If no exact match, try fuzzy matching
        best_match = None
        best_score = 0

        for student in self.students:
            score = self._calculate_name_similarity(
                ocr_name_normalized,
                self._normalize_name(student['name'])
            )

            if score > best_score and score > 0.7:  # Threshold for accepting a match
                best_score = score
                best_match = student

        return best_match

    def _normalize_name(self, name):
        """Normalize name for comparison"""
        if not name:
            return ""

        # Convert to lowercase, remove punctuation, and extra spaces
        return re.sub(r'\s+', ' ', re.sub(r'[^\w\s]', '', name.lower())).strip()

    def _calculate_name_similarity(self, name1, name2):
        """
        Calculate similarity between two names

        Args:
            name1 (str): First name
            name2 (str): Second name

        Returns:
            float: Similarity score between 0 and 1
        """
        # Use Levenshtein distance for string similarity
        max_len = max(len(name1), len(name2))
        if max_len == 0:
            return 0

        distance = Levenshtein.distance(name1, name2)
        similarity = 1 - (distance / max_len)

        return similarity
```

## 4. Exam Paper Structure Processing

### 4.1 Exam Structure Definition

The system must process exam papers with a two-part structure:
1. First page: Student information and multiple-choice answers
2. Subsequent pages: Written responses to questions

#### 4.1.1 Implementation Steps

1. Enhance the `process_exam` function in `utils/ocr.py` to handle multi-page processing:

```python
def process_exam(file_path):
    """
    Process an exam paper and extract all relevant information

    Args:
        file_path (str): Path to the exam file

    Returns:
        dict: Dictionary containing extracted information
    """
    # Convert PDF to images
    if file_path.lower().endswith('.pdf'):
        pages = convert_from_path(file_path)
        page_images = [np.array(page) for page in pages]
    else:
        # Handle single-page image
        page_images = [cv2.imread(file_path)]

    # Process first page for student info and multiple choice
    first_page = page_images[0]
    student_info = extract_student_info(first_page)
    multiple_choice_answers = extract_answers(first_page)

    # Process subsequent pages for written responses
    written_responses = []
    for i, page in enumerate(page_images[1:], 1):
        # Extract written responses from this page
        page_responses = extract_written_responses(page, page_number=i)
        written_responses.extend(page_responses)

    return {
        'student_info': student_info,
        'multiple_choice_answers': multiple_choice_answers,
        'written_responses': written_responses
    }
```

2. Create a new function to extract written responses:

```python
def extract_written_responses(image, page_number=1):
    """
    Extract written responses from an exam page

    Args:
        image: OpenCV image object
        page_number (int): Page number for tracking question numbers

    Returns:
        list: List of dictionaries with question numbers and response text
    """
    # Define regions of interest for different questions based on page number
    # This would be calibrated based on the exam template
    question_regions = get_question_regions(page_number)

    responses = []
    for q_num, region in question_regions.items():
        # Extract region from image
        q_region = extract_region(
            image,
            region['top'],
            region['left'],
            region['width'],
            region['height']
        )

        # Apply OCR to extract text
        response_text = ocr_extract_text(q_region)

        responses.append({
            'questionNumber': q_num,
            'responseText': response_text.strip()
        })

    return responses
```

3. Add function to define question regions based on exam template:

```python
def get_question_regions(page_number):
    """
    Get question regions based on page number

    Args:
        page_number (int): Page number

    Returns:
        dict: Dictionary mapping question numbers to their regions
    """
    # For part 2 of the exam (pages after first page)
    if page_number == 1:
        # Question 16
        return {
            "16a": {"top": 680, "left": 120, "width": 600, "height": 50},
            "16b": {"top": 830, "left": 120, "width": 600, "height": 120},
            "16c": {"top": 1010, "left": 120, "width": 600, "height": 50}
        }
    elif page_number == 2:
        # Questions 16d-16h
        return {
            "16d": {"top": 190, "left": 120, "width": 600, "height": 50},
            "16e": {"top": 340, "left": 120, "width": 600, "height": 200},
            "16f": {"top": 900, "left": 120, "width": 600, "height": 120}
        }
    elif page_number == 3:
        # Question 17 and 18a
        return {
            "17": {"top": 190, "left": 120, "width": 600, "height": 400},
            "18a": {"top": 700, "left": 120, "width": 600, "height": 100}
        }
    elif page_number == 4:
        # Question 18b and 19
        return {
            "18b": {"top": 190, "left": 120, "width": 600, "height": 200},
            "19a": {"top": 550, "left": 120, "width": 600, "height": 100},
            "19b": {"top": 700, "left": 120, "width": 600, "height": 100}
        }

    # Default empty regions
    return {}
```

## 5. OCR-driven Student Identification and Matching

### 5.1 Student Name Extraction and Matching

The system will extract student names from the handwritten input on the exam and match them with entries in the class list.

#### 5.1.1 Implementation Steps

1. Enhance the student information extraction in `ocr.py`:

```python
def extract_and_match_student(image, class_manager):
    """
    Extract student name from image and match with class list

    Args:
        image: OpenCV image object
        class_manager: ClassListManager instance

    Returns:
        dict: Student information with matching
    """
    # Extract student name from image
    student_area = extract_region(
        image,
        Config.STUDENT_NAME_AREA['top'],
        Config.STUDENT_NAME_AREA['left'],
        Config.STUDENT_NAME_AREA['width'],
        Config.STUDENT_NAME_AREA['height']
    )

    # Use OCR to extract text
    ocr_name = ocr_extract_text(student_area).strip()

    # Match with class list
    matched_student = class_manager.match_student_name(ocr_name)

    student_info = {
        'extracted_name': ocr_name,
        'class': extract_class_indicator(image)
    }

    # Add matched information if available
    if matched_student:
        student_info['matched_name'] = matched_student['name']
        student_info['student_number'] = matched_student['studentNumber']
        student_info['confidence'] = matched_student.get('match_confidence', 0)

    return student_info
```

2. Add function to annotate the exam with matched student information:

```python
def annotate_exam_with_student_info(image, student_info):
    """
    Annotate exam image with matched student information

    Args:
        image: OpenCV image object
        student_info: Dictionary with student information

    Returns:
        image: Annotated image
    """
    annotated = image.copy()

    # Define location to add annotation (below student name area)
    annotation_top = Config.STUDENT_NAME_AREA['top'] + Config.STUDENT_NAME_AREA['height'] + 10
    annotation_left = Config.STUDENT_NAME_AREA['left']

    # Format annotation text
    if 'matched_name' in student_info and 'student_number' in student_info:
        annotation_text = f"Matched: {student_info['matched_name']} ({student_info['student_number']})"
    else:
        annotation_text = "No match found in class list"

    # Add text to image
    cv2.putText(
        annotated,
        annotation_text,
        (annotation_left, annotation_top),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 0, 255),  # Red color
        2
    )

    return annotated
```

## 6. OCR Extraction and JSON Response Generation

### 6.1 Structured Response JSON Format

For each processed exam, the system will generate a JSON file containing the extracted written responses.

#### 6.1.1 Response JSON Schema

```json
{
  "studentName": "John Smith",
  "studentNumber": "S12345",
  "responses": [
    {
      "questionNumber": "16a",
      "responseText": "To find the effect that different temperatures had on the amount of residue from the solution."
    },
    {
      "questionNumber": "16b",
      "responseText": "The dependent variables were the amount of dissolved crystals and the independent variable was the temperature."
    }
  ]
}
```

#### 6.1.2 Implementation Steps

1. Create a function to generate the response JSON file:

```python
def generate_response_json(student_info, written_responses, output_dir):
    """
    Generate a JSON file containing student responses

    Args:
        student_info (dict): Student information
        written_responses (list): List of written responses
        output_dir (str): Directory to save the JSON file

    Returns:
        str: Path to the generated JSON file
    """
    # Create response data structure
    response_data = {
        "studentName": student_info.get('matched_name', student_info.get('extracted_name', 'Unknown')),
        "studentNumber": student_info.get('student_number', 'Unknown'),
        "responses": written_responses
    }

    # Create filename based on student number and name
    student_number = student_info.get('student_number', 'unknown')
    student_name = student_info.get('matched_name', student_info.get('extracted_name', 'Unknown'))

    # Sanitize student name for filename
    sanitized_name = re.sub(r'[^\w\s-]', '', student_name).strip().replace(' ', '-')

    filename = f"{student_number}-{sanitized_name}-responses.json"
    file_path = os.path.join(output_dir, filename)

    # Save to file
    try:
        with open(file_path, 'w') as f:
            json.dump(response_data, f, indent=2)
        return file_path
    except Exception as e:
        logging.error(f"Error saving response JSON: {str(e)}")
        return None
```

2. Integrate the response generation into the main processing flow:

```python
def process_exam_paper(file_path, class_manager, output_dir):
    """
    Process a single exam paper

    Args:
        file_path (str): Path to the exam file
        class_manager: ClassListManager instance
        output_dir (str): Directory to save results

    Returns:
        dict: Processing results
    """
    # Extract all information from the exam
    exam_data = process_exam(file_path)

    # Match student with class list
    student_info = extract_and_match_student(exam_data['first_page'], class_manager)

    # Process multiple choice answers
    mc_answers = exam_data['multiple_choice_answers']

    # Process written responses
    written_responses = exam_data['written_responses']

    # Generate response JSON
    json_path = generate_response_json(student_info, written_responses, output_dir)

    # Return processing results
    return {
        'student_info': student_info,
        'mc_answers': mc_answers,
        'written_responses': written_responses,
        'json_path': json_path
    }
```

## 7. Calibration Based on Provided Exam Samples

### 7.1 Sample-based Calibration Process

The system will utilize the provided blank (prompts/blank-exam.pdf) and completed exam (prompts/sample-completed-exampdf) samples to calibrate the OCR extraction regions and parameters.

#### 7.1.1 Implementation Steps

1. Create a calibration module to analyze the exam templates:

```python
def calibrate_from_samples(blank_exam_path, completed_exam_path):
    """
    Calibrate OCR parameters based on sample exams

    Args:
        blank_exam_path (str): Path to blank exam template
        completed_exam_path (str): Path to completed exam sample

    Returns:
        dict: Calibrated parameters
    """
    # Load exam images
    blank_pages = convert_pdf_to_images(blank_exam_path)
    completed_pages = convert_pdf_to_images(completed_exam_path)

    # Detect regions on blank template
    multiple_choice_region = detect_multiple_choice_grid(blank_pages[0])
    student_info_region = detect_student_info_region(blank_pages[0])
    written_question_regions = detect_written_question_regions(blank_pages[1:])

    # Analyze completed exam to calibrate OCR parameters
    optimal_preprocessing = optimize_preprocessing_parameters(completed_pages[0])
    name_recognition_parameters = calibrate_name_recognition(completed_pages[0], student_info_region)
    answer_detection_parameters = calibrate_answer_detection(completed_pages[0], multiple_choice_region)

    # Save calibration parameters
    calibration = {
        'regions': {
            'student_name': student_info_region,
            'multiple_choice': multiple_choice_region,
            'written_questions': written_question_regions
        },
        'preprocessing': optimal_preprocessing,
        'recognition': {
            'name': name_recognition_parameters,
            'answers': answer_detection_parameters
        }
    }

    return calibration
```

2. Create supporting functions for detection and calibration:

```python
def detect_multiple_choice_grid(image):
    """
    Detect the multiple choice grid on the exam template

    Args:
        image: Image of exam page

    Returns:
        dict: Coordinates and dimensions of the grid
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Find large rectangular contours that could be tables
    grid_candidates = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w > image.shape[1] * 0.5 and h > image.shape[0] * 0.2:
            grid_candidates.append((x, y, w, h))

    # Sort by area and take the largest as the grid
    if grid_candidates:
        grid_candidates.sort(key=lambda rect: rect[2] * rect[3], reverse=True)
        x, y, w, h = grid_candidates[0]

        # Detect individual cells in the grid
        cells = detect_grid_cells(gray[y:y+h, x:x+w])

        return {
            'top': y,
            'left': x,
            'width': w,
            'height': h,
            'cells': cells
        }

    # Fallback to default values if grid not detected
    return DEFAULT_GRID_REGION
```

## 8. Recommended Technologies and Methodologies

### 8.1 OCR Technology Recommendations

For optimal OCR performance, we recommend the following:

1. **Primary OCR Engine**: Tesseract OCR 5.0+ with LSTM engine
   - Superior handwriting recognition capabilities
   - Language model training possibilities for educational contexts
   - Active development and community support

2. **Image Preprocessing Pipeline**:
   - Deskewing: Correct page orientation for accurate recognition
   - Noise reduction: Remove speckles and artifacts
   - Binarization: Convert grayscale to black and white for clearer boundaries
   - Contrast enhancement: Improve text visibility

3. **Student Name Matching Algorithm**:
   - Levenshtein distance for approximate string matching
   - N-gram comparison for partial matches
   - Phonetic algorithms (Soundex, Metaphone) for handling spelling variations

4. **Configuration Management**:
   - JSON format for human-readability and editing
   - Environment variable overrides for deployment flexibility
   - Validation schema to prevent configuration errors

### 8.2 Best Practices for OCR Accuracy

1. **Image Quality Guidelines**:
   - Minimum 300 DPI for scanning exam papers
   - Consistent lighting and contrast
   - Proper alignment during scanning

2. **Written Response Extraction**:
   - Process line by line for better handling of handwriting
   - Apply contextual post-processing for academic terminology
   - Implement confidence thresholds to flag low-confidence extractions for review

3. **Multiple-Choice Detection**:
   - Use morphological operations to enhance marked options
   - Implement heatmap-based intensity analysis for partially marked answers
   - Calculate fill percentage for each option cell

## 9. Best Practices, Data Validation & Error Reduction

### 9.1 Data Validation Strategies

1. **Input Validation**:
   - Validate configuration file structure and required parameters
   - Verify exam file formats and readability
   - Check class list JSON for required fields and format

2. **Processing Validation**:
   - Implement confidence scores for OCR results
   - Flag anomalies in extracted data for manual review
   - Validate exam structure against expected templates

3. **Output Validation**:
   - Verify generated JSON files against schema
   - Ensure unique student identification in outputs
   - Validate completeness of extracted responses

### 9.2 Error Handling and Recovery

1. **Robust Error Handling**:
   - Log detailed error information for troubleshooting
   - Implement graceful degradation when optimal processing fails
   - Provide clear error messages in the user interface

2. **Recovery Mechanisms**:
   - Resume batch processing from failure points
   - Maintain partial results when complete processing fails
   - Implement backup and restore capabilities for critical data

3. **Manual Review Interface**:
   - Flag low-confidence extractions for review
   - Provide side-by-side comparison of original and extracted text
   - Implement efficient correction mechanisms

## 10. Implementation Plan

To implement these enhancements effectively, we recommend the following phased approach:

### 10.1 Phase 1: Configuration and Directory Structure
1. Implement configuration file loading and validation
2. Enhance directory scanning for class-based structure
3. Develop class list parsing and validation

### 10.2 Phase 2: Student Matching and Identification
1. Implement student name extraction enhancements
2. Develop name matching algorithms
3. Create exam annotation with matched student information

### 10.3 Phase 3: Written Response Processing
1. Enhance OCR for multi-page processing
2. Implement written response region detection
3. Develop response extraction and formatting

### 10.4 Phase 4: Integration and Testing
1. Integrate all components into the main processing flow
2. Implement calibration using sample exams
3. Conduct comprehensive testing with various exam samples

## 11. Conclusion

The proposed enhancements will significantly improve the capabilities and flexibility of the semi-automated examination marking system. By implementing a configuration-based approach, supporting class-based organization, enhancing student identification, and adding written response processing, the system will provide a more comprehensive solution for educational assessment.

The integration of OCR-driven student identification with class lists will improve accuracy and reliability, while the structured JSON output for written responses will facilitate further analysis and integration with other educational systems. The calibration process using sample exams will ensure optimal recognition for the specific examination format used by the institution.

These enhancements represent a significant advancement in the system's capabilities, making it a more valuable tool for educators and administrators while reducing the time and effort required for examination marking and analysis.
