# Makefile for the Exam Marking System

# Variables
PYTHON = python3
VENV = venv
BIN = $(VENV)/bin
PIP = $(BIN)/pip
PYTHON_VENV = $(BIN)/python
FLASK = $(BIN)/flask

# Default target
.PHONY: all
all: setup

# Setup virtual environment and install dependencies
.PHONY: setup
setup: $(VENV)/bin/activate

$(VENV)/bin/activate: requirements.txt
	@echo "Creating virtual environment and installing dependencies..."
	@test -d $(VENV) || $(PYTHON) -m venv $(VENV)
	@$(PIP) install --upgrade pip
	@$(PIP) install -r requirements.txt
	@touch $(VENV)/bin/activate
	@echo "Setup complete. Activate the virtual environment with: source venv/bin/activate"

# Run the Flask application
.PHONY: run
run: $(VENV)/bin/activate
	@echo "Starting the Flask application..."
	@$(PYTHON_VENV) app.py

# Run OCR test on an exam file
.PHONY: test-ocr
test-ocr: $(VENV)/bin/activate
	@echo "Running OCR test..."
	@$(PYTHON_VENV) test_ocr.py $(FILE) $(DISPLAY)

# Run grading test with sample data
.PHONY: test-grading
test-grading: $(VENV)/bin/activate
	@echo "Running grading test..."
	@$(PYTHON_VENV) test_grading.py --create-sample
	@$(PYTHON_VENV) test_grading.py --answers sample_student_answers.json --key sample_answer_key.json

# Run full system test
.PHONY: test-system
test-system: $(VENV)/bin/activate
	@echo "Running full system test..."
	@$(PYTHON_VENV) test_full_system.py $(ARGS)

# Generate sample exams for testing
.PHONY: generate-samples
generate-samples: $(VENV)/bin/activate
	@echo "Generating sample exams..."
	@$(PYTHON_VENV) generate_sample_exam.py --answer-key sample_answer_key.json

# Clean generated files
.PHONY: clean
clean:
	@echo "Cleaning up..."
	@rm -rf __pycache__
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -delete
	@rm -f sample_*.json
	@echo "Cleaned up generated files."

# Deep clean (including virtual environment and uploads)
.PHONY: deep-clean
deep-clean: clean
	@echo "Performing deep clean..."
	@rm -rf $(VENV)
	@rm -rf uploads/*
	@rm -rf results/*
	@echo "Deep clean complete."

# Help target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  all            : Setup the project (default)"
	@echo "  setup          : Create virtual environment and install dependencies"
	@echo "  run            : Start the Flask application"
	@echo "  test-ocr       : Test OCR functionality (usage: make test-ocr FILE=path/to/exam.jpg DISPLAY=--display)"
	@echo "  test-grading   : Test grading functionality with sample data"
	@echo "  test-system    : Test the full system (usage: make test-system ARGS=\"--image path/to/exam.jpg --display\")"
	@echo "  generate-samples: Generate sample exams for testing"
	@echo "  clean          : Remove generated files"
	@echo "  deep-clean     : Remove all generated files, virtual environment, and uploads"
	@echo "  help           : Display this help message"
