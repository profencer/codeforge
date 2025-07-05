#!/bin/bash

# CodeForge Setup Script
echo "🚀 Setting up CodeForge..."

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build the project
echo "🔨 Building CodeForge..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Make bin executable
chmod +x bin/codeforge

echo "✅ CodeForge setup complete!"
echo ""
echo "🎯 Usage options:"
echo "  Local usage:    ./bin/codeforge --help"
echo "  NPM script:     npm run codeforge -- --help"
echo "  Global install: sudo npm link"
echo ""
echo "🚀 Quick start:"
echo "  ./bin/codeforge sample --type blog"
echo "  ./bin/codeforge validate"
echo "  ./bin/codeforge generate all"
echo ""
echo "📚 Documentation:"
echo "  README.md - Main documentation"
echo "  DEMO.md - Complete demo walkthrough"
echo "  INSTALLATION.md - Installation guide"
