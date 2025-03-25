# Implementation Methodology

This document outlines the precise methodology to be followed when implementing this project. These procedures are mandatory and must be followed for all development tasks.

## Test-First Development Process

For each component implementation, follow these steps in exact order:

1. **Write Test First**
   - Begin by writing a minimal, focused test for the functionality
   - The test should clearly define expected behavior
   - Verify the test compiles but fails (expected at this stage)
   - Run with: `cargo test -- --nocapture` to see failure details

2. **Implement Minimum Viable Functionality**
   - Implement only what's needed to make the test pass
   - Follow correct API patterns exactly
   - Include proper error handling
   - Add documentation comments

3. **Verify Test Now Passes**
   - Run the test again to verify it now passes
   - If not, fix implementation and try again
   - Do not proceed until test passes

4. **Refine Implementation**
   - Improve error handling where needed
   - Enhance documentation
   - Ensure code meets all requirements

5. **Comprehensive Testing**
   - Add tests for edge cases and error conditions
   - Verify all tests pass
   - Check code coverage (if available)

## Single-File Focus Protocol

Attention must be focused on one file at a time:

1. **Complete Implementation Cycle**
   - Follow all steps for one file before moving to another
   - Implement → Test → Verify → Document → Commit

2. **Immediate Verification**
   - After implementing or modifying a file, immediately run:
     ```
     cargo check
     ```
   - Fix any errors before proceeding
   - Do not move to another file until current file compiles

3. **Commit After Verification**
   - Only commit code that successfully compiles
   - Use meaningful commit messages that reference the plan
   - Example: "Fix ObjectId type handling in processor.rs (Task 1.2.1)"

## Error Recovery Procedure

When encountering errors, follow this process:

1. **Isolate First Error**
   - Address only the first error shown in compiler output
   - Fix this single error before moving on

2. **Verify Fix**
   - Run `cargo check` again to verify the fix
   - If new errors appear, start again with the first error

3. **Document API Discrepancies**
   - If the error is due to API changes or documentation discrepancies:
     - Document the issue in API_CORRECTIONS.md
     - Include the expected API (from docs)
     - Include the actual required API
     - Reference official documentation

4. **Reset If Necessary**
   - If the context becomes too complex or confused:
     - Update CURRENT_STATE.md with exact status
     - Request a session restart
     - Resume with fresh context

## Context Management Discipline

The following procedures maintain implementation context integrity:

1. **Begin Each Session With**
   - Reading CURRENT_STATE.md completely
   - Reviewing the CHECKLIST.md for current task
   - Checking API_CORRECTIONS.md for known issues
   - Verifying the test-first methodology will be followed

2. **End Each Session With**
   - Updating CURRENT_STATE.md with exact progress
   - Documenting any discovered API issues
   - Summarizing complete and in-progress tasks
   - Identifying the next steps precisely

3. **Context Reset Indicators**
   - If you find yourself confused about API usage
   - If you're unsure about implementation details
   - If you detect inconsistencies in previous work
   - If you've been working on the same issue for too long without progress

## Documentation Standards

All code must be documented according to these standards:

1. **Public API Documentation**
   - Every public function must have documentation comments
   - Include:
     - Purpose description
     - Parameter details
     - Return value description
     - Error conditions
     - Usage example (if complex)

2. **Internal Documentation**
   - Document non-obvious implementation details
   - Explain complex algorithms or logic
   - Include references to documentation where relevant

3. **Test Documentation**
   - Each test should describe what it's testing
   - Document any special test setup or conditions

## Testing Strategy

Follow this testing strategy for all implementations:

1. **Unit Tests**
   - Test each function in isolation
   - Mock dependencies where appropriate
   - Include normal case and error case tests

2. **Integration Tests**
   - Test interactions between components
   - Test full workflows

3. **Edge Case Testing**
   - Test boundary conditions
   - Test invalid inputs
   - Test concurrent access (where relevant)

## Knowledge Persistence Procedures

Maintain knowledge across implementation sessions:

1. **API Corrections Documentation**
   - Maintain API_CORRECTIONS.md with all discovered issues
   - Format entries consistently
   - Include working solutions

2. **Implementation Templates**
   - Use successful implementations as templates for similar components
   - Document patterns that work well
   - Reference previous implementations in comments

3. **Compile-Check Cycle**
   - Maintain the discipline of the compile-check cycle
   - Never skip the verification step
   - Keep verification-per-file granularity