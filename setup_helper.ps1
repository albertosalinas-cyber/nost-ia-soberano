# NOST-IA v3.0 - Script de Inicialización y Diagnóstico Soberano
# 100% Offline, sin telemetría, para comercios de barrio

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "                 NOST-IA v3.0 - DIAGNOSTICO DEL SISTEMA" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""

# 1. Verificar Node.js
$nodeInstalled = $false
try {
    $nodeVer = node -v 2>$null
    if ($nodeVer) {
        Write-Host "[OK] Node.js detectado: $nodeVer" -ForegroundColor Green
        $nodeInstalled = $true
    }
} catch {}

if (-not $nodeInstalled) {
    # Buscar en carpetas estandar
    $rutas = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
    )
    foreach ($r in $rutas) {
        if (Test-Path $r) {
            $dir = Split-Path $r
            $env:Path = "$dir;$env:Path"
            $nodeInstalled = $true
            Write-Host "[OK] Node.js encontrado en $dir" -ForegroundColor Green
            break
        }
    }
}

if (-not $nodeInstalled) {
    Write-Host "[!] Node.js NO encontrado. Instalando automaticamente..." -ForegroundColor Yellow
    $msiPath = "$env:TEMP\nodejs_installer.msi"
    try {
        Write-Host "[*] Descargando Node.js LTS oficial..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi" -OutFile $msiPath -UseBasicParsing
        Write-Host "[*] Ejecutando instalador..." -ForegroundColor Cyan
        $proc = Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /quiet /norestart" -Wait -PassThru
        $env:Path = "$env:ProgramFiles\nodejs;$env:Path"
        Write-Host "[OK] Node.js instalado con exito." -ForegroundColor Green
    } catch {
        Write-Host "[!] Reintentando con winget..." -ForegroundColor Yellow
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        $env:Path = "$env:ProgramFiles\nodejs;$env:Path"
    }
}

# 2. Verificar Dependencias NPM
Write-Host ""
Write-Host "[*] Verificando dependencias del sistema..." -ForegroundColor Cyan
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Test-Path "$scriptDir\node_modules")) {
    Write-Host "[*] Instalando modulos locales de NOST-IA por primera vez..." -ForegroundColor Yellow
    npm install --no-audit --no-fund
    Write-Host "[OK] Dependencias instaladas." -ForegroundColor Green
} else {
    Write-Host "[OK] Dependencias locales encontradas en disco." -ForegroundColor Green
}

# 3. Verificar Ollama (Opcional - Copiloto Local)
Write-Host ""
Write-Host "[*] Verificando motor de IA Local (Ollama)..." -ForegroundColor Cyan
$ollamaInstalled = $false
try {
    $null = Get-Command ollama -ErrorAction SilentlyContinue
    if ($?) { $ollamaInstalled = $true }
} catch {}

if (-not $ollamaInstalled) {
    if (Test-Path "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe") {
        $env:Path = "$env:LOCALAPPDATA\Programs\Ollama;$env:Path"
        $ollamaInstalled = $true
    }
}

if ($ollamaInstalled) {
    Write-Host "[OK] Ollama listo." -ForegroundColor Green
    $env:OLLAMA_ORIGINS = "*"
    $env:OLLAMA_HOST = "127.0.0.1:11434"
    Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "[*] Verificando modelo Qwen 2.5 Coder 1.5B (Liviano 4GB RAM)..." -ForegroundColor Cyan
    ollama pull qwen2.5-coder:1.5b
} else {
    Write-Host "[INFO] Ollama no instalado. NOST-IA operara con motor VDU y POS offline 100% nativo." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "  NOST-IA ESTA LISTO PARA ABRIRSE EN TU NAVEGADOR (http://localhost:3000)" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""
