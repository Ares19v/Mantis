@echo off
title Mantis Agent Assist — Uninstall
cd /d "%~dp0"

echo.
echo  ================================================================
echo    M A N T I S   A G E N T   A S S I S T   v2.0
echo    Uninstall
echo  ================================================================
echo.
echo  The following will be removed:
echo    - venv\                     (Python environment)
echo    - mantis_ui\node_modules\   (Node packages)
echo    - mantis_ui\dist\           (Production build)
echo.
echo  Your source code and .env will NOT be touched.
echo.

set /p confirm="  Type YES to confirm: "
if /i not "%confirm%"=="YES" (
    echo.
    echo  Cancelled. Nothing was removed.
    pause & exit /b 0
)

echo.

echo  [1/3] Removing Python virtual environment...
if exist "venv\" (
    rmdir /s /q "venv\"
    echo  [OK]    Removed venv\
) else (
    echo  [SKIP]  venv\ not found.
)

echo  [2/3] Removing Node modules...
if exist "mantis_ui\node_modules\" (
    rmdir /s /q "mantis_ui\node_modules\"
    echo  [OK]    Removed mantis_ui\node_modules\
) else (
    echo  [SKIP]  mantis_ui\node_modules\ not found.
)

echo  [3/3] Removing build artifacts...
if exist "mantis_ui\dist\" (
    rmdir /s /q "mantis_ui\dist\"
    echo  [OK]    Removed mantis_ui\dist\
) else (
    echo  [SKIP]  mantis_ui\dist\ not found.
)

echo.
echo  ================================================================
echo    Uninstall complete.
echo    Run INSTALL.bat to reinstall at any time.
echo  ================================================================
echo.
pause
