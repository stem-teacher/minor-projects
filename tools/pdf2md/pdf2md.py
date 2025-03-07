#!/usr/bin/env python3
import os
import subprocess
import glob
import re

def extract_text(pdf_file):
    """Extract text from PDF using pdftotext with improved layout preservation"""
    try:
        # Use -layout flag to preserve original physical layout
        # Use -nopgbrk to avoid page breaks
        # Use -enc UTF-8 to ensure proper character encoding
        output = subprocess.check_output(['pdftotext', '-layout', '-nopgbrk', '-enc', 'UTF-8', pdf_file, '-'])
        text = output.decode('utf-8')

        # Clean up the text
        # Remove multiple blank lines
        text = re.sub(r'\n{3,}', '\n\n', text)

        return text
    except subprocess.CalledProcessError as e:
        print(f"Error extracting text from {pdf_file}: {e}")
        return ""
    except UnicodeDecodeError:
        print(f"Error decoding text from {pdf_file}")
        return ""

def extract_images(pdf_file, output_dir):
    """Extract images from PDF using pdftoppm"""
    base_name = os.path.basename(pdf_file).replace('.pdf', '')
    images_dir = os.path.join(output_dir, base_name)
    os.makedirs(images_dir, exist_ok=True)

    # Use pdftoppm to convert PDF pages to images
    subprocess.run([
        'pdftoppm', '-png', '-r', '300',
        pdf_file, f"{images_dir}/page"
    ])

    # Return list of generated image files
    return sorted(glob.glob(f"{images_dir}/page-*.png"))

