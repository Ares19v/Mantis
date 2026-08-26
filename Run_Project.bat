@echo off
title Mantis Agent Assist — Launcher
cd /d "%~dp0"

echo.
echo  ================================================================
echo    M A N T I S   A G E N T   A S S I S T   v2.0
echo    Startup Sequence Initiated
echo  ================================================================
echo.

:: --- Pre-flight: .env ---
if not exist ".env" (
    echo  [WARN]  No .env file found.
    echo  [INFO]  Copying .env.example to .env — add your GROQ_API_KEY before use.
    copy ".env.example" ".env" > nul
)

:: --- Pre-flight: Node Modules ---
if not exist "mantis_ui\node_modules\" (
    echo  [INFO]  Node modules missing. Running npm install...
    cd mantis_ui
    call npm install --silent
    cd ..
)

:: --- Launch Backend ---
echo  [1/3] Starting FastAPI Backend  ^>  http://localhost:8000
set "ACT_CMD="
if exist "venv\Scripts\Activate.ps1" set "ACT_CMD=& '.\venv\Scripts\Activate.ps1'; "
start "Mantis :: Backend" powershell -NoExit -Command ^
    "$host.ui.RawUI.WindowTitle = 'Mantis :: Backend'; " ^
    "Set-Location '%~dp0'; " ^
    "%ACT_CMD%" ^
    "python main.py"

:: --- Launch Frontend ---
echo  [2/3] Starting Vite Frontend    ^>  http://localhost:5173
start "Mantis :: Frontend" powershell -NoExit -Command ^
    "$host.ui.RawUI.WindowTitle = 'Mantis :: Frontend'; " ^
    "Set-Location '%~dp0mantis_ui'; " ^
    "npm run dev"

:: --- Wait then open browser ---
echo  [3/3] Waiting 5 seconds for servers to initialize...
timeout /t 5 /nobreak > nul

echo.
echo  ================================================================
echo    Dashboard  :  http://localhost:5173
echo    API Docs   :  http://localhost:8000/docs
echo  ================================================================
echo.

start "" "http://localhost:5173"
exit
