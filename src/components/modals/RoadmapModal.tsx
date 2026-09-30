import React, { useState } from 'react';
import { Sparkles, X, CheckCircle2, Clock, ShieldCheck, Zap, Layers, Cpu, Camera, CreditCard, Network, Download, Database, AlertOctagon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { exportarBackupSoberano } from '../../engine/db';

interface RoadmapModalProps {
  onClose: () => void;
  onAbrirScanner?: () => void;
  onAbrirPos?: () => void;
}

export const RoadmapModal: React.FC<RoadmapModalProps> = ({
  onClose,
  onAbrirScanner,
  onAbrirPos,
}) => {
  const [descargandoBackup, setDescargandoBackup] = useState<boolean>(false);
  const [backupDescargado, setBackupDescargado] = useState<boolean>(false);

  const handleDescargarBackup = async () => {
    try {
      setDescargandoBackup(true);
      const json = await exportarBackupSoberano();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_soberano_nost_ia_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupDescargado(true);
      setTimeout(() => setBackupDescargado(false), 4000);
    } catch (err) {
      console.error('Error al exportar copia de resguardo:', err);
    } finally {
      setDescargandoBackup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-3xl rounded-2xl border border-[#00FF87]/30 bg-[#0B0F17] p-6 shadow-2xl text-slate-200 flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00FF87]/20 to-[#00D2FF]/20 border border-[#00FF87]/40 text-[#00FF87]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Plan de Evolución & Próximas Actualizaciones
                <Badge variant="green">Hoja de Ruta</Badge>
              </h2>
              <p className="text-xs text-slate-400">
                Módulos en transición, laboratorios en desarrollo y arquitectura soberana planificada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto pr-1 py-4 space-y-4 font-mono text-xs">
          {/* SECTOR DE BACKUP SOBERANO PARA CUALQUIER COMERCIANTE QUE LO DESCARGUE */}
          <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-emerald-950/30 p-4 shadow-[0_0_15px_rgba(0,210,255,0.1)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-[#00D2FF] border border-cyan-500/40 shrink-0 mt-0.5">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    Copia de Seguridad Soberana Lista para Descargar
                    <Badge variant="blue">Backup Oficial</Badge>
                  </h4>
                  <p className="text-slate-300 text-[11px] font-sans mt-0.5 max-w-xl">
                    Cualquier comerciante o auditor puede descargar en 1 solo clic la base de datos soberana preconfigurada en formato JSON con Checksum Criptográfico SHA-256, garantizando respaldo total contra pérdidas o traslados de máquina.
                  </p>
                </div>
              </div>
              <Button
                variant="cyber"
                size="sm"
                onClick={handleDescargarBackup}
                disabled={descargandoBackup}
                icon={backupDescargado ? <CheckCircle2 className="h-4 w-4 text-black" /> : <Download className="h-4 w-4 text-black" />}
                className="font-bold"
              >
                {backupDescargado ? '¡Copia Descargada!' : descargandoBackup ? 'Generando...' : 'Descargar Backup Soberano'}
              </Button>
            </div>
          </div>

          {/* DIAGNÓSTICO DE VIABILIDAD TÉCNICA VISIBLE PARA EL PÚBLICO */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 p-4 text-amber-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0 mt-0.5">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold font-mono text-amber-300 text-sm uppercase tracking-wide">
                  Diagnóstico de Viabilidad Técnica para Salir a Producción
                </h4>
                <p className="text-xs font-mono text-amber-100/90 leading-relaxed">
                  Integrar en este instante <strong>PP-DocLayoutV3 + PaddleOCR-VL-1.5 ONNX + TeleOCR GGUF</strong> implica:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] font-mono text-amber-200/90 pl-1">
                  <li>Descargar <strong>~3.6 GB de pesos neuronales</strong> en cada equipo.</li>
                  <li>Requerir un consumo pico de <strong>&gt;3.5 GB a 4 GB de memoria RAM</strong> solo para el proceso de ingesta.</li>
                  <li>En una PC de mostrador humilde con 4 GB de RAM totales (donde Windows o Linux ya consumen 2 GB), la computadora sufriría <strong>OOM Crash (cierre forzado por falta de memoria) o congelamiento total del sistema operativo</strong>.</li>
                </ul>
                <div className="rounded-lg bg-black/40 border border-amber-500/20 p-2.5 text-[11px] font-sans text-slate-300">
                  <span className="text-amber-300 font-bold font-mono">Decisión Arquitectónica Soberana: </span>
                  Se mantiene el motor <strong>VDU 3.0 matricial en 2 etapas + ZXing WASM + Canvas 300 DPI + Tesseract local offline</strong> que responde en milisegundos, consume menos de 45 MB de RAM y corre con 100% de estabilidad en cualquier máquina popular sin internet.
                </div>
              </div>
            </div>
          </div>

          {/* Módulos reubicados para esta versión */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" /> Módulos en Perfeccionamiento (Reubicados)
            </h3>
            <p className="text-slate-300 text-xs mb-3">
              Por decisión estratégica de diseño y estabilidad operativa, estos módulos fueron retirados de la barra superior prioritaria mientras se integran sus versiones definitivas:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Escáner Óptico */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-[#00D2FF]" />
                      Escáner Óptico de Cámara
                    </span>
                    <Badge variant="blue">En Refactor</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Actualmente disponible en modo prueba. Se está migrando hacia un motor WebAssembly con auto-enfoque asistido y filtrado de brillos para etiquetas reflectantes.
                  </p>
                </div>
                {onAbrirScanner && (
                  <button
                    onClick={() => {
                      onClose();
                      onAbrirScanner();
                    }}
                    className="mt-3 text-left text-[11px] text-[#00D2FF] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    ▶ Probar versión beta actual
                  </button>
                )}
              </div>

              {/* Módulo Cobrar / POS */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-[#00FF87]" />
                      Terminal de Cobro Rápido (POS)
                    </span>
                    <Badge variant="green">Laboratorio</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Enriqueciendo la integración con impresoras térmicas ESC/POS (58mm/80mm) y tickets no fiscales para mostrador sin conexión.
                  </p>
                </div>
                {onAbrirPos && (
                  <button
                    onClick={() => {
                      onClose();
                      onAbrirPos();
                    }}
                    className="mt-3 text-left text-[11px] text-[#00FF87] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    ▶ Abrir terminal de cobro actual
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Próximas Mejoras y Actualizaciones Planificadas */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#00FF87]" /> Próximas Actualizaciones de la Plataforma
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <Cpu className="h-4 w-4 text-[#00FF87]" />
                  <span>Cerebro Local Multi-Rubro V2</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Ampliación del diccionario semántico a rubros farmacia (miligramos/comprimidos), bazar y repuestos mecánicos con código OEM.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <Network className="h-4 w-4 text-[#00D2FF]" />
                  <span>Sincronización P2P en Red Local</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Sincronización automática entre la caja registradora, el depósito y la oficina sin necesidad de internet (vía red Wi-Fi interna).
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <Layers className="h-4 w-4 text-[#FFD700]" />
                  <span>Importación Directa desde AFIP Comprobantes</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Carga automática de las compras declaradas en "Mis Comprobantes Recibidos" de AFIP mediante archivo CSV/Excel mensual con cotejo automático.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Backup Cifrado en Pendrive USB</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Exportación e importación segura con 1 solo clic en formato comprimido y protegido con clave para resguardo total del negocio.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-slate-800 pt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Plataforma Soberana • 100% Offline • Sin Dependencias Foráneas
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
