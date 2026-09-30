import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Plus,
  Trash2,
  Sliders,
  ShieldCheck,
  Zap,
  ArrowRight,
  Flame,
  Droplets,
  Wifi,
  Users,
  Wrench,
  Scale,
  RefreshCw,
  Search,
  PieChart as PieChartIcon,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { audioFeedback } from '../../engine/audioFeedback';
import {
  calcularTotalCostosFijos,
  calcularProrrateoUnitario,
  calcularPuntoEquilibrioMensual,
  calcularEstadoResultadosMensual,
  type EstadoResultadosMensual,
} from '../../engine/costCalculator';
import {
  guardarGastoOperativo,
  eliminarGastoOperativo,
  obtenerGastosOperativos,
  db,
} from '../../engine/db';
import type {
  Producto,
  VentaPOS,
  EstrategiaCostos,
  GastoOperativo,
  CategoriaGastoFijo,
} from '../../types';

interface FinancialIntelligenceHubProps {
  productos: Producto[];
  ventas: VentaPOS[];
  estrategia: EstrategiaCostos;
  onOpenInvoiceModal: (modo?: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo') => void;
  onUpdateEstrategia: (nueva: EstrategiaCostos) => Promise<void>;
  onActualizarProrrateoEnInventario: (nuevoProrrateo: number) => Promise<void>;
}

export const FinancialIntelligenceHub: React.FC<FinancialIntelligenceHubProps> = ({
  productos,
  ventas,
  estrategia,
  onOpenInvoiceModal,
  onUpdateEstrategia,
  onActualizarProrrateoEnInventario,
}) => {
  // Lista de Gastos Operativos cargados desde la base de datos
  const [gastos, setGastos] = useState<GastoOperativo[]>([]);
  const [cargandoGastos, setCargandoGastos] = useState<boolean>(true);

  // Selector de Mes para el Resumen (YYYY-MM)
  const mesActualISO = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(mesActualISO);

  // Formulario rápido para Cargar Gasto Manual en Efectivo
  const [mostrarFormManual, setMostrarFormManual] = useState<boolean>(false);
  const [categoriaManual, setCategoriaManual] = useState<CategoriaGastoFijo>('luz');
  const [proveedorManual, setProveedorManual] = useState<string>('');
  const [comprobanteManual, setComprobanteManual] = useState<string>('');
  const [montoManual, setMontoManual] = useState<number>(0);
  const [observacionesManual, setObservacionesManual] = useState<string>('');

  // Filtro de Búsqueda para la Tabla de Prorrateo de Productos
  const [filtroProducto, setFiltroProducto] = useState<string>('');
  const [filtroRentabilidad, setFiltroRentabilidad] = useState<'todos' | 'perdida' | 'ajustado' | 'rentable'>('todos');

  // Simulador de Sensibilidad ("¿Qué pasa si...?")
  const [mostrarSimulador, setMostrarSimulador] = useState<boolean>(false);
  const [simuladorVariacionCostosPorc, setSimuladorVariacionCostosPorc] = useState<number>(0); // ej. +20%
  const [simuladorVariacionVentasPorc, setSimuladorVariacionVentasPorc] = useState<number>(0); // ej. -10%

  // Notificación local de sincronización
  const [mensajeFeedback, setMensajeFeedback] = useState<string | null>(null);

  // Cargar gastos operativos desde IndexedDB
  const recargarGastos = async () => {
    setCargandoGastos(true);
    try {
      const lista = await obtenerGastosOperativos();
      setGastos(lista);
    } catch (err) {
      console.warn('Error al cargar gastos:', err);
    } finally {
      setCargandoGastos(false);
    }
  };

  useEffect(() => {
    recargarGastos();
  }, []);

  // Filtrar gastos por el mes seleccionado
  const gastosDelMes = useMemo(() => {
    return gastos.filter((g) => g.periodoMes === mesSeleccionado);
  }, [gastos, mesSeleccionado]);

  // Total de gastos fijos del mes
  const totalGastosMes = useMemo(() => {
    if (gastosDelMes.length > 0) {
      return gastosDelMes.reduce((acc, g) => acc + (g.montoTotal || 0), 0);
    }
    // Fallback a la configuración fija si aún no cargó comprobantes en este mes
    return calcularTotalCostosFijos(estrategia.costosFijos);
  }, [gastosDelMes, estrategia.costosFijos]);

  // Ventas del mes seleccionado
  const ventasDelMes = useMemo(() => {
    return ventas.filter((v) => v.fecha && v.fecha.startsWith(mesSeleccionado));
  }, [ventas, mesSeleccionado]);

  // Total Facturado en el mes ($)
  const totalVentasBrutasMes = useMemo(() => {
    return ventasDelMes.reduce((acc, v) => acc + (v.total || 0), 0);
  }, [ventasDelMes]);

  // Unidades físicas vendidas en el mes
  const unidadesVendidasMes = useMemo(() => {
    return ventasDelMes.reduce((acc, v) => {
      const cantItems = v.items?.reduce((subAcc, it) => subAcc + (it.cantidad || 0), 0) || 0;
      return acc + cantItems;
    }, 0);
  }, [ventasDelMes]);

  // Costo de Mercadería Vendida (CMV) del mes
  const costoMercaderiaVendidaMes = useMemo(() => {
    let cmvTotal = 0;
    ventasDelMes.forEach((v) => {
      v.items?.forEach((it) => {
        const prod = productos.find(
          (p) => p.id === it.productoId || p.codigoBarras === it.codigoBarras
        );
        const costoUnit = prod ? prod.precioCosto : it.precioUnitario * 0.65;
        cmvTotal += costoUnit * it.cantidad;
      });
    });
    return cmvTotal;
  }, [ventasDelMes, productos]);

  // Estado de Resultados del Contador Virtual
  const estadoResultados: EstadoResultadosMensual = useMemo(() => {
    return calcularEstadoResultadosMensual(
      totalVentasBrutasMes,
      costoMercaderiaVendidaMes,
      totalGastosMes
    );
  }, [totalVentasBrutasMes, costoMercaderiaVendidaMes, totalGastosMes]);

  // Punto de Equilibrio Mensual
  const puntoEquilibrio = useMemo(() => {
    const precioPromedio =
      productos.length > 0
        ? productos.reduce((acc, p) => acc + p.precioVenta, 0) / productos.length
        : 2500;
    return calcularPuntoEquilibrioMensual(
      totalGastosMes,
      estrategia.margenGananciaObjetivo || 35,
      precioPromedio
    );
  }, [totalGastosMes, estrategia.margenGananciaObjetivo, productos]);

  // Prorrateo de Costo Fijo por Unidad Real
  const unidadesBaseProrrateo = useMemo(() => {
    if (unidadesVendidasMes > 50) return unidadesVendidasMes;
    return Math.max(1, estrategia.unidadesMensualesEstimadas || 1000);
  }, [unidadesVendidasMes, estrategia.unidadesMensualesEstimadas]);

  const costoFijoProrrateadoUnitarioReal = useMemo(() => {
    return Math.round((totalGastosMes / unidadesBaseProrrateo) * 100) / 100;
  }, [totalGastosMes, unidadesBaseProrrateo]);

  // Desglose de Gastos por Categoría
  const desgloseCategorias = useMemo(() => {
    const categorias: Record<CategoriaGastoFijo, { label: string; icon: any; total: number; color: string }> = {
      luz: { label: 'Luz y Electricidad', icon: Zap, total: 0, color: 'text-amber-400' },
      alquiler: { label: 'Alquiler Comercial', icon: Building, total: 0, color: 'text-rose-400' },
      salarios: { label: 'Salarios y Sueldos', icon: Users, total: 0, color: 'text-purple-400' },
      gas: { label: 'Gas Natural / Envasado', icon: Flame, total: 0, color: 'text-orange-400' },
      agua: { label: 'Agua y Saneamiento', icon: Droplets, total: 0, color: 'text-blue-400' },
      internet: { label: 'Internet y Telefonía', icon: Wifi, total: 0, color: 'text-cyan-400' },
      mantenimiento: { label: 'Mantenimiento y Reparación', icon: Wrench, total: 0, color: 'text-emerald-400' },
      impuestos_tasas: { label: 'Tasas e Impuestos', icon: Scale, total: 0, color: 'text-yellow-400' },
      otros: { label: 'Otros Gastos Operativos', icon: Receipt, total: 0, color: 'text-slate-400' },
    };

    if (gastosDelMes.length > 0) {
      gastosDelMes.forEach((g) => {
        if (g.categoriaGasto in categorias) {
          categorias[g.categoriaGasto].total += g.montoTotal || 0;
        } else {
          categorias.otros.total += g.montoTotal || 0;
        }
      });
    } else {
      // Fallback a la configuración fija
      Object.keys(estrategia.costosFijos).forEach((k) => {
        const cat = k as CategoriaGastoFijo;
        if (cat in categorias) {
          categorias[cat].total = (estrategia.costosFijos as any)[cat] || 0;
        }
      });
    }

    return categorias;
  }, [gastosDelMes, estrategia.costosFijos]);

  // Lista de Productos con Prorrateo y Rentabilidad Real
  const productosConProrrateo = useMemo(() => {
    const prorrateoActual = costoFijoProrrateadoUnitarioReal;

    return productos.map((prod) => {
      const costoDirecto = prod.precioCosto || 0;
      const costoTotalReal = costoDirecto + prorrateoActual;
      const precioVenta = prod.precioVenta || 0;
      const gananciaLimpiaPesos = precioVenta - costoTotalReal;
      const margenNetoLimpioPorcentaje =
        precioVenta > 0 ? (gananciaLimpiaPesos / precioVenta) * 100 : 0;

      // Precio mínimo para no perder ni un centavo (Break-Even por unidad)
      const precioMinimoEquilibrio = Math.round(costoTotalReal);

      // Precio sugerido por el contador para cumplir el margen objetivo
      const margenObj = estrategia.margenGananciaObjetivo || 35;
      const iva = prod.ivaPorcentaje || 21;
      const precioSugerido = Math.round(costoTotalReal * (1 + margenObj / 100) * (1 + iva / 100));

      let estadoRentabilidad: 'rentable' | 'ajustado' | 'perdida' = 'rentable';
      if (gananciaLimpiaPesos < 0) {
        estadoRentabilidad = 'perdida';
      } else if (margenNetoLimpioPorcentaje < 10) {
        estadoRentabilidad = 'ajustado';
      }

      return {
        ...prod,
        costoDirecto,
        costoFijoProrrateado: prorrateoActual,
        costoTotalReal,
        gananciaLimpiaPesos,
        margenNetoLimpioPorcentaje: Math.round(margenNetoLimpioPorcentaje * 10) / 10,
        precioMinimoEquilibrio,
        precioSugerido,
        estadoRentabilidad,
      };
    });
  }, [productos, costoFijoProrrateadoUnitarioReal, estrategia.margenGananciaObjetivo]);

  // Productos filtrados por búsqueda y categoría de rentabilidad
  const productosFiltrados = useMemo(() => {
    return productosConProrrateo.filter((p) => {
      const coincideTexto =
        !filtroProducto ||
        p.nombre.toLowerCase().includes(filtroProducto.toLowerCase()) ||
        p.codigoBarras.includes(filtroProducto) ||
        p.categoria.toLowerCase().includes(filtroProducto.toLowerCase());

      const coincideRentabilidad =
        filtroRentabilidad === 'todos' || p.estadoRentabilidad === filtroRentabilidad;

      return coincideTexto && coincideRentabilidad;
    });
  }, [productosConProrrateo, filtroProducto, filtroRentabilidad]);

  // Handler para guardar gasto manual en efectivo
  const handleGuardarGastoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoManual <= 0) {
      alert('Por favor ingresa un monto válido mayor a $0.');
      return;
    }

