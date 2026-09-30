import React, { useState } from 'react';
import {
  FileText,
  X,
  AlertTriangle,
  Calendar,
  Building,
  CheckCircle2,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import type { FacturaProcesadaHistorial } from '../../types';

interface InvoiceHistoryModalProps {
  facturas: FacturaProcesadaHistorial[];
  onClose: () => void;
}

export const InvoiceHistoryModal: React.FC<InvoiceHistoryModalProps> = ({
  facturas,
  onClose,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'duplicadas' | 'compras' | 'ventas'>('todos');
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaProcesadaHistorial | null>(null);

  const facturasFiltradas = facturas.filter((f) => {
    const matchTexto =
      f.numeroComprobante.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.proveedorOEmisor.toLowerCase().includes(busqueda.toLowerCase()) ||
      (f.archivoOrigenNombre && f.archivoOrigenNombre.toLowerCase().includes(busqueda.toLowerCase()));

    if (!matchTexto) return false;

    if (filtroTipo === 'duplicadas') return f.esDuplicada;
    if (filtroTipo === 'compras') return f.tipoOperacion === 'compra_ingreso';
    if (filtroTipo === 'ventas') return f.tipoOperacion === 'venta_egreso';
    return true;
  });

  const cantDuplicadas = facturas.filter((f) => f.esDuplicada).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-[#1E293B] bg-[#0A0D14] text-[#F8FAFC] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#0E121C] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/30">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                Historial de Facturas y Comprobantes
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  {facturas.length} cargadas
                </span>
                {cantDuplicadas > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-bold">
                    <AlertTriangle className="h-3 w-3" /> {cantDuplicadas} duplicada{cantDuplicadas > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Auditoría territorial de comprobantes mayoristas y compras ingresadas al inventario
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] bg-[#12151E] px-6 py-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número, proveedor o archivo..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 py-1.5 pl-9 pr-3 text-xs font-mono text-white placeholder-slate-500 focus:border-[#00D2FF] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-mono transition-all ${
                filtroTipo === 'todos'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Todos ({facturas.length})
            </button>
            <button
              onClick={() => setFiltroTipo('duplicadas')}
              className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-mono transition-all flex items-center gap-1 ${
                filtroTipo === 'duplicadas'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-500 font-bold'
                  : 'bg-slate-900 text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <AlertTriangle className="h-3 w-3" /> Duplicadas ({cantDuplicadas})
            </button>
            <button
              onClick={() => setFiltroTipo('compras')}
              className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-mono transition-all ${
                filtroTipo === 'compras'
                  ? 'bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/40 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Compras
            </button>
            <button
              onClick={() => setFiltroTipo('ventas')}
              className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-mono transition-all ${
                filtroTipo === 'ventas'
                  ? 'bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/40 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Ventas
            </button>
          </div>
        </div>

        {/* Lista y Detalle */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {facturasFiltradas.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-sm">
              <FileText className="h-10 w-10 mx-auto text-slate-600 mb-2 opacity-50" />
              No se encontraron facturas en el historial con ese criterio.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {facturasFiltradas.map((f) => {
                const esCompra = f.tipoOperacion !== 'venta_egreso';
                const fechaLegible = new Date(f.fechaCarga).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={f.id}
                    className={`rounded-xl border p-4 transition-all ${
                      f.esDuplicada
                        ? 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'border-[#1E293B] bg-[#0E121E] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                              esCompra
                                ? 'bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30'
                                : 'bg-[#00D2FF]/15 text-[#00D2FF] border border-[#00D2FF]/30'
                            }`}
                          >
                            {esCompra ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            {esCompra ? 'Factura de Compra (+ Stock)' : 'Factura de Venta (- Stock)'}
                          </span>

                          <span className="font-mono text-sm font-bold text-white">
                            N° {f.numeroComprobante || 'S/N'}
                          </span>

                          {f.esDuplicada && (
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="h-3 w-3" /> REINGRESADA DUPLICADA
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                            <strong>{f.proveedorOEmisor}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {fechaLegible}
                          </span>
                          {f.archivoOrigenNombre && (
                            <span className="text-slate-500">
                              Archivo: {f.archivoOrigenNombre}
                            </span>
                          )}
                        </div>

                        {f.esDuplicada && f.motivoDuplicado && (
                          <div className="mt-2 rounded bg-amber-500/10 border border-amber-500/30 p-2 text-xs font-mono text-amber-200">
                            ⚠️ <strong>Aviso de Auditoría:</strong> {f.motivoDuplicado}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-mono text-slate-400">Total Comprobante</p>
                        <p className="text-lg font-mono font-bold text-[#00FF87]">
                          ${f.total.toLocaleString('es-AR')}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          {f.cantidadItems || f.items?.length || 0} productos facturados
                        </p>
                        <button
                          onClick={() => setFacturaSeleccionada(facturaSeleccionada?.id === f.id ? null : f)}
                          className="mt-2 cursor-pointer text-xs font-mono text-[#00D2FF] hover:underline flex items-center gap-1 ml-auto"
                        >
                          <Eye className="h-3 w-3" />
                          {facturaSeleccionada?.id === f.id ? 'Ocultar items' : 'Ver mercadería'}
                        </button>
                      </div>
                    </div>

                    {/* Desglose de Items */}
                    {facturaSeleccionada?.id === f.id && f.items && f.items.length > 0 && (
                      <div className="mt-3 border-t border-slate-800 pt-3">
                        <p className="text-xs font-mono font-bold text-slate-300 mb-2">
                          Detalle de renglones impactados en el stock:
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-slate-800">
                          <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-slate-900/90 text-slate-400">
                              <tr>
                                <th className="p-2">Descripción</th>
                                <th className="p-2 text-center">Cant.</th>
                                <th className="p-2 text-right">Precio Unit.</th>
                                <th className="p-2 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                              {f.items.map((it, idx) => (
                                <tr key={idx} className="hover:bg-slate-900/40">
                                  <td className="p-2 text-slate-200">{it.descripcion}</td>
                                  <td className="p-2 text-center font-bold text-[#00FF87]">{it.cantidad}</td>
                                  <td className="p-2 text-right text-slate-300">
                                    ${it.precioUnitario.toLocaleString('es-AR')}
                                  </td>
                                  <td className="p-2 text-right font-bold text-white">
                                    ${(it.subtotal || it.cantidad * it.precioUnitario).toLocaleString('es-AR')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="border-t border-[#1E293B] bg-[#0E121C] px-6 py-3 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>
            {cantDuplicadas > 0 ? (
              <span className="text-amber-400 font-bold">
                ⚠️ Atención: {cantDuplicadas} factura(s) duplicada(s) registrada(s). Los productos impactados tienen advertencia activa.
              </span>
            ) : (
              <span className="text-[#00FF87]">
                ✅ Auditoría limpia: sin comprobantes duplicados en el historial.
              </span>
            )}
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-slate-800 px-4 py-1.5 font-bold text-white hover:bg-slate-700"
          >
            Cerrar Historial
          </button>
        </div>
      </div>
    </div>
  );
};