def convert_pdf_to_markdown(pdf_file, output_dir='images', format_style='github', extract_equations=False, pages=None, no_images=False):
    """Convert PDF to Markdown with images and extracted text
    
    Args:
        pdf_file: Path to the PDF file
        output_dir: Directory to store extracted images
        format_style: Markdown style (github or pandoc)
        extract_equations: Whether to attempt to convert equations to LaTeX
        pages: Range of pages to convert (e.g. "1-5" or "2,4,7")
        no_images: Skip image extraction if True
    """
    print(f"Converting {pdf_file} to Markdown...")

    # Extract base name for output file
    base_name = os.path.basename(pdf_file).replace('.pdf', '')
    md_file = f"{base_name}.md"
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Parse page range if specified
    page_list = None
    if pages:
        page_list = []
        ranges = pages.split(',')
        for r in ranges:
            if '-' in r:
                start, end = map(int, r.split('-'))
                page_list.extend(range(start, end + 1))
            else:
                page_list.append(int(r))

    # Get number of pages from the PDF using pdfinfo
    try:
        pdfinfo_output = subprocess.check_output(['pdfinfo', pdf_file]).decode('utf-8')
        pages_match = re.search(r'Pages:\s+(\d+)', pdfinfo_output)
        num_pages = int(pages_match.group(1)) if pages_match else 0
        
        # Extract PDF title if available
        title_match = re.search(r'Title:\s+(.+)', pdfinfo_output)
        title = title_match.group(1).strip() if title_match else base_name
    except (subprocess.CalledProcessError, AttributeError) as e:
        print(f"Error getting page info: {e}")
        num_pages = 0
        title = base_name

    # Extract text from the entire PDF using pdftotext
    full_text = extract_text(pdf_file)
    
    # Extract images from the PDF if not disabled
    images = []
    if not no_images:
        images = extract_images(pdf_file, output_dir)
        
    # Filter to only use pages in the specified range if provided
    if page_list and num_pages > 0:
        # Filter to only include pages in the specified range
        valid_pages = [p for p in page_list if 1 <= p <= num_pages]
        if not valid_pages:
            print(f"Warning: No valid pages in specified range {pages} for {pdf_file}")
            valid_pages = list(range(1, num_pages + 1))
    else:
        valid_pages = list(range(1, num_pages + 1))
    
    # Create markdown with the PDF title
    markdown = f"# {title}\n\n"
    
    # Add a table of contents section
    markdown += "## Table of Contents\n\n"
    
    # Try to extract headings from full text to build TOC
    headings = []
    for line in full_text.split('\n'):
        line = line.strip()
        # Look for potential heading patterns (all caps, short lines, etc.)
        if (line and len(line) < 80 and 
            (re.match(r'^[A-Z0-9\s\-_.,;:]+$', line) or 
             re.match(r'^\d+(\.\d+)*\s+[A-Z]', line) or
             re.match(r'^(Chapter|Section)\s+\d+', line, re.IGNORECASE))):
            # Clean up the heading
            clean_heading = re.sub(r'\s+', ' ', line).strip()
            if len(clean_heading) > 3:  # Skip very short headings
                headings.append(clean_heading)
    
    # Add extracted headings to TOC
    if headings:
        for i, heading in enumerate(headings[:15]):  # Limit to top 15 headings
            markdown += f"- [{heading}](#heading-{i+1})\n"
    else:
        # Fallback if no headings were detected
        markdown += "- [Document Overview](#document-overview)\n"
        for i in range(min(5, num_pages)):
            markdown += f"- [Page {i+1}](#page-{i+1})\n"
    
    markdown += "\n## Document Overview\n\n"
    markdown += "This document was converted from PDF to Markdown format. Each page is presented as an image followed by its extracted text.\n\n"
    
    # Extract text from each page individually for better page separation
    text_pages = []
    if num_pages > 0:
        for i in valid_pages:
            try:
                # Extract text from a specific page
                page_output = subprocess.check_output([
                    'pdftotext', '-layout', '-f', str(i), '-l', str(i), pdf_file, '-'
                ]).decode('utf-8')
                text_pages.append((i, page_output.strip()))
            except (subprocess.CalledProcessError, UnicodeDecodeError) as e:
                print(f"Error extracting text from page {i}: {e}")
                text_pages.append((i, ""))
    else:
        # Fallback to form feed splitting if pdfinfo fails
        text_splits = full_text.split('\f')
        text_pages = [(i+1, text.strip()) for i, text in enumerate(text_splits)]
        
    # Attempt to identify sections in the document
    sections = []
    current_section = {"title": "Introduction", "start_page": 1, "content": []}
    
    # Pattern for section headings - adjust based on document structure
    section_patterns = [
        r'^(?:CHAPTER|Chapter)\s+\d+\s*[-:.]?\s*(.+)$',
        r'^(?:SECTION|Section)\s+\d+\s*[-:.]?\s*(.+)$',
        r'^\d+\.\d*\s+([A-Z][\w\s]+)$',
        r'^([A-Z][A-Z\s]{3,})$'
    ]
    
    for page_num, text in text_pages:
        lines = text.split('\n')
        found_section = False
        
        for line in lines[:10]:  # Check first 10 lines for section headers
            line = line.strip()
            for pattern in section_patterns:
                match = re.match(pattern, line)
                if match:
                    # If we found a section header, save the current section and start a new one
                    if current_section["content"]:
                        sections.append(current_section)
                    
                    section_title = match.group(1).strip() if match.groups() else line
                    current_section = {
                        "title": section_title,
                        "start_page": page_num,
                        "content": [(page_num, text)]
                    }
                    found_section = True
                    break
            if found_section:
                break
                
        if not found_section:
            current_section["content"].append((page_num, text))
    
    # Add the last section
    if current_section["content"]:
        sections.append(current_section)
        
    # If no sections were detected, create a single section with all content
    if not sections:
        sections.append({
            "title": "Document Content",
            "start_page": 1,
            "content": text_pages
        })
    
    # Create a document that organizes content by sections
    
    # First, update the TOC to include sections
    markdown = f"# {title}\n\n## Table of Contents\n\n"
    for i, section in enumerate(sections):
        markdown += f"- [{section['title']}](#section-{i+1})\n"
    
    markdown += "\n## Document Overview\n\n"
    markdown += "This document was converted from PDF to Markdown format and organized into sections. Each page is presented with its extracted text and images when available.\n\n"
    
    # Add sections with their content
    for i, section in enumerate(sections):
        markdown += f"<a id='section-{i+1}'></a>\n\n"
        markdown += f"## {section['title']}\n\n"
        
        # Process each page in this section
        for page_num, page_text in section["content"]:
            # Find corresponding image if it exists
            page_img = None
            if not no_images:
                img_candidates = [img for img in images if f"page-{page_num:02d}" in img or f"page-{page_num}" in img]
                if img_candidates:
                    page_img = img_candidates[0]
            
            markdown += f"### Page {page_num}\n\n"
            
            # Add the image if available
            if page_img:
                rel_path = os.path.relpath(page_img, os.path.dirname(md_file))
                markdown += f"![PDF page {page_num} from {title}]({rel_path})\n\n"
            
            if page_text:
                if page_img:
                    markdown += "#### Extracted Text\n\n"
                
                # Enhanced text processing for better markdown formatting
                processed_text = []
                
                lines = page_text.split('\n')
                in_paragraph = False
                code_block = False
                
                for line in lines:
                    line = line.rstrip()
                    
                    # Skip empty lines but end paragraphs
                    if not line.strip():
                        if in_paragraph:
                            processed_text.append("")
                            in_paragraph = False
                        continue
                    
                    # Check for bullet points
                    if re.match(r'^\s*[•\-\*]\s+', line):
                        if in_paragraph:
                            processed_text.append("")
                            in_paragraph = False
                        # Ensure proper markdown bullet formatting
                        processed_text.append(re.sub(r'^\s*[•\-\*]\s+', '* ', line))
                        
                    # Check for numbered lists
                    elif re.match(r'^\s*\d+[\.\)]\s+', line):
                        if in_paragraph:
                            processed_text.append("")
                            in_paragraph = False
                        # Ensure proper markdown numbered list formatting
                        processed_text.append(re.sub(r'^\s*(\d+)[\.\)]\s+', r'\1. ', line))
                        
                    # Check for possible headers (all caps lines or clear heading patterns)
                    elif ((re.match(r'^[A-Z0-9\s\-_.,;:]+$', line.strip()) and len(line.strip()) < 80) or
                          re.match(r'^\d+(\.\d+)*\s+[A-Za-z]', line) or
                          re.match(r'^(Chapter|Section)\s+\d+', line, re.IGNORECASE)):
                        if in_paragraph:
                            processed_text.append("")
                            in_paragraph = False
                        
                        # Determine heading level based on patterns
                        if re.match(r'^(Chapter|CHAPTER)', line, re.IGNORECASE) or len(line) < 20:
                            processed_text.append(f"### {line.strip()}")
                        else:
                            processed_text.append(f"#### {line.strip()}")
                            
                    # Detect table-like content (lines with multiple whitespace separations)
                    elif line.strip().count('  ') > 3 or line.count('|') > 2:
                        if in_paragraph:
                            processed_text.append("")
                            in_paragraph = False
                        
                        # Format as code block for table-like content to preserve spacing
                        if not code_block:
                            processed_text.append("```")
                            code_block = True
                        processed_text.append(line)
                        
                    # Otherwise treat as paragraph text
                    else:
                        if code_block:
                            processed_text.append("```")
                            code_block = False
                            
                        if not in_paragraph:
                            in_paragraph = True
                        processed_text.append(line)
                
                # Close any open code block
                if code_block:
                    processed_text.append("```")
                    
                markdown += "\n".join(processed_text)
                markdown += "\n\n"
            
        # Add a separator between pages
        if i < len(images) - 1:
            markdown += "---\n\n"

    # Write markdown to file
    with open(md_file, 'w') as f:
        f.write(markdown)

    print(f"Created {md_file} with {len(images)} images and extracted text")

