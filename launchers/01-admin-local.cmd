@echo off
setlocal

cd /d "%~dp0.."

title Licencia Clase B - Admin local

set "VITE_ENABLE_LOCAL_ADMIN=true"
set "VITE_ENABLE_ADMIN_BETA_PANEL=false"

echo.
echo Starting local Admin flow...
echo.
echo Flags:
echo   VITE_ENABLE_LOCAL_ADMIN=%VITE_ENABLE_LOCAL_ADMIN%
echo   VITE_ENABLE_ADMIN_BETA_PANEL=%VITE_ENABLE_ADMIN_BETA_PANEL%
echo   Ports are auto-resolved by npm run dev:admin-local
echo   Browser opens when /admin is ready
echo.

call npm run dev:admin-local

endlocal
