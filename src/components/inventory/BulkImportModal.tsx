import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Producto } from '../../types';
import { audioFeedback } from '../../engine/audioFeedback';

interface BulkImportModalProps {
  onBulkAddProductos: (nuevosProductos: Producto[]) => void;
  onClose: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  onBulkAddProductos,
  onClose,
}) => {
  const [contenidoCsv, setContenidoCsv] = useState<string>('');
  const [errorParseo, setErrorParseo] = useState<string | null>(null);
  const [productosDetectados, setProductosDetectados] = useState<Producto[]>([]);
  const [procesadoExitoso, setProcesadoExitoso] = useState<boolean>(false);

  const handleDescargarPlantilla = () => {
    const csvContent =
      'codigo_barras,nombre,categoria,rubro,precio_costo,precio_venta,stock_actual,stock_minimo,proveedor\n' +
      '7790123456789,Fideos Guiseros 500g,Almacén Seco,Almacén,750,1200,30,10,Distribuidora Sur\n' +
      '7799876543210,Tomate Triturado Botella 1L,Conservas,Granja,980,1600,24,8,Huerta Orgánica UNLP\n' +
      '7791122334455,Azúcar Común Tipo A 1kg,Almacén Seco,Cooperativa,850,1350,50,15,Cooperativa Azucarera';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_stock_nost_ia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContenidoCsv(text);
      procesarTextoCsv(text);
    };
    reader.readAsText(file);
  };

  const procesarTextoCsv = (texto: string) => {
    setErrorParseo(null);
    try {
      const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lineas.length < 2) {
        throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos.');
      }

      const primerLinea = lineas[0].toLowerCase();
      const delimitador = primerLinea.includes(';') ? ';' : ',';
      const parsedProds: Producto[] = [];

      for (let i = 1; i < lineas.length; i++) {
        const fila = lineas[i].split(delimitador).map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (fila.length < 5) continue;

        const codigo = fila[0] || `779${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        const nombre = fila[1] || `Producto ${i}`;
        const categoria = fila[2] || 'General';
        const rubro = fila[3] || 'Almacén';
        const costo = parseFloat(fila[4].replace(/[^\d\.,]/g, '').replace(',', '.')) || 1000;
        const venta = parseFloat(fila[5]?.replace(/[^\d\.,]/g, '').replace(',', '.') || '0') || Math.round(costo * 1.4);
        const stock = parseInt(fila[6]) || 20;
        const stockMin = parseInt(fila[7]) || 10;
        const proveedor = fila[8] || 'Distribuidor';

        parsedProds.push({
          id: `prod-bulk-${Date.now()}-${i}`,
          codigoBarras: codigo,
          nombre,
          categoria,
          rubro,
          precioCosto: costo,
          precioVenta: venta,
          stockActual: stock,
          stockMinimo: stockMin,
          stockTienda: Math.round(stock * 0.7),
          stockDeposito: Math.round(stock * 0.3),
          rotacion: stock > 40 ? 'baja' : 'alta',
          proveedor,
          ventasUltimos30Dias: 15,
          diasAgotamiento: 25,
          estadoAlerta: stock <= stockMin ? 'critico' : 'optimo',
          unidadMedida: 'unidades',
          ivaPorcentaje: 21,
          fechaActualizacion: new Date().toISOString(),
        });
      }

      if (parsedProds.length === 0) {
        throw new Error('No se pudieron extraer filas de productos válidas.');
      }

      setProductosDetectados(parsedProds);
      audioFeedback.playBarcodeSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al parsear el archivo CSV';
      setErrorParseo(msg);
      setProductosDetectados([]);
    }
  };

  const handleConfirmarImportacion = () => {
    if (productosDetectados.length === 0) return;
    onBulkAddProductos(productosDetectados);
    audioFeedback.playPosSaleSuccess();
    setProcesadoExitoso(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-[#1E293B] bg-[#0E111A] p-6 text-[#F8FAFC] shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono uppercase tracking-wide text-white">
                Ingreso Masivo de Stock (CSV / Excel)
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Carga cientos de productos en segundos mediante archivo delimitado por comas o punto y coma
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {/* Zona de subida */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#141824] p-4 border border-[#1E293B]">
            <div>
              <span className="text-xs font-mono text-slate-300 font-semibold">¿Necesitas el formato estándar?</span>
              <p className="text-xs text-slate-400 font-mono">Descarga la plantilla con encabezados para completar en Excel</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDescargarPlantilla}
              icon={<Download className="h-4 w-4 text-[#00D2FF]" />}
            >
              Descargar Plantilla CSV
            </Button>
          </div>

          <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#1E293B] bg-[#12151E] p-6 text-center hover:border-[#00D2FF]/50 transition-all">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            />
            <Upload className="h-8 w-8 text-[#00D2FF] mb-2" />
            <span className="font-mono text-sm font-bold text-white">
              Haz clic o arrastra tu archivo CSV / Excel aquí
            </span>
            <span className="text-xs text-slate-400 font-mono mt-1">
              Separadores admitidos: coma (,) o punto y coma (;)
            </span>
          </div>

          {errorParseo && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs font-mono text-red-300">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{errorParseo}</span>
            </div>
          )}

          {productosDetectados.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#00FF87] font-semibold">
                  ✅ Se detectaron {productosDetectados.length} productos listos para importar:
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-[#1E293B] bg-[#090A0F] p-2">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-slate-400 border-b border-[#1E293B]">
                    <tr>
                      <th className="p-2">Código</th>
                      <th className="p-2">Producto</th>
                      <th className="p-2">Costo</th>
                      <th className="p-2">Venta</th>
                      <th className="p-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {productosDetectados.slice(0, 10).map((p) => (
                      <tr key={p.id} className="text-slate-300">
                        <td className="p-2 text-slate-400">{p.codigoBarras}</td>
                        <td className="p-2 font-medium text-white">{p.nombre}</td>
                        <td className="p-2">${p.precioCosto}</td>
                        <td className="p-2 text-[#00FF87]">${p.precioVenta}</td>
                        <td className="p-2 font-bold">{p.stockActual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmarImportacion}
                icon={<CheckCircle2 className="h-5 w-5" />}
              >
                {procesadoExitoso
                  ? '¡Productos Importados con Éxito!'
                  : `Confirmar e Importar ${productosDetectados.length} Productos`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
