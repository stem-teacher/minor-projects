# Task 4.8 Instructions: Add MC Placeholders to Marking Template
**Goal:** Add 16 labeled, green rectangle annotations to Page 1 of the confirmed marking template PDF using the `add-annotation` tool.
**Target File:** `test_resources/input/sample_exam_marking_template_confirmed.pdf` (Modified in-place)
**Tool:** `target/debug/add-annotation`
**Steps:**
1.  **Define Properties:**
    *   Target Page: `1`
    *   Type: `rect`
    *   Color (Green): `"0.0,1.0,0.0"`
    *   Interior Color: `None` (transparent fill)
    *   Border Width: `1.0` (or `2.0` for more visibility?) Let's use `1.0`.
    *   Initial Rect (Placeholder): We need 16 slightly different Rects so they don't perfectly overlap. Let's stack them vertically near the top-left. Base Rect: `[10, 700, 50, 710]`. We will decrement Y1/Y2 by 15 for each subsequent rect.
    *   Labels: `mc-q1-c`, `mc-q2-d`, `mc-q3-b`, `mc-q4-d`, `mc-q5-b`, `mc-q6-c`, `mc-q7-a`, `mc-q8-d`, `mc-q9-a`, `mc-q10-b`, `mc-q11-a`, `mc-q12-a`, `mc-q13-c`, `mc-q14-d`, `mc-q15-b`, `mc-q16-d`
2.  **Prepare Script:** Create an execution script (`execute.sh`) that:
    *   Sets up environment variables (paths, etc.).
    *   Makes one initial backup of the target PDF.
    *   Loops through the 16 labels.
    *   Inside the loop, calculates the specific `rect` coordinates for the current annotation (stacking them vertically by adjusting Y values).
    *   Calls the `add-annotation` binary with `--in-place`, `--page 1`, `--type rect`, the calculated `--rect`, the specific `--label-template` (which is just the label itself here, no `{page}` needed), `--color "0.0,1.0,0.0"`, and `--border-width 1.0`.
    *   Logs progress and checks for errors after each call.
    *   Verifies the final file exists.
3.  **Execute Script:** Run the `execute.sh` script.
4.  **Return Report:** Provide the consolidated report artifact.