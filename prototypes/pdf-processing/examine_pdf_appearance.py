#!/usr/bin/env python3

import sys
try:
    import PyPDF2
except ImportError:
    print("Please install PyPDF2: pip install PyPDF2")
    sys.exit(1)

def examine_annotation_appearance(filepath):
    print(f"Examining PDF annotations appearance: {filepath}")
    
    with open(filepath, 'rb') as file:
        pdf = PyPDF2.PdfReader(file)
        
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
                            subtype = annot_obj.get('/Subtype', 'Unknown')
                            title = annot_obj.get('/T', 'No Title')
                            contents = annot_obj.get('/Contents', 'No Contents')
                            
                            print(f"  Annotation {j+1}: Type = {subtype}, Title = {title}")
                            print(f"    Contents: {contents}")
                            
                            # Check for appearance settings
                            if '/AP' in annot_obj:
                                print(f"    Has appearance stream")
                            
                            # Check for color
                            if '/C' in annot_obj:
                                print(f"    Color: {annot_obj['/C']}")
                            
                            # Check for flags
                            if '/F' in annot_obj:
                                flags = annot_obj['/F']
                                print(f"    Flags: {flags}")
                                
                                # Common flag values
                                if flags & 1: print("      Invisible")
                                if flags & 2: print("      Hidden")
                                if flags & 4: print("      Print")
                                if flags & 8: print("      NoZoom")
                                if flags & 16: print("      NoRotate")
                                if flags & 32: print("      NoView")
                                if flags & 64: print("      ReadOnly")
                                if flags & 128: print("      Locked")
                                if flags & 256: print("      ToggleNoView")
                            
                            # Check visibility state
                            if '/Border' in annot_obj:
                                print(f"    Border: {annot_obj['/Border']}")
                            
                            if '/Rect' in annot_obj:
                                print(f"    Rectangle: {annot_obj['/Rect']}")
                            
                            # Check other appearance properties
                            for key in ['/DA', '/BS', '/BE', '/Q', '/RC', '/IT', '/LE']:
                                if key in annot_obj:
                                    print(f"    {key}: {annot_obj[key]}")
                            
                            print("")  # Add blank line between annotations

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python examine_pdf_appearance.py <pdf_file>")
        sys.exit(1)
    
    examine_annotation_appearance(sys.argv[1])
