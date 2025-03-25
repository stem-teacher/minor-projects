# Installation Guide for PDF Filename Annotator

This guide provides detailed instructions for setting up and installing the PDF Filename Annotator tool.

## Prerequisites

- **Rust Toolchain**: Version 1.70 or later
  - Install from [https://rustup.rs/](https://rustup.rs/)
- **Operating System**:
  - Linux (Debian, Ubuntu, Fedora, etc.)
  - macOS 10.15+
  - Windows 10/11

## Dependencies

The following system libraries are required:

### For Debian/Ubuntu:
```bash
sudo apt update
sudo apt install build-essential pkg-config libssl-dev
```

### For macOS (using Homebrew):
```bash
brew install openssl pkg-config
```

### For Windows:
- Install Visual Studio C++ build tools or MinGW
- Ensure Rust is properly installed with the MSVC toolchain

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://your-repository-url/pdf-filename-annotator.git
cd pdf-filename-annotator
```

### 2. Build the Project

#### Development Build
```bash
cargo build
```

#### Release Build (Optimized)
```bash
cargo build --release
```

### 3. Run Tests

```bash
cargo test
```

### 4. Install the Binary (Optional)

This will install the binary to your Cargo bin directory (usually `~/.cargo/bin/` on Linux/macOS).

```bash
cargo install --path .
```

## Configuration

1. Create a configuration file (e.g., `config.json`) based on the example provided:

```bash
cp config.example.json config.json
```

2. Edit the configuration file to specify your input and output directories:

```json
{
  "input_dir": "/path/to/your/pdfs",
  "output_dir": "/path/to/output/directory",
  "recursive": true,
  "font": {
    "family": "Calibri",
    "size": 12.0,
    "fallback": "Arial"
  },
  "position": {
    "corner": "top-right",
    "x_offset": 10.0,
    "y_offset": 10.0
  }
}
```

## Font Configuration

The tool attempts to find fonts in standard system locations. If you're having issues with font loading:

1. Create a `fonts` directory in the project root:
   ```bash
   mkdir -p fonts
   ```

2. Copy your desired fonts into this directory:
   ```bash
   cp /path/to/Calibri.ttf fonts/
   ```

## Running the Application

### Using the Binary

If you installed the application with `cargo install`:

```bash
pdf-filename-annotator --config config.json
```

### Running without Installation

```bash
cargo run -- --config config.json
```

Add the `--verbose` flag for detailed logging:

```bash
cargo run -- --config config.json --verbose
```

## Troubleshooting

### Font Issues

If the application can't find your specified font:

1. Ensure the font is installed on your system
2. Use a font that's widely available (e.g., Arial, Times New Roman)
3. Place the font file in the `fonts` directory as described above

### Permission Errors

If you encounter permission errors:

1. Ensure you have read permissions for the input directory
2. Ensure you have write permissions for the output directory
3. On Linux/macOS, you may need to run with elevated privileges for certain directories

### PDF Processing Errors

If certain PDFs fail to process:

1. Ensure the PDFs are not encrypted or password-protected
2. Try with simpler PDFs to identify specific compatibility issues
3. Check the application logs for specific error messages
