import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Package,
  Edit2,
  Trash2,
  CheckCircle,
  TrendingDown,
  ArrowUpDown,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { EstadoStockBadge, Badge } from '../ui/Badge';
import type { Producto, EstadoAlertaStock } from '../../types';

interface InventoryTableProps {
  productos: Producto[];
  onUpdateProducto: (producto: Producto) => void;
  onDeleteProducto: (id: string) => void;
  onOpenCostModal: () => void;
  onOpenBulkModal: () => void;
  onOpenInvoiceModal: () => void;
  onOpenScannerModal: () => void;
  onAddManualProducto: () => void;
  onOpenReporteModal?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  productos,
  onUpdateProducto,
  onDeleteProducto,
  onOpenCostModal,
  onOpenBulkModal,
  onOpenInvoiceModal,
  onOpenScannerModal,
  onAddManualProducto,
  onOpenReporteModal,
}) => {
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroAlerta, setFiltroAlerta] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [ordenCampo, setOrdenCampo] = useState<keyof Producto>('nombre');
  const [ordenAsc, setOrdenAsc] = useState<boolean>(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<number>(0);
  const [tempPrecioVenta, setTempPrecioVenta] = useState<number>(0);

  // Categorías únicas
  const categorias = ['todas', ...Array.from(new Set(productos.map((p) => p.categoria)))];

  const handleOrdenar = (campo: keyof Producto) => {
    if (ordenCampo === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenCampo(campo);
      setOrdenAsc(true);
    }
  };

  const productosFiltrados = productos
    .filter((p) => {
      if (filtroAlerta !== 'todos' && p.estadoAlerta !== filtroAlerta) return false;
      if (filtroCategoria !== 'todas' && p.categoria !== filtroCategoria) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.codigoBarras.includes(q) ||
          p.proveedor.toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[ordenCampo];
      const bVal = b[ordenCampo];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return ordenAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return ordenAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const iniciarEdicionRapida = (p: Producto) => {
    setEditandoId(p.id);
    setTempStock(p.stockActual);
    setTempPrecioVenta(p.precioVenta);
  };

  const guardarEdicionRapida = (p: Producto) => {
    onUpdateProducto({
      ...p,
      stockActual: tempStock,
      stockTienda: Math.round(tempStock * 0.7),
      stockDeposito: Math.round(tempStock * 0.3),
      precioVenta: tempPrecioVenta,
      fechaActualizacion: new Date().toISOString(),
    });
    setEditandoId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Acciones y Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative min-w-[280px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por producto, EAN-13, rubro o proveedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-[#00FF87] focus:outline-none"
          />
        </div>

        {/* Filtros de Alerta & Categoría */}
        <div className="flex items-center gap-2">
          <select
            value={filtroAlerta}
            onChange={(e) => setFiltroAlerta(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-300 focus:border-[#00FF87] focus:outline-none"
          >
            <option value="todos">Todos los Estados</option>
            <option value="critico">🚨 Quiebre Crítico</option>
            <option value="medio">⚠️ Stock Medio</option>
            <option value="optimo">✅ Stock Óptimo</option>
            <option value="sobrestock">📦 Sobrestock</option>
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-300 focus:border-[#00FF87] focus:outline-none"
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c === 'todas' ? 'Todas las Categorías' : c}
              </option>
            ))}
          </select>
        </div>

        {/* Botones de Acción Rápida */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenReporteModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenReporteModal}
              icon={<Printer className="h-4 w-4 text-[#00D2FF]" />}
              title="Generar Reporte PDF A4 para Impresora de Quiebres y Compras"
              className="border-cyan-500/40 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-500/20"
            >
              Reporte PDF Compras
            </Button>
          )}

          <Button variant="cyber" size="sm" onClick={onOpenCostModal}>
            Estrategia de Costos & Precios
          </Button>

          <Button variant="secondary" size="sm" onClick={onOpenInvoiceModal}>
            Cargar Factura
          </Button>

          <Button variant="secondary" size="sm" onClick={onOpenBulkModal}>
            Importar CSV
          </Button>

          <Button variant="primary" size="sm" onClick={onAddManualProducto} icon={<Plus className="h-4 w-4" />}>
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Tabla Interactiva de Alta Velocidad */}
      <div className="overflow-x-auto rounded-xl border border-[#1E293B] bg-[#0E111A] shadow-xl">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-[#1E293B] bg-[#12151E] text-slate-400 uppercase tracking-wider">
            <tr>
              <th
                onClick={() => handleOrdenar('codigoBarras')}
                className="cursor-pointer p-3 hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Código EAN-13</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3 hover:text-white">
                <span>SKU</span>
              </th>
              <th
                onClick={() => handleOrdenar('nombre')}
                className="cursor-pointer p-3 hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Producto & Categoría</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleOrdenar('precioCosto')}
                className="cursor-pointer p-3 text-right hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Costo Unit.</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleOrdenar('precioVenta')}
                className="cursor-pointer p-3 text-right hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>P. Venta</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleOrdenar('stockActual')}
                className="cursor-pointer p-3 text-center hover:text-white"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Stock (Tda / Dep)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3 text-center">Mínimo</th>
              <th
                onClick={() => handleOrdenar('diasAgotamiento')}
                className="cursor-pointer p-3 text-center hover:text-white"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Días Restantes</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3 text-center">Alerta</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {productosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500 font-mono">
                  No se encontraron productos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              productosFiltrados.map((p) => {
                const esCritico = p.estadoAlerta === 'critico';
                const estaEditando = editandoId === p.id;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      esCritico
                        ? 'bg-[#FF2E93]/5 hover:bg-[#FF2E93]/10'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Código de Barras */}
                    <td className="p-3 font-semibold text-slate-300">
                      <span className="font-mono text-[11px] text-slate-400 block">{p.codigoBarras}</span>
                    </td>

                    {/* SKU Comercial */}
                    <td className="p-3 font-mono text-xs text-amber-300 font-semibold">
                      {p.sku || <span className="text-slate-600 font-normal">-</span>}
                    </td>

                    {/* Nombre y Categoría */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{p.nombre}</span>
                        {p.alertaFacturaDuplicada && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300 border border-amber-500/40 shrink-0"
                            title={`Mercadería incorporada desde factura duplicada: ${p.alertaFacturaDuplicada}`}
                          >
                            ⚠️ Factura Dup
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-[#00D2FF]">{p.categoria}</span>
                        <span>•</span>
                        <span>Prov: {p.proveedor}</span>
                      </div>
                    </td>

                    {/* Precio Costo */}
                    <td className="p-3 text-right text-slate-300">
                      ${p.precioCosto.toLocaleString('es-AR')}
                    </td>

                    {/* Precio Venta */}
                    <td className="p-3 text-right font-bold text-[#00FF87]">
                      {estaEditando ? (
                        <input
                          type="number"
                          value={tempPrecioVenta}
                          onChange={(e) => setTempPrecioVenta(parseFloat(e.target.value) || 0)}
                          className="w-20 rounded border border-[#00FF87] bg-slate-950 px-1 py-0.5 text-right text-white"
                        />
                      ) : (
                        `$${p.precioVenta.toLocaleString('es-AR')}`
                      )}
                    </td>

                    {/* Stock Actual (Tienda / Depósito) */}
                    <td className="p-3 text-center">
                      {estaEditando ? (
                        <input
                          type="number"
                          value={tempStock}
                          onChange={(e) => setTempStock(parseInt(e.target.value) || 0)}
                          className="w-16 rounded border border-[#00FF87] bg-slate-950 px-1 py-0.5 text-center text-white"
                        />
                      ) : (
                        <div>
                          <span
                            className={`font-bold ${
                              esCritico ? 'text-[#FF2E93]' : 'text-white'
                            }`}
                          >
                            {p.stockActual}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            ({p.stockTienda} tda / {p.stockDeposito} dep)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Stock Mínimo */}
                    <td className="p-3 text-center text-slate-400">{p.stockMinimo}</td>

                    {/* Días Agotamiento */}
                    <td className="p-3 text-center">
                      <span
                        className={`font-bold ${
                          p.diasAgotamiento <= 5
                            ? 'text-[#FF2E93]'
                            : p.diasAgotamiento <= 14
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {p.diasAgotamiento} d
                      </span>
                    </td>

                    {/* Estado Alerta */}
                    <td className="p-3 text-center">
                      <EstadoStockBadge estado={p.estadoAlerta} dias={p.diasAgotamiento} />
                    </td>

                    {/* Acciones */}
                    <td className="p-3 text-right">
                      {estaEditando ? (
                        <button
                          onClick={() => guardarEdicionRapida(p)}
                          className="cursor-pointer rounded bg-[#00FF87] px-2 py-1 text-black font-bold hover:bg-[#00e077]"
                        >
                          Listo
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => iniciarEdicionRapida(p)}
                            title="Editar stock o precio"
                            className="cursor-pointer p-1 text-slate-400 hover:text-white"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              onUpdateProducto({
                                ...p,
                                stockActual: p.stockActual + 5,
                                stockTienda: p.stockTienda + 3,
                                stockDeposito: p.stockDeposito + 2,
                                fechaActualizacion: new Date().toISOString(),
                              });
                            }}
                            title="Reposición rápida +5 unidades"
                            className="cursor-pointer rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-[#00FF87] hover:border-[#00FF87]"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar producto "${p.nombre}"?`)) {
                                onDeleteProducto(p.id);
                              }
                            }}
                            title="Eliminar producto"
                            className="cursor-pointer p-1 text-slate-500 hover:text-[#FF2E93]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
