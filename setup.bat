@echo off
REM Setup script for local development
REM Run this script when you have Node.js installed

echo.
echo ========================================
echo Zoho Cliq Extension - Setup Script
echo ========================================
echo.

cd cliq-extension

echo [1/3] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found: 
node --version
echo.

echo [2/3] Installing dependencies...
npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo.

echo [3/3] Validating setup...
npm run validate
echo.

echo ========================================
echo Setup complete!
echo ========================================
echo.
echo Next steps:
echo 1. Copy .env.example to .env
echo 2. Fill in your environment variables
echo 3. Run: npm start
echo 4. Commit package-lock.json: git add . ^&^& git commit -m "Add package-lock.json" ^&^& git push
echo.
pause