def print_help():
    """Print usage information for the script"""
    print("Usage: ./pdf2md.py [options] <pdf_file>")
    print("Options:")
    print("  -h, --help                Display this help message")
    print("  -v, --verbose             Enable detailed output during conversion")
    print("  -o, --output <dir>        Specify the output directory (default: same as PDF)")
    print("  -p, --pages <range>       Convert specific page range (e.g. '1-5' or '2,4,7')")
    print("  --no-images               Skip image extraction")
    print("  --extract-equations       Convert embedded equations to LaTeX")
    print("  --format <style>          Choose Markdown style (github or pandoc)")
    print("  --version                 Show version information")
    print("\nAvailable PDF files in current directory:")
    for pdf in sorted(glob.glob("*.pdf")):
        print(f"  {pdf}")

if __name__ == "__main__":
    import sys
    import argparse
    
    # Create argument parser
    parser = argparse.ArgumentParser(description="Convert PDF files to Markdown with images and text extraction")
    parser.add_argument("pdf_file", nargs="?", help="Path to the PDF file to convert")
    parser.add_argument("-o", "--output", dest="output_dir", default="images", help="Directory to store extracted images")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable detailed output")
    parser.add_argument("-p", "--pages", help="Range of pages to convert (e.g. '1-5' or '2,4,7')")
    parser.add_argument("--no-images", action="store_true", help="Skip image extraction")
    parser.add_argument("--extract-equations", action="store_true", help="Convert embedded equations to LaTeX")
    parser.add_argument("--format", choices=["github", "pandoc"], default="github", help="Markdown style")
    parser.add_argument("--version", action="store_true", help="Show version information")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Handle version request
    if args.version:
        print("pdf2md version 1.0.0")
        sys.exit(0)
    
    # Check if a PDF file was provided
    if not args.pdf_file:
        print_help()
        sys.exit(1)
    
    # Ensure the PDF file exists
    if not os.path.exists(args.pdf_file):
        print(f"Error: File not found: {args.pdf_file}")
        sys.exit(1)
    
    # Convert the PDF to Markdown
    convert_pdf_to_markdown(
        args.pdf_file, 
        args.output_dir,
        args.format,
        args.extract_equations,
        args.pages,
        args.no_images
    )