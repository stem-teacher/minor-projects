# Multiple Choice Marking Guide - Requirements Specification

## 1. Introduction

### 1.1 Purpose
The Multiple Choice Marking Guide program automates the application of standardized marking annotations to multiple-choice exam papers. This tool streamlines the grading process by copying annotation patterns from a template PDF to the first page of target PDFs.

### 1.2 Scope
This application will extract annotation elements from a sample marked PDF and apply them to unmarked exam papers. It will process directories of PDF files and produce new annotated versions without modifying the originals.

### 1.3 Definitions
- **Template PDF**: A sample PDF with the desired marking annotations applied (the "after-marking.pdf" example)
- **Target PDFs**: Unmarked PDFs that need annotation (before-marking.pdf and similar files)
- **Marking Guide**: The collection of annotation elements that indicate correct answers
- **Annotation**: A PDF object that represents a mark, highlight, or shape added to a PDF

## 2. Functional Requirements

### 2.1 Core Functionality

#### 2.1.1 Annotation Extraction
- The system SHALL extract all annotation elements from the first page of a template PDF
- The system SHALL identify the type, position, and properties of each annotation
- The system SHALL filter annotations to include only those relevant to marking
- The system SHALL preserve the visual characteristics of annotations
- The system SHALL handle multiple annotation types (circles, checkmarks, highlights, etc.)

#### 2.1.2 Directory Processing
- The system SHALL process directories of PDF files recursively
- The system SHALL support filtering of input files by pattern
- The system SHALL maintain directory structure in output
- The system SHALL skip already processed files (optional override)
- The system SHALL report progress during processing

#### 2.1.3 Annotation Application
- The system SHALL apply extracted annotations to the first page of each target PDF
- The system SHALL position annotations exactly as they appear in the template
- The system SHALL preserve all visual properties of annotations
- The system SHALL handle different page sizes and orientations
- The system SHALL not modify other pages in the target PDFs

#### 2.1.4 Output Generation
- The system SHALL generate new PDFs with annotations applied
- The system SHALL save output files with a configurable naming scheme
- The system SHALL not modify original input files
- The system SHALL report statistics on applied annotations
- The system SHALL validate all output files

### 2.2 User Interface

#### 2.2.1 Command Line Interface
- The system SHALL provide a command-line interface for operation
- The system SHALL accept the following parameters:
  - Template PDF file path
  - Input directory path
  - Output directory path
  - Recursive processing flag
  - File pattern matching
  - Overwrite existing files flag
  - Verbose output flag
  - Dry-run option

#### 2.2.2 Output and Logging
- The system SHALL provide clear progress information
- The system SHALL report errors with specific contexts
- The system SHALL generate a summary report of operations
- The system SHALL support multiple log levels
- The system SHALL log all operations to a configurable location

## 3. Non-Functional Requirements

### 3.1 Performance
- The system SHALL process at least 10 PDF files per minute on standard hardware
- The system SHALL handle PDFs up to 10MB in size
- The system SHALL not consume more than 500MB of memory under normal conditions
- The system SHALL support parallel processing for large batches

### 3.2 Usability
- The system SHALL provide helpful error messages
- The system SHALL offer command help via --help
- The system SHALL validate all inputs before processing
- The system SHALL confirm operations that might overwrite files

### 3.3 Reliability
- The system SHALL validate input PDFs before processing
- The system SHALL recover from errors with individual files
- The system SHALL complete batch processing despite individual file failures
- The system SHALL report all failures in a structured format

### 3.4 Compatibility
- The system SHALL handle PDFs conforming to PDF specification 1.4 and above
- The system SHALL support various annotation types
- The system SHALL handle different page sizes and orientations
- The system SHALL preserve PDF metadata

## 4. Implementation Constraints

### 4.1 Technology Stack
- The system SHALL be implemented in Rust
- The system SHALL use the same PDF libraries as the existing annotator
- The system SHALL be structured as an additional binary in the existing project
- The system SHALL share common utility code with the existing annotator
- The system SHALL be compatible with the existing project's build system

### 4.2 Development Process
- The implementation SHALL follow a test-driven development approach
- The implementation SHALL include comprehensive unit and integration tests
- The implementation SHALL conform to Rust best practices
- The implementation SHALL include proper documentation

## 5. Test Requirements

### 5.1 Test Cases
- Tests SHALL verify correct extraction of annotations
- Tests SHALL verify accurate application of annotations
- Tests SHALL verify proper handling of various PDF types
- Tests SHALL verify error conditions and recovery
- Tests SHALL verify command-line options behave correctly

### 5.2 Test Data
- Test data SHALL include sample PDFs with various annotation types
- Test data SHALL include PDFs with different page sizes
- Test data SHALL include malformed PDFs to test error handling
- Test data SHALL include large PDFs to test performance

## 6. Lessons Applied from Previous Project

### 6.1 Font and Resource Handling
- The system SHALL use a consistent approach to font resources
- The system SHALL check for existing resources before adding new ones
- The system SHALL standardize annotation properties formats

### 6.2 Error Handling
- The system SHALL implement robust error handling
- The system SHALL provide detailed diagnostics
- The system SHALL include a separate diagnostic tool
- The system SHALL log all operations consistently

### 6.3 Structure and Organization
- The system SHALL follow a modular architecture
- The system SHALL share core functionality with the existing application
- The system SHALL implement a structured validation process
- The system SHALL provide diagnostic tools for troubleshooting

## 7. Acceptance Criteria

The Multiple Choice Marking Guide will be considered complete when:

1. It successfully extracts all marking annotations from a template PDF
2. It correctly applies these annotations to target PDFs
3. The output PDFs maintain all visual characteristics of the source annotations
4. The program handles all specified error conditions gracefully
5. The program meets all performance requirements
6. Comprehensive tests verify all functionality
7. Documentation is complete and accurate

## 8. Use Cases

### 8.1 Basic Use Case
A teacher has 180 multiple-choice exams to grade. They mark one exam completely using their PDF annotation tools, creating circles, highlights, or check marks to indicate correct answers. They then run the Multiple Choice Marking Guide program, targeting their marked example as the template and a directory containing all unmarked exams as input. The program produces 180 new PDFs with the marking guide applied to the first page of each, allowing for consistent and efficient grading.

### 8.2 Advanced Use Cases
- Processing multiple different exam types with different templates
- Using different annotation types for different question types
- Batch processing across multiple directories
- Integration with existing grading workflows
