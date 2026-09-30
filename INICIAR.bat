@echo off
title NOST-IA v3.0 - Nodo Operativo Soberano Territorial
color 0A

REM Ir al directorio del script
cd /d "%~dp0"

echo ==============================================================================
echo                 NOST-IA v3.0 - LANZADOR AUTOMATICO SOBERANO
echo       Punto de Venta POS - Control de Stock - Ingesta VDU - IA Local Qwen
echo ==============================================================================
echo.

REM Ejecutar diagnostico y preparacion con PowerShell
if exist "%~dp0setup_helper.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_helper.ps1"
)

REM Asegurar rutas en PATH
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\Ollama;%PATH%"

echo [*] Iniciando servidor NOST-IA...
start "" http://localhost:3000

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [!] Hubo un detalle al ejecutar npm run dev.
    echo Intentando con npx...
    call npx tsx server.ts
)

echo.
echo ==============================================================================
echo El servidor se ha detenido.
echo Presiona cualquier tecla para salir.
echo ==============================================================================
pause
