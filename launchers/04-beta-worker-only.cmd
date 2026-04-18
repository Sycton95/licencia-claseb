@echo off
setlocal

cd /d "%~dp0.."

title Licencia Clase B - Beta Worker Only

set "LOCAL_OLLAMA_WORKER_PORT=4789"

echo.
echo Starting local Ollama worker only...
echo Worker URL: http://127.0.0.1:%LOCAL_OLLAMA_WORKER_PORT%
echo.
node node_modules/tsx/dist/cli.mjs scripts/local-ollama-worker.ts

endlocal
