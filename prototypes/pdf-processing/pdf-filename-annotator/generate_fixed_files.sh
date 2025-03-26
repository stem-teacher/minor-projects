#!/bin/bash
# Script to generate fixed versions of the PDF Filename Annotator files

FIXED_DIR="fixed_files"
mkdir -p "$FIXED_DIR"

echo "Generating fixed processor.rs..."
ai_router --provider openai --query "Create a complete fixed version of processor.rs for the PDF Filename Annotator that addresses these issues:
1. The front page of converted PDF documents is blank
2. There are no text annotations on any page except page one

Key changes needed:
1. Use actual page object IDs from doc.get_pages() instead of indices
2. Use a unified annotation approach rather than special-casing by page number
3. Properly handle all types of content streams (array, direct, reference)
4. Fix the page tree structure

The current code uses scanner detection and has different approaches for first page, pages 2-3, and pages 4+, which is causing issues. The fixed version should use a unified approach that works for all pages.

Output only the complete fixed code." > "${FIXED_DIR}/processor.rs"

echo "Generating fixed annotation.rs..."
ai_router --provider openai --query "Create a fixed version of annotation.rs for the PDF Filename Annotator that ensures annotations work correctly on all pages.

Key changes needed:
1. Improve content stream handling to work with different PDF structures
2. Fix the add_text_to_page method to work correctly with all page types
3. Fix any other issues that might cause the blank first page or missing annotations

Output only the complete fixed code." > "${FIXED_DIR}/annotation.rs"

echo "Fixed files generated in ${FIXED_DIR} directory"
