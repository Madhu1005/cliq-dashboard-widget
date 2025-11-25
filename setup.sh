#!/bin/bash
# Setup script for local development
# Run this script when you have Node.js installed

echo ""
echo "========================================"
echo "Zoho Cliq Extension - Setup Script"
echo "========================================"
echo ""

cd cliq-extension

echo "[1/3] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "Node.js found: $(node --version)"
echo ""

echo "[2/3] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: npm install failed!"
    exit 1
fi
echo ""

echo "[3/3] Validating setup..."
npm run validate
echo ""

echo "========================================"
echo "Setup complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env"
echo "2. Fill in your environment variables"
echo "3. Run: npm start"
echo "4. Commit package-lock.json: git add . && git commit -m 'Add package-lock.json' && git push"
echo ""
