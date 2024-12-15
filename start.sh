#!/bin/bash

# Set the base project directory
BASE_DIR="/Users/gang.wang/code/askRag"

# Start the Node.js server in the background
#echo "Starting Node.js server..."
#cd "$BASE_DIR" && npm run server:dev &

# Wait a moment for the server to initialize
#sleep 2

# Start the main app
echo "Starting main app..."
cd "$BASE_DIR" && npm run dev

# This script will keep running with the app in the foreground
# When you terminate it, both processes will be stopped