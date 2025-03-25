# Precise Implementation Plan for PDF Filename Annotator

This document outlines the implementation plan for the PDF Filename Annotator project, focused on tangible, testable outcomes. All tasks follow the test-first development methodology detailed in [IMPLEMENTATION_METHODOLOGY.md](IMPLEMENTATION_METHODOLOGY.md) and are tracked in [CHECKLIST.md](CHECKLIST.md).

## Phase 1: Verify and Fix Existing Code

### Task 1.1: Verify Existing Code Builds
**Outcome**: The project builds successfully with `cargo check`.
- Verify all dependencies use consistent versioning pattern
- Run `cargo check` to identify any compilation issues
- Fix any compilation errors in the processor.rs annotate_page function
- Document any API discrepancies in API_CORRECTIONS.md

### Task 1.2: Develop Basic E2E Test
**Outcome**: A test that copies an unannotated PDF, reads the filename, and writes it to an annotated output file.
- Create a test that uses existing code to process a sample PDF
- Verify the test illustrates the core filename annotation functionality
- Document the test approach in LEARNING_LOG.md
- Fix any issues identified during test creation

## Phase 2: Core Functionality Verification

### Task 2.1: Validate PDF Annotation
**Outcome**: Verified functionality adding a filename to the top-right corner of PDF pages.
- Test with sample files from test-examples directory
- Verify annotations appear correctly on all pages
- Validate filenames are correctly extracted and displayed
- Compare output files with expected results

### Task 2.2: Implement Configuration Options
**Outcome**: Working configuration options for annotation position and font settings.
- Test loading configuration from JSON file
- Validate position settings (top-right, top-left, etc.)
- Test font size configuration
- Verify error handling for invalid configuration

## Phase 3: Robust Error Handling

### Task 3.1: Directory Handling
**Outcome**: Robust handling of input and output directories.
- Test for missing or inaccessible directories
- Implement logical error messages for directory issues
- Verify recursive directory option works correctly
- Test with various directory structures

### Task 3.2: PDF File Processing Errors
**Outcome**: Graceful handling of PDF processing errors.
- Test with malformed or corrupted PDF files
- Implement proper error recovery to continue batch processing
- Verify reporting of file-specific errors
- Document error handling approach

### Task 3.3: Fix Scanned PDF Issues
**Outcome**: Correctly annotated scanned PDFs with annotations on all pages and no blank pages.
- Address issues identified in the code review (review/code_review.md)
- Fix content stream handling to preserve original image content
- Implement proper resource dictionary merging
- Use correct generation numbers for page references
- Verify fixes with a variety of scanned PDFs
- Create comprehensive tests for scanner PDF scenarios

## Phase 4: Finalization

### Task 4.1: Documentation
**Outcome**: Complete, accurate documentation for users and developers.
- Ensure all public functions have proper documentation
- Create user guide with examples
- Document configuration options
- Add build and installation instructions

### Task 4.2: Performance Testing
**Outcome**: Verified performance with typical use cases.
- Test with batches of multiple PDF files
- Measure and document performance metrics
- Optimize for common use cases
- Create benchmark tests for future comparison

---

## Implementation Notes
- All implementation must follow the test-first approach in [IMPLEMENTATION_METHODOLOGY.md](IMPLEMENTATION_METHODOLOGY.md)
- Task details and completion status are tracked in [CHECKLIST.md](CHECKLIST.md)
- API discrepancies should be documented in API_CORRECTIONS.md
- Current status and progress information belongs in CURRENT_STATE.md
- Issues identified in review/code_review.md should be addressed in Task 3.3
- External model code review (via openai-reasoning) should be used to validate fixes

The primary goal is a working PDF Filename Annotator that reliably annotates PDF files with their filenames in the appropriate position, with proper configuration options and error handling.
