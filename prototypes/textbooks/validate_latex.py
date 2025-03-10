#!/usr/bin/env python3
import os
import re
import sys
import argparse

def validate_latex_file(file_path):
    """Check LaTeX file for common errors"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    errors = []
    
    # Check for unmatched braces
    open_braces = content.count('{')
    close_braces = content.count('}')
    if open_braces != close_braces:
        errors.append(f"Unmatched braces: {open_braces} opening vs {close_braces} closing")
    
    # Check for malformed environment begins
    begin_env = re.findall(r'\\begin\s+{([^}]*)}', content)
    if begin_env:
        errors.append(f"Malformed begin environments: {', '.join(begin_env)}")
    
    # Check for malformed environment ends
    end_env = re.findall(r'\\end\s+{([^}]*)}', content)
    if end_env:
        errors.append(f"Malformed end environments: {', '.join(end_env)}")
    
    # Check for stopandthink with parameter
    stopandthink_params = re.findall(r'\\begin{stopandthink}{([^}]*)}', content)
    if stopandthink_params:
        errors.append("stopandthink environment should not have parameters")
    
    # Check for any undefined command patterns
    undefined_patterns = re.findall(r'undefined color', content)
    if undefined_patterns:
        errors.append("Found reference to undefined colors")
    
    return errors

def validate_directory(directory):
    """Validate all .tex files in a directory"""
    has_errors = False
    for filename in os.listdir(directory):
        if filename.endswith('.tex'):
            file_path = os.path.join(directory, filename)
            errors = validate_latex_file(file_path)
            
            if errors:
                print(f"\nErrors in {file_path}:")
                for error in errors:
                    print(f"  - {error}")
                has_errors = True
            else:
                print(f"✓ {file_path} - No errors detected")
    
    return not has_errors

def main():
    parser = argparse.ArgumentParser(description='Validate LaTeX files for common errors')
    parser.add_argument('path', help='Path to LaTeX file or directory containing LaTeX files')
    args = parser.parse_args()
    
    if os.path.isdir(args.path):
        success = validate_directory(args.path)
    elif os.path.isfile(args.path) and args.path.endswith('.tex'):
        errors = validate_latex_file(args.path)
        if errors:
            print(f"\nErrors in {args.path}:")
            for error in errors:
                print(f"  - {error}")
            success = False
        else:
            print(f"✓ {args.path} - No errors detected")
            success = True
    else:
        print(f"Invalid path: {args.path}")
        success = False
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
