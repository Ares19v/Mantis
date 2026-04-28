@echo off
title Mantis Agent Assist — Installation
cd /d "%~dp0"

echo.
echo  ================================================================
echo    M A N T I S   A G E N T   A S S I S T   v2.0
echo    Installation
echo  ================================================================
echo.

:: --- Check Python ---
python --version > nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python is not installed or not in PATH.
    echo  [INFO]  Download from https://python.org ^(3.10+ required^)
    pause & exit /b 1
)

:: --- Check Node ---
node --version > nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  [INFO]  Download from https://nodejs.org ^(v18+ required^)
    pause & exit /b 1
)

:: --- [1/4] Python virtual environment ---
echo  [1/4] Creating Python virtual environment...
if exist "venv\" (
    echo  [SKIP]  venv already exists.
) else (
    python -m venv venv
    if errorlevel 1 ( echo  [ERROR] Failed to create venv. & pause & exit /b 1 )
    echo  [OK]    venv created.
)

:: --- [2/4] Python dependencies ---
echo  [2/4] Installing Python dependencies...
call venv\Scripts\activate.bat
pip install --upgrade pip --quiet
pip install -r requirements.txt
if errorlevel 1 (
    echo  [ERROR] pip install failed. Check requirements.txt and your internet connection.
    pause & exit /b 1
)
echo  [OK]    Python dependencies installed.

:: --- [3/4] Environment file ---
echo  [3/4] Setting up environment configuration...
if not exist ".env" (
    copy ".env.example" ".env" > nul
    echo  [OK]    .env created from template.
    echo.
    echo  *** ACTION REQUIRED ***
    echo  Open .env and replace "your_groq_api_key_here" with your real key.
    echo  Get a free key at: https://console.groq.com
    echo.
) else (
    echo  [SKIP]  .env already exists.
)

:: --- [4/4] Node.js dependencies ---
echo  [4/4] Installing frontend dependencies...
cd mantis_ui
call npm install
if errorlevel 1 (
    echo  [ERROR] npm install failed. Check your internet connection.
    cd ..
    pause & exit /b 1
)
cd ..
echo  [OK]    Frontend dependencies installed.

echo.
echo  ================================================================
echo    Installation complete!
echo.
echo    Next steps:
echo      1. Edit .env  — paste your GROQ_API_KEY
echo      2. Run Run_Project.bat to launch the dashboard
echo  ================================================================
echo.
pause
