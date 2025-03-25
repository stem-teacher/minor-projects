# PDF Filename Annotator: Verification Plan

This document outlines the verification procedures to ensure our solutions for the critical issues are effective.

## 1. Text Extraction Verification

### Test Case 1.1: Text Extraction Compatibility
**Goal**: Verify that annotations are detectable by text extraction tools.

**Procedure**:
1. Process a set of sample PDF files using the new annotation method.
2. Use pdftotext to extract text from the output files:
   ```bash
   pdftotext output.pdf - | grep -i "filename.pdf"
   ```
3. Check that the filename appears in the extracted text for each page.

**Expected Outcome**: The filename is found in the extracted text for all annotated pages.

### Test Case 1.2: Visual Verification
**Goal**: Confirm that annotations are visually correct.

**Procedure**:
1. Open processed PDFs in a viewer like Preview or Adobe Reader.
2. Visually inspect the annotations for correct:
   - Position (top-right corner)
   - Font size and appearance
   - Content (exact filename)

**Expected Outcome**: Annotations are visually identical to the previous implementation.

### Test Case 1.3: Searchability Test
**Goal**: Verify that annotations are searchable in PDF viewers.

**Procedure**:
1. Open processed PDFs in Adobe Reader or Preview.
2. Use the search function to search for the filename.
3. Verify search results highlight the annotations.

**Expected Outcome**: The search function finds and highlights the annotations.

## 2. Error Recovery Verification

### Test Case 2.1: First Page Failure Recovery
**Goal**: Verify processing continues after first page annotation failure.

**Procedure**:
1. Create a test PDF with a problematic first page (e.g., by modifying the content stream).
2. Process the PDF with the updated error handling.
3. Verify that subsequent pages are still annotated.

**Expected Outcome**: The PDF is saved with annotations on all pages except the first.

### Test Case 2.2: Partial Success Reporting
**Goal**: Verify proper reporting of partial successes.

**Procedure**:
1. Process a batch of PDFs where some pages will fail annotation.
2. Check the ProcessingSummary for:
   - Total files processed
   - Total pages annotated
   - Partial success entries with page-specific errors

**Expected Outcome**: ProcessingSummary contains detailed information about partial successes and specific page failures.

### Test Case 2.3: Error Handling with Scanned Documents
**Goal**: Verify compatibility with real-world scanner-generated PDFs.

**Procedure**:
1. Process a set of scanned PDFs from "Epson Scan 2".
2. Verify that:
   - The PDFs are processed without errors
   - All pages are annotated
   - Annotations are detectable by text extraction

**Expected Outcome**: Scanner-generated PDFs are successfully processed with searchable annotations.

## 3. Performance Verification

### Test Case 3.1: Processing Time Comparison
**Goal**: Ensure the new annotation method doesn't significantly impact performance.

**Procedure**:
1. Process a large batch of PDFs (10+) with both the old and new methods.
2. Measure and compare processing times.

**Expected Outcome**: The new implementation has similar or better performance than the previous one.

### Test Case 3.2: Memory Usage Assessment
**Goal**: Verify memory efficiency of the new annotation method.

**Procedure**:
1. Process large multi-page PDFs (20+ pages).
2. Monitor memory usage during processing.

**Expected Outcome**: Memory usage remains stable and within acceptable limits.

## 4. Compatibility Verification

### Test Case 4.1: PDF Viewer Compatibility
**Goal**: Verify annotations are compatible with different PDF viewers.

**Procedure**:
1. Open annotated PDFs in multiple viewers:
   - Adobe Reader
   - Preview (macOS)
   - PDF.js (browser-based)
   - Evince (Linux)

**Expected Outcome**: Annotations appear correctly in all tested viewers.

### Test Case 4.2: PDF Version Compatibility
**Goal**: Verify compatibility with different PDF versions.

**Procedure**:
1. Process PDFs of different versions (1.3 through 1.7).
2. Verify successful annotation and text extraction.

**Expected Outcome**: All PDF versions are successfully annotated with searchable text.

## 5. Integration Testing

### Test Case 5.1: End-to-End Workflow
**Goal**: Verify the complete annotation workflow.

**Procedure**:
1. Run the utility with a configuration file:
   ```bash
   cargo run -- --config config.json
   ```
2. Verify:
   - All PDF files in the input directory are processed
   - Output files contain searchable annotations
   - Error reporting is accurate and helpful

**Expected Outcome**: The utility successfully processes all files with appropriate annotations and error handling.

## Automated Verification Script

Create a verification script (`verify_annotations.py`) that:
1. Processes a batch of test PDFs
2. Extracts text from each output file
3. Checks for the presence of filename annotations
4. Reports success/failure for each file

This script will be used for regression testing after each code change.