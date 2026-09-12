@echo off
cd /d "%~dp0"

:loop
echo [%date% %time%] Starting Simos18 Patch Agent >> service.log
".venv\Scripts\python.exe" -m uvicorn api:app --host 127.0.0.1 --port 8787 --reload --reload-dir . >> service.log 2>&1
echo [%date% %time%] Server exited, restarting in 5s... >> service.log
timeout /t 5 /nobreak >nul
goto loop
