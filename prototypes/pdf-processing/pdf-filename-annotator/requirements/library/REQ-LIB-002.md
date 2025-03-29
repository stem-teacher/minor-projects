---
id: "REQ-LIB-002"
title: "Add Labeled FreeText Annotation (Multi-Page)"
description: "Provides a mechanism to add a new FreeText annotation with a specific label, content, and appearance to one or more pages of a PDF document."
type: "Library Function"
component: "pdf_exam_tools_lib::annotation"
status: "Implemented"
priority: "High"
rationale: "Core requirement for programmatically adding textual information (like filename stamps, scores, comments) to PDFs in a structured, identifiable way across multiple pages efficiently."
dependencies: ["REQ-LIB-004"] # Depends on add_annotation_to_page helper
acceptance_criteria:
  - "Function signature matches `add_labeled_freetext_multi(...) -> Result<(), Error>`."
  - "Accepts a slice of 1-based page numbers."
  - "Accepts label and content *templates* which substitute '{page}' with the current page number."
  - "For each specified page number:"
  - "  Creates a valid `lopdf::Dictionary` for a FreeText annotation."
  - "  Sets `/Type`, `/Subtype`, `/Rect`."
  - "  Sets `/T` to the generated label for that page."
  - "  Sets `/Contents` to the generated content for that page."
  - "  Sets `/F` (Print flag)."
  - "  Sets `/Border` (e.g., `[0 0 0]`)."
  - "  Sets `/DA` (Default Appearance) based on provided `FontConfig` (e.g., `/Helvetica 12 Tf 0 g`)."
  - "  Adds the annotation dictionary object to the `doc`."
  - "  Calls `add_annotation_to_page` helper to link the new annotation ID to the page's `/Annots` array."
  - "Logs warnings but continues if adding to a specific page fails."
  - "Returns `Ok(())` if the process completes (even with individual page errors)."
  - "Returns `Err` on critical document-level errors."
verification_method: "Unit Testing, Integration Testing (via CLI tools)"
references: ["Task 2.1.1"]
implementation_ref: "pdf_exam_tools_lib/src/annotation.rs#add_labeled_freetext_multi"
test_ref: "" # Add later
---

# REQ-LIB-002: Add Labeled FreeText Annotation (Multi-Page)

## Description
The library must provide a function to add a new FreeText annotation to multiple specified pages of a `lopdf::Document`. The function accepts templates for the label (`/T`) and content (`/Contents`) fields, allowing the page number to be dynamically inserted using the placeholder `{page}`. It creates a distinct annotation object for each specified page.

## Rationale
This enables efficient programmatic addition of repetitive textual annotations, such as page numbers or filename stamps, across many pages without needing to load/save the document multiple times. It also ensures these annotations are identifiable via their labels.

## Acceptance Criteria
- Function signature matches `add_labeled_freetext_multi(...) -> Result<(), Error>`.
- Accepts a slice of 1-based page numbers.
- Accepts label and content *templates* which substitute `{page}` with the current page number.
- For each specified page number:
-   Creates a valid `lopdf::Dictionary` for a FreeText annotation.
-   Sets `/Type`, `/Subtype`, `/Rect`.
-   Sets `/T` to the generated label for that page.
-   Sets `/Contents` to the generated content for that page.
-   Sets `/F` (Print flag).
-   Sets `/Border` (e.g., `[0 0 0]`).
-   Sets `/DA` (Default Appearance) based on provided `FontConfig` (e.g., `/Helvetica 12 Tf 0 g`).
-   Adds the annotation dictionary object to the `doc`.
-   Calls `add_annotation_to_page` helper to link the new annotation ID to the page's `/Annots` array.
- Logs warnings but continues if adding to a specific page fails.
- Returns `Ok(())` if the process completes (even with individual page errors).
- Returns `Err` on critical document-level errors.