# Task 4.5.R1 Instructions: Set Exam Scores

**Goal:** Simulate the marking process by setting scores for Part A and individual question parts using the corrected `set-annotation-value --in-place` tool with the fixed library function that removes `/RC` and `/AP` fields.

**Target Files:**
- Annotated Student Exam PDF: `/test_resources/output/Y7SCID_smith_john-950786052_annotated.pdf`
- The tool: `/target/debug/set-annotation-value`

**Steps:**

1. **Verify Prerequisites:**
   - Ensure the target PDF file exists
   - Ensure the `set-annotation-value` binary has been built

2. **Create Initial Backup:**
   - Before making changes, create a backup of the original annotated PDF file

3. **Set Exam Scores:**
   - Use the `set-annotation-value --in-place` tool to set the following scores:
     - Part A: 15 points
     - Question 16a-h: 1, 2, 2, 1, 3, 2, 3, 1 points respectively
     - Question 17: 4 points
     - Question 18a-b: 2, 2 points respectively
     - Question 19a-b: 2, 2 points respectively

4. **Rename Final File:**
   - Rename the modified file to indicate it now contains scores

5. **Verify Results:**
   - Confirm the scored PDF exists
   - Report success count and any failures

**Execution:**

Run the script `set_exam_scores.sh` which performs all these steps automatically and logs the results.