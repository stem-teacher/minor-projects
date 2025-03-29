# Task 4.9 Instructions: Copy MC Rectangles to Exam Paper

**Goal:** Copy the 16 multiple-choice key rectangles from the marking template to page 1 of the student's exam paper using the `cp-annotation` tool.

**Source File:** `test_resources/input/sample_exam_marking_template_mc_final.pdf`
**Target File:** `test_resources/input/Y7SCID_smith_john-950786052.pdf`
**Output File:** `test_resources/output/Y7SCID_smith_john-950786052_mc_guide.pdf`
**Tool:** `target/debug/cp-annotation`

**Steps:**

1. **Verify Prerequisites:**
   - Check that source and target PDF files exist
   - Ensure the `cp-annotation` binary exists or build it

2. **Copy Annotations:**
   - Use the `cp-annotation` tool to copy only the 16 MC rectangle annotations
   - Set the annotations to appear on page 1 of the target document
   - Use the following MC labels:
     - `mc-q1-c`, `mc-q2-d`, `mc-q3-b`, `mc-q4-d`, `mc-q5-b`, `mc-q6-c`, `mc-q7-a`, `mc-q8-d`
     - `mc-q9-a`, `mc-q10-b`, `mc-q11-a`, `mc-q12-a`, `mc-q13-c`, `mc-q14-d`, `mc-q15-b`, `mc-q16-d`

3. **Verify Results:**
   - Check that the output file was created
   - Verify that the annotations appear correctly positioned on page 1

4. **Generate Report:**
   - Provide a consolidated report with execution status, logs, and command output
