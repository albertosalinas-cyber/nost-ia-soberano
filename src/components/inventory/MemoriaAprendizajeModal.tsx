import React, { useState, useEffect } from 'react';
import {
  Brain,
  Trash2,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  obtenerAprendizajesAlias,
  eliminarAprendizajeAlias,
} from '../../engine/db';
import type { AprendizajeAlias } from '../../types';
import { audioFeedback } from '../../engine/audioFeedback';

interface MemoriaAprendizajeModalProps {
  onClose: () => void;
  onActualizado?: () => void;
}

export const MemoriaAprendizajeModal: React.FC<MemoriaAprendizajeModalProps> = ({
  onClose,
  onActualizado,
}) => {
  const [aprendizajes, setAprendizajes] = useState<AprendizajeAlias[]>([]);
  const [busqueda, setBusqueda] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(true);

  const cargar = async () => {
    setCargando(true);
    try {
      const datos = await obtenerAprendizajesAlias();
      setAprendizajes(datos);
    } catch (err) {
      console.warn('Error al cargar memoria de aprendizajes:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleEliminar = async (id: string) => {
    await eliminarAprendizajeAlias(id);
    audioFeedback.playTick();
    setAprendizajes((prev) => prev.filter((a) => a.id !== id));
    if (onActualizado) onActualizado();
  };

  const filtrados = aprendizajes.filter((a) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      a.textoOriginal.toLowerCase().includes(q) ||
      a.productoNombreDestino.toLowerCase().includes(q) ||
      (a.proveedor && a.proveedor.toLowerCase().includes(q)) ||
      (a.codigoBarrasDestino && a.codigoBarrasDestino.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-purple-500/40 bg-[#0C0F1A] text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#121524] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Brain className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-mono font-bold text-white">
                  Memoria de Aprendizaje Adaptativo
                </h3>
                <Badge variant="purple">
                  {aprendizajes.length} Asociaciones Guardadas
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-400">
                Reglas automáticas aprendidas por NOST-IA para no repetir errores en futuras facturas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-slate-400 hover:text-white font-mono text-sm px-2.5 py-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Explicación & Buscador */}
        <div className="p-4 border-b border-slate-800 bg-[#0E1220]/60 space-y-3">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-950/30 border border-purple-500/25 text-purple-200 text-xs font-mono">
            <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong>¿Cómo funciona el aprendizaje?</strong> Cada vez que corriges o vinculas un producto en el lector de facturas (por ejemplo, diferenciando <em>Harina 000 (50kg)</em> de <em>Harina 0000 (50kg)</em>), NOST-IA memoriza la asociación en tu disco local. En las siguientes facturas de ese proveedor, se asignará automáticamente sin errores.
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar en la memoria por texto original, producto asignado o proveedor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-9 pr-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-purple-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Lista de Reglas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cargando ? (
            <div className="p-8 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
              <span>Cargando memoria adaptativa...</span>
            </div>
          ) : filtrados.length > 0 ? (
            filtrados.map((item) => {
              const fechaUso = new Date(item.fechaUltimoUso).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-purple-500/40 transition-all flex flex-wrap items-center justify-between gap-3 font-mono text-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-[280px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-400 text-[11px]">Texto en Factura:</span>
                      <code className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-bold">
                        "{item.textoOriginal}"
                      </code>
                      {item.proveedor && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 text-[10px] text-cyan-300">
                          {item.proveedor}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-white">
                      <ArrowRight className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="font-bold text-[#00FF87]">{item.productoNombreDestino}</span>
                      <span className="text-[10px] text-slate-400">
                        (EAN: {item.codigoBarrasDestino || 'S/C'})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        Aplicado {item.vecesAplicado} vez/veces
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        Último uso: {fechaUso}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEliminar(item.id)}
                    className="cursor-pointer p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/30 transition-all"
                    title="Olvidar esta asociación"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-400 font-mono text-xs space-y-2">
              <Brain className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-bold">No hay reglas de aprendizaje registradas aún.</p>
              <p className="text-slate-500 max-w-md mx-auto">
                A medida que cargues facturas y hagas correcciones de nombres o códigos, NOST-IA las guardará aquí automáticamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#121524] p-3 font-mono text-xs">
          <span className="text-slate-400 text-[11px]">
            Persistencia: 100% Local en IndexedDB / Dexie
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
