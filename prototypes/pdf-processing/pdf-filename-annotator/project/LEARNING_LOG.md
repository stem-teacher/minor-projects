# Learning Log for PDF Filename Annotator

This document tracks key insights, challenges, and solutions encountered during the development process.

## 2025-03-25: Initial Project Setup

### PDF Library Selection
The project initially considered using both pdf-rs and lopdf libraries. After evaluation, we've decided to use only lopdf for the following reasons:
- Better support for content modification
- More straightforward API for our specific needs
- Avoids dependency complexity of using two libraries

However, this decision has revealed some complexities in the type system around ObjectId handling.

### Type Handling Challenges
Working with lopdf's ObjectId type has revealed several patterns:
- lopdf uses (u32, u16) tuples as ObjectId
- Different parts of the API expect different forms (sometimes references, sometimes values)
- The get_pages() iterator returns a different format than what other methods expect
- Careful type conversion is needed between these different representations

### Borrowing Patterns
PDF manipulation requires careful borrowing management:
- Content streams require mutable access to the document for adding objects
- Page dictionaries also require mutable access
- These competing borrows need to be carefully managed, often by:
  - Obtaining necessary information first with immutable borrows
  - Cloning data that will be needed later
  - Dropping borrows before creating new ones
  - Using temporary variables to store intermediate results

### Font Handling
Font handling in PDFs is more complex than initially expected:
- Font resources must be properly registered in the PDF's resource dictionary
- System fonts are not trivially accessible from within the application
- Font metrics for different fonts affect text positioning
- Fallback mechanisms are essential for robustness

## 2025-03-25: Compilation Fixes

### ObjectId Type Resolution
Fixing the ObjectId type issues required a consistent approach:
- Understanding that lopdf's ObjectId is specifically a (u32, u16) tuple
- Pages dictionary returns (&u32, &u16) which needs careful dereferencing
- Type annotations in function signatures must be explicit and consistent
- The difference between Document::get_object() and Document::get_dictionary() requires care with types

### Mutable Borrowing Resolution
Resolving the mutable borrowing conflicts required:
- Restructuring the content stream modification process
- Breaking complex operations into smaller steps
- Using the "clone-modify-add" pattern instead of in-place modification
- Careful scope management with explicit drop() calls

### Naming Considerations
Clear and consistent naming proved important:
- Distinguishing between page_id, page_num, and page_index
- Using consistent suffixes for different types (_ref for references, _id for identifiers)
- Avoiding reusing variable names in nested scopes
- Making type conversions explicit in variable names

## 2025-03-25: End-to-End Testing Implementation

### Testing Approach
The E2E test implementation revealed several key insights:
- Using temporary directories with assert_fs simplifies test cleanup
- Creating minimal valid PDFs programmatically is more reliable than using external files
- Testing the full pipeline from input to output validates core functionality

### Test-First Development Benefits
The test-first approach provided clear advantages:
- Focused development on the critical user workflow
- Made success criteria explicit and testable
- Revealed edge cases in directory handling and file processing

### PDF Validation Techniques
Testing PDF files required a multi-level validation approach:
1. Verify files are created at expected locations
2. Check basic processing metrics (files processed, pages annotated)
3. Validate output files can be opened as valid PDFs
4. In future tests, we'll need more detailed content validation

### Test Structure Pattern
The end-to-end test established a useful pattern for future tests:
1. Setup: Create directories and test files
2. Configure: Define test-specific configuration
3. Execute: Run the processor through the public API
4. Verify: Check results through multiple assertions
5. Cleanup: Ensure temporary files are removed

This structure can be reused for more complex scenarios with different configurations and inputs.

## 2025-03-25: Comprehensive Testing Implementation

### Multi-Configuration Testing
Testing different configuration options revealed important insights:
- The same PDF file displays annotations differently based on configuration
- Text positioning calculations correctly adapt to different corner positions
- Font size adjustments work correctly across a range of reasonable sizes
- The filename annotation is visible and correctly placed in all four corners

### Multi-Page PDF Support
Testing PDF files with multiple pages validated core functionality:
- Every page in a multi-page document gets annotated correctly
- Page indices are properly handled during processing
- Content streams are correctly added to each page individually
- PDF structure remains valid after adding content to multiple pages

### Corner Position Calculations
Testing different corner positions revealed:
- Text positioning requires different calculations for each corner
- Vertical positioning is based on page height and font size
- Horizontal positioning requires approximating text width based on character count
- These approximations work well enough for basic annotation purposes

### Font Size Considerations
Testing different font sizes revealed:
- Font sizes from 8pt to 16pt are readable and appropriately placed
- Font size also affects the calculated text width for horizontal positioning
- The simple scaling factor (0.6 * font size * text length) works as a width estimate
- For extreme precision, a proper font metrics system would be needed

### Test Organization Strategies
Developing comprehensive tests led to these best practices:
- Group tests by feature/configuration (corner positions, font sizes, etc.)
- Use nested loops to test multiple variants efficiently
- Validate both the process (no errors) and the output (valid PDF)
- Perform basic structural validation on the output documents

## 2025-03-25: Robust Error Handling Implementation

### Directory Handling Patterns
Testing directory-related error conditions revealed:
- Directory operations require different error handling than file operations
- Permission issues can manifest differently across operating systems
- Recursive directory handling must be carefully tested with nested structures
- Early validation of directories can prevent confusing runtime errors

### Error Handling Strategy
Our approach to error handling evolved through testing:
- Failed individual files should not stop batch processing
- Errors should be collected and reported comprehensively
- Error messages should be clear about the specific issue
- The application should distinguish between fatal errors and per-file errors

### Error Recovery Mechanisms
Testing error scenarios led to these recovery patterns:
- Collect errors in a map with file paths as keys for clear reporting
- Skip invalid files but continue processing valid ones
- Ensure resources are properly released even when errors occur
- Provide detailed context in error messages to aid troubleshooting

### Test Environment Considerations
Error testing revealed environment-specific concerns:
- Some tests (like permission tests) may need to be skipped in CI environments
- Different platforms have different permission models
- Directory separators and path handling vary across platforms
- Error message text may vary across operating systems

### Batch Processing Robustness
Testing batch processing with errors confirmed:
- The application can handle a mix of valid and invalid files
- Error reporting correctly identifies problematic files
- Summary information accurately reflects processing results
- The processor maintains correct state even after encountering errors
