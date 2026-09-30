import React, { useState } from 'react';
import { X, DollarSign, Calculator, Percent, Sparkles, Check, TrendingUp, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import type { EstrategiaCostos, Producto } from '../../types';
import {
  calcularTotalCostosFijos,
  calcularProrrateoUnitario,
  calcularDesglosePrecioProducto,
} from '../../engine/costCalculator';

interface PricingStrategyModalProps {
  estrategia: EstrategiaCostos;
  productos: Producto[];
  onSaveEstrategia: (nuevaEstrategia: EstrategiaCostos) => void;
  onApplyPriceToProduct?: (productoId: string, nuevoPrecioVenta: number) => void;
  onClose: () => void;
}

export const PricingStrategyModal: React.FC<PricingStrategyModalProps> = ({
  estrategia,
  productos,
  onSaveEstrategia,
  onApplyPriceToProduct,
  onClose,
}) => {
  const [formData, setFormData] = useState<EstrategiaCostos>({
    costosFijos: { ...estrategia.costosFijos },
    unidadesMensualesEstimadas: estrategia.unidadesMensualesEstimadas,
    margenGananciaObjetivo: estrategia.margenGananciaObjetivo,
    ivaPorcentajePorDefecto: estrategia.ivaPorcentajePorDefecto,
  });

  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<string>(
    productos[0]?.id || ''
  );
  const [costoDirectoSimulado, setCostoDirectoSimulado] = useState<number>(
    productos[0]?.precioCosto || 2000
  );
  const [margenSimulado, setMargenSimulado] = useState<number>(formData.margenGananciaObjetivo);
  const [ivaSimulado, setIvaSimulado] = useState<number>(formData.ivaPorcentajePorDefecto);
  const [guardadoExitoso, setGuardadoExitoso] = useState<boolean>(false);

  const totalFijos = calcularTotalCostosFijos(formData.costosFijos);
  const prorrateoUnitario = calcularProrrateoUnitario(formData);

  const productoActual = productos.find((p) => p.id === productoSeleccionadoId);

  const desglose = calcularDesglosePrecioProducto(
    costoDirectoSimulado,
    formData,
    margenSimulado,
    ivaSimulado,
    productoActual?.precioVenta
  );

  const handleCostChange = (key: keyof typeof formData.costosFijos, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setFormData((prev) => ({
      ...prev,
      costosFijos: {
        ...prev.costosFijos,
        [key]: num,
      },
    }));
  };

  const handleGuardarConfig = () => {
    onSaveEstrategia(formData);
    setGuardadoExitoso(true);
    setTimeout(() => setGuardadoExitoso(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-[#1E293B] bg-[#0E111A] p-6 text-[#F8FAFC] shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono uppercase tracking-wide text-white flex items-center gap-2">
                Estrategia Táctica de Costos Fijos & Precios Soberanos
              </h2>
              <p className="text-xs text-slate-400">
                Prorrateo de servicios e infraestructura para garantizar margen real sin descapitalización
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Costos Fijos Mensuales */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-[#00D2FF] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" /> 1. Costos Operativos Fijos Mensuales
              </h3>
              <span className="text-xs font-mono text-slate-400">Todos editables ($ ARS)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-slate-400">Alquiler Local / Galpón</label>
                <input
                  type="number"
                  value={formData.costosFijos.alquiler}
                  onChange={(e) => handleCostChange('alquiler', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400">Salarios / Cargas Laborales</label>
                <input
                  type="number"
                  value={formData.costosFijos.salarios}
                  onChange={(e) => handleCostChange('salarios', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400">Electricidad / Luz</label>
                <input
                  type="number"
                  value={formData.costosFijos.luz}
                  onChange={(e) => handleCostChange('luz', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400">Gas / Calefacción</label>
                <input
                  type="number"
                  value={formData.costosFijos.gas}
                  onChange={(e) => handleCostChange('gas', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400">Agua de Red</label>
                <input
                  type="number"
                  value={formData.costosFijos.agua}
                  onChange={(e) => handleCostChange('agua', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400">Internet & Posnet</label>
                <input
                  type="number"
                  value={formData.costosFijos.internet}
                  onChange={(e) => handleCostChange('internet', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400">Mantenimiento / Rodados</label>
                <input
                  type="number"
                  value={formData.costosFijos.mantenimiento}
                  onChange={(e) => handleCostChange('mantenimiento', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400">Otros / Imprevistos</label>
                <input
                  type="number"
                  value={formData.costosFijos.otros}
                  onChange={(e) => handleCostChange('otros', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                />
              </div>
            </div>

            {/* Total Costos Fijos & Unidades Prorrateables */}
            <div className="rounded-xl border border-[#1E293B] bg-[#141824] p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Total Gastos Operativos Fijos:</span>
                <span className="text-base font-bold text-white">
                  ${totalFijos.toLocaleString('es-AR')} / mes
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#1E293B]">
                <div className="text-xs font-mono text-slate-400">
                  <span>Ventas Proyectadas Mensuales (Unidades totales):</span>
                </div>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  value={formData.unidadesMensualesEstimadas}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      unidadesMensualesEstimadas: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-center font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#00FF87]/10 p-2 border border-[#00FF87]/30">
                <span className="text-xs font-mono text-[#00FF87] font-semibold">
                  Costo Fijo Prorrateado por Unidad:
                </span>
                <span className="font-mono text-base font-bold text-[#00FF87]">
                  +${prorrateoUnitario.toFixed(2)} por unidad
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleGuardarConfig}
              className="mt-1"
              icon={guardadoExitoso ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            >
              {guardadoExitoso ? '¡Costos Actualizados con Éxito!' : 'Guardar Parámetros de Costo Global'}
            </Button>
          </div>

          {/* Columna Derecha: Simulador Táctico de Margen & Formación de Precios */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <h3 className="font-mono text-sm font-semibold text-[#FF2E93] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> 2. Simulador y Sugerencia de Precio Unitario
            </h3>

            {/* Selector de Producto de Prueba o Costo Libre */}
            <div className="rounded-xl border border-[#1E293B] bg-[#141824] p-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-mono text-slate-400">Probar con Producto Existente:</label>
                <select
                  value={productoSeleccionadoId}
                  onChange={(e) => {
                    setProductoSeleccionadoId(e.target.value);
                    const sel = productos.find((p) => p.id === e.target.value);
                    if (sel) {
                      setCostoDirectoSimulado(sel.precioCosto);
                      setMargenSimulado(sel.margenSugerido || formData.margenGananciaObjetivo);
                      setIvaSimulado(sel.ivaPorcentaje);
                    }
                  }}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Costo: ${p.precioCosto} | Venta: ${p.precioVenta})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-mono text-slate-400">Costo Directo ($)</label>
                  <input
                    type="number"
                    value={costoDirectoSimulado}
                    onChange={(e) => setCostoDirectoSimulado(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400">Margen Deseado (%)</label>
                  <input
                    type="number"
                    value={margenSimulado}
                    onChange={(e) => setMargenSimulado(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400">Alícuota IVA (%)</label>
                  <select
                    value={ivaSimulado}
                    onChange={(e) => setIvaSimulado(parseFloat(e.target.value))}
                    className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-sm text-white focus:border-[#00FF87] focus:outline-none"
                  >
                    <option value={21}>21.0% (General)</option>
                    <option value={10.5}>10.5% (Granos/Harinas)</option>
                    <option value={0}>0% (Exento/Leche)</option>
                  </select>
                </div>
              </div>

              {/* Tarjeta HUD de Desglose Matemático */}
              <div className="rounded-xl border border-[#1E293B] bg-[#090A0F] p-3 text-xs font-mono space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Costo Compra Mayorista (Directo):</span>
                  <span>${desglose.costoDirecto.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-[#00D2FF]">
                  <span>+ Prorrateo Gastos Fijos (Luz/Alquiler/Salarios):</span>
                  <span>+${desglose.costoFijoProrrateado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-300 font-bold border-t border-slate-800 pt-1">
                  <span>Costo Total Unitario Real:</span>
                  <span>${desglose.costoTotalUnitario.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-[#00FF87]">
                  <span>+ Ganancia Neta Estimada ({desglose.margenPorcentaje}%):</span>
                  <span>+${desglose.gananciaNetaEstimada.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>+ Impacto IVA ({desglose.alicuotaIva}%):</span>
                  <span>+${desglose.montoIva.toLocaleString('es-AR')}</span>
                </div>

                {/* Resultado Final Sugerido */}
                <div className="mt-3 rounded-lg border border-[#00FF87]/40 bg-[#00FF87]/15 p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold">
                      Precio de Venta Sugerido:
                    </span>
                    <div className="text-xl font-extrabold text-[#00FF87]">
                      ${desglose.precioFinalSugerido.toLocaleString('es-AR')}
                    </div>
                  </div>

                  {desglose.precioVentaActual !== undefined && (
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">Precio Actual en Góndola:</span>
                      <div className="text-sm font-bold text-white">
                        ${desglose.precioVentaActual.toLocaleString('es-AR')}
                      </div>
                      <span
                        className={`text-[10px] ${
                          (desglose.diferenciaConActual || 0) < 0
                            ? 'text-red-400'
                            : 'text-[#00FF87]'
                        }`}
                      >
                        {(desglose.diferenciaConActual || 0) < 0 ? '⚠️ Por debajo del costo real' : '✅ Margen cubierto'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {productoActual && onApplyPriceToProduct && (
                <Button
                  variant="cyber"
                  size="sm"
                  onClick={() => {
                    onApplyPriceToProduct(productoActual.id, desglose.precioFinalSugerido);
                    setGuardadoExitoso(true);
                  }}
                  icon={<Check className="h-4 w-4" />}
                >
                  Aplicar ${desglose.precioFinalSugerido} a "{productoActual.nombre.slice(0, 24)}..."
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
