@echo off
echo Starting F1 Race Replay...
echo.

if not exist .venv (
    echo ERROR: Virtual environment not found!
    echo Please run setup.bat first
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat
python main.py --year 2025 --round 12
