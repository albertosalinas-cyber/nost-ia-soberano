import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Wifi,
  WifiOff,
  Settings,
  RefreshCw,
  Terminal,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Layers,
  FileCode,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GlassCard } from '../ui/GlassCard';
import type { Producto, PuntoTerritorial, EstrategiaCostos, MensajeCopiloto, RolCopiloto, VentaPOS } from '../../types';
import {
  responderCopilotoLocal,
  probarConexionOllama,
  DEFAULT_OLLAMA_CONFIG,
  type OllamaConfig,
} from '../../engine/localCopilot';
import { audioFeedback } from '../../engine/audioFeedback';
import { AuditoriaErroresPanel } from './AuditoriaErroresPanel';

interface LocalCopilotPanelProps {
  productos: Producto[];
  puntos: PuntoTerritorial[];
  estrategia: EstrategiaCostos;
  ventas?: VentaPOS[];
  onOpenPricingModal?: () => void;
  onNotificar?: (mensaje: string) => void;
}

export const LocalCopilotPanel: React.FC<LocalCopilotPanelProps> = ({
  productos,
  puntos,
  estrategia,
  ventas = [],
  onOpenPricingModal,
  onNotificar,
}) => {
  const [seccionCopiloto, setSeccionCopiloto] = useState<'chat' | 'auditoria'>('chat');
  const [rolActivo, setRolActivo] = useState<RolCopiloto>('asistente_general');

  const [mensajes, setMensajes] = useState<MensajeCopiloto[]>([
    {
      id: 'bienvenida',
      emisor: 'copiloto',
      texto: `### 🛡️ NOST-IA Compañero/a IA Territorial (Nodo Operativo Soberano)

Bienvenido/a. Estoy sincronizado con tu base de datos local:
* **Catálogo:** ${productos.length} productos cargados en memoria.
* **Ventas Registradas:** ${ventas.length} transacciones disponibles para auditar.
* **Modelo de Operación:** Procesamiento local $100\\%$ offline en tu dispositivo sin filtrar datos hacia servidores externos.

Podés consultar sobre stock, ventas, combos o revisar la **Auditoría de Errores y Trazabilidad** en la pestaña superior.`,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      sugerencias: [
        '¿Qué errores de lectura hubo?',
        '¿Qué productos están por agotarse?',
        'Ver ventas totales de hoy',
        'Estrategias para aumentar ventas',
      ],
    },
  ]);

  const [inputTexto, setInputTexto] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);
  const [mostrarConfigOllama, setMostrarConfigOllama] = useState<boolean>(false);
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(DEFAULT_OLLAMA_CONFIG);
  const [estadoConexionOllama, setEstadoConexionOllama] = useState<{
    probado: boolean;
    conectado: boolean;
    mensaje?: string;
  }>({ probado: false, conectado: false });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (seccionCopiloto === 'chat') {
      scrollToBottom();
    }
  }, [mensajes, seccionCopiloto]);

  // Verificar automáticamente la conexión con Ollama al cargar el copiloto
  useEffect(() => {
    verificarOllama();
  }, []);

  // Verificar conexión con Ollama en background
  const verificarOllama = async () => {
    setCargando(true);
    const resultado = await probarConexionOllama(ollamaConfig.endpoint);
    setEstadoConexionOllama({
      probado: true,
      conectado: resultado.conectado,
      mensaje: resultado.conectado
        ? 'Conectado a servidor Ollama local (localhost:11434)'
        : resultado.error || 'Ollama no detectado en localhost:11434. Usando Motor Soberano Integrado.',
    });
    setOllamaConfig((prev) => ({ ...prev, activo: resultado.conectado }));
    setCargando(false);
  };

  const handleEnviar = async (textoAEnviar?: string) => {
    const texto = (textoAEnviar || inputTexto).trim();
    if (!texto || cargando) return;

    const nuevoMsgUsuario: MensajeCopiloto = {
      id: `usr-${Date.now()}`,
      emisor: 'usuario',
      texto,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMensajes((prev) => [...prev, nuevoMsgUsuario]);
    setInputTexto('');
    setCargando(true);

    try {
      const respuesta = await responderCopilotoLocal(
        texto,
        productos,
        puntos,
        estrategia,
        ollamaConfig,
        rolActivo,
        ventas,
        [...mensajes, nuevoMsgUsuario]
      );
      setMensajes((prev) => [...prev, respuesta]);
      audioFeedback.playBarcodeSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col h-[740px] max-h-[82vh] rounded-xl border border-[#1E293B] bg-[#0E111A] text-[#F8FAFC] shadow-2xl overflow-hidden">
      {/* Header del Copiloto */}
      <div className="border-b border-[#1E293B] p-3.5 bg-[#12151E]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30">
              <Bot className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  NOST-IA Compañero/a IA Territorial
                </h3>
                <Badge variant={ollamaConfig.activo ? 'green' : 'blue'}>
                  {ollamaConfig.activo ? `⚡ ${ollamaConfig.model}` : 'Motor Soberano 100% Offline'}
                </Badge>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                {ollamaConfig.activo
                  ? `⚡ Motor Qwen 1.5B Ultra-Rápido activo en ${ollamaConfig.endpoint}`
                  : 'Procesamiento en memoria del navegador • Consultas abiertas • Cero fuga de datos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented Control para alternar entre Chat y Auditoría de Errores */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSeccionCopiloto('chat');
                  audioFeedback.playTick();
                }}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  seccionCopiloto === 'chat'
                    ? 'bg-[#00FF87] text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Chat Asistente</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSeccionCopiloto('auditoria');
                  audioFeedback.playTick();
                }}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  seccionCopiloto === 'auditoria'
                    ? 'bg-cyan-400 text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Auditoría de Errores (.txt)</span>
              </button>
            </div>

            {seccionCopiloto === 'chat' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMostrarConfigOllama(!mostrarConfigOllama)}
                  title="Configuración de Endpoint Ollama / LLM Local"
                >
                  <Settings className="h-4 w-4 text-slate-400 hover:text-white" />
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={verificarOllama}
                  disabled={cargando}
                  icon={<RefreshCw className={`h-3.5 w-3.5 ${cargando ? 'animate-spin' : ''}`} />}
                >
                  Ping Ollama
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Selector de Roles Especializados (Visible sólo en modo Chat) */}
        {seccionCopiloto === 'chat' && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800 font-mono text-xs">
            <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[#00FF87]" /> Rol Especializado:
            </span>
            {[
              { id: 'asistente_general', label: 'General NOST-IA', icon: <Bot className="h-3 w-3" /> },
              { id: 'auditor_ventas', label: 'Auditor de Ventas', icon: <Receipt className="h-3 w-3" /> },
              { id: 'centinela_stock', label: 'Centinela de Stock', icon: <AlertTriangle className="h-3 w-3" /> },
              { id: 'estratega_comercial', label: 'Estratega Comercial', icon: <TrendingUp className="h-3 w-3" /> },
            ].map((r) => {
              const activo = rolActivo === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setRolActivo(r.id as RolCopiloto);
                    audioFeedback.playTick();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activo
                      ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {r.icon}
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* RENDERIZADO CONDICIONAL: CHAT vs AUDITORÍA */}
      {seccionCopiloto === 'auditoria' ? (
        <div className="flex-1 overflow-hidden">
          <AuditoriaErroresPanel onNotificar={onNotificar} />
        </div>
      ) : (
        <>
          {/* Configuración de Ollama (Desplegable) */}
          {mostrarConfigOllama && (
            <div className="border-b border-[#1E293B] bg-[#141824] p-3 font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#00D2FF]">Configuración de LLM Local (Ollama / VLLM / LM Studio)</span>
                <button
                  onClick={() => setMostrarConfigOllama(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400">Endpoint API (OpenAI Compatible):</label>
                  <input
                    type="text"
                    value={ollamaConfig.endpoint}
                    onChange={(e) =>
                      setOllamaConfig((prev) => ({ ...prev, endpoint: e.target.value }))
                    }
                    className="w-full mt-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400">Modelo Local Seleccionado:</label>
                  <input
                    type="text"
                    value={ollamaConfig.model}
                    onChange={(e) =>
                      setOllamaConfig((prev) => ({ ...prev, model: e.target.value }))
                    }
                    className="w-full mt-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white font-mono"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOllamaConfig((prev) => ({ ...prev, model: 'qwen2.5-coder:1.5b', activo: true }))}
                      className={`cursor-pointer px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                        ollamaConfig.model.includes('1.5b') || ollamaConfig.model.includes('qwen')
                          ? 'border-[#00FF87] bg-[#00FF87]/20 text-[#00FF87]'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      ⚡ Qwen 2.5 Coder 1.5B (Ultra-Rápido 100% Offline • Modelo Oficial)
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span className={estadoConexionOllama.conectado ? 'text-[#00FF87]' : 'text-amber-400'}>
                    {estadoConexionOllama.probado
                      ? estadoConexionOllama.mensaje
                      : 'Pulsa "Ping Ollama" para probar si tenés Ollama corriendo en tu máquina.'}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-white">
                    <input
                      type="checkbox"
                      checked={ollamaConfig.activo}
                      onChange={(e) =>
                        setOllamaConfig((prev) => ({ ...prev, activo: e.target.checked }))
                      }
                      className="accent-[#00FF87]"
                    />
                    Priorizar Ollama sobre motor integrado
                  </label>
                </div>
                {estadoConexionOllama.probado && !estadoConexionOllama.conectado && (
                  <p className="text-[10px] text-slate-400 bg-slate-900/80 p-1.5 rounded border border-slate-800 mt-1">
                    💡 <strong>¿Por qué dice "Failed to fetch"?:</strong> El navegador web bloquea conexiones a <code>localhost:11434</code> por seguridad (CORS), o bien Ollama aún no fue iniciado. Para permitir la conexión en tu PC ejecutá: <code className="text-[#00FF87]">set OLLAMA_ORIGINS=*</code> antes de iniciar Ollama. Mientras tanto, <strong>el Compañero/a IA dialoga fluidamente con vos</strong> usando la inteligencia conectada a tu inventario real.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Historial de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.emisor === 'usuario' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3.5 leading-relaxed whitespace-pre-wrap ${
                    m.emisor === 'usuario'
                      ? 'border border-[#00FF87]/40 bg-[#00FF87]/15 text-white shadow-[0_0_12px_rgba(0,255,135,0.1)]'
                      : 'border border-[#1E293B] bg-[#12151E] text-slate-200 shadow-lg'
                  }`}
                >
                  {m.texto}
                </div>

                <span className="mt-1 text-[10px] text-slate-500 px-1">{m.timestamp}</span>

                {/* Chips de sugerencias interactivas */}
                {m.sugerencias && m.sugerencias.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                    {m.sugerencias.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleEnviar(sug)}
                        className="cursor-pointer rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-[#00D2FF] hover:border-[#00D2FF] hover:bg-[#00D2FF]/10 transition-all text-left"
                      >
                        ⚡ {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {cargando && (
              <div className="flex items-center gap-2 text-slate-400 font-mono text-xs p-2">
                <RefreshCw className="h-4 w-4 animate-spin text-[#00FF87]" />
                <span className="text-[#00FF87] font-semibold animate-pulse">NOST-IA QWEN TERRITORIAL PROCESANDO...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Caja de Entrada de Consulta */}
          <div className="border-t border-[#1E293B] p-3 bg-[#12151E]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEnviar();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Preguntale al copiloto: '¿Qué productos están por agotarse?' o 'Estrategia de precios'..."
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value)}
                disabled={cargando}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-[#00FF87] focus:outline-none"
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={cargando || !inputTexto.trim()}
                icon={<Send className="h-4 w-4" />}
              >
                Preguntar
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
