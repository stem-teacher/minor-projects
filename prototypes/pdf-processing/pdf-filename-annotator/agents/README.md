# AI Agent Context Management

This directory contains context management files for the different AI agents involved in the software development process.

## Purpose

The primary purpose of this directory is to maintain continuity across chat sessions and ensure that context is properly preserved when switching between different AI agents or when sessions need to be restarted.

## Agent Structure

### Claude Desktop
- **Role**: Orchestration of the software development lifecycle
- **Context Files**:
  - `claude_desktop/CLAUDE_DESKTOP.md` - Primary context restoration file
  - `claude_desktop/TASK_TRACKING.md` - Agent-specific task tracking
  - `claude_desktop/SESSION_LOG.md` - Log of all chat sessions

### Claude Code
- **Role**: Implementation of code-specific tasks
- **Context Files**:
  - `claude_code/CLAUDE_CODE.md` - Primary context restoration file

## How to Use

### Starting a New Session
1. Begin by reading the agent's primary context file (e.g., `CLAUDE_DESKTOP.md`)
2. Review the "Current Session Information" and "Next Actions" sections
3. Check the task-specific documentation as referenced in the context file
4. Proceed with the next actions as specified

### Ending a Session
1. Update the agent's primary context file with the current status
2. Document any decisions made or issues encountered
3. Update the next actions for the following session
4. If using Claude Desktop, also update the SESSION_LOG.md with session summary

## Context Management Best Practices

1. **Regular Updates**: Update context files at the end of each session
2. **Precise Status Tracking**: Be specific about what has been completed and what remains
3. **Clear Next Actions**: Always document clear next steps for the following session
4. **Cross-References**: Include references to relevant task documentation
5. **Key Decisions**: Document important decisions that affect the project

## Coordination Between Agents

- Claude Desktop orchestrates the overall process and delegates specific implementation tasks to Claude Code
- Claude Code executes implementation tasks and reports results back to Claude Desktop
- All coordination should be documented in the respective context files
- Task handoffs should include clear documentation of requirements and expectations
