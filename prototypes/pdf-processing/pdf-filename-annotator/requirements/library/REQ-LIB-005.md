---
id: "REQ-LIB-005"
title: "Get Annotation Properties"
description: "Provides a mechanism to retrieve a structured summary of an annotation's properties by its label."
type: "Library Function"
component: "pdf_exam_tools_lib::annotation_utils"
status: "Implemented"
priority: "Medium"
rationale: "Essential for debugging, verification, and operations that need to check or display annotation properties. Particularly useful since PDF viewers like Acrobat don't easily expose internal properties."
dependencies: ["REQ-LIB-001", "REQ-LIB-006"] # Depends on find_annotation_by_label and AnnotationProperties struct
acceptance_criteria:
  - "Function signature matches `get_annotation_properties(doc: &Document, label: &str) -> Result<Option<AnnotationProperties>, Error>`."
  - "Uses `find_annotation_by_label` to locate the specified annotation."
  - "Returns `Ok(None)` if no annotation with the specified label is found."
  - "Returns `Ok(Some(AnnotationProperties))` with populated fields if annotation is found."
  - "Correctly extracts common annotation properties: subtype, label, rect, contents, color, interior color, and border style."
  - "Handles missing or invalid properties gracefully (using Option types)."
  - "Returns `Err` on underlying document access errors."
  - "Returned structure is serializable (implements `serde::Serialize`)."
verification_method: "Unit Testing, Integration Testing (via CLI tools)"
references: ["Task 1.9"]
implementation_ref: "pdf_exam_tools_lib/src/annotation_utils.rs#get_annotation_properties"
test_ref: "" # Add later
---

# REQ-LIB-005: Get Annotation Properties

## Description
The library must provide a function to retrieve a structured summary of a labeled annotation's properties. This function first locates an annotation by its label, then extracts and organizes its properties into a standardized, serializable structure. This enables inspection, debugging, and verification of annotations without requiring direct access to the PDF's internal structures.

## Rationale
This function is essential for debugging annotation issues, verifying the state of annotations programmatically, and supporting user interfaces that need to display annotation properties. It provides a consistent, typed interface to annotation properties that would otherwise require complex PDF dictionary parsing.

## Acceptance Criteria
- Function signature matches `get_annotation_properties(doc: &Document, label: &str) -> Result<Option<AnnotationProperties>, Error>`.
- Uses `find_annotation_by_label` to locate the specified annotation.
- Returns `Ok(None)` if no annotation with the specified label is found.
- Returns `Ok(Some(AnnotationProperties))` with populated fields if annotation is found.
- Correctly extracts common annotation properties:
  - subtype (e.g., "FreeText", "Square")
  - label (the `/T` value)
  - rect (the annotation's bounding rectangle)
  - contents (the `/Contents` value, if any)
  - color (the border color from `/C`)
  - interior color (the fill color from `/IC`)
  - border style (from `/BS` or legacy `/Border`)
- Handles missing or invalid properties gracefully (using Option types).
- Returns `Err` on underlying document access errors.
- Returned structure is serializable (implements `serde::Serialize`).