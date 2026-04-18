@echo off
setlocal

cd /d "%~dp0.."

title Licencia Clase B - Admin Beta

set "VITE_ENABLE_LOCAL_ADMIN=true"
set "VITE_ENABLE_ADMIN_BETA_PANEL=true"
set "VITE_ENABLE_LOCAL_OLLAMA=true"
set "LOCAL_OLLAMA_WORKER_PORT=4789"

echo.
echo Starting Admin Beta local flow...
echo.
echo Flags:
echo   VITE_ENABLE_LOCAL_ADMIN=%VITE_ENABLE_LOCAL_ADMIN%
echo   VITE_ENABLE_ADMIN_BETA_PANEL=%VITE_ENABLE_ADMIN_BETA_PANEL%
echo   VITE_ENABLE_LOCAL_OLLAMA=%VITE_ENABLE_LOCAL_OLLAMA%
echo.
echo Waiting for http://localhost:5173/admin before opening browser...
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline=(Get-Date).AddMinutes(2);" ^
  "while((Get-Date) -lt $deadline){" ^
  "  try {" ^
  "    $response=Invoke-WebRequest -Uri 'http://localhost:5173/admin' -UseBasicParsing -TimeoutSec 2;" ^
  "    if($response.StatusCode -ge 200 -and $response.StatusCode -lt 500){" ^
  "      Start-Process 'http://localhost:5173/admin';" ^
  "      exit 0;" ^
  "    }" ^
  "  } catch {}" ^
  "  Start-Sleep -Seconds 2;" ^
  "}" ^
  "Write-Host 'Admin server did not become ready in time.'"
call npm run dev:admin-beta

endlocal
