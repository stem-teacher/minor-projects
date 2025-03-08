#\!/bin/bash

echo "==== Starting Stage 4 OpenAI Textbook Generation ===="
echo "This script will generate all chapters for the Stage 4 textbook."
echo "The process will run in the background. You can close this terminal."
echo ""
echo "To monitor progress: tail -f stage4-openai-log.txt"
echo ""

# Run in background with nohup
nohup ./generate_stage4_openai.sh > /dev/null 2>&1 &

echo "Process started with PID: $\!"
echo "Check stage4-openai-log.txt for progress updates."
