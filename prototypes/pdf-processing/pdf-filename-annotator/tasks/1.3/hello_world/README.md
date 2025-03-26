# Hello World

A simple greeting application that demonstrates the structured SDLC process.

## Features

- Customizable greetings with different styles
- Command-line interface with argument parsing
- Comprehensive test suite

## Installation

Ensure you have Rust and Cargo installed, then:

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd hello_world

# Build the project
cargo build --release
```

## Usage

```bash
# Basic usage (defaults to "World" with casual style)
./target/release/hello_world

# Custom name
./target/release/hello_world Alice

# Custom style
./target/release/hello_world --style formal
./target/release/hello_world -s enthusiastic

# Combine name and style
./target/release/hello_world Bob --style formal
```

## Available Styles

- `casual`: Friendly, informal greeting (default)
- `formal`: Polite, professional greeting
- `enthusiastic`: Excited, energetic greeting

## Development

### Running Tests

```bash
# Run all tests
cargo test

# Run unit tests only
cargo test --lib

# Run integration tests only
cargo test --test cli_tests
```

### Building

```bash
# Development build
cargo build

# Release build
cargo build --release
```

## Project Structure

- `src/lib.rs`: Core greeting functionality
- `src/main.rs`: Command-line interface implementation
- `tests/cli_tests.rs`: Integration tests for the CLI

## License

MIT
