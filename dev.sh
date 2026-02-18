#!/bin/bash
# Development runner script
# Usage: ./dev.sh (will prompt for sudo if needed)

if [ "$EUID" -ne 0 ]; then
  exec sudo "$0" "$@"
fi

echo "Starting Backend in Development Mode..."
./backend/venv/bin/python backend/main.py
