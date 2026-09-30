import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  Download,
  Share2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  CheckSquare,
  Square,
  Package,
  DollarSign,
  Truck,
  Copy,
  Check,
  X,
  FileText,
  Clock,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import type { Producto, VentaPOS, PerfilComercio } from '../../types';
import {
  generarAnalisisDinamicaComercial,
  type AnalisisDinamicaComercial,
  type ProductoQuiebreCritico,
} from '../../engine/smartRestockEngine';
import {
  descargarPdfReporte,
  generarPdfReporteCompras,
} from '../../engine/reportPdfGenerator';
import { audioFeedback } from '../../engine/audioFeedback';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productos: Producto[];
  ventas: VentaPOS[];
  perfilComercio?: PerfilComercio | null;
}

export function ReporteComprasModal({
  isOpen,
  onClose,
  productos,
  ventas,
  perfilComercio,
}: Props) {
  const [tabActiva, setTabActiva] = useState<'hoja_a4' | 'checklist_pedidos' | 'creatividad'>(
    'hoja_a4'
  );
  const [filtroProveedor, setFiltroProveedor] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [itemsCheckeados, setItemsCheckeados] = useState<Record<string, boolean>>({});
  const [copiadoWhatsapp, setCopiadoWhatsapp] = useState<boolean>(false);
  const [generandoPdf, setGenerandoPdf] = useState<boolean>(false);

  // Generar el análisis comercial soberano
  const analisis = useMemo(() => {
    return generarAnalisisDinamicaComercial(productos, ventas, perfilComercio);
  }, [productos, ventas, perfilComercio]);

  // Lista de proveedores únicos en quiebre
  const proveedores = useMemo(() => {
    const setP = new Set<string>();
    analisis.quiebresCriticos.forEach((q) => {
      if (q.proveedor) setP.add(q.proveedor);
    });
    return Array.from(setP);
  }, [analisis]);

  // Filtrado de quiebres para la vista
  const quiebresFiltrados = useMemo(() => {
    return analisis.quiebresCriticos.filter((q) => {
      if (filtroProveedor !== 'todos' && q.proveedor !== filtroProveedor) {
        return false;
      }
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase();
        const coincide =
          q.nombre.toLowerCase().includes(query) ||
          q.codigoBarras.toLowerCase().includes(query) ||
          (q.sku && q.sku.toLowerCase().includes(query)) ||
          q.proveedor.toLowerCase().includes(query);
        if (!coincide) return false;
      }
      return true;
    });
  }, [analisis, filtroProveedor, busqueda]);

  const toggleCheck = (id: string) => {
    setItemsCheckeados((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Descarga directa del archivo PDF A4 listo para imprimir
  const handleDescargarPdf = () => {
    setGenerandoPdf(true);
    audioFeedback.playBarcodeSuccess();
    try {
      descargarPdfReporte(analisis);
    } catch (err) {
      console.error('Error al generar PDF:', err);
    } finally {
      setTimeout(() => setGenerandoPdf(false), 800);
    }
  };

  // Impresión directa nativa
  const handleImprimir = () => {
    audioFeedback.playBarcodeSuccess();
    window.print();
  };

  // Copiar resumen de orden de compras para WhatsApp de distribuidores
  const handleCopiarWhatsApp = () => {
    audioFeedback.playBarcodeSuccess();
    let texto = `*PEDIDO DE REPOSICIÓN - ${analisis.nombreComercio.toUpperCase()}*\n`;
    texto += `Fecha: ${analisis.fechaEmision} ${analisis.horaEmision} hs\n`;
    texto += `-------------------------------------------\n\n`;

    analisis.ordenCompraPorProveedor.forEach((provGroup) => {
      texto += `*PROVEEDOR: ${provGroup.proveedor.toUpperCase()}*\n`;
      provGroup.items.forEach((it) => {
        texto += `• [${it.codigo || 'S/C'}] ${it.producto} x ${it.cantidadSugerida} un. ($${it.costoUnitario.toLocaleString('es-AR')} c/u)\n`;
      });
      texto += `Subtotal Estimado: $${provGroup.totalEstimado.toLocaleString('es-AR')}\n\n`;
    });

    texto += `-------------------------------------------\n`;
    texto += `*TOTAL ESTIMADO REPOSICIÓN: $${analisis.totalInversionReposicionUrgente.toLocaleString('es-AR')}*\n`;
    texto += `Por favor confirmar stock y plazo de entrega. Gracias!`;

    navigator.clipboard.writeText(texto);
    setCopiadoWhatsapp(true);
    setTimeout(() => setCopiadoWhatsapp(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden">
      {/* Estilos específicos para impresión en papel */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #seccion-imprimible-reporte, #seccion-imprimible-reporte * {
            visibility: visible;
          }
          #seccion-imprimible-reporte {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl h-[95vh] bg-[#0E131F] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* BARRA SUPERIOR (HEADER) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Reporte Soberano de Compras y Dinámica Comercial
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Formato A4 Impresora
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Resumen de quiebres críticos, comparativas de ventas (ayer / semana / mes) y compras predictivas
              </p>
            </div>
          </div>

          {/* ACCIONES PRINCIPALES */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Abrir diálogo de impresión directa"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleDescargarPdf}
              disabled={generandoPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono rounded-lg transition-colors cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{generandoPdf ? 'Generando...' : 'Descargar PDF'}</span>
            </button>

            <button
              onClick={handleCopiarWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
              title="Copiar lista de compras estructurada para WhatsApp"
            >
              {copiadoWhatsapp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiadoWhatsapp ? '¡Copiado!' : 'WhatsApp'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PESTAÑAS DE VISTA */}
        <div className="flex items-center justify-between px-5 py-2 bg-slate-950/60 border-b border-slate-800/80">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTabActiva('hoja_a4')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                tabActiva === 'hoja_a4'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Vista Hoja A4 (Previsualización Impresa)</span>
            </button>

            <button
              onClick={() => setTabActiva('checklist_pedidos')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                tabActiva === 'checklist_pedidos'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Checklist de Pedidos ({analisis.quiebresCriticos.length})</span>
            </button>

            <button
              onClick={() => setTabActiva('creatividad')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                tabActiva === 'creatividad'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Estrategia y Combos Creativos</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {analisis.fechaEmision} • {analisis.horaEmision} hs
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40">
          {/* TAB 1: VISTA HOJA A4 (Previsualización exacta formateada para impresora) */}
          {tabActiva === 'hoja_a4' && (
            <div className="max-w-4xl mx-auto">
              <div
                id="seccion-imprimible-reporte"
                className="bg-white text-slate-900 rounded-xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6"
              >
                {/* ENCABEZADO A4 */}
                <div className="border-b-2 border-slate-900 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-xl font-black text-slate-950 tracking-tight">
                        REPORTE DIARIO DE COMPRAS, VENTAS Y GESTIÓN DE QUIEBRES
                      </h1>
                      <div className="text-xs font-bold text-slate-700 mt-0.5">
                        {analisis.nombreComercio.toUpperCase()} • RUBRO: {analisis.rubro.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">{analisis.fechaEmision}</div>
                      <div className="text-[11px] text-slate-500">{analisis.horaEmision} hs</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2 flex flex-wrap gap-x-4">
                    {analisis.direccion && <span>Dirección: {analisis.direccion}</span>}
                    {analisis.telefono && <span>Teléfono: {analisis.telefono}</span>}
                    <span>Emisión: NOST-IA Soberano</span>
                    <span>Documento de Gestión Interna de Compras</span>
                  </div>
                </div>

                {/* 1. SECCIÓN DE VENTAS Y COMPARATIVAS */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
                    1. Ventas y Comparativa Dinámica de Facturación
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Ventas Hoy */}
                    <div className="p-3 rounded-lg border border-slate-300 bg-slate-50">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Ventas de Hoy
                      </div>
                      <div className="text-base font-black text-slate-950 mt-0.5">
                        $ {analisis.ventasHoy.totalMonto.toLocaleString('es-AR')}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        {analisis.ventasHoy.totalTickets} tickets • {analisis.ventasHoy.unidadesVendidas} unid.
                      </div>
                    </div>

                    {/* Vs Día Anterior */}
                    <div className="p-3 rounded-lg border border-slate-300 bg-slate-50">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Vs Día Anterior (Ayer)
                      </div>
                      <div
                        className={`text-base font-black mt-0.5 flex items-center gap-1 ${
                          analisis.relacionDiaAnterior.porcentajeVariacion >= 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {analisis.relacionDiaAnterior.porcentajeVariacion >= 0 ? '+' : ''}
                        {analisis.relacionDiaAnterior.porcentajeVariacion}%
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        Ayer: $ {analisis.relacionDiaAnterior.periodoAnterior.totalMonto.toLocaleString('es-AR')}
                      </div>
                    </div>

                    {/* Vs Semana Anterior */}
                    <div className="p-3 rounded-lg border border-slate-300 bg-slate-50">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Vs Semana Anterior (7d)
                      </div>
                      <div
                        className={`text-base font-black mt-0.5 flex items-center gap-1 ${
                          analisis.relacionSemanaAnterior.porcentajeVariacion >= 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {analisis.relacionSemanaAnterior.porcentajeVariacion >= 0 ? '+' : ''}
                        {analisis.relacionSemanaAnterior.porcentajeVariacion}%
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        Prev: $ {analisis.relacionSemanaAnterior.periodoAnterior.totalMonto.toLocaleString('es-AR')}
                      </div>
                    </div>

                    {/* Vs Mes Anterior */}
                    <div className="p-3 rounded-lg border border-slate-300 bg-slate-50">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        Vs Mes Anterior (30d)
                      </div>
                      <div
                        className={`text-base font-black mt-0.5 flex items-center gap-1 ${
                          analisis.relacionMesAnterior.porcentajeVariacion >= 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {analisis.relacionMesAnterior.porcentajeVariacion >= 0 ? '+' : ''}
                        {analisis.relacionMesAnterior.porcentajeVariacion}%
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        Prev: $ {analisis.relacionMesAnterior.periodoAnterior.totalMonto.toLocaleString('es-AR')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN DE PRODUCTOS EN QUIEBRE CRÍTICO (TABLA FORMATEADA PARA IMPRESORA) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                      2. Productos en Quiebre Crítico y Reposición Urgente ({analisis.quiebresCriticos.length})
                    </h3>
                    <div className="text-xs font-bold text-slate-900">
                      Total Inversión: $ {analisis.totalInversionReposicionUrgente.toLocaleString('es-AR')} ({analisis.totalUnidadesReposicionUrgente} un.)
                    </div>
                  </div>

                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="py-1.5 px-2 text-center w-8">Chk</th>
                          <th className="py-1.5 px-2 w-28">Cód / SKU</th>
                          <th className="py-1.5 px-2">Descripción del Producto</th>
                          <th className="py-1.5 px-2 text-center w-12">Stock</th>
                          <th className="py-1.5 px-2 text-center w-12">Mín</th>
                          <th className="py-1.5 px-2 text-center w-14 text-amber-300 font-black">Pedir</th>
                          <th className="py-1.5 px-2 text-right w-20">Costo Unit.</th>
                          <th className="py-1.5 px-2 text-right w-24">Inversión</th>
                          <th className="py-1.5 px-2 w-32">Distribuidor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {analisis.quiebresCriticos.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-4 text-center text-slate-500 italic">
                              No hay productos en quiebre crítico en este momento. Stock en niveles óptimos.
                            </td>
                          </tr>
                        ) : (
                          analisis.quiebresCriticos.map((q, idx) => (
                            <tr
                              key={q.id || idx}
                              className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                            >
                              <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[10px]">
                                [  ]
                              </td>
                              <td className="py-1.5 px-2 font-mono text-[10px] text-slate-600">
                                {q.codigoBarras || q.sku || '-'}
                              </td>
                              <td className="py-1.5 px-2 font-bold text-slate-900">
                                {q.nombre}
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-rose-700">
                                {q.stockActual}
                              </td>
                              <td className="py-1.5 px-2 text-center text-slate-600">
                                {q.stockMinimo}
                              </td>
                              <td className="py-1.5 px-2 text-center font-black text-rose-700 bg-rose-50/50">
                                {q.unidadesSugeridasPedir}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                                $ {q.precioCosto.toLocaleString('es-AR')}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                                $ {q.inversionEstimada.toLocaleString('es-AR')}
                              </td>
                              <td className="py-1.5 px-2 text-[10px] text-slate-700 truncate max-w-[120px]">
                                {q.proveedor}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. ALERTAS PREDICTIVAS DE QUIEBRE */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    3. Alertas Predictivas de Quiebre (Agotamiento en menos de 7 días)
                  </h3>

                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold">
                          <th className="py-1.5 px-2 w-8 text-center">Chk</th>
                          <th className="py-1.5 px-2">Producto con Riesgo Próximo</th>
                          <th className="py-1.5 px-2 text-center w-24">Stock Actual</th>
                          <th className="py-1.5 px-2 text-center w-24">Rotación Diaria</th>
                          <th className="py-1.5 px-2 text-center w-28 text-amber-300">Quiebre Estimado</th>
                          <th className="py-1.5 px-2 text-center w-16">Pedir</th>
                          <th className="py-1.5 px-2">Acción Preventiva Sugerida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {analisis.alertasPredictivas.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-3 text-center text-slate-500 italic">
                              No hay alertas predictivas para los próximos 7 días.
                            </td>
                          </tr>
                        ) : (
                          analisis.alertasPredictivas.map((a, idx) => (
                            <tr key={a.productoId || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                              <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[10px]">[  ]</td>
                              <td className="py-1.5 px-2 font-bold text-slate-900">{a.nombre}</td>
                              <td className="py-1.5 px-2 text-center text-slate-700">{a.stockActual} (Mín: {a.stockMinimo})</td>
                              <td className="py-1.5 px-2 text-center text-slate-700">{a.consumoDiarioEstimado} un/día</td>
                              <td className="py-1.5 px-2 text-center font-bold text-amber-700">En {a.diasRestantesParaQuiebre} días (~{a.fechaEstimadaQuiebre})</td>
                              <td className="py-1.5 px-2 text-center font-black text-slate-900 bg-amber-50">{a.unidadesSugeridas}</td>
                              <td className="py-1.5 px-2 text-slate-600 text-[10.5px]">{a.sugerenciaAccion}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. FECHAS ESPECIALES Y CALENDARIO SOBERANO */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                    4. Calendario Soberano: Fechas Especiales y Temporada
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analisis.fechasEspecialesProximas.map((fe, idx) => (
                      <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{fe.nombreEvento}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            En {fe.diasRestantes} días ({fe.fecha})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 mt-1">
                          <span className="font-semibold">Impacto:</span> {fe.impactoEsperado}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          <span className="font-semibold text-slate-800">Sugerencia de compra:</span> {fe.accionSugeridaCompras}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. CREATIVIDAD EN VENTAS: COMBOS Y DESAHOGO DE STOCK */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                    5. Propuestas Creativas para Ventas y Recupero de Capital
                  </h3>

                  <div className="space-y-2">
                    {analisis.ideasCreativas.map((id, idx) => (
                      <div key={idx} className="p-2.5 border border-slate-200 rounded-lg bg-emerald-50/30">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-950">{id.titulo}</span>
                          <span className="text-[9.5px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            {id.tipo === 'COMBO_DESAHOGO' ? 'Desahogo de Capital' : 'Venta Cruzada'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 mt-1">{id.descripcion}</p>
                        <p className="text-[10px] font-semibold text-emerald-800 mt-0.5">
                          Beneficio esperado: {id.beneficioEsperado}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PIE DE PÁGINA A4 */}
                <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-[10px] text-slate-500">
                  <div>NOST-IA Sistema Soberano Local • Reporte de Compras A4</div>
                  <div>Firma / Control de Recepción: _______________________</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHECKLIST INTERACTIVO DE PEDIDOS POR DISTRIBUIDOR */}
          {tabActiva === 'checklist_pedidos' && (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Barra de Filtros */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar producto, código o proveedor..."
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filtroProveedor}
                    onChange={(e) => setFiltroProveedor(e.target.value)}
                    className="bg-slate-950/60 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="todos">Todos los Proveedores ({proveedores.length})</option>
                    {proveedores.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grupos de Orden de Compra por Proveedor */}
              {analisis.ordenCompraPorProveedor.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400">
                  <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold">No hay artículos en quiebre crítico para pedir.</p>
                  <p className="text-xs text-slate-500 mt-1">Tu inventario se encuentra en niveles de stock adecuados.</p>
                </div>
              ) : (
                analisis.ordenCompraPorProveedor
                  .filter((p) => filtroProveedor === 'todos' || p.proveedor === filtroProveedor)
                  .map((provGroup, pIdx) => (
                    <div
                      key={pIdx}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                            {provGroup.proveedor}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                            {provGroup.items.length} ítems
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400">Total Estimado: </span>
                          <span className="text-sm font-mono font-bold text-cyan-400">
                            $ {provGroup.totalEstimado.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-800/60">
                        {provGroup.items.map((it, itIdx) => {
                          const itemKey = `${it.codigo}-${it.producto}`;
                          const checkeado = !!itemsCheckeados[itemKey];
                          return (
                            <div
                              key={itIdx}
                              onClick={() => toggleCheck(itemKey)}
                              className={`flex items-center justify-between py-2.5 px-2 rounded-lg cursor-pointer transition-colors ${
                                checkeado ? 'bg-cyan-500/10 text-cyan-200' : 'hover:bg-slate-800/40 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  className="text-slate-400 hover:text-cyan-400 transition-colors"
                                >
                                  {checkeado ? (
                                    <CheckSquare className="w-4 h-4 text-cyan-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-500" />
                                  )}
                                </button>
                                <div>
                                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                                    <span className={checkeado ? 'line-through text-slate-400' : ''}>
                                      {it.producto}
                                    </span>
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-3 mt-0.5">
                                    <span>Cód: {it.codigo || it.sku || 'S/C'}</span>
                                    <span>Stock: {it.stockActual} (Mín: {it.stockMinimo})</span>
                                    <span>Costo: ${it.costoUnitario.toLocaleString('es-AR')}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs font-mono font-bold text-amber-400">
                                  Pedir: {it.cantidadSugerida} un.
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  $ {it.subtotal.toLocaleString('es-AR')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* TAB 3: ESTRATEGIA Y COMBOS CREATIVOS */}
          {tabActiva === 'creatividad' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-transparent border border-amber-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Dinámica de Ventas & Inteligencia Comercial Soberana</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  El sistema analiza la velocidad de rotación de tu stock para proponer combinaciones que aceleran la salida de mercadería estancada y aumentan el margen total.
                </p>
              </div>

              {/* Ideas Creativas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analisis.ideasCreativas.map((idea, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white tracking-wide">{idea.titulo}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {idea.tipo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{idea.descripcion}</p>
                    <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-cyan-400">
                      💡 {idea.beneficioEsperado}
                    </div>
                  </div>
                ))}
              </div>

              {/* Próximas Fechas Especiales del Calendario */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Anticipación Estratégica: Fechas Especiales y Temporadas</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analisis.fechasEspecialesProximas.map((fe, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{fe.nombreEvento}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          En {fe.diasRestantes} días
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        <span className="text-slate-400 font-medium">Impacto:</span> {fe.impactoEsperado}
                      </p>
                      <p className="text-[11px] text-cyan-300">
                        <span className="text-slate-400 font-medium">Acción de Compra:</span> {fe.accionSugeridaCompras}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BARRA INFERIOR DE RESUMEN */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500">Quiebres Críticos: </span>
              <span className="font-bold text-rose-400 font-mono">{analisis.quiebresCriticos.length}</span>
            </div>
            <div>
              <span className="text-slate-500">Unidades a Reponer: </span>
              <span className="font-bold text-white font-mono">{analisis.totalUnidadesReposicionUrgente}</span>
            </div>
            <div>
              <span className="text-slate-500">Inversión Estimada: </span>
              <span className="font-bold text-cyan-400 font-mono">
                $ {analisis.totalInversionReposicionUrgente.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDescargarPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Descargar PDF A4 para Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
