#!/bin/bash

# Exit on error
set -e

# Clear screen for a clean, premium interface
clear

echo "=========================================================="
echo "      🏔️  SKI GAME - FOLDER RENAME & GITHUB UPLOAD 🏔️      "
echo "=========================================================="
echo ""

# 1. Stop any running server on port 8081
echo "🔍 Checking for running ski game servers on port 8081..."
PID=$(lsof -t -i:8081 || true)
if [ -n "$PID" ]; then
    echo "🛑 Stopping running server (PID: $PID) to prevent file lock..."
    kill -9 "$PID"
    echo "✓ Server stopped."
else
    echo "✓ No running server found on port 8081."
fi
echo ""

# 2. Git Initialization and Commit
echo "📦 Preparing Git repository..."
if [ ! -d ".git" ]; then
    git init
    git branch -M main
    echo "✓ Initialized empty Git repository."
else
    echo "✓ Git repository already initialized."
fi

# Add all files to staging
git add .

# Check if there is anything to commit
if git diff-index --quiet HEAD --; then
    echo "✓ No new changes to commit."
else
    git commit -m "Initial commit of Ski Game"
    echo "✓ Committed local changes."
fi
echo ""

# 3. GitHub Remote Configuration & Push
echo "🌐 GitHub Upload Configuration"
echo "----------------------------------------------------------"
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || true)

if [ -n "$CURRENT_REMOTE" ]; then
    echo "Current GitHub remote is: $CURRENT_REMOTE"
    read -p "Do you want to use this remote? (y/n, default: y): " KEEP_REMOTE
    KEEP_REMOTE=${KEEP_REMOTE:-y}
    if [[ "$KEEP_REMOTE" =~ ^[Nn]$ ]]; then
        git remote remove origin
        CURRENT_REMOTE=""
    fi
fi

if [ -z "$CURRENT_REMOTE" ]; then
    echo "To upload your project to GitHub:"
    echo "1. Go to https://github.com/new"
    echo "2. Create a new repository named 'ski-game' (do NOT initialize with README/gitignore)"
    echo "3. Copy the HTTPS or SSH repository URL"
    echo ""
    read -p "👉 Paste your GitHub Repository URL here: " REPO_URL
    if [ -n "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        CURRENT_REMOTE="$REPO_URL"
        echo "✓ Added remote origin: $REPO_URL"
    else
        echo "⚠️ No URL provided. Skipping GitHub upload."
    fi
fi

if [ -n "$CURRENT_REMOTE" ]; then
    echo ""
    echo "🚀 Pushing code to GitHub (main branch)..."
    if git push -u origin main; then
        echo "✓ Successfully uploaded to GitHub!"
    else
        echo "❌ Push failed. Please check your GitHub credentials or internet connection."
    fi
fi
echo ""

# 4. Folder Rename
echo "📁 Renaming project folder..."
cd /Users/kilianfrey
if [ -d "Ski Gamge" ]; then
    mv "Ski Gamge" "ski game"
    echo "✓ Renamed '/Users/kilianfrey/Ski Gamge' to '/Users/kilianfrey/ski game'!"
else
    echo "⚠️ Folder '/Users/kilianfrey/Ski Gamge' not found (it might have already been renamed)."
fi
echo ""

# 5. Server Restart Options
echo "⚡ Server Restart"
echo "----------------------------------------------------------"
read -p "Do you want to start the Ski Game local server now? (y/n, default: y): " START_SERVER
START_SERVER=${START_SERVER:-y}
if [[ "$START_SERVER" =~ ^[Yy]$ ]]; then
    cd "/Users/kilianfrey/ski game"
    echo "🚀 Starting server..."
    nohup node server.js > server.log 2>&1 &
    sleep 1
    echo "✓ Server is running in the background!"
    echo "👉 You can open it at: http://127.0.0.1:8081/"
fi

echo ""
echo "=========================================================="
echo "🎉 Setup complete! You can open the renamed folder in VS Code."
echo "=========================================================="
