# Session Reset Protocol

This document outlines the specific protocol to follow when a session needs to be reset due to context overflow, confusion, or when starting a new session.

## Indicators for Session Reset

A session reset should be initiated when:

1. **Context Overflow**
   - The implementation context becomes too complex
   - Multiple files are being modified simultaneously
   - The error stack becomes too deep
   - Context window is reaching capacity limits

2. **Implementation Confusion**
   - Uncertainty about API usage
   - Repeated failed attempts to fix the same error
   - Confusion about implementation requirements
   - Contradictory information or instructions

3. **Natural Session Breaks**
   - Completion of a major task
   - Logical stopping point in implementation
   - Start of a new session after time away

## Preparation for Reset

Before initiating a reset, ensure these steps are completed:

1. **Document Current Status**
   - Update CURRENT_STATE.md with precise progress
   - Include file-by-file status
   - Document any in-progress work
   - List specific errors being addressed

2. **Record API Issues**
   - Document any API discrepancies in API_CORRECTIONS.md
   - Include both expected and actual API usage
   - Reference documentation sources

3. **Save Partial Progress**
   - Document any partially implemented solutions
   - Note specific approaches attempted
   - Record error messages encountered
   - Preserve any successful test implementations

4. **Update Implementation Plan**
   - Mark completed tasks in CHECKLIST.md
   - Note any tasks that need revisiting
   - Identify the exact next step

## Reset Process

When executing a reset, follow this process:

1. **Perform Final State Update**
   - Make final updates to CURRENT_STATE.md
   - Ensure all current progress is documented
   - Mark exact point for continuation
   - Note any known issues to be addressed

2. **Clear Implementation Context**
   - Explicitly state that you are performing a context reset
   - Note the reason for the reset
   - Identify the starting point for the next session

3. **Commit Documentation Updates**
   - Ensure all status documents are updated
   - Make any necessary filesystem commits
   - Preserve all implementation progress

4. **Reset Confirmation**
   - Confirm the reset is complete
   - Reference the reset point in CURRENT_STATE.md
   - Provide clear instructions for resuming work

## Resuming After Reset

When starting a new session after a reset:

1. **State Assessment**
   - Read CURRENT_STATE.md completely
   - Review CHECKLIST.md for current task
   - Check API_CORRECTIONS.md for known issues
   - Validate understanding of current status

2. **Context Reestablishment**
   - Summarize the current implementation state
   - Identify the specific file and function to work on
   - Reference the test-first methodology to be followed
   - Note the specific next steps

3. **Validation Check**
   - Run `cargo check` to verify current state
   - Run `cargo test` to verify existing tests
   - Ensure understanding of any failing tests
   - Validate API version understanding

4. **Implementation Continuation**
   - Begin with the exact next step from CURRENT_STATE.md
   - Follow test-first development methodology
   - Maintain single-file focus
   - Continue the compile-check cycle

## Reset Message Template

When requesting a reset, use this template:

```
## Session Reset Required

I need to perform a session reset due to [reason for reset].

### Current Status
- Phase: [Current phase]
- Task: [Current task]
- Subtask: [Current subtask]
- Target File: [File being implemented]
- Implementation Status: [Status description]
- Error State: [Any current errors]

### Next Steps After Reset
1. [First step after reset]
2. [Second step after reset]
3. [Continuation plan]

I have updated:
- CURRENT_STATE.md with the exact progress
- API_CORRECTIONS.md with discovered API issues
- CHECKLIST.md with completed tasks

Please restart the session, beginning with a review of CURRENT_STATE.md.
```