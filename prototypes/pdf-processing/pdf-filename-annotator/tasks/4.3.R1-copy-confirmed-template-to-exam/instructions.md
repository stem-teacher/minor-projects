# Task 4.3.R1 Instructions: Copy Confirmed Template to Exam

**Goal:** Create a script to copy all annotations from the manually-adjusted confirmed template PDF to a student exam using the `cp-annotation` tool.

**Steps:**

1. Create a bash script that:
   - Verifies the source (confirmed template) and target (student exam) files exist
   - Builds or verifies the `cp-annotation` binary
   - Runs `cp-annotation` to copy all annotations from the template to the exam
   - Uses the correct list of annotation labels to copy
   - Verifies the output file was created

2. Execute the script to create the annotated student exam file

3. Report the result and any necessary manual verification steps

**Source and Target Files:**

- **Source (Template):** `/test_resources/input/sample_exam_marking_template_confirmed.pdf`
- **Target (Exam):** `/test_resources/input/Y7SCID_smith_john-950786052.pdf`
- **Output:** `/test_resources/output/Y7SCID_smith_john-950786052_annotated.pdf`

**Annotation Labels to Copy:**

- Filename stamps: `filename_stamp_p1` through `filename_stamp_p6`
- Score fields for Part A: `mark-part-a`, `mark-part-b`, `mark-total`
- Score fields for questions 16-19: e.g., `mark-q16-a`, `mark-q17`, etc.