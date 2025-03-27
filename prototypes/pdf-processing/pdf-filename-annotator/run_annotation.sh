#!/bin/bash
# Script to run PDF annotation for all class directories

# Path to the annotator executable
ANNOTATOR="/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator/target/release/pdf-filename-annotator"
CONFIG_DIR="/Users/philiphaynes/devel/teaching/projects/minor-projects/prototypes/pdf-processing/pdf-filename-annotator/configs"

# Create the base output directory if it doesn't exist
mkdir -p "/Volumes/second-store/scan/2025-T1-annotated"

# Process each class directory
classes=("7SCID" "7SCIF" "7SCIG" "7SCIO" "7SCIR" "7SCIS")
total_processed=0
total_errors=0

echo "Starting PDF annotation process..."
echo "-----------------------------------"

for class in "${classes[@]}"; do
    echo "Processing class $class..."
    
    # Create output directory
    mkdir -p "/Volumes/second-store/scan/2025-T1-annotated/$class"
    
    # Run the annotator
    $ANNOTATOR -c "$CONFIG_DIR/config-$class.json" -v
    
    # Check exit status
    if [ $? -eq 0 ]; then
        # Count files in input and output directories
        input_count=$(find "/Volumes/second-store/scan/2025-T1/$class" -name "*.pdf" | wc -l)
        output_count=$(find "/Volumes/second-store/scan/2025-T1-annotated/$class" -name "*.pdf" | wc -l)
        
        echo "  Files processed for $class: $output_count/$input_count"
        
        # Update totals
        total_processed=$((total_processed + output_count))
        if [ $input_count -ne $output_count ]; then
            diff=$((input_count - output_count))
            total_errors=$((total_errors + diff))
            echo "  Warning: $diff files may not have been processed correctly"
        fi
    else
        echo "  Error: Failed to process $class"
        total_errors=$((total_errors + 1))
    fi
    
    echo "-----------------------------------"
done

# Print summary
echo "PDF Annotation Complete"
echo "Total files processed: $total_processed"
if [ $total_errors -gt 0 ]; then
    echo "Total errors encountered: $total_errors"
    echo "Please check the logs for details."
else
    echo "All files processed successfully!"
fi
