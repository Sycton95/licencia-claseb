@echo off
setlocal

cd /d "%~dp0.."

title Licencia Clase B - Local Preview

echo.
echo Building local production preview...
echo.
call npm run build
if errorlevel 1 goto :fail

echo.
echo Opening local preview in the browser...
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 4; Start-Process 'http://127.0.0.1:4173/'"
call npm run preview -- --host 127.0.0.1 --port 4173
goto :end

:fail
echo.
echo Build failed. Preview was not started.
pause

:end
endlocal
