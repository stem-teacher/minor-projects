# PDF Filename Annotator: Build Guide for Claude Code

This guide provides step-by-step instructions for building the PDF Filename Annotator with Claude Code, a command-line AI tool.

## Prerequisites

Before starting the build process, ensure you have:
- Claude Code installed and configured
- Rust toolchain installed (version 1.70+)
- Git installed (if using version control)
- Internet access for downloading dependencies

## Step 1: Clone or Navigate to the Project

Navigate to the project directory:
```bash
cd /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator
```

## Step 2: Prepare Claude Code Environment

1. Create a working file called `build-instructions.txt` containing the build prompt:
```bash
cat CLAUDE_CODE_BUILD.md > build-instructions.txt
```

2. Verify you have the prompt file:
```bash
ls -la build-instructions.txt
```

## Step 3: Execute Claude Code Build Process

Run Claude Code with the instructions:
```bash
claude-code build-pdf-annotator --prompt build-instructions.txt
```

This will trigger Claude Code to:
1. Check the environment
2. Verify dependencies
3. Build the application
4. Run tests
5. Generate a build report

## Step 4: Monitor Build Progress

Claude Code will display progress as it builds the application. You can track progress against the checklist:
```bash
cat BUILD_CHECKLIST.md
```

## Step 5: Verify Build Results

After the build completes:

1. Check if the binary was created:
```bash
ls -la target/release/pdf-filename-annotator
```

2. Verify it's executable:
```bash
file target/release/pdf-filename-annotator
```

## Step 6: Create Configuration

Create a configuration file for your environment:
```bash
cp config.example.json config.json
```

Edit the configuration file to specify your input and output directories:
```bash
nano config.json
```

## Step 7: Run the Application

Execute the application with your configuration:
```bash
./target/release/pdf-filename-annotator --config config.json
```

## Troubleshooting

If you encounter build issues:

1. Check for errors in the Rust build:
```bash
cargo check
```

2. Run verbose tests:
```bash
cargo test -- --nocapture
```

3. Clean and rebuild:
```bash
cargo clean
cargo build --release
```

4. Check dependency versions:
```bash
cargo tree
```

## Claude Code Command Reference

When using Claude Code with this project, you can use the following commands:

1. **Build the project**:
```bash
claude-code build --prompt CLAUDE_CODE_BUILD.md
```

2. **Analyze the codebase**:
```bash
claude-code analyze --path /Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator
```

3. **Fix specific issues**:
```bash
claude-code fix --prompt "Fix the error handling in the PDF processing module" --path src/pdf.rs
```

4. **Add a new feature**:
```bash
claude-code extend --prompt "Add support for custom text templates beyond just filenames" --path src/
```
