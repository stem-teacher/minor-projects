# [task-id]-CHECKLIST.md

## Preparation Phase
- [ ] Review related documentation
- [ ] Set up task directory with required files
- [ ] Create task description (DESCRIPTION.md)
- [ ] Identify and document dependencies
- [ ] Set up testing environment if needed
- [ ] Create initial test cases 
- [ ] Create implementation plan
- [ ] Update STEP_LOG.md with preparation actions

## Design Approach Phase
- [ ] Review task objectives and constraints
- [ ] Identify feasible approaches and associated risks
- [ ] Conduct provisional testing/code sampling as needed
- [ ] Select optimal implementation approach
- [ ] Document approach decisions in STEP_LOG.md
- [ ] Get design approach approval (AI/Human as required)

## Detailed Design Phase
- [ ] Define explicit sequential implementation steps
- [ ] Create detailed component specifications
- [ ] Identify potential edge cases and error scenarios
- [ ] Review and update test cases based on detailed design
- [ ] Get detailed design approval (AI/Human as required)
- [ ] Update STEP_LOG.md with design activities

## Package Dependency Management
- [ ] Identify required dependencies
- [ ] Document current API vs expected API differences
- [ ] Update Cargo.toml with required dependencies
- [ ] Verify dependencies with `cargo check`
- [ ] Update STEP_LOG.md with dependency changes

## Unit Test / Build Cycle
- [ ] Create unit tests for [Component 1]
- [ ] Implement [Component 1]
- [ ] Verify [Component 1] tests pass
- [ ] Create unit tests for [Component 2]
- [ ] Implement [Component 2]
- [ ] Verify [Component 2] tests pass
- [ ] Integrate components and verify functionality
- [ ] Conduct AI code review
- [ ] Address review feedback
- [ ] Update STEP_LOG.md with implementation progress

## Final Build and Integration Test
- [ ] Run full test suite
- [ ] Verify all acceptance criteria are met
- [ ] Benchmark performance if applicable
- [ ] Document any remaining issues or limitations
- [ ] Get implementation approval (AI/Human as required)
- [ ] Update STEP_LOG.md with test results

## Release Phase
- [ ] Create final build
- [ ] Conduct smoke tests
- [ ] Update project documentation
- [ ] Commit all changes to version control
- [ ] Update CURRENT_STATE.md with task completion
- [ ] Create task summary
- [ ] Get release approval (AI/Human as required)
- [ ] Define next action or follow-up tasks
