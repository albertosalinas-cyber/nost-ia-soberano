import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  Calendar,
  CheckCircle2,
  DollarSign,
  Package,
  FileCheck,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { db } from '../../engine/db';
import { audioFeedback } from '../../engine/audioFeedback';

interface CierreDiaBackupModalProps {
  onCerrar: () => void;
  onDescargarBackup: () => void;
  onRestaurarBackup: (archivo: File) => Promise<{ exito: boolean; mensaje: string }>;
}

export const CierreDiaBackupModal: React.FC<CierreDiaBackupModalProps> = ({
  onCerrar,
  onDescargarBackup,
  onRestaurarBackup,
}) => {
  const [totalVentasHoy, setTotalVentasHoy] = useState<number>(0);
  const [cantVentasHoy, setCantVentasHoy] = useState<number>(0);
  const [totalProductos, setTotalProductos] = useState<number>(0);
  const [backupDescargado, setBackupDescargado] = useState<boolean>(false);
  const [restaurando, setRestaurando] = useState<boolean>(false);
  const [mensajeRestauracion, setMensajeRestauracion] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    const cargarResumen = async () => {
      try {
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);

        const ventas = await db.ventas.where('fecha').aboveOrEqual(hoyInicio).toArray();
        const suma = ventas.reduce((acc, v) => acc + (v.total || 0), 0);
        setTotalVentasHoy(suma);
        setCantVentasHoy(ventas.length);

        const countProd = await db.productos.count();
        setTotalProductos(countProd);
      } catch (err) {
        console.error('Error cargando resumen de cierre:', err);
      }
    };
    cargarResumen();
  }, []);

  const handleDescargar = () => {
    onDescargarBackup();
    setBackupDescargado(true);
    audioFeedback.playPosSaleSuccess();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestaurando(true);
    setMensajeRestauracion(null);

    try {
      const res = await onRestaurarBackup(file);
      if (res.exito) {
        setMensajeRestauracion({ tipo: 'ok', texto: res.mensaje });
        audioFeedback.playPosSaleSuccess();
      } else {
        setMensajeRestauracion({ tipo: 'error', texto: res.mensaje });
        audioFeedback.playErrorAlert();
      }
    } catch {
      setMensajeRestauracion({
        tipo: 'error',
        texto: 'Error inesperado al restaurar la copia de seguridad.',
      });
      audioFeedback.playErrorAlert();
    } finally {
      setRestaurando(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border-2 border-emerald-500/50 bg-[#0A101D] p-6 shadow-2xl space-y-5 my-8">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-[#00FF87] border border-emerald-500/40 shadow-[0_0_15px_rgba(0,255,135,0.2)]">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-mono text-white">
                  Cierre de Día Comercial & Copia de Seguridad
                </h3>
                <Badge variant="success">100% OFFLINE</Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Persistencia Soberana en Disco Local • Sin Servidores Externos
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="cursor-pointer text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumen del Día */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <DollarSign className="h-3.5 w-3.5 text-[#00FF87]" />
              <span>Ventas de Hoy:</span>
            </div>
            <div className="text-base font-black text-[#00FF87]">
              ${totalVentasHoy.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500">{cantVentasHoy} operaciones registradas</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Package className="h-3.5 w-3.5 text-[#00D2FF]" />
              <span>Catálogo Activo:</span>
            </div>
            <div className="text-base font-black text-[#00D2FF]">
              {totalProductos} items
            </div>
            <div className="text-[10px] text-slate-500">Persistidos en IndexedDB</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span>Fecha de Jornada:</span>
            </div>
            <div className="text-xs font-bold text-amber-300">
              {new Date().toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <div className="text-[10px] text-slate-500">Cierre de caja local</div>
          </div>
        </div>

        {/* Notificación Crucial de Persistencia y Cierre */}
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2 text-[#00FF87] font-bold">
            <CheckCircle2 className="h-4 w-4" />
            <span>¿Qué ocurre cuando cierras la ventana de NOST-IA al finalizar el día?</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-sans text-xs">
            <strong>NO necesitás reinstalar nada ni hacer doble clic para comenzar de nuevo.</strong> Toda tu mercadería, precios, costos y facturas quedan resguardados automáticamente en el disco rígido de tu computadora. Mañana simplemente volvés a abrir tu navegador o el acceso directo del escritorio y todo estará listo.
          </p>
        </div>

        {/* Cláusula de Responsabilidad de Datos Locales */}
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <AlertTriangle className="h-4 w-4" />
            <span>Cláusula Soberana de Responsabilidad de Datos Locales:</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-sans text-xs">
            Al ser un sistema <strong>100% local</strong>, los datos viven exclusivamente en el disco rígido de tu computadora. NOST-IA no almacena ni copia nada en servidores externos. Si la computadora sufre daños físicos o se formatea el disco sin una copia previa, la responsabilidad es del usuario. 
            <strong className="text-amber-300"> Recomendamos descargar una copia periódica y guardarla en un pendrive físico.</strong>
          </p>
        </div>

        {/* Acciones de Resguardo y Restauración */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Button
            variant="cyber"
            size="lg"
            onClick={handleDescargar}
            className="w-full justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>{backupDescargado ? '¡Copia Descargada con Éxito!' : 'Descargar Backup Soberano (.json)'}</span>
          </Button>

          <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-[#00D2FF]/50 bg-[#00D2FF]/15 hover:bg-[#00D2FF]/25 px-4 py-3 text-xs font-bold text-[#00D2FF] transition-all text-center">
            <Upload className="h-4 w-4" />
            <span>{restaurando ? 'Verificando archivo...' : 'Restaurar Copia desde Archivo'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={restaurando}
              className="hidden"
            />
          </label>
        </div>

        {/* Mensaje de Restauración */}
        {mensajeRestauracion && (
          <div
            className={`rounded-xl p-3 border font-mono text-xs flex items-center gap-2 ${
              mensajeRestauracion.tipo === 'ok'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-rose-500/20 border-rose-500 text-rose-300'
            }`}
          >
            {mensajeRestauracion.tipo === 'ok' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{mensajeRestauracion.texto}</span>
          </div>
        )}

        {/* Botón de Cierre */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <Button variant="outline" size="sm" onClick={onCerrar}>
            Cerrar Ventana
          </Button>
        </div>
      </div>
    </div>
  );
};
