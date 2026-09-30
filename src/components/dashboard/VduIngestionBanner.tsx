import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  FileCheck2,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  HelpCircle,
  Database,
  ArrowRight,
  HardDrive
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const VduIngestionBanner: React.FC = () => {
  const [expandido, setExpandido] = useState<boolean>(false);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState<boolean>(false);

  return (
    <>
      {/* Banner Principal Visible en el Dashboard */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#0C1220] via-[#0E1729] to-[#0A1526] p-4 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Lado Izquierdo: Identidad del Motor */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-[#00D2FF] border border-cyan-500/40 shadow-[0_0_15px_rgba(0,210,255,0.25)] shrink-0">
              <Cpu className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#00D2FF]">
                  MOTOR DE INGESTA DE DOCUMENTOS ACTIVO:
                </span>
                <span className="rounded-md border border-[#00FF87]/50 bg-[#00FF87]/15 px-2 py-0.5 font-mono text-[11px] font-bold text-[#00FF87]">
                  VDU v3.0 • Visual Document Understanding Soberano
                </span>
                <span className="hidden sm:inline-flex rounded-md border border-slate-700 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] text-slate-300 items-center gap-1">
                  <HardDrive className="h-3 w-3 text-cyan-400" />
                  100% CPU Pura • 0% Internet
                </span>
              </div>
              <p className="mt-1 text-xs font-mono text-slate-300">
                <span className="text-cyan-300 font-semibold">Pipeline Activo:</span> Ingesta Tabular Estructurada (SheetJS) ➔ Reconstrucción Vectorial 2D (Mozilla PDF.js / ZXing WASM) ➔ Layout Espacial 2D (docTR / Docling) ➔ Normalizador Numérico Argentino ($ 45.000,00) ➔ Matriz de Veto Fiscal ➔ Desacoplador EAN-13.
              </p>
            </div>
          </div>

          {/* Lado Derecho: Acciones & Expansor */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMostrarModalDetalle(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 px-3 py-1.5 font-mono text-xs font-bold text-cyan-300 transition-all shadow-sm"
              title="Ver especificación técnica completa del motor VDU"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Ver Proceso & Stack</span>
            </button>
            <button
              type="button"
              onClick={() => setExpandido(!expandido)}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 font-mono text-xs text-slate-300 transition-all"
            >
              <span>{expandido ? 'Ocultar' : 'Detalles'}</span>
              {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Detalles Desplegables Rápidos */}
        {expandido && (
          <div className="mt-3.5 pt-3.5 border-t border-cyan-500/20 grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-[#00D2FF] font-bold mb-1">
                <Layers className="h-4 w-4" />
                <span>1. Layout Analysis Espacial</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Segmentación por redes neuronales DETR / Docling. Reconoce encabezados, pie fiscal, tablas y celdas multilínea sin confundir filas.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-[#00FF87] font-bold mb-1">
                <Zap className="h-4 w-4" />
                <span>2. VDU Parsing Tabular</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Extracción limpia por columna (Código, Descripción, Cantidad, Unitario, Subtotal). Reemplaza totalmente al OCR ciego y heurísticas frágiles.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>3. Post-Procesamiento Seguro</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Filtra ruido fiscal con Matriz de Veto (IVA, CUIT, CAI), calcula montos exactos y coteja con tu base local de Dexie/IndexedDB.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Técnico con la Arquitectura Completa de Ingesta */}
      {mostrarModalDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/40 bg-[#0E121E] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-[#00D2FF] border border-cyan-500/40">
                  <Cpu className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-mono font-bold text-white">
                    Arquitectura de Ingesta VDU v3.0 de NOST-IA
                  </h3>
                  <p className="text-xs font-mono text-cyan-300">
                    Visual Document Understanding • Inferencia Soberana 100% Offline
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalDetalle(false)}
                className="cursor-pointer text-slate-400 hover:text-white font-mono text-sm px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="font-bold text-[#00FF87] flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> ¿Qué software y proceso de ingesta estamos usando?
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  NOST-IA utiliza el nuevo paradigma de <strong className="text-white">Visual Document Understanding (VDU v3.0)</strong>, eliminando los motores de OCR ciego (como Tesseract.js simple) y reemplazándolos por un flujo de dos etapas estructurado para documentos mercantiles argentinos.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-cyan-300 uppercase tracking-wider">Flujo de Ejecución Paso a Paso:</h4>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[#00D2FF] font-bold">1</span>
                  <div>
                    <span className="font-bold text-white">ETAPA 1: Layout Analysis (Análisis Espacial del Documento)</span>
                    <p className="text-slate-400 mt-1">
                      Detección de regiones (<code className="text-cyan-300">Table</code>, <code className="text-cyan-300">Header</code>, <code className="text-cyan-300">Footer</code>, <code className="text-cyan-300">Subtitle</code>, <code className="text-cyan-300">Text</code>) con modelos tipo docTR (LW-DETR) y IBM Granite-Docling (ONNX / CPU). Identifica los límites exactos de las columnas y no confunde filas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00FF87]/20 text-[#00FF87] font-bold">2</span>
                  <div>
                    <span className="font-bold text-white">ETAPA 2: VDU Parsing Tabular Desacoplado</span>
                    <p className="text-slate-400 mt-1">
                      Extracción celda por celda de Código, Descripción Principal, Subtítulo/Presentación, Cantidad, Precio Unitario y Subtotal. Mantiene la continuidad de descripciones largas y separa el EAN de la descripción.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-bold">3</span>
                  <div>
                    <span className="font-bold text-white">ETAPA 3: Post-Procesamiento Mercantil Soberano</span>
                    <p className="text-slate-400 mt-1">
                      - <strong className="text-slate-200">parseNumeroArgentino:</strong> Transforma importes como <code className="text-amber-200">$ 45.000,00</code> a <code className="text-amber-200">45000.00</code> sin errores de coma.<br/>
                      - <strong className="text-slate-200">Matriz de Veto Fiscal:</strong> Descarta palabras clave de impuestos (CUIT, IVA, IIBB, CAI, Remito) evitando productos falsos.<br/>
                      - <strong className="text-slate-200">Product Matcher:</strong> Coteja por EAN-13, SKU o descripción contra la base de datos local en Dexie/IndexedDB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <ShieldCheck className="h-4 w-4 text-[#00FF87]" />
                  <span>Soberanía y Privacidad Garantizadas</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Todo el procesamiento corre 100% en la CPU de tu computadora. Las facturas, fotos y datos de costos nunca viajan a servidores externos ni a la nube.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMostrarModalDetalle(false)}
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
