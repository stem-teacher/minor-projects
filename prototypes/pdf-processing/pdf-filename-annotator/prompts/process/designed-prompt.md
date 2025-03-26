
# C – CONTEXT
You are about to introduce a structured software development lifecycle (SDLC) within a currently running project to address the challenges faced by the Claude coding agent. This agent has a finite token window (context limit) and is prone to re-introducing complexity whenever its context resets. The goal is to improve control, oversight, and efficiency in software engineering tasks by:

• Explicitly defining task phases (preparation, design, testing, release).
• Thoroughly documenting each phase (e.g., DESCRIPTION, CHECKLIST, STEP_LOG, COMMAND_LOG).
• Leveraging both AI and human reviews at checkpoints to manage complexity.
• Employing a standardised approach to reduce redundant or conflicting builds.
• Introducing clear monitoring of context usage, ensuring tasks reset gracefully and intentionally.

Key Advantages of Structured Approach:
1. Minimises accidental complexity and duplicated effort.
2. Facilitates traceability with consistent logging and version control.
3. Improves clarity regarding task goals, process steps, and success criteria.
4. Enhances reliability by designating formal approval gates for both AI and human reviews.

Your objective is to provide a comprehensive and instructive prompt that Claude Desktop (the orchestration agent) can follow to implement this strategy on an active project. This includes exemplars, form templates, instructions, and examples illustrating how to govern both process logic (e.g., release management, CI/CD checks) and project-specific tasks (e.g., coding for PDF annotation).

# R – ROLE
You are an industry-leading expert with more than 20 years of specialised experience in large-scale software development, quality assurance, and process improvement. You have a track record of establishing robust development lifecycles and championing best practices in version control, structured logging, and iterative approvals. In this capacity, you will provide an end-to-end plan to enhance software engineering outcomes by ensuring precise documentation, consistent processes, and transparent checkpoints.

# A – ACTION
Adhering to the structured approach, perform the following steps:

1. PROBLEM & SOLUTION RECAP:
   a) Summarise the key problem – finite context window causing lost continuity and accidental complexity in large tasks.
   b) Restate the solution approach – define standardised processes and tasks that are thoroughly documented, with smaller context-chunks and explicit, repeatable steps.

2. OUTLINE THE STRUCTURED TASK PHASES:
   a) Task Preparation (Create baseline, set up directories/files).
   b) Design Approach (Review objectives, identify risks, plan sub-tasks).
   c) Detailed Design (List explicit coding steps, checklists, required approvals).
   d) Package Dependency Management (Track additions/updates/removals of libraries).
   e) Unit Test / Build Cycle (Iterative code/test cycles with documented AI and human checks).
   f) Final Build & Integration Test (Well-defined success criteria and official sign-off).
   g) Release Phase (Create final builds, update documentation, commit changes).

3. DEMONSTRATE WITH EXAMPLES & TEMPLATES:
   Provide sample file references and structures for:
   • [task-id]-DESCRIPTION.md – (Task type, objectives, success metrics, step checklist).
   • [task-id]-CHECKLIST.md – (Sequential tasks, checkboxes for progress).
   • [task-id]-STEP_LOG.md – (Timestamped log entries for each action taken).
   • [task-id]-COMMAND_LOG.md – (Records of all agent commands executed).
   Enclose these templates in code blocks for easy use (e.g., Markdown format).

4. IMPLEMENTATION IN CURRENT PROJECT:
   a) Create an example scenario (e.g., PDF Annotation Task).
   b) Show how to adapt the structured approach to a work-in-progress project.
   c) Demonstrate how to “restart context” gracefully whenever the agent’s token usage approaches its limit, ensuring relevant logs are updated, approvals are rechecked, and no essential details are lost.

5. ESCALATION & APPROVAL MECHANISMS:
   a) Define how and when AI or human approvals are required (based on complexity).
   b) Provide guidance on gating approvals for major design changes.
   c) Include instructions on how to seek additional human input if AI assistance stalls or becomes contradictory.

6. BEST PRACTICES FOR TRANSPARENCY & EFFICIENCY:
   a) Show how to incorporate incremental successes and failures in the STEP_LOG.
   b) Clarify how to summarise final outcomes in a single “Task Summary” document.
   c) Provide instructions for version control commits, tagging, and the transition to subsequent tasks.

7. END WITH A “FILL-IN-THE-BLANK” CHECKLIST:
   a) Supply placeholders for project name, task IDs, success criteria, required approvals, etc.
   b) Encourage customisation of the workflow steps to match organisational standards or regulatory mandates.

# F – FORMAT
Produce your response in formal academic British English. Use a clear, hierarchical Markdown structure for improved readability. Incorporate headings, subheadings, bullet points, and fenced code blocks for the example templates. If relevant, provide JSON or YAML snippets for structured data. Each section should be self-contained and cross-referenced to assist future readers.

Example Format Outline for Your Response:

■ Introduction
■ Problem & Proposed Strategy Recap
■ Step-by-Step Implementation Guide
■ Example Templates (Markdown & Code Snippets)
■ Summary of Key Benefits & Reminders
■ Next Steps or Additional Considerations


# T – TARGET AUDIENCE

This prompt is designed for advanced AI models—such as ChatGPT 4.5, ChatGPT o1, Anthropic Claude 3.7, and other large language models—tasked with orchestrating software development processes within collaborative environments. The readers and beneficiaries of this approach include software developers, project managers, quality assurance analysts, and AI assistants who all benefit from a transparent, mature, and repeatable process structure.
