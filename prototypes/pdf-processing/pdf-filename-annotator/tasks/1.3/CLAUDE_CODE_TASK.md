# Claude Code Task: Build and Test Hello World Project

## IMPORTANT: READ THIS FIRST
This task is ONLY about building and testing the hello world Rust project in tasks/1.3/hello_world/.
DO NOT attempt to work on the main PDF Filename Annotator project.
Stick strictly to the steps outlined in this document.

## Task Description
Execute the build and test process for the Rust hello world project. This task is part of testing the structured SDLC process with proper separation of responsibilities between Claude Desktop (orchestration) and Claude Code (execution).

## Expected Output
1. Successful build of the project
2. Passing unit and integration tests
3. Detailed logs of commands executed and their outputs

## Context
This project is a simple Rust application that demonstrates the structured SDLC process. The project structure has been set up with the following files:
- `Cargo.toml` - Project configuration with dependencies
- `src/lib.rs` - Library code with greeting functionality
- `src/main.rs` - CLI application using clap for argument parsing
- `tests/cli_tests.rs` - Integration tests for the CLI interface

The project implements a greeting application with customizable styles (formal, casual, enthusiastic).

## Context Management
To prevent context window overflow:
1. First read the PRECISE_IMPLEMENTATION_PLAN.md in the project directory
2. Only load files that are specifically referenced in the implementation plan
3. Focus on the current task (Task 1.3) files
4. Document which files you've read in your responses
5. Do not read files unless they are needed for the current task

## Steps to Execute
1. Navigate to the project directory
2. Run `cargo check` to verify the code compiles
3. Run `cargo test --lib` to run the unit tests
4. Run `cargo build` to build the project
5. Run `cargo test` to run all tests including integration tests
6. Run the application with various arguments to verify functionality
7. Document all commands and their outputs

## Success Criteria
- All commands execute successfully
- All tests pass
- The application runs as expected with different arguments
- All outputs are properly documented

## Reporting
Document all commands and their outputs in the 1.3-COMMAND_LOG.md file, following the established format.
