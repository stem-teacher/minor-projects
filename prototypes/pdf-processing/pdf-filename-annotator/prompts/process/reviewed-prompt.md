# Problem Statement

The Claude coding agent possesses a finite context window (token window) for undertaking coding tasks, limiting its ability to remember or manage extensive or complex task details simultaneously. It performs exceptionally well with clearly defined, contextually concise problems, successfully generating and executing code solutions.

However, once a software engineering task exceeds the Claude coding agent’s token window limit—due to task complexity or volume of associated information—the agent cannot reliably maintain context or ensure transparent and consistent progress. Each time the context window is exhausted and must reset, the agent re-establishes context from incomplete prior states, inadvertently introducing unnecessary accidental complexity. This cycle ultimately impedes productivity and introduces inefficiencies.

For example, a current task involves annotating scanned PDF documents by placing filenames (which include unique IDs for tracking purposes) at the top of every page. Presently, only the first page is annotated, and the front page inadvertently remains blank. Repeated attempts to rectify this issue have resulted in the Claude agent recreating slightly varied solutions across multiple locations, resulting in confusion and redundant work.

# Proposed Solution Strategy

Drawing upon an early Capability Maturity Model (CMM) analogy, the Claude coding agent currently functions as a Level 1 'super programmer.' To improve performance and reliability, the proposed strategy involves explicitly defining software engineering tasks through scripted processes and structured prompts. These explicit definitions can be systematically reviewed (by AI and human reviewers), tested automatically, and iteratively improved over time.

With this approach, the Claude coding agent’s primary role shifts from direct coding to overseeing task execution, process monitoring, and continuous improvement. By minimizing the required context at each restart, agent efficiency and transparency will significantly improve.

## Definitions
- **Process Tasks**: These are standardized tasks executed uniformly across various projects, including general process checks, logging, reviews, and quality assurance.
- **Project Tasks**: These are tasks unique to specific project objectives, including task-specific coding, dependencies, integrations, and design.

# Task Management and Execution

Tasks must follow clearly defined lifecycle phases:

## Task Preparation
Preparation is either conducted upon prior task completion or proactively:

1. Verify if the project has a baseline; if absent, create one and check the project into version control, allowing precise tracking and rollback.
2. Create a task-specific directory identified by `{task-id}`, containing:
   - `{task-id}-DESCRIPTION.md`: Clearly states task type, objectives, expected outcomes, success metrics, and uniquely identified task steps aligned with the checklist.
   - `{task-id}-CHECKLIST.md`: Tracks progress and checkpoints.
   - `{task-id}-STEP_LOG.md`: Logs all actions and decisions, including timestamps and outcomes to differentiate successful and unsuccessful attempts.
   - `{task-id}-COMMAND_LOG.md`: Records all agent commands executed during the task.

## Design Approach Phase
Given task goals, this phase:
- Reviews task objectives and prior feedback.
- Identifies feasible approaches and associated risks explicitly.
- Conducts provisional testing or code sampling as needed.
- Triggers sub-tasks (e.g., Dependency Updates, Code Examples, Test Case Designs).
- Requires formal review and documented approval depending on task complexity:
  - High complexity/new projects: Human and AI approval.
  - Lower complexity/stable projects: AI approval sufficient.

## Detailed Design Phase
- Documents explicit sequential steps necessary for task completion, clearly defined in DESCRIPTION and CHECKLIST files.
- Specifies steps as executable scripts or explicit AI prompts, enforcing logical order (e.g., database → business logic → UI updates).
- Requires documented approval (AI or human based on risk and project maturity).

## Package Dependency Management
Clearly document when:
- Adding, updating, or removing packages.
- Explicit handling of differences between current APIs and agent training APIs, including references/examples.

## Unit Test / Build Cycle
- Iterative creation and execution of unit tests.
- Code incrementally reviewed and built; feedback and learnings documented.
- AI review occurs at interim checkpoints to avoid costly build cycles.
- If progress stalls, return to earlier phases explicitly.

## Final Build and Integration Test
- Conduct comprehensive integration tests.
- Clearly document success criteria and decision-making steps for rework or task completion.

## Release Phase
Explicitly includes:
1. Creating release builds.
2. Conducting smoke tests; documenting outcomes explicitly.
3. Making test results transparently available.
4. Updating documentation and task status clearly.
5. Committing changes into version control.
6. Clearly defining the next action—transition to the subsequent task or escalation for broader project review.

# Task Initiation and Operation
At initiation:
- Revalidate and repeat task preparation if any project/task context changed since initial preparation.
- Update CHECKLIST status.
- Commit all state changes explicitly.

## Context Monitoring
The agent continuously monitors:
- Task progress.
- Context window consumption; proactively compacts and snapshots execution state as needed, explicitly restarting tasks when nearing token limits to avoid accidental complexity.

## Progress Monitoring and Approval
During task execution:
- When consistent issues occur (failed tests/builds), initially seek AI advice.
- Escalate to human intervention if AI feedback is unclear or ineffective.
- Explicitly document gating approval for any significant changes in direction or methodology. Changes without explicit approval are prohibited.

Upon task completion:
- Prepare a concise Task Summary incorporating DESCRIPTION, STEP_LOG, COMMAND_LOG, outcomes, issues encountered, and lessons learned.
- Explicitly document task completion and gain final human or AI approval based on risk and project maturity.

# Implementation Notes
- Claude Desktop controls the overall software development lifecycle.
- Claude Code performs direct coding actions.
- Both agents access OpenAI, Anthropic, and Google APIs via an MCP interface.
- Claude Desktop initiates project setup using Filesystem MCP, tracks agent progress via interface logs, and manually intervenes when task progression stalls.
- Continuous review checkpoints are established to ensure task alignment with explicit approvals.

# Example Scenario (Brief)
For a PDF annotation task:
1. Task Preparation clearly documents the annotation objective.
2. Design Approach evaluates PDF processing libraries and explicit risks.
3. Detailed Design specifies sequential steps—initially processing PDF pages, then annotating filenames on each page.
4. Unit Test Cycle incrementally validates annotation correctness.
5. Final Build ensures complete PDF annotation before release.

This explicit, structured approach ensures clarity, maintains control, minimizes unnecessary complexity, and maximizes efficiency.
