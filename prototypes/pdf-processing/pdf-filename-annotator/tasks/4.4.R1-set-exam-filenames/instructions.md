# Task 4.4.R1 Instructions: Set Exam Filename Stamps

**Goal:** Create a script to set all filename stamp annotation values on the student exam paper using `set-annotation-value --in-place`.

**Steps:**

1. Create a bash script that:
   - Extracts the student identifier from the target filename
   - Creates a single initial backup of the annotated PDF file
   - Uses `set-annotation-value --in-place` to set all filename stamp values (pages 1-6)
   - Verifies the modified file exists after completion

2. Execute the script to update all filename stamp values

3. Report the result and any necessary manual verification steps

**Notes:**
- Remember this version of `set-annotation-value` no longer creates backups internally
- The script must handle creating one initial backup before making changes
- Target file: `/test_resources/output/Y7SCID_smith_john-950786052_annotated.pdf`
- Labels to update: `filename_stamp_p1` through `filename_stamp_p6`
- All stamps should be set to the student identifier: `smith_john-950786052`