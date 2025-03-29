#!/bin/bash
set -e # Exit on error

TASK_ID="2.1-impl-cli-add-annotation-freetext"
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../../..")
ANNOTATOR_CRATE_PATH="$PROJECT_ROOT/pdf-filename-annotator" # Path to the crate containing the binaries
STEP_LOG="$SCRIPT_DIR/${TASK_ID}-STEP_LOG.md"
COMMAND_LOG="$SCRIPT_DIR/${TASK_ID}-COMMAND_LOG.md"
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")

# --- Log Start ---
echo "## ${CURRENT_DATETIME} - Executing Task ${TASK_ID}" >> "$STEP_LOG"
echo "Project Root: $PROJECT_ROOT" >> "$STEP_LOG"
echo "Goal: Implement add-annotation CLI binary (FreeText only)." >> "$STEP_LOG"
echo "Executing script: $0" >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"
echo "### ${CURRENT_DATETIME} - Task ${TASK_ID} Execution" >> "$COMMAND_LOG"
echo "" >> "$COMMAND_LOG"

# --- Action 1: Create Binary Source File ---
BIN_SRC_DIR="$ANNOTATOR_CRATE_PATH/src/bin"
BIN_FILE="$BIN_SRC_DIR/add_annotation.rs"
echo "[Action 1] Creating binary source file: $BIN_FILE" | tee -a "$STEP_LOG"
echo "Command: mkdir -p \"$BIN_SRC_DIR\" && touch \"$BIN_FILE\" && echo ... > \"$BIN_FILE\"" >> "$COMMAND_LOG"
mkdir -p "$BIN_SRC_DIR"
touch "$BIN_FILE"

# Initial content for add_annotation.rs
cat <<'EOF' > "$BIN_FILE"
use clap::Parser;
use std::path::PathBuf;
use anyhow::{Context, Result}; // Using anyhow for top-level error handling in binaries

use pdf_exam_tools_lib::{add_labeled_freetext, Config, FontConfig}; // Import library function and config
use lopdf::Document;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Input PDF file path
    #[arg(short, long)]
    input: PathBuf,

    /// Output PDF file path
    #[arg(short, long)]
    output: PathBuf,

    /// Page number (1-based)
    #[arg(short, long)]
    page: u32,

    /// Annotation label (/T value)
    #[arg(short, long)]
    label: String,

    /// Annotation type (currently only 'freetext' supported)
    #[arg(long, default_value = "freetext")]
    type_: String, // Use type_ because type is a reserved keyword

    /// Annotation rectangle [x1,y1,x2,y2] (comma-separated)
    #[arg(long, value_parser = parse_rect)]
    rect: [f32; 4],

    /// Text content for FreeText annotations
    #[arg(long, default_value = "")]
    contents: String,

    /// Font size for FreeText annotations (optional)
    #[arg(long, default_value_t = 12.0)]
    font_size: f32,

    // font_family is omitted for now, hardcoding Helvetica in lib
}

/// Parses a comma-separated string into a [f32; 4] array.
fn parse_rect(s: &str) -> Result<[f32; 4], String> {
    let parts: Vec<&str> = s.split(',').map(|x| x.trim()).collect();
    if parts.len() != 4 {
        return Err("Rectangle must have exactly 4 comma-separated values".to_string());
    }
    let mut rect = [0.0f32; 4];
    for (i, part) in parts.iter().enumerate() {
        rect[i] = part.parse::<f32>().map_err(|e| format!("Invalid number '{}' at index {}: {}", part, i, e))?;
    }
    Ok(rect)
}


fn main() -> Result<()> {
    // Consider adding env_logger initialization here later
    // env_logger::init();

    let args = Args::parse();

    // Basic validation for type (expand later)
    if args.type_ != "freetext" {
         anyhow::bail!("Unsupported annotation type '{}'. Only 'freetext' is currently supported.", args.type_);
    }

    // Load the document
    let mut doc = Document::load(&args.input)
        .with_context(|| format!("Failed to load input PDF: {}", args.input.display()))?;

    // Prepare FontConfig (simplified for now)
    let font_config = FontConfig {
        size: args.font_size,
        family: "Helvetica".to_string(), // Hardcoded for now
        fallback: None,
    };

    // Call the library function
    add_labeled_freetext(
        &mut doc,
        args.page,
        &args.label,
        &args.contents,
        args.rect,
        &font_config, // Pass reference
    ).with_context(|| format!("Failed to add annotation '{}' to page {}", args.label, args.page))?;


    // Save the modified document
    doc.save(&args.output)
        .with_context(|| format!("Failed to save output PDF: {}", args.output.display()))?;

    println!("Successfully added annotation '{}' to page {} in {}", args.label, args.page, args.output.display());

    Ok(())
}
EOF
echo "Result: Created $BIN_FILE." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"

# --- Action 2: Update Annotator Crate's Cargo.toml ---
ANNOTATOR_CARGO="$ANNOTATOR_CRATE_PATH/Cargo.toml"
echo "[Action 2] Ensuring binary target and dependencies in $ANNOTATOR_CARGO" | tee -a "$STEP_LOG"
echo "Command: Modifying $ANNOTATOR_CARGO (manual check recommended)" >> "$COMMAND_LOG"

