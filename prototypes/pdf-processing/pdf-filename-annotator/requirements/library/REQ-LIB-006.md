---
id: "REQ-LIB-006"
title: "Annotation Data Types"
description: "Defines standardized data structures for representing annotation properties and attributes."
type: "Library Types"
component: "pdf_exam_tools_lib::annotation, pdf_exam_tools_lib::annotation_utils"
status: "Implemented"
priority: "High"
rationale: "Essential supporting types for consistent representation of annotation attributes across the library."
dependencies: []
acceptance_criteria:
  - "Provides a `Color` struct representing RGB color values (0.0-1.0 range)."
  - "Provides a `BorderStyle` struct representing annotation border properties (primarily width)."
  - "Provides an `AnnotationProperties` struct that encapsulates common annotation properties."
  - "All structs implement appropriate traits: `Debug`, `Clone`, `Serialize`, etc."
  - "Color should be `Copy` to facilitate easier usage."
  - "All properties use proper Rust types (f32 for coordinates, Option for nullable fields, etc.)."
  - "`AnnotationProperties` structure should include: page number, object ID, subtype, label, rect, contents, colors, and border style."
verification_method: "Unit Testing, Code Review"
references: ["Task 1.9", "Task 1.6.R1"]
implementation_ref: ["pdf_exam_tools_lib/src/annotation.rs#Color", "pdf_exam_tools_lib/src/annotation.rs#BorderStyle", "pdf_exam_tools_lib/src/annotation_utils.rs#AnnotationProperties"]
test_ref: "" # Add later
---

# REQ-LIB-006: Annotation Data Types

## Description
The library must provide standardized data structures for representing PDF annotation properties and attributes. These types ensure consistent handling of annotation data across different library functions and enable proper serialization for debugging and external interfaces.

## Rationale
Standardized types provide type safety, consistent conversion between PDF and Rust representations, and support serialization for external tools. They avoid duplication and inconsistency in handling common annotation properties like colors, borders, and geometric attributes.

## Acceptance Criteria

### Color Struct
- Named `Color` and located in `annotation.rs`.
- Represents RGB color values as three f32 fields (r, g, b) in 0.0-1.0 range.
- Implements `Debug`, `Clone`, `Copy`, and `Serialize` traits.
- Used consistently for all color-related annotation properties.

### BorderStyle Struct
- Named `BorderStyle` and located in `annotation.rs`.
- Contains at minimum a `width` field (f32).
- Implements `Debug`, `Clone`, and `Serialize` traits.
- Used consistently for representing annotation border attributes.

### AnnotationProperties Struct
- Named `AnnotationProperties` and located in `annotation_utils.rs`.
- Comprehensive structure containing common annotation properties:
  - `page`: The 1-based page number (u32)
  - `id`: The annotation object ID (tuple of u32, u16)
  - `subtype`: The annotation type (Option<String>)
  - `label`: The annotation's label/title (Option<String>)
  - `rect`: The bounding rectangle coordinates (Option<[f32; 4]>)
  - `contents`: The annotation's content text (Option<String>)
  - `color`: The border/stroke color (Option<Color>)
  - `interior_color`: The fill color (Option<Color>)
  - `border_style`: Border attributes (Option<BorderStyle>)
- Implements `Debug` and `Serialize` traits.
- Uses Option types appropriately for fields that might be absent.
- Provides a clean, structured representation for API responses and debugging.