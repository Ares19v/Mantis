@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo  Mantis Agent Assist (Real-Time AI Copilot)
echo ========================================================
echo.

if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
        echo [1/3] Initialized .env from template.
    )
)

echo [2/3] Starting FastAPI Backend on Port 8000...
start "Mantis Backend" cmd /k ".\venv\Scripts\python.exe main.py"

echo [3/3] Starting Vite Frontend on Port 5173...
cd mantis_ui
start "Mantis Frontend" cmd /k "npm run dev"
cd ..

timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================================
echo  Mantis is LIVE at: http://localhost:5173
echo  Backend API Docs : http://localhost:8000/docs
echo ========================================================
