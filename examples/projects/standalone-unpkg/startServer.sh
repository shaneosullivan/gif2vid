#!/bin/bash

# Start a simple HTTP server for the standalone unpkg example

PORT=3334

echo "Starting HTTP server on port $PORT..."
echo "Open http://localhost:$PORT in your browser"
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
elif command -v serve &> /dev/null; then
    serve -p $PORT
else
    echo "Error: No HTTP server found. Please install one of:"
    echo "  - Python (python3 or python)"
    echo "  - serve (npm install -g serve)"
    exit 1
fi
