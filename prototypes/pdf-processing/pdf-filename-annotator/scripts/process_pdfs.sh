#!/bin/bash
# PDF Filename Annotator - Batch Processing Script
# This script helps automate common PDF processing tasks

set -e

# Default values
DEFAULT_CONFIG="config.json"
DEFAULT_MODE="annotate"
CONFIG_FILE="$DEFAULT_CONFIG"
MODE="$DEFAULT_MODE"
VERBOSE=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display help information
function show_help {
    echo -e "${BLUE}PDF Filename Annotator - Batch Processing Script${NC}"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -c, --config FILE    Specify the configuration file (default: config.json)"
    echo "  -m, --mode MODE      Processing mode: annotate, verify, clean (default: annotate)"
    echo "  -v, --verbose        Enable verbose output"
    echo "  -h, --help           Display this help message"
    echo
    echo "Modes:"
    echo "  annotate    Process PDFs and add filename annotations"
    echo "  verify      Check if PDFs are properly configured for processing"
    echo "  clean       Remove all processed PDFs from the output directory"
    echo
    echo "Examples:"
    echo "  $0 --config my_config.json"
    echo "  $0 --mode verify --verbose"
    echo "  $0 --mode clean"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE="--verbose"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Check if the config file exists
if [ ! -f "$CONFIG_FILE" ] && [ "$MODE" != "clean" ]; then
    echo -e "${RED}Error: Configuration file '$CONFIG_FILE' not found${NC}"
    echo "Use -c or --config to specify a different file, or create this file."
    exit 1
fi

# Get input and output directories from config file (except in clean mode)
if [ "$MODE" != "clean" ]; then
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq not installed. Using grep/sed instead.${NC}"
        INPUT_DIR=$(grep -o '"input_dir": *"[^"]*"' "$CONFIG_FILE" | sed 's/"input_dir": *"\(.*\)"/\1/')
        OUTPUT_DIR=$(grep -o '"output_dir": *"[^"]*"' "$CONFIG_FILE" | sed 's/"output_dir": *"\(.*\)"/\1/')
    else
        INPUT_DIR=$(jq -r '.input_dir' "$CONFIG_FILE")
        OUTPUT_DIR=$(jq -r '.output_dir' "$CONFIG_FILE")
    fi
    
    # Check if we could extract the directories
    if [ -z "$INPUT_DIR" ] || [ -z "$OUTPUT_DIR" ]; then
        echo -e "${RED}Error: Could not extract input_dir or output_dir from $CONFIG_FILE${NC}"
        echo "Please check your configuration file format."
        exit 1
    fi
    
    echo -e "${BLUE}Using configuration:${NC}"
    echo -e "  Input directory:  ${GREEN}$INPUT_DIR${NC}"
    echo -e "  Output directory: ${GREEN}$OUTPUT_DIR${NC}"
fi

# Process based on mode
case "$MODE" in
    annotate)
        echo -e "${YELLOW}Starting PDF annotation process...${NC}"
        if [ -x "./target/release/pdf-filename-annotator" ]; then
            ./target/release/pdf-filename-annotator --config "$CONFIG_FILE" $VERBOSE
        else
            echo -e "${YELLOW}Running with cargo...${NC}"
            cargo run --release -- --config "$CONFIG_FILE" $VERBOSE
        fi
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}PDF annotation completed successfully!${NC}"
            echo -e "Annotated PDFs are available in: ${BLUE}$OUTPUT_DIR${NC}"
        else
            echo -e "${RED}PDF annotation failed.${NC}"
            exit 1
        fi
        ;;
        
    verify)
        echo -e "${YELLOW}Verifying PDF files...${NC}"
        
        # Check if input directory exists
        if [ ! -d "$INPUT_DIR" ]; then
            echo -e "${RED}Error: Input directory does not exist: $INPUT_DIR${NC}"
            exit 1
        fi
        
        # Count PDF files
        PDF_COUNT=$(find "$INPUT_DIR" -name "*.pdf" -o -name "*.PDF" | wc -l)
        echo -e "Found ${GREEN}$PDF_COUNT${NC} PDF files in the input directory"
        
        # Check output directory
        if [ ! -d "$OUTPUT_DIR" ]; then
            echo -e "${YELLOW}Output directory does not exist: $OUTPUT_DIR${NC}"
            echo -e "It will be created when you run the annotation process."
        else
            echo -e "${GREEN}Output directory exists: $OUTPUT_DIR${NC}"
            
            # Check write permissions
            if [ -w "$OUTPUT_DIR" ]; then
                echo -e "${GREEN}Output directory is writable${NC}"
            else
                echo -e "${RED}Warning: Output directory is not writable${NC}"
            fi
        fi
        
        echo -e "${GREEN}Verification completed!${NC}"
        ;;
        
    clean)
        # Ask for confirmation
        echo -e "${RED}Warning: This will remove all PDF files from the output directory.${NC}"
        read -p "Enter the output directory to clean: " OUTPUT_DIR
        read -p "Are you sure you want to continue? (y/n) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [ -d "$OUTPUT_DIR" ]; then
                echo -e "${YELLOW}Cleaning output directory: $OUTPUT_DIR${NC}"
                find "$OUTPUT_DIR" -name "*.pdf" -o -name "*.PDF" -delete
                echo -e "${GREEN}Cleaned up PDF files from output directory${NC}"
            else
                echo -e "${RED}Output directory does not exist: $OUTPUT_DIR${NC}"
                exit 1
            fi
        else
            echo -e "${BLUE}Operation cancelled${NC}"
        fi
        ;;
        
    *)
        echo -e "${RED}Error: Unknown mode: $MODE${NC}"
        show_help
        exit 1
        ;;
esac

exit 0