# Add bin target if not present
if ! grep -q 'name = "add-annotation"' "$ANNOTATOR_CARGO"; then
    echo "   -> Adding bin target 'add-annotation'" | tee -a "$STEP_LOG"
    # Add before the first existing [[bin]] or at the end of [package] if none exist
    awk '
    BEGIN { added=0 }
    /^\[\[bin\]]/ && !added {
        print ""
        print "[[bin]]"
        print "name = \"add-annotation\""
        print "path = \"src/bin/add_annotation.rs\""
        added=1
    }
    { print }
    END { if (!added) {
            print ""
            print "[[bin]]"
            print "name = \"add-annotation\""
            print "path = \"src/bin/add_annotation.rs\""
        }
    }' "$ANNOTATOR_CARGO" > "$ANNOTATOR_CARGO.tmp" && mv "$ANNOTATOR_CARGO.tmp" "$ANNOTATOR_CARGO"
else
     echo "   -> Bin target 'add-annotation' already exists." | tee -a "$STEP_LOG"
fi

# Ensure necessary dependencies for the binary crate itself
# Add clap if not present under [dependencies]
 if ! grep -q '^clap =' "$ANNOTATOR_CARGO"; then
     echo "   -> Adding clap dependency" | tee -a "$STEP_LOG"
      awk '/^\[dependencies\]/ { print; print "clap = { version = \"4.5.4\", features = [\"derive\"] }"; next } 1' "$ANNOTATOR_CARGO" > "$ANNOTATOR_CARGO.tmp" && mv "$ANNOTATOR_CARGO.tmp" "$ANNOTATOR_CARGO"
 fi
 # Add anyhow if not present under [dependencies]
  if ! grep -q '^anyhow =' "$ANNOTATOR_CARGO"; then
      echo "   -> Adding anyhow dependency" | tee -a "$STEP_LOG"
       awk '/^\[dependencies\]/ { print; print "anyhow = \"1.0\""; next } 1' "$ANNOTATOR_CARGO" > "$ANNOTATOR_CARGO.tmp" && mv "$ANNOTATOR_CARGO.tmp" "$ANNOTATOR_CARGO"
  fi
 # Ensure library dependency is present
 if ! grep -q 'pdf_exam_tools_lib' "$ANNOTATOR_CARGO"; then
     echo "   -> Adding pdf_exam_tools_lib dependency" | tee -a "$STEP_LOG"
     awk '/^\[dependencies\]/ { print; print "pdf_exam_tools_lib = { path = \"../pdf_exam_tools_lib\" }"; next } 1' "$ANNOTATOR_CARGO" > "$ANNOTATOR_CARGO.tmp" && mv "$ANNOTATOR_CARGO.tmp" "$ANNOTATOR_CARGO"
 fi

echo "Result: Updated $ANNOTATOR_CARGO." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 3: Format code ---
echo "[Action 3] Running cargo fmt for annotator crate" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo fmt --package pdf-filename-annotator)" >> "$COMMAND_LOG"
(cd "$PROJECT_ROOT" && cargo fmt --package pdf-filename-annotator) >> "$COMMAND_LOG" 2>&1
FMT_STATUS=$?
echo "Result: Formatting complete (Status: $FMT_STATUS)." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"
echo "---" >> "$COMMAND_LOG"


# --- Action 4: Validation ---
echo "[Action 4] Running cargo check for annotator crate" | tee -a "$STEP_LOG"
echo "Command: (cd \"$PROJECT_ROOT\" && cargo check --package pdf-filename-annotator)" >> "$COMMAND_LOG"
CHECK_OUTPUT_FILE="$SCRIPT_DIR/cargo_check.output"
(cd "$PROJECT_ROOT" && cargo check --package pdf-filename-annotator) > "$CHECK_OUTPUT_FILE" 2>&1
CARGO_CHECK_STATUS=$?
cat "$CHECK_OUTPUT_FILE" >> "$COMMAND_LOG"
# rm "$CHECK_OUTPUT_FILE" # Keep output
echo "Result: cargo check finished (Status: $CARGO_CHECK_STATUS)." >> "$STEP_LOG"
echo "" >> "$STEP_LOG"


# --- Log End ---
echo "---" >> "$COMMAND_LOG"
if [ $CARGO_CHECK_STATUS -eq 0 ]; then
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: SUCCESS" >> "$STEP_LOG"
  echo "Validation: cargo check passed for pdf-filename-annotator." >> "$STEP_LOG"
  exit 0
else
  echo "## ${CURRENT_DATETIME} - Task ${TASK_ID} Result: FAILURE" >> "$STEP_LOG"
  echo "Validation: cargo check failed for pdf-filename-annotator. See command log ($COMMAND_LOG) and output file ($CHECK_OUTPUT_FILE) for details." >> "$STEP_LOG"
  exit 1
fi