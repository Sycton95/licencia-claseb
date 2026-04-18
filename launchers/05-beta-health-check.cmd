@echo off
setlocal

title Licencia Clase B - Beta Health Check

echo.
echo Checking local Ollama worker health...
echo.
curl http://127.0.0.1:4789/__local/ollama/health
echo.
echo.
pause

endlocal
