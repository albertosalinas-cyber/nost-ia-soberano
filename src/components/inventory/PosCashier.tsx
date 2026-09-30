import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, DollarSign, BookOpen, Check, Printer, X, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { audioFeedback } from '../../engine/audioFeedback';
import type { Producto, ItemVenta, VentaPOS } from '../../types';

interface PosCashierProps {
  productos: Producto[];
  cartItems: ItemVenta[];
  onUpdateCart: (items: ItemVenta[]) => void;
  onCompletarVenta: (venta: VentaPOS) => void;
  onClose?: () => void;
}

export const PosCashier: React.FC<PosCashierProps> = ({
  productos,
  cartItems,
  onUpdateCart,
  onCompletarVenta,
  onClose,
}) => {
  const [busquedaProducto, setBusquedaProducto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'mercadopago' | 'fiado_libreta'>('efectivo');
  const [montoAbonado, setMontoAbonado] = useState<number>(0);
  const [nombreClienteFiado, setNombreClienteFiado] = useState<string>('');
  const [descuento, setDescuento] = useState<number>(0);
  const [ventaCompletada, setVentaCompletada] = useState<VentaPOS | null>(null);

  const subtotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const total = Math.max(0, subtotal - descuento);
  const vuelto = montoAbonado > total ? montoAbonado - total : 0;

  const agregarProductoAlCarrito = (prod: Producto) => {
    const existeIdx = cartItems.findIndex((it) => it.productoId === prod.id);
    if (existeIdx >= 0) {
      const actualizados = [...cartItems];
      const actual = actualizados[existeIdx];
      const nuevaCant = actual.cantidad + 1;
      actualizados[existeIdx] = {
        ...actual,
        cantidad: nuevaCant,
        subtotal: nuevaCant * actual.precioUnitario,
      };
      onUpdateCart(actualizados);
    } else {
      const nuevo: ItemVenta = {
        productoId: prod.id,
        codigoBarras: prod.codigoBarras,
        nombre: prod.nombre,
        cantidad: 1,
        precioUnitario: prod.precioVenta,
        subtotal: prod.precioVenta,
      };
      onUpdateCart([...cartItems, nuevo]);
    }
    audioFeedback.playBarcodeSuccess();
  };

  const modificarCantidad = (idx: number, delta: number) => {
    const actualizados = [...cartItems];
    const nuevaCant = actualizados[idx].cantidad + delta;
    if (nuevaCant <= 0) {
      actualizados.splice(idx, 1);
    } else {
      actualizados[idx] = {
        ...actualizados[idx],
        cantidad: nuevaCant,
        subtotal: nuevaCant * actualizados[idx].precioUnitario,
      };
    }
    onUpdateCart(actualizados);
  };

  const eliminarItem = (idx: number) => {
    const actualizados = cartItems.filter((_, i) => i !== idx);
    onUpdateCart(actualizados);
  };

  const handleCobrar = () => {
    if (cartItems.length === 0) return;
    if (metodoPago === 'fiado_libreta' && !nombreClienteFiado.trim()) {
      alert('Por favor ingrese el nombre del vecino para la libreta de fiado.');
      return;
    }

    const nuevaVenta: VentaPOS = {
      id: `vta-${Date.now()}`,
      fecha: new Date().toISOString(),
      items: [...cartItems],
      subtotal,
      descuento,
      total,
      metodoPago,
      nombreClienteFiado: metodoPago === 'fiado_libreta' ? nombreClienteFiado.trim() : undefined,
      montoAbonado: metodoPago === 'efectivo' ? montoAbonado || total : total,
      vuelto: metodoPago === 'efectivo' ? vuelto : 0,
    };

    onCompletarVenta(nuevaVenta);
    audioFeedback.playPosSaleSuccess();
    setVentaCompletada(nuevaVenta);
    onUpdateCart([]);
    setMontoAbonado(0);
    setNombreClienteFiado('');
  };

  const productosFiltrados = busquedaProducto.trim()
    ? productos
        .filter(
          (p) =>
            p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
            p.codigoBarras.includes(busquedaProducto)
        )
        .slice(0, 6)
    : [];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#1E293B] bg-[#0E111A] p-4 text-[#F8FAFC] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold tracking-wide text-white uppercase">
              Terminal POS de Caja Barrial (Punto de Venta)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Cobro ultra-rápido • Libreta de Fiado • Efectivo • Transferencias
            </span>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1 rounded-md">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Buscador de producto por nombre o código */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar producto por nombre o código de barras para sumar a la compra..."
          value={busquedaProducto}
          onChange={(e) => setBusquedaProducto(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-[#00FF87] focus:outline-none"
        />

        {productosFiltrados.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#1E293B] bg-[#12151E] p-1 shadow-2xl">
            {productosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  agregarProductoAlCarrito(p);
                  setBusquedaProducto('');
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded p-2 text-left text-xs font-mono hover:bg-[#1E293B]"
              >
                <div>
                  <span className="font-semibold text-white">{p.nombre}</span>
                  <span className="ml-2 text-slate-400 font-normal">Stock: {p.stockActual}</span>
                </div>
                <span className="font-bold text-[#00FF87]">${p.precioVenta.toLocaleString('es-AR')}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista del Carrito Actual */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#1E293B] bg-[#090A0F] p-3 max-h-56 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500">
            El carrito está vacío. Escaneá códigos con la cámara o buscá productos arriba.
          </div>
        ) : (
          cartItems.map((item, idx) => (
            <div
              key={`${item.productoId}-${idx}`}
              className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2 text-xs font-mono"
            >
              <div className="flex-1 truncate">
                <div className="truncate font-semibold text-white">{item.nombre}</div>
                <div className="text-[11px] text-slate-400">
                  ${item.precioUnitario.toLocaleString('es-AR')} c/u • {item.codigoBarras}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => modificarCantidad(idx, -1)}
                  className="cursor-pointer rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-7 text-center font-bold text-white">{item.cantidad}</span>
                <button
                  onClick={() => modificarCantidad(idx, 1)}
                  className="cursor-pointer rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="w-20 text-right font-bold text-[#00FF87]">
                ${item.subtotal.toLocaleString('es-AR')}
              </div>

              <button
                onClick={() => eliminarItem(idx)}
                className="cursor-pointer text-slate-500 hover:text-red-400 p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Métodos de Pago y Totales */}
      {cartItems.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#1E293B] bg-[#141824] p-3 font-mono text-xs">
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setMetodoPago('efectivo')}
              className={`cursor-pointer rounded-lg p-2 text-center transition-all ${
                metodoPago === 'efectivo'
                  ? 'border border-[#00FF87] bg-[#00FF87]/20 text-[#00FF87] font-bold'
                  : 'border border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              💵 Efectivo
            </button>
            <button
              onClick={() => setMetodoPago('transferencia')}
              className={`cursor-pointer rounded-lg p-2 text-center transition-all ${
                metodoPago === 'transferencia'
                  ? 'border border-[#00D2FF] bg-[#00D2FF]/20 text-[#00D2FF] font-bold'
                  : 'border border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              📲 QR / Transfer
            </button>
            <button
              onClick={() => setMetodoPago('mercadopago')}
              className={`cursor-pointer rounded-lg p-2 text-center transition-all ${
                metodoPago === 'mercadopago'
                  ? 'border border-sky-400 bg-sky-400/20 text-sky-300 font-bold'
                  : 'border border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              💳 MercadoPago
            </button>
            <button
              onClick={() => setMetodoPago('fiado_libreta')}
              className={`cursor-pointer rounded-lg p-2 text-center transition-all ${
                metodoPago === 'fiado_libreta'
                  ? 'border border-[#FF2E93] bg-[#FF2E93]/20 text-[#FF2E93] font-bold'
                  : 'border border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              📖 Fiado / Libreta
            </button>
          </div>

          {/* Opciones según método */}
          {metodoPago === 'efectivo' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[11px] text-slate-400">Paga con ($ ARS):</label>
                <input
                  type="number"
                  placeholder="Ej: 5000"
                  value={montoAbonado || ''}
                  onChange={(e) => setMontoAbonado(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Vuelto a entregar:</label>
                <div className="mt-1 font-bold text-base text-[#00FF87]">
                  ${vuelto.toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          )}

          {metodoPago === 'fiado_libreta' && (
            <div className="pt-2 border-t border-slate-800">
              <label className="text-[11px] text-[#FF2E93] font-bold">
                Nombre de Vecino / Titular de la Libreta:
              </label>
              <input
                type="text"
                placeholder="Ej: Doña Mabel (depto 3B) / Carlos el mecánico..."
                value={nombreClienteFiado}
                onChange={(e) => setNombreClienteFiado(e.target.value)}
                className="w-full mt-1 rounded border border-[#FF2E93]/50 bg-slate-900 px-2.5 py-1 text-white"
              />
            </div>
          )}

          {/* Total & Botón de Cobro */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div>
              <span className="text-slate-400 text-xs">Total Venta:</span>
              <div className="text-2xl font-black text-white">${total.toLocaleString('es-AR')}</div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleCobrar}
              icon={<Check className="h-5 w-5" />}
            >
              Registrar Cobro (${total.toLocaleString('es-AR')})
            </Button>
          </div>
        </div>
      )}

      {/* Ticket / Comprobante de Última Venta */}
      {ventaCompletada && (
        <div className="rounded-xl border border-[#00FF87]/40 bg-[#00FF87]/10 p-3 text-xs font-mono">
          <div className="flex items-center justify-between text-[#00FF87] font-bold mb-1">
            <span>✅ Venta {ventaCompletada.id} Registrada</span>
            <span className="text-white">${ventaCompletada.total.toLocaleString('es-AR')}</span>
          </div>
          <p className="text-slate-300">
            Método: <span className="uppercase font-semibold">{ventaCompletada.metodoPago.replace('_', ' ')}</span>
            {ventaCompletada.nombreClienteFiado && ` (Cliente: ${ventaCompletada.nombreClienteFiado})`}
          </p>
        </div>
      )}
    </div>
  );
};
