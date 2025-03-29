---
id: "REQ-LIB-004"
title: "Add Annotation to Page"
description: "Provides a mechanism to link an existing annotation object to a specific page's /Annots array."
type: "Library Function"
component: "pdf_exam_tools_lib::annotation_utils"
status: "Implemented"
priority: "High"
rationale: "Core helper function for all annotation creation operations. Handles the complexities of PDF annotation referencing and array manipulation."
dependencies: []
acceptance_criteria:
  - "Function signature matches `add_annotation_to_page(doc: &mut Document, page_num: u32, annotation_ref_id: ObjectId) -> Result<(), Error>`."
  - "Correctly identifies the page dictionary for the specified 1-based `page_num`."
  - "Handles different representations of the page's `/Annots` entry (direct array, reference to array, or non-existent)."
  - "When `/Annots` is a direct array: Appends the reference and updates the page dictionary."
  - "When `/Annots` is a reference to an array: Retrieves the array, appends the reference, and replaces the object."
  - "When `/Annots` doesn't exist: Creates a new array with the reference and adds it to the page dictionary."
  - "Returns `Ok(())` on successful completion."
  - "Returns `Err(Error::Processing)` if the page number doesn't exist or other structural issues are encountered."
  - "Returns `Err(Error::Pdf)` on underlying `lopdf` errors."
verification_method: "Unit Testing, Integration Testing (via CLI tools)"
references: ["Task 1.4"]
implementation_ref: "pdf_exam_tools_lib/src/annotation_utils.rs#add_annotation_to_page"
test_ref: "" # Add later
---

# REQ-LIB-004: Add Annotation to Page

## Description
The library must provide a function to link an existing annotation object (already added to the document) to a specific page's `/Annots` array. This function is critical for completing the annotation addition process, as it establishes the connection between the annotation object and the page where it should appear.

## Rationale
This helper function handles the complex and error-prone process of manipulating PDF object references and arrays. Centralizing this logic ensures consistent and reliable behavior across all annotation types. It abstracts away the complexities of direct vs. referenced arrays and handles the creation of `/Annots` arrays when they don't exist.

## Acceptance Criteria
- Function signature matches `add_annotation_to_page(doc: &mut Document, page_num: u32, annotation_ref_id: ObjectId) -> Result<(), Error>`.
- Correctly identifies the page dictionary for the specified 1-based `page_num`.
- Handles different representations of the page's `/Annots` entry:
  - Direct array: Appends the reference and updates the page dictionary.
  - Reference to array: Retrieves the array, appends the reference, and replaces the object.
  - Non-existent: Creates a new array with the reference and adds it to the page dictionary.
- Returns `Ok(())` on successful completion.
- Returns `Err(Error::Processing)` if the page number doesn't exist or other structural issues are encountered.
- Returns `Err(Error::Pdf)` on underlying `lopdf` errors.