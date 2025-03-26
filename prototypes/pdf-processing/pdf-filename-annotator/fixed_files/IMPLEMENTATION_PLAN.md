# Implementation Plan for PDF Annotator Fixes

## Key Issues
1. The front page of converted PDF documents is blank
2. There are no text annotations on any page except page one

## Root Causes
1. Page references are handled incorrectly - using indices instead of actual PDF object IDs
2. Special-casing based on page numbers causes inconsistent behavior
3. Content stream handling is not robust for different PDF structures
4. Page tree structure may be invalid in some PDFs

## Fixes Required

### In processor.rs:
1. Fix how pages are iterated and processed:
   - Use doc.get_pages() object IDs directly
   - Remove special handling based on page number

2. Create a unified annotation approach:
   - Add unified_page_annotation method
   - Detect content stream type
   - Apply appropriate annotation strategy

3. Improve page tree handling:
   - Rebuild page tree when needed
   - Ensure all pages have correct parent pointers

### In annotation.rs:
1. Improve content stream handling:
   - Handle different content stream structures
   - Fix text annotation placement

2. Fix resources dictionary:
   - Ensure font resources exist on all pages
   - Handle resource dictionary references

## Implementation Steps
1. Fix processor.rs 
2. Fix annotation.rs
3. Test with various PDF types

## Testing Plan
Test with:
- Single page PDFs
- Multi-page PDFs
- Scanner-generated PDFs
- PDFs with different content stream structures
