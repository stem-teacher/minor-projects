#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Verifying PDF Filename Annotator setup...${NC}"

# Check Rust installation
if command -v rustc >/dev/null 2>&1; then
    VERSION=$(rustc --version)
    echo -e "${GREEN}✓ Rust is installed: $VERSION${NC}"
else
    echo -e "${RED}✗ Rust is not installed${NC}"
    echo "Please install Rust from https://rustup.rs/"
    exit 1
fi

# Check Cargo installation
if command -v cargo >/dev/null 2>&1; then
    VERSION=$(cargo --version)
    echo -e "${GREEN}✓ Cargo is installed: $VERSION${NC}"
else
    echo -e "${RED}✗ Cargo is not installed${NC}"
    echo "Please install Rust from https://rustup.rs/"
    exit 1
fi

# Check project structure
echo -e "\n${YELLOW}Checking project structure...${NC}"
for DIR in src tests docs verified_patterns; do
    if [ -d "$DIR" ]; then
        echo -e "${GREEN}✓ $DIR directory exists${NC}"
    else
        echo -e "${RED}✗ $DIR directory does not exist${NC}"
        exit 1
    fi
done

# Check Cargo.toml
if [ -f "Cargo.toml" ]; then
    echo -e "${GREEN}✓ Cargo.toml exists${NC}"
else
    echo -e "${RED}✗ Cargo.toml does not exist${NC}"
    exit 1
fi

# Check if the code compiles
echo -e "\n${YELLOW}Checking if code compiles...${NC}"
cargo check
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Code compiles successfully${NC}"
else
    echo -e "${RED}✗ Code does not compile${NC}"
    exit 1
fi

# Run tests
echo -e "\n${YELLOW}Running tests...${NC}"
cargo test
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tests pass successfully${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}All checks passed! The PDF Filename Annotator is properly set up.${NC}"
echo -e "To build and run the application:"
echo -e "1. Edit config.json with your PDF directory paths"
echo -e "2. Run: cargo build --release"
echo -e "3. Run: ./target/release/pdf-filename-annotator --config config.json"
