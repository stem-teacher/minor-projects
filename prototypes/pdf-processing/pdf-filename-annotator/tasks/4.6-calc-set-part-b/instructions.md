# Task 4.6 Instructions: Calculate and Set Part B Total

**Goal:** Calculate the total for Part B by summing individual question scores and set the `mark-part-b` annotation value.

**Target Files:**
- Scored Student Exam PDF: `/test_resources/output/Y7SCID_smith_john-950786052_scored.pdf`
- Tools: `get-annotation-value` and `set-annotation-value`

**Steps:**

1. **Verify Prerequisites:**
   - Ensure the target PDF file exists
   - Ensure both binary tools have been built

2. **Get Individual Scores:**
   - Retrieve all individual question scores using `get-annotation-value`
   - Calculate the sum of all question scores
   - Handle any errors or invalid values

3. **Create Backup and Set Part B Total:**
   - Create a backup of the scored PDF
   - Use `set-annotation-value --in-place` to set the Part B total value

4. **Verify Results:**
   - Confirm the Part B total was set correctly
   - Report success or failure

**Execution:**

Run the script `calc_set_part_b.sh` which performs all these steps automatically and logs the results.