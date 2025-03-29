---
id: "REQ-LIB-001"
title: "Find Annotation by Label"
description: "Provides a mechanism to locate a single PDF annotation object within a document based on its exact label (/T field)."
type: "Library Function"
component: "pdf_exam_tools_lib::annotation_utils"
status: "Implemented"
priority: "High"
rationale: "Core requirement for identifying specific annotations (e.g., score fields, template markers) for reading, modification, or copying."
dependencies: []
acceptance_criteria:
  - "Function signature matches `find_annotation_by_label(doc: &Document, label: &str) -> Result<Option<(ObjectId, u32)>, Error>`."
  - "Searches all pages of the provided `doc`."
  - "Correctly identifies an annotation whose `/T` field value exactly matches the `label` string."
  - "Handles `/Annots` arrays that are direct objects or references."
  - "Returns `Ok(Some((annot_id, page_num)))` where `annot_id` is the ObjectId of the annotation dictionary and `page_num` is the 1-based page number."
  - "Returns `Ok(None)` if no annotation with the exact label is found."
  - "Returns `Err(Error::Pdf)` on underlying `lopdf` errors."
  - "Returns `Err(Error::Processing)` for unexpected PDF structures (e.g., non-dictionary page object)."
verification_method: "Unit Testing, Integration Testing (via CLI tools)"
references: ["Task 1.2"]
implementation_ref: "pdf_exam_tools_lib/src/annotation_utils.rs#find_annotation_by_label"
test_ref: "" # Add later
---

# REQ-LIB-001: Find Annotation by Label

## Description
The library must provide a function to search through all pages of a given `lopdf::Document` and find the first annotation whose `/T` (Title) field contains a byte string that exactly matches the provided UTF-8 label string.

## Rationale
This function is fundamental for nearly all subsequent annotation manipulation tasks. Tools need to locate specific annotations (score fields, template guides, placeholders) reliably before they can read, write, copy, or delete them. Using a unique label (`/T` field) is the chosen mechanism for identification.

## Acceptance Criteria
- Function signature matches `find_annotation_by_label(doc: &Document, label: &str) -> Result<Option<(ObjectId, u32)>, Error>`.
- Searches all pages of the provided `doc`.
- Correctly identifies an annotation whose `/T` field value exactly matches the `label` string.
- Handles `/Annots` arrays that are direct objects or references.
- Returns `Ok(Some((annot_id, page_num)))` where `annot_id` is the ObjectId of the annotation dictionary and `page_num` is the 1-based page number.
- Returns `Ok(None)` if no annotation with the exact label is found.
- Returns `Err(Error::Pdf)` on underlying `lopdf` errors.
- Returns `Err(Error::Processing)` for unexpected PDF structures (e.g., non-dictionary page object).