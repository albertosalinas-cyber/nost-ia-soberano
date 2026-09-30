import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Code2,
  Award,
  Heart,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { VduIngestionBanner } from '../dashboard/VduIngestionBanner';

interface TechStackCreditBarProps {
  seccion: 'inventario' | 'analitica' | 'finanzas' | 'copiloto';
}

export const TechStackCreditBar: React.FC<TechStackCreditBarProps> = ({ seccion }) => {
  const [expandido, setExpandido] = useState<boolean>(false);
  const [mostrarModalVdu, setMostrarModalVdu] = useState<boolean>(false);

  // ÚNICAMENTE visible en inventario de forma compacta y desplegable.
  // En las demás secciones (analitica, finanzas, copiloto), NO se muestra nada para optimizar el espacio.
  if (seccion !== 'inventario') {
    return null;
  }

  return (
    <>
      <div className="rounded-xl border border-slate-800/90 bg-[#0B0E17]/80 px-3 py-1.5 font-mono text-xs text-slate-400 transition-all shadow-sm">
        {/* Barra ultra compacta en una sola línea */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 rounded bg-[#00FF87]/15 border border-[#00FF87]/30 px-2 py-0.5 text-[10px] font-bold text-[#00FF87] shrink-0">
              <Code2 className="h-3 w-3 text-[#00FF87]" />
              Stack & Ingesta VDU
            </span>
            <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
              Mozilla PDF.js • SheetJS • ZXing WASM • Docling 2D • Aporte Solidario: NOST.IA.SOBERANO
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setExpandido(!expandido)}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 transition-all"
              title="Desplegar u ocultar reconocimiento a creadores y especificación de ingesta"
            >
              <Award className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span>{expandido ? 'Ocultar Creadores' : 'Creadores & Stack'}</span>
              {expandido ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Panel Desplegable (se muestra sólo cuando el comerciante hace clic) */}
        {expandido && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/90 space-y-2.5 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300">
              <span className="text-[#00D2FF] font-semibold">
                Pipeline VDU Activo: Ingesta Tabular (SheetJS) ➔ Vectorial 2D (PDF.js / ZXing) ➔ Layout Espacial 2D (Docling) ➔ Normalizador $
              </span>
              <span className="text-slate-500 hidden md:inline">
                Soberanía Cero Nube • Privacidad Absoluta
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[10px]">
              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2">
                <div className="flex items-center justify-between font-bold text-white mb-0.5">
                  <span className="text-[#00FF87]">Dexie.js (IndexedDB)</span>
                  <span className="text-amber-300 text-[9px] flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5 text-rose-400 fill-rose-400" /> David Fahlander
                  </span>
                </div>
                <p className="text-slate-400 font-sans leading-tight">
                  Persistencia 100% offline y soberana en el disco físico del comerciante sin servidores ajenos.
                </p>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2">
                <div className="flex items-center justify-between font-bold text-white mb-0.5">
                  <span className="text-[#00D2FF]">SheetJS (xlsx)</span>
                  <span className="text-amber-300 text-[9px] flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5 text-rose-400 fill-rose-400" /> SheetJS LLC
                  </span>
                </div>
                <p className="text-slate-400 font-sans leading-tight">
                  Lectura y exportación ultrarrápida de planillas Excel de listas mayoristas, stock y remitos tabulares.
                </p>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2">
                <div className="flex items-center justify-between font-bold text-white mb-0.5">
                  <span className="text-purple-300">pdfjs-dist</span>
                  <span className="text-amber-300 text-[9px] flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5 text-rose-400 fill-rose-400" /> Fundación Mozilla
                  </span>
                </div>
                <p className="text-slate-400 font-sans leading-tight">
                  Motor de reconstrucción vectorial 2D para extraer texto y coordenadas de facturas electrónicas AFIP sin rasterizado ciego.
                </p>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2">
                <div className="flex items-center justify-between font-bold text-white mb-0.5">
                  <span className="text-cyan-300">ZXing WASM</span>
                  <span className="text-amber-300 text-[9px] flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5 text-rose-400 fill-rose-400" /> Sean Owen y colab.
                  </span>
                </div>
                <p className="text-slate-400 font-sans leading-tight">
                  Decodificación instantánea (&lt;50ms) en WebAssembly de códigos de barras EAN-13 y códigos QR fiscales de AFIP.
                </p>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2">
                <div className="flex items-center justify-between font-bold text-white mb-0.5">
                  <span className="text-amber-300">Layout Espacial 2D</span>
                  <span className="text-amber-300 text-[9px] flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5 text-rose-400 fill-rose-400" /> docTR / Docling
                  </span>
                </div>
                <p className="text-slate-400 font-sans leading-tight">
                  Arquitectura de referencia VDU para segmentación geométrica 2D por bounding boxes sin confusión de renglones.
                </p>
              </div>

              <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2">
                <div className="flex items-center justify-between font-bold text-white mb-0.5">
                  <span className="text-emerald-300">Ollama (Qwen 2.5)</span>
                  <span className="text-amber-300 text-[9px] flex items-center gap-0.5">
                    <Heart className="h-2.5 w-2.5 text-rose-400 fill-rose-400" /> Alibaba & Ollama
                  </span>
                </div>
                <p className="text-slate-400 font-sans leading-tight">
                  Motor cognitivo local de inferencia 100% offline para análisis de quiebres de stock y rentabilidad.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
