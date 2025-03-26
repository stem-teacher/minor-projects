#!/bin/bash
# create_task.sh - Script to create task directory and files

# Check if task ID was provided
if [ -z "$1" ]; then
    echo "Error: Task ID not provided"
    echo "Usage: ./create_task.sh <task-id>"
    exit 1
fi

TASK_ID=$1
TASK_DIR="tasks/${TASK_ID}"
PROCESS_DIR="$(dirname "$0")"
PROJECT_ROOT="$(dirname "$PROCESS_DIR")"

# Create task directory
echo "Creating task directory: ${TASK_DIR}"
mkdir -p "${PROJECT_ROOT}/${TASK_DIR}"

# Copy template files with proper names
echo "Creating task files from templates..."

# Description file
cp "${PROCESS_DIR}/TASK_DESCRIPTION_TEMPLATE.md" "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-DESCRIPTION.md"
sed -i'.bak' "s/\[task-id\]/${TASK_ID}/g" "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-DESCRIPTION.md"
rm "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-DESCRIPTION.md.bak"

# Checklist file
cp "${PROCESS_DIR}/TASK_CHECKLIST_TEMPLATE.md" "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-CHECKLIST.md"
sed -i'.bak' "s/\[task-id\]/${TASK_ID}/g" "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-CHECKLIST.md"
rm "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-CHECKLIST.md.bak"

# Step log file
cp "${PROCESS_DIR}/TASK_STEP_LOG_TEMPLATE.md" "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-STEP_LOG.md"
sed -i'.bak' "s/\[task-id\]/${TASK_ID}/g" "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-STEP_LOG.md"
rm "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-STEP_LOG.md.bak"

# Command log file
cp "${PROCESS_DIR}/TASK_COMMAND_LOG_TEMPLATE.md" "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-COMMAND_LOG.md"
sed -i'.bak' "s/\[task-id\]/${TASK_ID}/g" "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-COMMAND_LOG.md"
rm "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-COMMAND_LOG.md.bak"

# Set current date/time for initial step log entry
CURRENT_DATETIME=$(date "+%Y-%m-%d %H:%M")
sed -i'.bak' "s/\[YYYY-MM-DD HH:MM\] - Session Started/${CURRENT_DATETIME} - Task Created/g" "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-STEP_LOG.md"
rm "${PROJECT_ROOT}/${TASK_DIR}/${TASK_ID}-STEP_LOG.md.bak"

echo "Task directory and files created successfully!"
echo "Task location: ${PROJECT_ROOT}/${TASK_DIR}/"
echo ""
echo "Created files:"
echo "- ${TASK_ID}-DESCRIPTION.md"
echo "- ${TASK_ID}-CHECKLIST.md"
echo "- ${TASK_ID}-STEP_LOG.md"
echo "- ${TASK_ID}-COMMAND_LOG.md"
echo ""
echo "Next steps:"
echo "1. Complete the task description in ${TASK_ID}-DESCRIPTION.md"
echo "2. Customize the checklist in ${TASK_ID}-CHECKLIST.md"
echo "3. Begin implementation and document in ${TASK_ID}-STEP_LOG.md"
echo "4. Log commands in ${TASK_ID}-COMMAND_LOG.md"
