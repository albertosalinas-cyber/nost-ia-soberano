@echo off
cd /d "%~dp0"
title NOST-IA
color 0A

echo =======================================================
echo                 NOST-IA - INICIANDO
echo =======================================================
echo.

set "NODE_BIN="

if exist ".runtime\node\node.exe" (
    set "NODE_BIN=.runtime\node\node.exe"
    echo [*] Usando Node portable interno...
) else (
    where node >nul 2>&1
    if %errorlevel% equ 0 (
        set "NODE_BIN=node"
        echo [*] Usando Node.js instalado en el sistema...
    ) else (
        echo [!] ERROR: No se encuentra Node.js ni portable ni instalado.
        echo Por favor, instala Node.js LTS desde https://nodejs.org/
        pause
        exit
    )
)

echo [*] Abriendo navegador en http://localhost:3000...
start http://localhost:3000

echo [*] Iniciando servidor territorial...
if exist "dist\server.cjs" (
    "%NODE_BIN%" "dist\server.cjs"
) else (
    "%NODE_BIN%" "node_modules\tsx\dist\cli.mjs" "server.ts"
)

echo.
echo El servidor se ha detenido.
pause
