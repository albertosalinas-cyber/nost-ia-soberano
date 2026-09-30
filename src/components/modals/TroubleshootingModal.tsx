import React from 'react';
import {
  X,
  HelpCircle,
  AlertTriangle,
  HardDrive,
  RefreshCcw,
  Globe,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface TroubleshootingModalProps {
  onCerrar: () => void;
}

export const TroubleshootingModal: React.FC<TroubleshootingModalProps> = ({ onCerrar }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border-2 border-amber-500/50 bg-[#0A101D] p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-mono text-white">
                  Manual de Solución de Problemas (Troubleshooting FAQ)
                </h3>
                <Badge variant="warning">GUÍA DE ENTORNO LOCAL</Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Respuestas Tácticas a Errores de Entorno • Persistencia • Puertos • Accesos Directos
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

        {/* Lista de Preguntas y Respuestas */}
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 font-mono text-xs">
          {/* FAQ 1 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <HardDrive className="h-4 w-4 shrink-0 text-amber-400" />
              <span>¿Qué pasa cuando cierro la ventana de NOST-IA al finalizar el día comercial?</span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              <strong>No tenés que reinstalar ni hacer doble clic para comenzar todo de nuevo.</strong> Toda la información de mercadería, costos, ventas y facturas queda persistida automáticamente en tu disco duro (IndexedDB). Mañana simplemente abrís el navegador o tu acceso directo y todo continuará en su lugar.
            </p>
          </div>

          {/* FAQ 2 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#00D2FF] font-bold text-sm">
              <Terminal className="h-4 w-4 shrink-0 text-[#00D2FF]" />
              <span>¿Qué pasa si el puerto 3000 está ocupado por otra aplicación?</span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              NOST-IA puede iniciar en un puerto alternativo disponible (<code className="text-white bg-slate-800 px-1.5 py-0.5 rounded">3001</code>, <code className="text-white bg-slate-800 px-1.5 py-0.5 rounded">3002</code>, <code className="text-white bg-slate-800 px-1.5 py-0.5 rounded">8080</code>). También podés liberar el puerto 3000 ejecutando:
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-[#00FF87]">
              PORT=3001 npm run dev  <span className="text-slate-500"># O en Windows: npx kill-port 3000</span>
            </div>
          </div>

          {/* FAQ 3 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#00FF87] font-bold text-sm">
              <Globe className="h-4 w-4 shrink-0 text-[#00FF87]" />
              <span>¿Cómo recupero el acceso si cerré la pestaña del navegador por error?</span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              1. Presioná <strong className="text-white">Ctrl + Shift + T</strong> para reabrir la última pestaña.<br />
              2. O ingresá en tu navegador a: <strong className="text-[#00D2FF]">http://localhost:3000</strong>.<br />
              3. O creá un acceso directo en tu escritorio desde Chrome/Edge: menú <strong className="text-white">⋮ &gt; Guardar y Compartir &gt; Crear acceso directo</strong>.
            </p>
          </div>

          {/* FAQ 4: Cláusula de Responsabilidad */}
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>Cláusula de Responsabilidad de Datos Locales:</span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              Al ser un sistema 100% local y soberano, <strong>los datos viven exclusivamente en el disco rígido de tu computadora</strong>. NOST-IA no almacena ni copia nada en servidores externos. Si la computadora sufre una falla de hardware sin un resguardo previo, la responsabilidad es del usuario. 
              <strong className="text-rose-300"> Guardá copias periódicas en un pendrive desde la sección de Cierre de Día.</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <Button variant="outline" size="sm" onClick={onCerrar}>
            Entendido, Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
