# Context Management Guide

This guide outlines strategies and practices for managing the AI's context window effectively throughout the software development lifecycle.

## Understanding Context Limitations

- **Token Limit**: The AI has a finite token window (context limit)
- **Context Reset**: When this limit is reached, a reset must occur, which can lead to accidental complexity
- **Information Persistence**: Critical information must be explicitly documented to survive resets

## Context Management Strategies

### 1. Preemptive Context Planning

- **Anticipate Complexity**: For complex tasks, plan context usage in advance
- **Chunking**: Break large tasks into smaller, self-contained subtasks
- **Priority Information**: Identify and segregate critical vs. non-critical information

### 2. Documentation for Context Persistence

- **CURRENT_STATE.md**: Maintain up-to-date project state
- **STEP_LOG.md**: Document progress with timestamps and clear next steps
- **Critical Path Marking**: Clearly mark the most important information to preserve

### 3. Controlled Context Reset Protocol

When approaching the context limit (approximately 75-80% full):

1. **Signal Pending Reset**: Indicate that a reset is about to occur
2. **Summarize Current State**: Document current progress concisely
3. **Identify Resume Point**: Specify exactly where work should continue
4. **Record Critical Variables**: List any important values or decisions
5. **Execute Reset**: Perform a controlled context reset
6. **Verify After Reset**: Confirm understanding of task state after resuming

### 4. Context Optimization Techniques

- **Focused Scope**: Work on one file or component at a time
- **Reference Instead of Repeat**: Reference documentation rather than repeating it
- **Incremental Commits**: Commit progress frequently to externalize information
- **Prune Redundant Information**: Regularly remove obsolete or duplicate information

## Context Reset Template

When a context reset is required, use this format in STEP_LOG.md:

```markdown
## [YYYY-MM-DD HH:MM] - Context Reset
- **Context Status**: Context window limit approaching, performing controlled reset
- **Current Progress**: [Summary of progress so far]
- **Current Focus**: [What was being worked on]
- **Critical State**: [Important variables, paths, or status]
- **Resume Instructions**: [Clear instructions on how to resume work]
- **Next Action**: [Specific next action to take after reset]
```

## Context Usage Monitoring

Regularly assess context usage:

- **Low**: <30% of context window - Continue normal operation
- **Medium**: 30-60% of context window - Begin prioritizing information
- **High**: 60-80% of context window - Prepare for potential reset
- **Critical**: >80% of context window - Execute controlled reset protocol

## Best Practices for Multi-Session Tasks

- **Session Boundaries**: Plan natural stopping points between sessions
- **End-of-Session Summary**: Create comprehensive summaries at the end of each session
- **Beginning-of-Session Review**: Start each session by reviewing and confirming understanding
- **Cross-Session References**: Maintain clear references to previous session outcomes

## Real-Time Context Management

During active development:
- Regularly check if context is becoming cluttered
- Perform "mini-summaries" to consolidate understanding
- Externalize information when possible through documentation
- Recognize signs of context confusion and address immediately
