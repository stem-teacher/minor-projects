#!/usr/bin/env python3

import sys
try:
    import PyPDF2
except ImportError:
    print("Please install PyPDF2: pip install PyPDF2")
    sys.exit(1)

def examine_pdf(filepath):
    print(f"Examining PDF file: {filepath}")
    
    with open(filepath, 'rb') as file:
        pdf = PyPDF2.PdfReader(file)
        
        # Basic info
        print(f"Number of pages: {len(pdf.pages)}")
        
        # Check for AcroForm
        if '/AcroForm' in pdf.trailer['/Root']:
            print("PDF contains AcroForm (interactive form)")
            
            # Try to access form fields
            if hasattr(pdf, 'get_fields'):
                fields = pdf.get_fields()
                if fields:
                    print(f"Form fields found: {len(fields)}")
                    for field_name, field_value in fields.items():
                        print(f"  Field: {field_name} = {field_value}")
                else:
                    print("No form fields found")
            else:
                print("PyPDF2 version doesn't support get_fields()")
        else:
            print("PDF does not contain AcroForm")
        
        # Loop through all pages to find annotations
        for i, page in enumerate(pdf.pages):
            page_num = i + 1
            
            if '/Annots' in page:
                annots = page['/Annots']
                if isinstance(annots, list):
                    print(f"Page {page_num}: {len(annots)} annotations found")
                    
                    for j, annot in enumerate(annots):
                        if isinstance(annot, PyPDF2.generic.IndirectObject):
                            annot_obj = annot.get_object()
                            
                            # Get annotation type
                            if '/Subtype' in annot_obj:
                                subtype = annot_obj['/Subtype']
                                print(f"  Annotation {j+1}: Type = {subtype}")
                                
                                # Look for /T (title) field
                                if '/T' in annot_obj:
                                    title = annot_obj['/T']
                                    print(f"    Title: {title}")
                                
                                # Look for /Contents field
                                if '/Contents' in annot_obj:
                                    contents = annot_obj['/Contents']
                                    print(f"    Contents: {contents}")
                else:
                    print(f"Page {page_num}: Annotations reference found but not a list")
            else:
                print(f"Page {page_num}: No annotations found")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python examine_pdf.py <pdf_file>")
        sys.exit(1)
    
    examine_pdf(sys.argv[1])
