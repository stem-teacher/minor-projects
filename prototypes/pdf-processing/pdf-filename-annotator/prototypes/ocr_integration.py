#!/usr/bin/env python3
"""
OCR Integration Prototype for PDF Filename Annotator

This script demonstrates how OCR capabilities could be integrated into the
PDF Filename Annotator project. It processes PDF files, extracts text using OCR,
and demonstrates potential exam marking capabilities.

Dependencies:
- pdf2image
- pytesseract
- Pillow
- numpy

Installation:
  pip install pdf2image pytesseract Pillow numpy

Note: You also need to install Tesseract OCR on your system:
- On Debian/Ubuntu: sudo apt-get install tesseract-ocr
- On macOS: brew install tesseract
- On Windows: Download and install from https://github.com/UB-Mannheim/tesseract/wiki
"""

import argparse
import os
import re
import json
import sys
from typing import Dict, List, Tuple, Any, Optional
import logging
from pathlib import Path

try:
    import pdf2image
    import pytesseract
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
except ImportError:
    print("Error: Required dependencies not found.")
    print("Please install required packages with:")
    print("pip install pdf2image pytesseract Pillow numpy")
    sys.exit(1)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class PDFOCRProcessor:
    """Process PDF files with OCR capabilities."""
    
    def __init__(self, config_path: str):
        """Initialize the processor with configuration."""
        self.config = self._load_config(config_path)
        self.ocr_lang = self.config.get("ocr", {}).get("language", "eng")
        self.dpi = self.config.get("ocr", {}).get("dpi", 300)
        self.input_dir = Path(self.config["input_dir"])
        self.output_dir = Path(self.config["output_dir"])
        self.output_dir.mkdir(exist_ok=True, parents=True)
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file."""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                
            # Add default OCR settings if not present
            if "ocr" not in config:
                config["ocr"] = {
                    "language": "eng",
                    "dpi": 300,
                    "threshold": 90
                }
                
            return config
        except (json.JSONDecodeError, FileNotFoundError) as e:
            logger.error(f"Error loading configuration: {e}")
            sys.exit(1)
    
    def process_all(self) -> None:
        """Process all PDF files in the input directory."""
        pdf_files = list(self.input_dir.glob("**/*.pdf")) if self.config.get("recursive", False) else list(self.input_dir.glob("*.pdf"))
        
        if not pdf_files:
            logger.error(f"No PDF files found in {self.input_dir}")
            return
        
        logger.info(f"Found {len(pdf_files)} PDF files to process")
        
        for pdf_path in pdf_files:
            try:
                result = self.process_file(pdf_path)
                if result:
                    logger.info(f"Successfully processed {pdf_path.name}")
                    # Write extracted text to file
                    text_output = self.output_dir / f"{pdf_path.stem}_text.txt"
                    with open(text_output, 'w') as f:
                        f.write(result["text"])
                    
                    # If this looks like an exam, try to detect answers
                    if self._is_likely_exam(result["text"]):
                        answers = self._detect_answers(result["text"])
                        if answers:
                            answers_output = self.output_dir / f"{pdf_path.stem}_answers.json"
                            with open(answers_output, 'w') as f:
                                json.dump(answers, f, indent=2)
                            logger.info(f"Detected {len(answers)} potential answers in {pdf_path.name}")
            except Exception as e:
                logger.error(f"Error processing {pdf_path.name}: {e}")
    
    def process_file(self, pdf_path: Path) -> Optional[Dict[str, Any]]:
        """Process a single PDF file with OCR."""
        logger.info(f"Processing {pdf_path}")
        
        # Convert PDF to images
        try:
            images = pdf2image.convert_from_path(
                pdf_path, 
                dpi=self.dpi,
                fmt="png"
            )
        except Exception as e:
            logger.error(f"Error converting PDF to images: {e}")
            return None
        
        logger.info(f"Converted {len(images)} pages to images")
        
        # Process each page with OCR
        all_text = []
        
        for i, img in enumerate(images):
            # Apply OCR to image
            text = pytesseract.image_to_string(img, lang=self.ocr_lang)
            all_text.append(text)
            
            # Create annotated image with filename
            annotated_img = self._annotate_image(img, pdf_path.name)
            
            # Save annotated image for reference
            img_output = self.output_dir / f"{pdf_path.stem}_page_{i+1}.png"
            annotated_img.save(img_output)
        
        return {
            "filename": pdf_path.name,
            "text": "\n------ PAGE BREAK ------\n".join(all_text),
            "page_count": len(images)
        }
    
    def _annotate_image(self, img: Image.Image, text: str) -> Image.Image:
        """Add text annotation to image."""
        # Create a copy of the image
        annotated = img.copy()
        draw = ImageDraw.Draw(annotated)
        
        # Try to load a font, or use default
        try:
            font_size = 24  # Equivalent to about 12pt at 300 DPI
            font = ImageFont.truetype("Arial.ttf", font_size)
        except IOError:
            font = ImageFont.load_default()
        
        # Draw text in top-right corner with padding
        width, height = annotated.size
        text_width, text_height = draw.textsize(text, font=font)
        position = (width - text_width - 20, 20)  # 20px padding
        
        # Draw semi-transparent background
        draw.rectangle(
            [position[0]-5, position[1]-5, position[0]+text_width+5, position[1]+text_height+5],
            fill=(255, 255, 255, 128)
        )
        
        # Draw text
        draw.text(position, text, fill=(0, 0, 0), font=font)
        
        return annotated
    
    def _is_likely_exam(self, text: str) -> bool:
        """Determine if text is likely from an exam paper."""
        # Simple heuristic checking for common exam keywords
        exam_keywords = [
            "exam", "test", "quiz", "question", "answer",
            "marks", "grade", "score", "points", "assessment",
            "multiple choice", "true or false", "essay"
        ]
        
        text_lower = text.lower()
        keyword_count = sum(1 for keyword in exam_keywords if keyword in text_lower)
        
        # If at least 3 keywords are found, consider it an exam
        return keyword_count >= 3
    
    def _detect_answers(self, text: str) -> Dict[str, Any]:
        """Attempt to detect answers in exam text."""
        # Look for multiple choice answers (A, B, C, D)
        mc_pattern = r"(?:^|\n)(\d+)[.)\s]+(.+?)(?:\n|$)"
        mc_matches = re.findall(mc_pattern, text, re.MULTILINE)
        
        # Look for true/false questions
        tf_pattern = r"(?:^|\n)(\d+)[.)\s]+(True|False|T|F)(?:\n|$)"
        tf_matches = re.findall(tf_pattern, text, re.IGNORECASE | re.MULTILINE)
        
        # Look for numerical answers
        num_pattern = r"(?:^|\n)(\d+)[.)\s]+([-+]?\d*\.?\d+)(?:\n|$)"
        num_matches = re.findall(num_pattern, text, re.MULTILINE)
        
        results = {
            "multiple_choice": dict(mc_matches),
            "true_false": dict((q, a.upper()) for q, a in tf_matches),
            "numerical": dict((q, float(a)) for q, a in num_matches),
        }
        
        return results


def main():
    parser = argparse.ArgumentParser(description="OCR Integration Prototype for PDF Filename Annotator")
    parser.add_argument("--config", type=str, required=True, help="Path to configuration JSON file")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    processor = PDFOCRProcessor(args.config)
    processor.process_all()


if __name__ == "__main__":
    main()
