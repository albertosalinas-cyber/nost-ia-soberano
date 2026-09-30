#!/usr/bin/env bash
# ==============================================================================
#                 NOST-IA v3.0 - LANZADOR AUTOMÁTICO SOBERANO (LINUX/MAC)
#       Punto de Venta (POS), Control de Stock, Ingesta VDU y Copiloto IA Local
# ==============================================================================

set -e

echo "=============================================================================="
echo "                 NOST-IA v3.0 - LANZADOR AUTOMÁTICO SOBERANO"
echo "       Punto de Venta (POS), Control de Stock, Ingesta VDU y Copiloto IA Local"
echo "=============================================================================="
echo ""
echo "[*] [1/5] Verificando entorno Node.js / Runtime JavaScript..."

if ! command -v node &> /dev/null; then
    echo "[!] Node.js no encontrado. Descargando e instalando automáticamente..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y nodejs npm
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm nodejs npm
    elif command -v brew &> /dev/null; then
        brew install node
    else
        echo "[ERROR] Por favor instala Node.js desde https://nodejs.org/"
        exit 1
    fi
else
    NODE_VER=$(node -v)
    echo "[OK] Node.js detectado ($NODE_VER)."
fi
echo ""

echo "[*] [2/5] Verificando dependencias locales del sistema POS y VDU..."
if [ ! -d "node_modules" ]; then
    echo "[*] Instalando dependencias por primera vez..."
    npm install --no-audit --no-fund
    echo "[OK] Dependencias instaladas con éxito."
else
    echo "[OK] Dependencias locales listas."
fi
echo ""

echo "[*] [3/5] Verificando motor de Inteligencia Artificial Local (Ollama)..."
if ! command -v ollama &> /dev/null; then
    echo "[!] Ollama no encontrado. Descargando e instalando Ollama oficial..."
    curl -fsSL https://ollama.com/install.sh | sh || true
fi

if command -v ollama &> /dev/null; then
    echo "[OK] Ollama detectado y listo."
    export OLLAMA_ORIGINS="*"
    export OLLAMA_HOST="127.0.0.1:11434"

    # Iniciar ollama si no está corriendo
    if ! pgrep -x "ollama" > /dev/null; then
        echo "[*] Iniciando servicio Ollama en segundo plano..."
        ollama serve > /dev/null 2>&1 &
        sleep 2
    fi

    echo ""
    echo "[*] [4/5] Verificando modelos neuronales locales (Qwen 2.5 Coder)..."
    echo "[*] Verificando Qwen 2.5 Coder 1.5B (Ultra liviano y optimizado para 4GB RAM)..."
    ollama pull qwen2.5-coder:1.5b || true
else
    echo "[AVISO] Ollama no disponible. NOST-IA funcionará con el motor VDU y POS offline nativo."
fi
echo ""

echo "[*] [5/5] Iniciando NOST-IA en tu navegador http://localhost:3000 ..."
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 &
elif command -v sensible-browser &> /dev/null; then
    sensible-browser http://localhost:3000 &
elif command -v open &> /dev/null; then
    open http://localhost:3000 &
fi

echo "=============================================================================="
echo "  NOST-IA ESTÁ LISTO Y OPERATIVO AL 100% DE FORMA LOCAL Y SOBERANA."
echo "  Mantén esta terminal abierta durante la jornada."
echo "=============================================================================="
echo ""

npm run dev