    const nuevo: GastoOperativo = {
      id: `gasto-man-${Date.now()}`,
      fecha: new Date().toISOString(),
      periodoMes: mesSeleccionado,
      categoriaGasto: categoriaManual,
      proveedor: proveedorManual.trim() || 'Comprobante de Caja',
      comprobante: comprobanteManual.trim() || `REC-${Date.now().toString().slice(-4)}`,
      montoTotal: Number(montoManual),
      observaciones: observacionesManual.trim() || 'Carga manual directa en mostrador',
      impactaEnProrrateo: true,
    };

    await guardarGastoOperativo(nuevo);
    await recargarGastos();

    setMostrarFormManual(false);
    setProveedorManual('');
    setComprobanteManual('');
    setMontoManual(0);
    setObservacionesManual('');

    audioFeedback.playPosSaleSuccess();
    setMensajeFeedback(`✅ Gasto de ${nuevo.proveedor} ($${nuevo.montoTotal.toLocaleString('es-AR')}) guardado y prorrateado.`);
    setTimeout(() => setMensajeFeedback(null), 3500);
  };

  // Handler para eliminar un gasto erróneo
  const handleEliminarGasto = async (id: string, descripcion: string) => {
    if (confirm(`¿Eliminar comprobante de "${descripcion}"? Se recalcularán los gastos fijos del mes.`)) {
      await eliminarGastoOperativo(id);
      await recargarGastos();
      audioFeedback.playAlert();
    }
  };

  // Handler para sincronizar el prorrateo en todos los productos en Dexie
  const handleAplicarProrrateoGeneral = async () => {
    try {
      await onActualizarProrrateoEnInventario(costoFijoProrrateadoUnitarioReal);
      audioFeedback.playPosSaleSuccess();
      setMensajeFeedback(`✨ ¡Prorrateo de +$${costoFijoProrrateadoUnitarioReal}/unidad aplicado con éxito a los ${productos.length} productos!`);
      setTimeout(() => setMensajeFeedback(null), 4000);
    } catch (e) {
      console.error('Error aplicando prorrateo:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* HUD SUPERIOR: ENCABEZADO Y SELECTOR DE PERÍODO */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1E293B] bg-[#0A0D16] p-5 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-mono tracking-tight text-white">
                Contador Virtual & Finanzas Reales
              </h2>
              <Badge variant="amber" className="text-[10px] px-2 py-0.5 uppercase tracking-wider font-mono font-extrabold">
                NOST-IA SOVEREIGN
              </Badge>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Control de gastos operativos, prorrateo de costos en precios de venta y cálculo exacto del punto de equilibrio.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Mes */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-300">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <span className="text-slate-400">Período:</span>
            <input
              type="month"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
            />
          </div>

          {/* Botón Maestro: Subir Factura de Gasto Fijo */}
          <Button
            variant="cyber"
            size="sm"
            onClick={() => onOpenInvoiceModal('gasto_operativo')}
            icon={<Receipt className="h-4 w-4 text-black" />}
            className="font-bold shadow-[0_0_15px_rgba(0,255,135,0.25)]"
            title="Subir factura de luz, gas, internet, alquiler o sueldos (cero impacto en stock)"
          >
            Subir Factura de Gasto Fijo
          </Button>

          {/* Botón: Cargar Gasto Manual */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFormManual(!mostrarFormManual)}
            icon={<Plus className="h-4 w-4 text-amber-400" />}
            className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-mono"
            title="Registrar gasto menor o recibo en efectivo"
          >
            Gasto Manual
          </Button>

          {/* Botón: Simulador de Sensibilidad */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarSimulador(!mostrarSimulador)}
            icon={<Sliders className="h-4 w-4 text-[#00D2FF]" />}
            className="border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 font-mono"
            title="Simular aumentos de luz, alquiler o inflación sobre los precios"
          >
            Simulador "¿Qué pasa si...?"
          </Button>
        </div>
      </div>

      {/* BANNER DE RETROALIMENTACIÓN */}
      {mensajeFeedback && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/60 bg-emerald-950/40 p-3.5 text-xs font-mono font-bold text-emerald-300 animate-fade-in shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{mensajeFeedback}</span>
        </div>
      )}

      {/* FORMULARIO DE CARGA DE GASTO MANUAL EN EFECTIVO (COLAPSIBLE) */}
      {mostrarFormManual && (
        <form
          onSubmit={handleGuardarGastoManual}
          className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
            <h3 className="text-sm font-bold font-mono text-amber-300 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Registrar Gasto Operativo Manual (Efectivo / Sin PDF)
            </h3>
            <span className="text-[11px] font-mono text-amber-200/70">
              Impactará en el resumen del mes {mesSeleccionado} sin alterar existencias de mercadería.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Categoría</label>
              <select
                value={categoriaManual}
                onChange={(e) => setCategoriaManual(e.target.value as CategoriaGastoFijo)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="luz">⚡ Luz y Electricidad</option>
                <option value="alquiler">🏢 Alquiler Comercial</option>
                <option value="salarios">👥 Salarios y Sueldos</option>
                <option value="gas">🔥 Gas Natural / Envasado</option>
                <option value="agua">💧 Agua y Saneamiento</option>
                <option value="internet">🌐 Internet y Telefonía</option>
                <option value="mantenimiento">🔧 Mantenimiento</option>
                <option value="impuestos_tasas">🏛️ Tasas e Impuestos</option>
                <option value="otros">📦 Otros Gastos</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Proveedor / Prestador</label>
              <input
                type="text"
                placeholder="Ej. Edenor, Metrogas, Don Carlos Plomero"
                value={proveedorManual}
                onChange={(e) => setProveedorManual(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">N° Comprobante / Recibo</label>
              <input
                type="text"
                placeholder="Ej. REC-0012 o N° Factura"
                value={comprobanteManual}
                onChange={(e) => setComprobanteManual(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Importe Total ($)</label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Ej. 45000"
                value={montoManual || ''}
                onChange={(e) => setMontoManual(Number(e.target.value))}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-amber-300 font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Notas / Observaciones (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Pago de reparaciones de persiana en efectivo"
              value={observacionesManual}
              onChange={(e) => setObservacionesManual(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-slate-300 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setMostrarFormManual(false)}
            >
              Cancelar
            </Button>
            <Button variant="cyber" size="sm" type="submit">
              Guardar Gasto Fijo
            </Button>
          </div>
        </form>
      )}

      {/* PANEL ESTADO DE RESULTADOS REAL DEL MES (ESTADO CONTABLE) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 1. Facturación Bruta */}
        <div className="rounded-2xl border border-cyan-500/30 bg-[#0C101A] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
            <span>Facturación del Mes</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-white">
            ${totalVentasBrutasMes.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            {unidadesVendidasMes} unidades despachadas ({ventasDelMes.length} operaciones)
          </div>
        </div>

        {/* 2. Margen Bruto Comercial */}
        <div className="rounded-2xl border border-[#00FF87]/30 bg-[#0C101A] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-[#00FF87]">
            <span>Margen Bruto (Ventas - CMV)</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-[#00FF87]">
            ${estadoResultados.margenBrutoPesos.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            {estadoResultados.margenBrutoPorcentaje}% de ganancia bruta sobre ventas
          </div>
        </div>

        {/* 3. Gastos Fijos Operativos */}
        <div className="rounded-2xl border border-amber-500/30 bg-[#0C101A] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-amber-400">
            <span>Gastos Fijos del Mes</span>
            <Building className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-amber-300">
            ${totalGastosMes.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            {gastosDelMes.length} comprobantes cargados en {mesSeleccionado}
          </div>
        </div>

        {/* 4. Resultado Neto Real (Bolsillo Limpio) */}
        <div
          className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
            estadoResultados.resultadoNetoRealPesos >= 0
              ? 'border-emerald-500/50 bg-emerald-950/20'
              : 'border-rose-500/50 bg-rose-950/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span
              className={
                estadoResultados.resultadoNetoRealPesos >= 0
                  ? 'text-emerald-400 font-bold'
                  : 'text-rose-400 font-bold'
              }
            >
              Resultado Neto Real (Bolsillo)
            </span>
            {estadoResultados.resultadoNetoRealPesos >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <div
            className={`mt-2 text-2xl font-mono font-bold ${
              estadoResultados.resultadoNetoRealPesos >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {estadoResultados.resultadoNetoRealPesos >= 0 ? '+' : ''}$
            {estadoResultados.resultadoNetoRealPesos.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] font-mono text-slate-300 mt-1">
            {estadoResultados.resultadoNetoRealPorcentaje}% ganancia neta real post-gastos
          </div>
        </div>
      </div>

      {/* VEREDICTO DEL CONTADOR VIRTUAL SOBERANO */}
      <div
        className={`rounded-2xl border p-4.5 font-mono text-xs flex items-start gap-3.5 backdrop-blur-md shadow-xl ${
          estadoResultados.estadoSalud === 'superavit_saludable'
            ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
            : estadoResultados.estadoSalud === 'zona_equilibrio'
            ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
            : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
        }`}
      >
        <div className="p-2 rounded-xl bg-black/40 border border-white/10 shrink-0">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold uppercase tracking-wide text-white text-sm">
              Diagnóstico Contable y Financiero • Mes {mesSeleccionado}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-extrabold uppercase bg-white/10 text-white border border-white/20">
              Cobertura de Fijos: {estadoResultados.coberturaPuntoEquilibrioPorcentaje}%
            </span>
          </div>
          <p className="mt-1.5 leading-relaxed text-slate-100 font-sans sm:font-mono text-xs">
            {estadoResultados.veredictoContador}
          </p>
        </div>
      </div>

      {/* SECCIÓN PUNTO DE EQUILIBRIO & PRORRATEO UNITARIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Punto de Equilibrio (Break-Even) */}
        <div className="lg:col-span-6 rounded-2xl border border-[#1E293B] bg-[#0A0D16] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Scale className="h-4 w-4 text-cyan-400" />
              Punto de Equilibrio (Supervivencia Comercial)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Mínimo para no ganar ni perder
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-slate-800 bg-[#07090F] p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Facturación Mínima</span>
              <div className="text-lg font-mono font-bold text-cyan-300 mt-1">
                ${puntoEquilibrio.puntoEquilibrioPesos.toLocaleString('es-AR')}
              </div>
              <span className="text-[10px] font-mono text-slate-500">Requerido por mes</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#07090F] p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Unidades Mínimas</span>
              <div className="text-lg font-mono font-bold text-amber-300 mt-1">
                {puntoEquilibrio.puntoEquilibrioUnidades.toLocaleString('es-AR')} unid.
              </div>
              <span className="text-[10px] font-mono text-slate-500">Para cubrir fijos</span>
            </div>
          </div>

          {/* Barra de Progreso del Punto de Equilibrio */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Progreso hacia el Break-Even:</span>
              <span className="font-bold text-white">
                ${totalVentasBrutasMes.toLocaleString('es-AR')} / ${puntoEquilibrio.puntoEquilibrioPesos.toLocaleString('es-AR')} (
                {Math.round((totalVentasBrutasMes / Math.max(1, puntoEquilibrio.puntoEquilibrioPesos)) * 100)}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalVentasBrutasMes >= puntoEquilibrio.puntoEquilibrioPesos
                    ? 'bg-gradient-to-r from-emerald-500 to-[#00FF87]'
                    : 'bg-gradient-to-r from-amber-500 to-cyan-400'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((totalVentasBrutasMes / Math.max(1, puntoEquilibrio.puntoEquilibrioPesos)) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[11px] font-mono text-slate-400 italic">
              {totalVentasBrutasMes >= puntoEquilibrio.puntoEquilibrioPesos
                ? '🎉 ¡Punto de equilibrio superado! A partir de aquí cada venta aporta ganancia neta libre de gastos fijos.'
                : `Faltan $${Math.max(0, puntoEquilibrio.puntoEquilibrioPesos - totalVentasBrutasMes).toLocaleString('es-AR')} para cubrir los costos fijos totales.`}
            </p>
          </div>
        </div>

        {/* Tarjeta de Absorción & Prorrateo de Costo Fijo */}
        <div className="lg:col-span-6 rounded-2xl border border-amber-500/30 bg-[#0A0D16] p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-amber-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Costo Fijo Prorrateado por Unidad
              </h3>
              <Badge variant="amber" className="text-[10px] font-mono">
                Incidencia Fija
              </Badge>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Cada producto que vendes debe absorber esta cantidad exacta para pagar alquiler, sueldos y servicios.
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-slate-400">Absorción Contable por Unidad:</span>
              <div className="text-3xl font-mono font-extrabold text-[#00FF87] mt-1">
                +${costoFijoProrrateadoUnitarioReal.toFixed(2)}
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Calculado sobre ${totalGastosMes.toLocaleString('es-AR')} en {unidadesBaseProrrateo} unidades estimadas
              </span>
            </div>

            <Button
              variant="cyber"
              size="sm"
              onClick={handleAplicarProrrateoGeneral}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              className="font-bold text-xs"
              title="Aplica este costo prorrateado a todos los productos del inventario"
            >
              Prorratear en Catálogo
            </Button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 leading-relaxed border-t border-slate-800 pt-2">
            💡 <strong>Regla de Oro Contable:</strong> Costo Total Real = Costo de Compra + Gasto Fijo Prorrateado. Si vendes por debajo del Costo Total Real, estás perdiendo dinero aunque veas margen sobre la compra.
          </div>
        </div>
      </div>

      {/* SIMULADOR DE SENSIBILIDAD "¿QUÉ PASA SI...?" (COLAPSIBLE) */}
      {mostrarSimulador && (
        <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/20 p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
            <h3 className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-2">
              <Sliders className="h-4 w-4" /> Simulador de Escenarios Financieros e Inflación
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Anticípate a aumentos de tarifas o caída de ventas antes de que sucedan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Variación en Gastos Fijos (Tarifazo de luz / Alquiler):</span>
                <strong className={simuladorVariacionCostosPorc > 0 ? 'text-amber-400' : 'text-slate-300'}>
                  {simuladorVariacionCostosPorc > 0 ? '+' : ''}{simuladorVariacionCostosPorc}%
                </strong>
              </div>
              <input
                type="range"
                min="-50"
                max="100"
                step="5"
                value={simuladorVariacionCostosPorc}
                onChange={(e) => setSimuladorVariacionCostosPorc(Number(e.target.value))}
                className="w-full cursor-pointer accent-[#00D2FF]"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>-50%</span>
                <span>Actual (0%)</span>
                <span>+50%</span>
                <span>+100%</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Variación en Volumen de Unidades Vendidas:</span>
                <strong className={simuladorVariacionVentasPorc < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {simuladorVariacionVentasPorc > 0 ? '+' : ''}{simuladorVariacionVentasPorc}%
                </strong>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={simuladorVariacionVentasPorc}
                onChange={(e) => setSimuladorVariacionVentasPorc(Number(e.target.value))}
                className="w-full cursor-pointer accent-[#00FF87]"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>-50% (Recesión)</span>
                <span>Actual (0%)</span>
                <span>+50% (Boom)</span>
              </div>
            </div>
          </div>

          {/* Resultado Simulado */}
          {(() => {
            const fijosSimulados = totalGastosMes * (1 + simuladorVariacionCostosPorc / 100);
            const unidadesSimuladas = Math.max(1, unidadesBaseProrrateo * (1 + simuladorVariacionVentasPorc / 100));
            const prorrateoSimulado = Math.round((fijosSimulados / unidadesSimuladas) * 100) / 100;
            const difProrrateo = prorrateoSimulado - costoFijoProrrateadoUnitarioReal;

            return (
              <div className="rounded-xl border border-cyan-500/30 bg-black/40 p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                <div>
                  <span className="text-slate-400">Gastos Fijos Simulados:</span>
                  <div className="text-base font-bold text-white">
                    ${Math.round(fijosSimulados).toLocaleString('es-AR')} / mes
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Nuevo Prorrateo Unitario:</span>
                  <div className="text-xl font-bold text-[#00FF87]">
                    +${prorrateoSimulado.toFixed(2)} / unid.
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Impacto en Precios:</span>
                  <div className={`text-base font-bold ${difProrrateo > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {difProrrateo > 0 ? `Debes subir +$${difProrrateo.toFixed(2)} por producto para no perder plata.` : 'Mayor margen de resguardo.'}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* DESGLOSE POR CATEGORÍA DE GASTO Y COMPROBANTES CARGADOS */}
      <div className="rounded-2xl border border-[#1E293B] bg-[#0A0D16] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div>
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-amber-400" />
              Desglose de Gastos Operativos por Rubro ({mesSeleccionado})
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Total computado en el mes: ${totalGastosMes.toLocaleString('es-AR')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenInvoiceModal('gasto_operativo')}
            className="cursor-pointer text-xs font-mono font-bold text-[#00FF87] hover:underline flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar Comprobante de Gasto
          </button>
        </div>

        {/* Tarjetas de Categorías */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.entries(desgloseCategorias) as [string, { label: string; icon: any; total: number; color: string }][]).map(([catKey, cat]) => {
            const IconComp = cat.icon;
            const porcSobreTotal =
              totalGastosMes > 0 ? Math.round((cat.total / totalGastosMes) * 100) : 0;

            return (
              <div
                key={catKey}
                className="rounded-xl border border-slate-800 bg-[#07090F] p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 truncate" title={cat.label}>
                    {cat.label}
                  </span>
                  <IconComp className={`h-4 w-4 ${cat.color}`} />
                </div>
                <div className="mt-2 text-base font-mono font-bold text-white">
                  ${cat.total.toLocaleString('es-AR')}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  {porcSobreTotal}% de los gastos
                </div>
              </div>
            );
          })}
        </div>

        {/* Listado de Facturas y Comprobantes de Gastos del Mes */}
        <div className="pt-2">
          <h4 className="text-xs font-bold font-mono text-slate-300 mb-2">
            Comprobantes de Gastos Registrados en el Mes ({gastosDelMes.length})
          </h4>

          {gastosDelMes.length === 0 ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-6 text-center text-xs font-mono text-slate-400">
              <p>No hay facturas de servicios ni comprobantes cargados para el mes {mesSeleccionado}.</p>
              <p className="mt-1 text-slate-500 text-[11px]">
                Puedes hacer clic en <strong>"Subir Factura de Gasto Fijo"</strong> para escanear facturas de Edenor, Metrogas, Telecom, recibos de sueldo o alquileres sin afectar el inventario.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0E121E] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Emisor / Prestador</th>
                    <th className="p-3">N° Comprobante</th>
                    <th className="p-3 text-right">Monto Total</th>
                    <th className="p-3">Observaciones</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-[#07090F]">
                  {gastosDelMes.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-slate-400">
                        {new Date(g.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="p-3">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
                          {g.categoriaGasto}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white">{g.proveedor}</td>
                      <td className="p-3 text-slate-300">{g.comprobante || 'S/N'}</td>
                      <td className="p-3 text-right font-bold text-amber-300">
                        ${g.montoTotal.toLocaleString('es-AR')}
                      </td>
                      <td className="p-3 text-slate-400 truncate max-w-xs" title={g.observaciones}>
                        {g.observaciones || g.archivoOrigenNombre || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleEliminarGasto(g.id, g.proveedor)}
                          className="cursor-pointer text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                          title="Eliminar comprobante"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* TABLA COMPARATIVA DE PRORRATEO EN LOS PRECIOS FINALES DE PRODUCTOS */}
      <div className="rounded-2xl border border-[#1E293B] bg-[#0A0D16] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
          <div>
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#00FF87]" />
              Impacto del Prorrateo en Precios de Venta y Margen Neto Real
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Evaluación de rentabilidad real de cada artículo considerando el costo de reposición + absorción fija (+${costoFijoProrrateadoUnitarioReal}/unid).
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador de Producto */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar producto o código..."
                value={filtroProducto}
                onChange={(e) => setFiltroProducto(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3 py-1 font-mono text-xs text-white placeholder-slate-500 focus:border-[#00FF87] focus:outline-none"
              />
            </div>

            {/* Filtro de Estado de Rentabilidad */}
            <select
              value={filtroRentabilidad}
              onChange={(e) => setFiltroRentabilidad(e.target.value as any)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 font-mono text-xs text-slate-200 focus:border-[#00FF87] focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Estados ({productosConProrrateo.length})</option>
              <option value="perdida">🔴 A Pérdida ({productosConProrrateo.filter((p) => p.estadoRentabilidad === 'perdida').length})</option>
              <option value="ajustado">🟡 Margen Ajustado ({productosConProrrateo.filter((p) => p.estadoRentabilidad === 'ajustado').length})</option>
              <option value="rentable">🟢 Rentables ({productosConProrrateo.filter((p) => p.estadoRentabilidad === 'rentable').length})</option>
            </select>
          </div>
        </div>

        {/* Tabla de Productos con Desglose */}
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0D111A] text-slate-400 uppercase tracking-wider border-b border-[#1E293B] sticky top-0 z-10">
              <tr>
                <th className="p-3">Producto / Artículo</th>
                <th className="p-3 text-right">Costo Compra</th>
                <th className="p-3 text-right text-amber-400">+ Gasto Fijo</th>
                <th className="p-3 text-right text-cyan-300">Costo Total Real</th>
                <th className="p-3 text-right">Precio Mostrador</th>
                <th className="p-3 text-right">Margen Limpio</th>
                <th className="p-3 text-right text-emerald-400">Precio Sugerido</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] bg-[#07090F]">
              {productosFiltrados.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-white truncate max-w-xs" title={prod.nombre}>
                      {prod.nombre}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      EAN: {prod.codigoBarras} • Stock: {prod.stockActual}
                    </span>
                  </td>

                  <td className="p-3 text-right text-slate-300">
                    ${prod.costoDirecto.toLocaleString('es-AR')}
                  </td>

                  <td className="p-3 text-right font-bold text-amber-400">
                    +${prod.costoFijoProrrateado.toFixed(2)}
                  </td>

                  <td className="p-3 text-right font-bold text-cyan-300">
                    ${prod.costoTotalReal.toFixed(2)}
                  </td>

                  <td className="p-3 text-right font-extrabold text-white">
                    ${prod.precioVenta.toLocaleString('es-AR')}
                  </td>

                  <td className="p-3 text-right font-bold">
                    <span
                      className={
                        prod.gananciaLimpiaPesos >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {prod.gananciaLimpiaPesos >= 0 ? '+' : ''}${Math.round(prod.gananciaLimpiaPesos).toLocaleString('es-AR')}{' '}
                      ({prod.margenNetoLimpioPorcentaje}%)
                    </span>
                  </td>

                  <td className="p-3 text-right font-bold text-emerald-300">
                    ${prod.precioSugerido.toLocaleString('es-AR')}
                  </td>

                  <td className="p-3 text-center">
                    {prod.estadoRentabilidad === 'perdida' ? (
                      <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                        🔴 A Pérdida
                      </span>
                    ) : prod.estadoRentabilidad === 'ajustado' ? (
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                        🟡 Ajustado
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                        🟢 Rentable
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-mono">
                    No se encontraron productos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
