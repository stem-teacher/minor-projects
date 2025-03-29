---
id: "REQ-LIB-003"
title: "Add Labeled Rectangle Annotation (Multi-Page)"
description: "Provides a mechanism to add a new Square (rectangle) annotation with a specific label, geometry, and appearance options to one or more pages of a PDF document."
type: "Library Function"
component: "pdf_exam_tools_lib::annotation"
status: "Implemented"
priority: "Medium"
rationale: "Needed for creating visual markers, defining regions of interest (e.g., for image extraction), or marking guides on templates across multiple pages efficiently."
dependencies: ["REQ-LIB-004", "REQ-LIB-006"] # Depends on add_annotation_to_page and helper types
acceptance_criteria:
  - "Function signature matches `add_labeled_rect_multi(...) -> Result<(), Error>`."
  - "Accepts a slice of 1-based page numbers."
  - "Accepts a label *template* which substitutes '{page}'."
  - "Accepts optional `Color` for border (`/C`) and interior (`/IC`)."
  - "Accepts optional `BorderStyle` for width (`/BS`, `/Border`)."
  - "For each specified page number:"
  - "  Creates a valid `lopdf::Dictionary` for a Square annotation."
  - "  Sets `/Type`, `/Subtype`, `/Rect`."
  - "  Sets `/T` to the generated label for that page."
  - "  Sets `/F` (Print flag)."
  - "  Correctly sets `/C`, `/IC`, `/BS`, `/Border` based on provided options or applies defaults (no fill, thin black border) if options are `None`."
  - "  Adds the annotation dictionary object to the `doc`."
  - "  Calls `add_annotation_to_page` helper to link the new annotation ID to the page's `/Annots` array."
  - "Logs warnings but continues if adding to a specific page fails."
  - "Returns `Ok(())` if the process completes."
  - "Returns `Err` on critical document-level errors."
verification_method: "Unit Testing, Integration Testing (via CLI tools)"
references: ["Task 1.6.1"]
implementation_ref: "pdf_exam_tools_lib/src/annotation.rs#add_labeled_rect_multi"
test_ref: "" # Add later
---

# REQ-LIB-003: Add Labeled Rectangle Annotation (Multi-Page)

## Description
The library must provide a function to add a new Square annotation (representing a rectangle) to multiple specified pages of a `lopdf::Document`. The function accepts a template for the label (`/T`) field, allowing the page number to be dynamically inserted using `{page}`. It allows specifying optional border color, interior (fill) color, and border style (width). It creates a distinct annotation object for each specified page.

## Rationale
This enables the creation of visual markers or defined areas across multiple pages, useful for generating templates or highlighting consistent regions in documents.

## Acceptance Criteria
- Function signature matches `add_labeled_rect_multi(...) -> Result<(), Error>`.
- Accepts a slice of 1-based page numbers.
- Accepts a label *template* which substitutes `{page}`.
- Accepts optional `Color` for border (`/C`) and interior (`/IC`).
- Accepts optional `BorderStyle` for width (`/BS`, `/Border`).
- For each specified page number:
-   Creates a valid `lopdf::Dictionary` for a Square annotation.
-   Sets `/Type`, `/Subtype`, `/Rect`.
-   Sets `/T` to the generated label for that page.
-   Sets `/F` (Print flag).
-   Correctly sets `/C`, `/IC`, `/BS`, `/Border` based on provided options or applies defaults (no fill, thin black border) if options are `None`.
-   Adds the annotation dictionary object to the `doc`.
-   Calls `add_annotation_to_page` helper to link the new annotation ID to the page's `/Annots` array.
- Logs warnings but continues if adding to a specific page fails.
- Returns `Ok(())` if the process completes.
- Returns `Err` on critical document-level errors.