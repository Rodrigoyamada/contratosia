#!/bin/bash
# Script to start the development server with the correct Node.js version

# Get the absolute path of the script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Add local Node.js to PATH
export PATH="$DIR/node-v22.13.0-darwin-x64/bin:$PATH"

# Check Node version
echo "Using Node.js version: $(node -v)"

# Start Vite server
echo "Starting ContratosIA..."
npm run dev
