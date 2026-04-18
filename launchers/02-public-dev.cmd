@echo off
setlocal

cd /d "%~dp0.."

title Licencia Clase B - Public Dev

echo.
echo Starting public dev server...
echo.
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:5173/'"
call npm run dev

endlocal
