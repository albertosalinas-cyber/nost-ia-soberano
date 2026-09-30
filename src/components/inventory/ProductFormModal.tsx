import React, { useState } from 'react';
import { X, Sparkles, Barcode, Calculator, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Producto, EstrategiaCostos } from '../../types';
import { calcularDesglosePrecioProducto } from '../../engine/costCalculator';

interface ProductFormModalProps {
  producto?: Producto | null;
  estrategia: EstrategiaCostos;
  onSave: (prod: Producto) => void;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  producto,
  estrategia,
  onSave,
  onClose,
}) => {
  const [nombre, setNombre] = useState<string>(producto?.nombre || '');
  const [codigoBarras, setCodigoBarras] = useState<string>(
    producto?.codigoBarras || `779${Math.floor(1000000000 + Math.random() * 9000000000)}`
  );
  const [sku, setSku] = useState<string>(producto?.sku || '');
  const [categoria, setCategoria] = useState<string>(producto?.categoria || 'Almacén Seco');
  const [rubro, setRubro] = useState<string>(producto?.rubro || 'Almacén');
  const [proveedor, setProveedor] = useState<string>(producto?.proveedor || 'Distribuidora Central');
  const [unidadMedida, setUnidadMedida] = useState<Producto['unidadMedida']>(
    producto?.unidadMedida || 'unidades'
  );
  const [precioCosto, setPrecioCosto] = useState<number>(producto?.precioCosto || 1500);
  const [precioVenta, setPrecioVenta] = useState<number>(producto?.precioVenta || 2200);
  const [stockActual, setStockActual] = useState<number>(producto?.stockActual || 20);
  const [stockMinimo, setStockMinimo] = useState<number>(producto?.stockMinimo || 10);
  const [rotacion, setRotacion] = useState<Producto['rotacion']>(producto?.rotacion || 'alta');
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number>(producto?.ivaPorcentaje || 21);

  const desglose = calcularDesglosePrecioProducto(
    precioCosto,
    estrategia,
    estrategia.margenGananciaObjetivo,
    ivaPorcentaje
  );

  const handleAplicarPrecioSugerido = () => {
    setPrecioVenta(desglose.precioFinalSugerido);
  };

  const handleGenerarCodigo = () => {
    setCodigoBarras(`779${Math.floor(1000000000 + Math.random() * 9000000000)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const stockTda = Math.round(stockActual * 0.7);
    const stockDep = stockActual - stockTda;

    const prodGuardar: Producto = {
      id: producto?.id || `prod-${Date.now()}`,
      codigoBarras: codigoBarras.trim(),
      sku: sku.trim() || undefined,
      nombre: nombre.trim(),
      categoria: categoria.trim(),
      rubro: rubro.trim(),
      precioCosto,
      precioVenta,
      stockActual,
      stockMinimo,
      stockTienda: stockTda,
      stockDeposito: stockDep,
      rotacion,
      proveedor: proveedor.trim(),
      ventasUltimos30Dias: producto?.ventasUltimos30Dias || 15,
      diasAgotamiento: Math.round(stockActual / (15 / 30)),
      estadoAlerta: stockActual <= stockMinimo ? 'critico' : 'optimo',
      unidadMedida,
      ivaPorcentaje,
      costoFijoProrrateado: desglose.costoFijoProrrateado,
      margenSugerido: estrategia.margenGananciaObjetivo,
      fechaActualizacion: new Date().toISOString(),
    };

    onSave(prodGuardar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#1E293B] bg-[#0E111A] p-6 text-[#F8FAFC] shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <h2 className="text-base font-bold font-mono uppercase tracking-wide text-white">
            {producto ? 'Editar Ficha de Producto' : 'Nuevo Producto en Inventario Soberano'}
          </h2>
          <button onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400">Nombre del Producto *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Fideos Tallarines al Huevo 500g"
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-[#00FF87] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-slate-400">Código EAN-13 / Barra</label>
                <button
                  type="button"
                  onClick={handleGenerarCodigo}
                  className="cursor-pointer text-[10px] text-[#00D2FF] hover:underline"
                >
                  Generar Nuevo
                </button>
              </div>
              <input
                type="text"
                required
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-[#00FF87] focus:outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400">SKU (Código Interno / Alfanumérico)</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ej: HAR-000-50KG"
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400">Categoría</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400">Rubro</label>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
              >
                <option value="Almacén">Almacén</option>
                <option value="Granja">Granja</option>
                <option value="Cooperativa">Cooperativa</option>
                <option value="Taller">Taller</option>
                <option value="Cultivo">Cultivo</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400">Proveedor</label>
              <input
                type="text"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
              />
            </div>
          </div>

          {/* Desglose Táctico de Costos y Precios */}
          <div className="rounded-xl border border-[#1E293B] bg-[#141824] p-3 flex flex-col gap-2">
            <span className="text-[11px] text-[#00D2FF] font-semibold flex items-center gap-1">
              <Calculator className="h-3.5 w-3.5" /> Visión Táctica de Costo y Sugerencia de Precio
            </span>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400">Costo Compra ($)</label>
                <input
                  type="number"
                  min="0"
                  value={precioCosto}
                  onChange={(e) => setPrecioCosto(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400">IVA (%)</label>
                <select
                  value={ivaPorcentaje}
                  onChange={(e) => setIvaPorcentaje(parseFloat(e.target.value))}
                  className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                >
                  <option value={21}>21.0% (General)</option>
                  <option value={10.5}>10.5% (Harinas/Granos)</option>
                  <option value={0}>0% (Exento)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400">Precio Venta Final ($)</label>
                <input
                  type="number"
                  min="0"
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 rounded-lg border border-[#00FF87] bg-slate-900 px-2 py-1.5 text-[#00FF87] font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[#090A0F] p-2 text-[11px]">
              <div>
                <span className="text-slate-400">Sugerido con Prorrateo Fijo (+${desglose.costoFijoProrrateado}) y Margen:</span>
                <span className="ml-2 font-bold text-[#00FF87]">${desglose.precioFinalSugerido}</span>
              </div>
              <button
                type="button"
                onClick={handleAplicarPrecioSugerido}
                className="cursor-pointer rounded bg-[#00FF87]/20 border border-[#00FF87]/40 px-2 py-0.5 text-[#00FF87] hover:bg-[#00FF87]/30"
              >
                Aplicar Sugerido
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400">Stock Actual</label>
              <input
                type="number"
                min="0"
                value={stockActual}
                onChange={(e) => setStockActual(parseInt(e.target.value) || 0)}
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400">Stock Mínimo (Alerta)</label>
              <input
                type="number"
                min="1"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(parseInt(e.target.value) || 1)}
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400">Rotación</label>
              <select
                value={rotacion}
                onChange={(e) => setRotacion(e.target.value as any)}
                className="w-full mt-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
              >
                <option value="alta">Alta Rotación</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3 border-t border-[#1E293B] pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Producto
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
