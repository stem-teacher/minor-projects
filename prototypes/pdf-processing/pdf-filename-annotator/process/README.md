# Structured SDLC Process

This directory contains the templates and documentation for the structured software development lifecycle (SDLC) process designed to improve AI-assisted software development.

## Introduction

The structured SDLC process addresses the challenges posed by the finite token window (context limit) in AI systems like Claude. By implementing a standardized, document-centric approach, we can maintain context across sessions, ensure transparent progress tracking, and avoid accidental complexity.

## Process Components

### Documentation Templates

- [TASK_DESCRIPTION_TEMPLATE.md](TASK_DESCRIPTION_TEMPLATE.md) - Template for defining task objectives, success metrics, and dependencies
- [TASK_CHECKLIST_TEMPLATE.md](TASK_CHECKLIST_TEMPLATE.md) - Template for tracking task progress with checkable items
- [TASK_STEP_LOG_TEMPLATE.md](TASK_STEP_LOG_TEMPLATE.md) - Template for logging all actions with timestamps
- [TASK_COMMAND_LOG_TEMPLATE.md](TASK_COMMAND_LOG_TEMPLATE.md) - Template for logging all commands executed
- [TASK_SUMMARY_TEMPLATE.md](TASK_SUMMARY_TEMPLATE.md) - Template for summarizing completed tasks

### Process Guidelines

- [CONTEXT_MANAGEMENT_GUIDE.md](CONTEXT_MANAGEMENT_GUIDE.md) - Strategies for managing AI context window effectively
- [AI_COLLABORATION_PROTOCOL.md](AI_COLLABORATION_PROTOCOL.md) - Protocol for collaboration between different AI models

### Scripts

- [create_task.sh](create_task.sh) - Script for creating a new task with all required documentation

## Project Structure

The structured SDLC process uses the following directory structure:

- `/process/` - Templates and guidelines for the structured process
- `/project/` - Project-level documentation and planning
- `/tasks/` - Individual task directories (e.g., `/tasks/1.3/`)
- `/agents/` - Agent-specific context tracking for session continuity

## Task Lifecycle

Each task follows a structured lifecycle:

1. **Preparation Phase** - Set up task documentation and testing environment
2. **Design Approach Phase** - Review objectives and identify feasible approaches
3. **Detailed Design Phase** - Define explicit implementation steps
4. **Package Dependency Management** - Handle dependencies and API discrepancies
5. **Unit Test / Build Cycle** - Implement and test incrementally
6. **Final Build and Integration Test** - Verify all acceptance criteria
7. **Release Phase** - Create final build and complete documentation

## Using This Process

To create a new task:

```bash
./process/create_task.sh <task-id>
```

This will create a new task directory in `/tasks/<task-id>/` with all required documentation files:

- `<task-id>-DESCRIPTION.md`
- `<task-id>-CHECKLIST.md`
- `<task-id>-STEP_LOG.md`
- `<task-id>-COMMAND_LOG.md`

Then:

1. Complete the task description in `<task-id>-DESCRIPTION.md`
2. Customize the checklist in `<task-id>-CHECKLIST.md`
3. Begin implementation and document in `<task-id>-STEP_LOG.md`
4. Log all commands in `<task-id>-COMMAND_LOG.md`
5. Create a task summary when complete

## AI Collaboration Model

This process implements a structured AI collaboration model:

1. **Claude Desktop** (Orchestrator) - Manages the SDLC process and documentation
2. **Claude Code** (Implementer) - Executes coding tasks and commands
3. **Support AI Services** - Provide specialized expertise when needed

## Context Management

The process includes explicit context management strategies:

- Preemptive context planning
- Documentation for context persistence
- Controlled context reset protocol
- Context optimization techniques

For details, see [CONTEXT_MANAGEMENT_GUIDE.md](CONTEXT_MANAGEMENT_GUIDE.md).

## Session Continuity

To maintain continuity across chat sessions, the `/agents/` directory contains context files for each AI agent:

- `/agents/claude_desktop/CLAUDE_DESKTOP.md` - Primary context file for Claude Desktop
- `/agents/claude_desktop/SESSION_LOG.md` - Log of all chat sessions
- `/agents/claude_desktop/TASK_TRACKING.md` - Claude Desktop task tracking
- `/agents/claude_code/CLAUDE_CODE.md` - Primary context file for Claude Code

When starting a new session, begin by reviewing these files to restore context.
