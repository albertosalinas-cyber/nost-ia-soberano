import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Layers,
  Package,
  MapPin,
  Bot,
  Camera,
  ShoppingCart,
  BookOpen,
  DollarSign,
  AlertTriangle,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Settings,
  BarChart2,
  Activity,
  Globe2,
  FileSpreadsheet,
  Printer,
  Building,
  Award,
  HelpCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from './components/ui/Button';
import { MetricCard } from './components/ui/MetricCard';
import { Badge } from './components/ui/Badge';
import { MateSoberanoLogo } from './components/ui/MateSoberanoLogo';
import { SolidarityTicker } from './components/navigation/SolidarityTicker';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { InventoryTable } from './components/inventory/InventoryTable';
import { BarcodeCameraScanner } from './components/inventory/BarcodeCameraScanner';
import { PricingStrategyModal } from './components/inventory/PricingStrategyModal';
import { InvoiceReaderModal } from './components/inventory/InvoiceReaderModal';
import { InvoiceHistoryModal } from './components/inventory/InvoiceHistoryModal';
import { BulkImportModal } from './components/inventory/BulkImportModal';
import { ProductFormModal } from './components/inventory/ProductFormModal';
import { PosCashier } from './components/inventory/PosCashier';
import { ReporteComprasModal } from './components/inventory/ReporteComprasModal';
import { IntelligentBusinessHub } from './components/analytics/IntelligentBusinessHub';
import { FinancialIntelligenceHub } from './components/finanzas/FinancialIntelligenceHub';
import { LocalCopilotPanel } from './components/copilot/LocalCopilotPanel';
import { ManualSoberanoModal } from './components/guide/ManualSoberanoModal';
import { FilosofiaModal } from './components/guide/FilosofiaModal';
import { RoadmapModal } from './components/modals/RoadmapModal';
import { TechStackCreditBar } from './components/ui/TechStackCreditBar';
import { ReinicioSeguroModal } from './components/modals/ReinicioSeguroModal';
import { CierreDiaBackupModal } from './components/modals/CierreDiaBackupModal';
import { ActualizacionesSoberanasModal } from './components/modals/ActualizacionesSoberanasModal';
import { TroubleshootingModal } from './components/modals/TroubleshootingModal';
import {
  cotejarRenglonConCatalogo,
  desglosarCodigoYDescripcion,
  generarEan13Determinista,
} from './engine/productMatcher';
import {
  db,
  initializeDatabase,
  vaciarBaseDeDatosTotal,
  exportarBackupSoberano,
  importarBackupSoberano,
  importarArchivoBackup,
  guardarFacturaEnHistorial,
  obtenerHistorialFacturas,
  guardarRegistroAuditoria,
  guardarGastoOperativo,
  actualizarCostosFijosDesdeGastosBD,
  INITIAL_ESTRATEGIA_COSTOS,
} from './engine/db';
import { audioFeedback } from './engine/audioFeedback';
import { calcularTotalCostosFijos, calcularProrrateoUnitario } from './engine/costCalculator';
import type {
  Producto,
  PuntoTerritorial,
  EstrategiaCostos,
  ItemVenta,
  VentaPOS,
  FacturaItemExtraido,
  FacturaProcesadaHistorial,
  PerfilComercio,
  CategoriaGastoFijo,
  GastoOperativo,
  LicenciaSoberana,
} from './types';

export default function App() {
  // Estados de Base de Datos y Estado Global
  const [cargandoDb, setCargandoDb] = useState<boolean>(true);
  const [perfilComercio, setPerfilComercio] = useState<PerfilComercio | null>(null);
  const [licencia, setLicencia] = useState<LicenciaSoberana | null>(null);
  const [mostrarOnboarding, setMostrarOnboarding] = useState<boolean>(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [puntos, setPuntos] = useState<PuntoTerritorial[]>([]);
  const [estrategia, setEstrategia] = useState<EstrategiaCostos>(INITIAL_ESTRATEGIA_COSTOS);
  const [carritoPos, setCarritoPos] = useState<ItemVenta[]>([]);
  const [ventas, setVentas] = useState<VentaPOS[]>([]);

  // Pestaña Activa
  const [pestanaActiva, setPestanaActiva] = useState<'inventario' | 'analitica' | 'finanzas' | 'copiloto'>('inventario');

  // Modales
  const [mostrarScanner, setMostrarScanner] = useState<boolean>(false);
  const [mostrarPosModal, setMostrarPosModal] = useState<boolean>(false);
  const [mostrarCostModal, setMostrarCostModal] = useState<boolean>(false);
  const [mostrarInvoiceModal, setMostrarInvoiceModal] = useState<boolean>(false);
  const [modoInicialInvoice, setModoInicialInvoice] = useState<'compra_ingreso' | 'venta_egreso' | 'gasto_operativo'>('compra_ingreso');

  const handleAbrirInvoiceModal = (modo: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo' = 'compra_ingreso') => {
    setModoInicialInvoice(modo);
    setMostrarInvoiceModal(true);
  };
  const [mostrarBulkModal, setMostrarBulkModal] = useState<boolean>(false);
  const [mostrarProductForm, setMostrarProductForm] = useState<boolean>(false);
  const [productoAEditar, setProductoAEditar] = useState<Producto | null>(null);
  const [mostrarManual, setMostrarManual] = useState<boolean>(false);
  const [mostrarFilosofia, setMostrarFilosofia] = useState<boolean>(false);
  const [mostrarRoadmap, setMostrarRoadmap] = useState<boolean>(false);
  const [mostrarReporteModal, setMostrarReporteModal] = useState<boolean>(false);
  const [mostrarHistorialFacturasGeneral, setMostrarHistorialFacturasGeneral] = useState<boolean>(false);
  const [historialFacturasGlobal, setHistorialFacturasGlobal] = useState<FacturaProcesadaHistorial[]>([]);
  const [facturasDuplicadasCount, setFacturasDuplicadasCount] = useState<number>(0);
  const [mostrarModalReinicio, setMostrarModalReinicio] = useState<boolean>(false);
  const [mostrarCierreDiaBackup, setMostrarCierreDiaBackup] = useState<boolean>(false);
  const [mostrarActualizaciones, setMostrarActualizaciones] = useState<boolean>(false);
  const [mostrarTroubleshooting, setMostrarTroubleshooting] = useState<boolean>(false);

  // Offline Safety Guard: Monitor de conectividad de red
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Recarga del historial de facturas y auditoría de duplicados
  const recargarHistorialFacturas = useCallback(async () => {
    try {
      const historial = await obtenerHistorialFacturas();
      setHistorialFacturasGlobal(historial);
      setFacturasDuplicadasCount(historial.filter((f) => f.esDuplicada).length);
    } catch (e) {
      console.warn('Error al leer historial de facturas:', e);
    }
  }, []);

  // Notificación Toast HUD
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  const mostrarToast = useCallback((msg: string) => {
    setToastMensaje(msg);
    setTimeout(() => {
      setToastMensaje(null);
    }, 3500);
  }, []);

  // Carga reactiva de datos desde IndexedDB
  const cargarDatos = useCallback(async () => {
    try {
      await initializeDatabase();
      const prods = await db.productos.toArray();
      const pts = await db.puntosTerritoriales.toArray();
      const vts = await db.ventas.toArray();
      const cfg = await db.configuracion.get('estrategia_costos');
      const cfgPerfil = await db.configuracion.get('perfil_comercio');
      const cfgLic = await db.configuracion.get('licencia_soberana');

      setProductos(prods);
      setPuntos(pts);
      setVentas(vts);
      if (cfg && cfg.valor) {
        setEstrategia(cfg.valor);
      }
      if (cfgLic && cfgLic.valor && cfgLic.valor.activa) {
        setLicencia(cfgLic.valor);
      } else {
        setLicencia(null);
      }
      if (cfgPerfil && cfgPerfil.valor && cfgPerfil.valor.configurado) {
        setPerfilComercio(cfgPerfil.valor);
        setMostrarOnboarding(false);
      } else {
        // Primer inicio: abrir el Asistente de 5 pasos para configurar el comercio
        setMostrarOnboarding(true);
      }

      // Cargar historial de facturas procesadas
      await recargarHistorialFacturas();
    } catch (err) {
      console.error('Error cargando base de datos:', err);
    } finally {
      setCargandoDb(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Finalizar configuración inicial del comercio (Onboarding de 5 Pasos)
  const handleFinalizarOnboarding = async (
    nuevoPerfil: PerfilComercio,
    nuevosProductos: Producto[]
  ) => {
    await db.configuracion.put({ clave: 'perfil_comercio', valor: nuevoPerfil });
    setPerfilComercio(nuevoPerfil);
    setMostrarOnboarding(false);

    if (nuevosProductos && nuevosProductos.length > 0) {
      await db.productos.clear();
      await db.productos.bulkPut(nuevosProductos);
      setProductos(nuevosProductos);
    }

    mostrarToast(`✨ ¡NOST-IA Configurado! Bienvenido "${nuevoPerfil.nombreComercio}".`);
  };

  // Manejo de actualización de productos
  const handleUpdateProducto = async (prod: Producto) => {
    await db.productos.put(prod);
    setProductos((prev) => prev.map((p) => (p.id === prod.id ? prod : p)));
    mostrarToast(`Producto "${prod.nombre}" actualizado.`);
  };

  const handleDeleteProducto = async (id: string) => {
    await db.productos.delete(id);
    setProductos((prev) => prev.filter((p) => p.id !== id));
    mostrarToast('Producto eliminado del catálogo local.');
  };

  const handleSaveProductoManual = async (prod: Producto) => {
    await db.productos.put(prod);
    const existe = productos.some((p) => p.id === prod.id);
    if (existe) {
      setProductos((prev) => prev.map((p) => (p.id === prod.id ? prod : p)));
    } else {
      setProductos((prev) => [prod, ...prev]);
    }
    setMostrarProductForm(false);
    setProductoAEditar(null);
    audioFeedback.playPosSaleSuccess();
    mostrarToast(`✅ Producto "${prod.nombre}" guardado.`);
  };

  // Manejo de escaneo de código de barras
  const handleBarcodeDetected = (
    codigo: string,
    accion: 'stock_add' | 'pos_sale' | 'view'
  ) => {
    const prod = productos.find((p) => p.codigoBarras === codigo);

    if (accion === 'pos_sale') {
      if (prod) {
        // Sumar al carrito POS
        setCarritoPos((prev) => {
          const idx = prev.findIndex((it) => it.productoId === prod.id);
          if (idx >= 0) {
            const copia = [...prev];
            copia[idx].cantidad += 1;
            copia[idx].subtotal = copia[idx].cantidad * copia[idx].precioUnitario;
            return copia;
          }
          return [
            ...prev,
            {
              productoId: prod.id,
              codigoBarras: prod.codigoBarras,
              nombre: prod.nombre,
              cantidad: 1,
              precioUnitario: prod.precioVenta,
              subtotal: prod.precioVenta,
            },
          ];
        });
        mostrarToast(`🛒 ${prod.nombre} sumado a la venta POS.`);
      } else {
        mostrarToast(`⚠️ Código ${codigo} no encontrado. Creá el producto.`);
        setMostrarProductForm(true);
      }
    } else if (accion === 'stock_add') {
      if (prod) {
        const nuevoStock = prod.stockActual + 1;
        const actualizado: Producto = {
          ...prod,
          stockActual: nuevoStock,
          stockTienda: prod.stockTienda + 1,
          fechaActualizacion: new Date().toISOString(),
        };
        handleUpdateProducto(actualizado);
        mostrarToast(`📦 Stock +1 en "${prod.nombre}" (Total: ${nuevoStock})`);
      } else {
        mostrarToast(`⚠️ Código ${codigo} no encontrado. Creá el producto.`);
        setMostrarProductForm(true);
      }
    } else if (accion === 'view') {
      if (prod) {
        setProductoAEditar(prod);
        setMostrarProductForm(true);
      } else {
        mostrarToast(`Código ${codigo} no registrado.`);
      }
    }
  };

  // Guardar Estrategia de Costos & Precios
  const handleSaveEstrategia = async (nueva: EstrategiaCostos) => {
    setEstrategia(nueva);
    await db.configuracion.put({
      clave: 'estrategia_costos',
      valor: nueva,
    });
    mostrarToast('✅ Estrategia de costos y prorrateo guardada.');
  };

  const handleApplyPriceToProduct = async (productoId: string, nuevoPrecio: number) => {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return;
    const actualizado = { ...prod, precioVenta: nuevoPrecio };
    await handleUpdateProducto(actualizado);
    mostrarToast(`Precio de "${prod.nombre}" actualizado a $${nuevoPrecio}.`);
  };

  // Impacto directo desde el lector de facturas (Compras, Ventas o Gastos Fijos)
  const handleCommitInvoiceItems = async (
    items: FacturaItemExtraido[],
    tipoComprobante: string,
    origen: string,
    tipoOperacion: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo' = 'compra_ingreso',
    esDuplicada: boolean = false,
    motivoDuplicado?: string,
    archivoOrigenNombre?: string,
    categoriaGasto?: CategoriaGastoFijo,
    montoTotalGasto?: number
  ) => {
    // 1. RAMA GASTO OPERATIVO: CERO IMPACTO EN STOCK, SUMA A RESUMEN MENSUAL Y PRORRATEO
    if (tipoOperacion === 'gasto_operativo') {
      const montoTotal =
        montoTotalGasto && montoTotalGasto > 0
          ? montoTotalGasto
          : items.reduce((acc, it) => acc + (it.subtotal || it.cantidad * it.precioUnitario), 0);

      const nuevoGasto: GastoOperativo = {
        id: `gasto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fecha: new Date().toISOString(),
        periodoMes: new Date().toISOString().slice(0, 7),
        categoriaGasto: categoriaGasto || 'otros',
        proveedor: origen,
        comprobante: tipoComprobante,
        montoTotal,
        archivoOrigenNombre,
        impactaEnProrrateo: true,
      };

      await guardarGastoOperativo(nuevoGasto);
      const nuevaEstrategia = await actualizarCostosFijosDesdeGastosBD();
      setEstrategia(nuevaEstrategia);
      const nuevoProrrateo = calcularProrrateoUnitario(nuevaEstrategia);

      await guardarFacturaEnHistorial({
        id: `fac-hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fechaCarga: new Date().toISOString(),
        numeroComprobante: tipoComprobante,
        proveedorOEmisor: origen,
        tipo: 'remito',
        tipoOperacion: 'gasto_operativo',
        categoriaGasto,
        total: montoTotal,
        cantidadItems: 0,
        esDuplicada,
        motivoDuplicado,
        archivoOrigenNombre,
        items: [],
      });

      await recargarHistorialFacturas();
      audioFeedback.playPosSaleSuccess();
      mostrarToast(
        `🏢 Gasto Fijo (${categoriaGasto ? categoriaGasto.toUpperCase() : 'SERVICIO'}) registrado: $${montoTotal.toLocaleString('es-AR')}. Costo fijo unitario recalculado a +$${nuevoProrrateo.toFixed(2)}/unid. Cero impacto en inventario.`
      );
      return;
    }

    const productosActualizados = [...productos];
    let actualizadosCount = 0;
    let nuevosCount = 0;
    let totalDescontado = 0;

    if (tipoOperacion === 'venta_egreso') {
      // --- OPERACIÓN FACTURA DE VENTA: DESCUENTO DE STOCK Y REGISTRO DE VENTA ---
      for (const item of items) {
        const idx = productosActualizados.findIndex(
          (p) =>
            (item.coincidenciaProductoId && p.id === item.coincidenciaProductoId) ||
            (item.codigo && p.codigoBarras === item.codigo) ||
            p.nombre.toLowerCase().trim() === item.descripcion.toLowerCase().trim()
        );

        if (idx >= 0) {
          const actual = productosActualizados[idx];
          const nuevoStock = Math.max(0, actual.stockActual - item.cantidad);
          const nuevoTienda = Math.max(0, actual.stockTienda - item.cantidad);
          const nuevoDeposito = Math.max(0, nuevoStock - nuevoTienda);
          const nuevasVentas30d = (actual.ventasUltimos30Dias || 0) + item.cantidad;

          let estadoAlerta: 'optimo' | 'medio' | 'critico' | 'sobrestock' = 'optimo';
          if (nuevoStock <= 0 || nuevoStock <= actual.stockMinimo) {
            estadoAlerta = 'critico';
          } else if (nuevoStock <= actual.stockMinimo * 1.4) {
            estadoAlerta = 'medio';
          }

          productosActualizados[idx] = {
            ...actual,
            stockActual: nuevoStock,
            stockTienda: nuevoTienda,
            stockDeposito: nuevoDeposito,
            ventasUltimos30Dias: nuevasVentas30d,
            estadoAlerta,
            alertaFacturaDuplicada: esDuplicada ? tipoComprobante : actual.alertaFacturaDuplicada,
            fechaActualizacion: new Date().toISOString(),
          };
          await db.productos.put(productosActualizados[idx]);
          actualizadosCount++;
          totalDescontado += item.cantidad;
        }
      }

      // Registrar la venta en la base de datos local
      const montoTotal = items.reduce((acc, it) => acc + (it.subtotal || it.cantidad * it.precioUnitario), 0);
      const nuevaVenta: VentaPOS = {
        id: `vta-fac-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fecha: new Date().toISOString(),
        items: items.map((it) => ({
          productoId: it.coincidenciaProductoId || `prod-${it.codigo || it.descripcion}`,
          codigoBarras: it.codigo || '',
          nombre: it.descripcion,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
          subtotal: it.subtotal || it.cantidad * it.precioUnitario,
        })),
        subtotal: montoTotal,
        descuento: 0,
        total: montoTotal,
        metodoPago: 'transferencia',
        nombreClienteFiado: origen || 'Factura de Venta',
      };
      await db.ventas.add(nuevaVenta);
      setVentas((prev) => [nuevaVenta, ...prev]);

      setProductos(productosActualizados);
      audioFeedback.playPosSaleSuccess();
      mostrarToast(
        `🧾 Factura de Venta procesada: ${actualizadosCount} productos actualizados (${totalDescontado} unidades descontadas del stock). Venta registrada: $${montoTotal.toLocaleString('es-AR')}.`
      );
    } else {
      // --- OPERACIÓN FACTURA DE COMPRA: INGRESO DE STOCK Y ACTUALIZACIÓN DE COSTOS ---
      for (const item of items) {
        // Desacoplar códigos incrustados en la descripción si los hubiera
        const desglose = desglosarCodigoYDescripcion(item.descripcion, item.codigo, item.sku);
        const codBuscado = (desglose.codigo || item.codigo || '').trim();
        const skuBuscado = (desglose.sku || item.sku || '').trim().toLowerCase();

        // Cotejo de alta precisión para evitar confusiones entre variantes (ej: Harina 000 vs Harina 0000)
        let idx = -1;
        if (item.coincidenciaProductoId) {
          idx = productosActualizados.findIndex((p) => p.id === item.coincidenciaProductoId);
        } else if (codBuscado.length >= 4) {
          idx = productosActualizados.findIndex((p) => p.codigoBarras === codBuscado || (p.sku && p.sku === codBuscado));
        }

        if (idx === -1 && skuBuscado.length >= 2) {
          idx = productosActualizados.findIndex((p) => p.sku && p.sku.toLowerCase() === skuBuscado);
        }

        if (idx === -1) {
          // Si no vino id o código previo, usar el motor semántico con el nombre limpio desglosado
          const cotejo = cotejarRenglonConCatalogo(desglose.descripcionLimpia, codBuscado, productosActualizados, desglose.sku);
          if (!cotejo.esNuevoProducto && cotejo.productoCoincidente) {
            idx = productosActualizados.findIndex((p) => p.id === cotejo.productoCoincidente!.id);
          }
        }

        if (idx >= 0) {
          // Producto Existente: Sumar existencias y actualizar costo de reposición
          const actual = productosActualizados[idx];
          const nuevoStock = actual.stockActual + item.cantidad;
          const nuevoCosto = item.precioUnitario > 0 ? item.precioUnitario : actual.precioCosto;
          // Ajustar precio de venta manteniendo margen sugerido si cambió el costo
          const margen = actual.margenSugerido || 35;
          const nuevoPrecioVenta = Math.round(nuevoCosto * (1 + margen / 100));

          // Si el producto existente no tenía código EAN y la factura trajo uno válido, enriquecerlo
          const codigoActualizado = (codBuscado.length >= 8 && (!actual.codigoBarras || actual.codigoBarras.length < 8))
            ? codBuscado
            : actual.codigoBarras;

          productosActualizados[idx] = {
            ...actual,
            codigoBarras: codigoActualizado,
            sku: actual.sku || desglose.sku || item.sku,
            stockActual: nuevoStock,
            stockDeposito: actual.stockDeposito + item.cantidad,
            precioCosto: nuevoCosto,
            precioVenta: nuevoPrecioVenta > actual.precioVenta ? nuevoPrecioVenta : actual.precioVenta,
            proveedor: origen || actual.proveedor,
            estadoAlerta: nuevoStock >= actual.stockMinimo ? 'optimo' : 'medio',
            alertaFacturaDuplicada: esDuplicada ? tipoComprobante : actual.alertaFacturaDuplicada,
            fechaActualizacion: new Date().toISOString(),
          };
          await db.productos.put(productosActualizados[idx]);
          actualizadosCount++;
        } else {
          // Crear nuevo producto a partir de la factura con código de barras y nombre limpio sin códigos pegados
          const codigoFinal = codBuscado.length >= 8
            ? codBuscado
            : generarEan13Determinista(desglose.descripcionLimpia);

          const nuevoProd: Producto = {
            id: `prod-inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            codigoBarras: codigoFinal,
            sku: desglose.sku || item.sku || undefined,
            nombre: desglose.descripcionLimpia || item.descripcion,
            categoria: 'Almacén General',
            rubro: 'Almacén',
            precioCosto: item.precioUnitario,
            precioVenta: Math.round(item.precioUnitario * 1.35),
            stockActual: item.cantidad,
            stockMinimo: Math.max(5, Math.round(item.cantidad * 0.3)),
            stockTienda: Math.ceil(item.cantidad * 0.6),
            stockDeposito: Math.floor(item.cantidad * 0.4),
            rotacion: 'alta',
            proveedor: origen,
            ventasUltimos30Dias: 0,
            diasAgotamiento: 30,
            estadoAlerta: 'optimo',
            unidadMedida: 'unidades',
            ivaPorcentaje: item.alicuotaIva || 21,
            margenSugerido: 35,
            alertaFacturaDuplicada: esDuplicada ? tipoComprobante : undefined,
            fechaActualizacion: new Date().toISOString(),
          };
          productosActualizados.unshift(nuevoProd);
          await db.productos.put(nuevoProd);
          nuevosCount++;
        }
      }

      setProductos(productosActualizados);
      audioFeedback.playPosSaleSuccess();
      mostrarToast(
        esDuplicada
          ? `⚠️ Factura DUPLICADA registrada: ${actualizadosCount} productos afectados tienen alerta permanente de auditoría.`
          : `📦 Factura de Compra impactada: ${actualizadosCount} productos repuestos y ${nuevosCount} nuevos catalogados desde ${origen}.`
      );
    }

    // Guardar factura en el historial local persistente
    try {
      const totalFactura = items.reduce(
        (acc, it) => acc + (it.subtotal || it.cantidad * it.precioUnitario),
        0
      );
      await guardarFacturaEnHistorial({
        id: `fac-hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fechaCarga: new Date().toISOString(),
        numeroComprobante: tipoComprobante,
        proveedorOEmisor: origen,
        tipo: tipoOperacion === 'venta_egreso' ? 'factura_venta' : 'factura_compra',
        tipoOperacion,
        total: totalFactura,
        cantidadItems: items.length,
        esDuplicada,
        motivoDuplicado,
        items,
      });

      await recargarHistorialFacturas();
    } catch (e) {
      console.warn('Error al guardar factura en historial:', e);
    }
  };

  // Impacto en Lote de Múltiples Facturas (Batch) al Inventario, Ventas y al Historial General
  const handleCommitBatchInvoices = useCallback(async (
    lote: Array<{
      itemsAprobados: FacturaItemExtraido[];
      tipoComprobante: string;
      origen: string;
      tipoOperacion: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo';
      categoriaGasto?: CategoriaGastoFijo;
      montoTotalGasto?: number;
      esDuplicada?: boolean;
      motivoDuplicado?: string;
      archivoOrigenNombre?: string;
    }>
  ) => {
    if (!lote || lote.length === 0) return;

    let productosActualizados = await db.productos.toArray();
    let ventasActualizadas = await db.ventas.toArray();
    let totalItemsAfectados = 0;
    let totalFacturasGuardadas = 0;

    for (const fac of lote) {
      const { itemsAprobados, tipoComprobante, origen, tipoOperacion, esDuplicada, motivoDuplicado, archivoOrigenNombre, categoriaGasto, montoTotalGasto } = fac;

      // Si es gasto operativo en lote: Cero impacto en stock, alimenta resumen mensual y prorrateo
      if (tipoOperacion === 'gasto_operativo') {
        const montoGasto = montoTotalGasto && montoTotalGasto > 0
          ? montoTotalGasto
          : itemsAprobados ? itemsAprobados.reduce((acc, it) => acc + (it.subtotal || it.cantidad * it.precioUnitario), 0) : 0;

        const nuevoGasto: GastoOperativo = {
          id: `gasto-batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          fecha: new Date().toISOString(),
          periodoMes: new Date().toISOString().slice(0, 7),
          categoriaGasto: categoriaGasto || 'otros',
          proveedor: origen,
          comprobante: tipoComprobante,
          montoTotal: montoGasto,
          archivoOrigenNombre,
          impactaEnProrrateo: true,
        };
        await guardarGastoOperativo(nuevoGasto);
        const estActualizada = await actualizarCostosFijosDesdeGastosBD();
        setEstrategia(estActualizada);

        await guardarFacturaEnHistorial({
          id: `fac-hist-batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          fechaCarga: new Date().toISOString(),
          numeroComprobante: tipoComprobante,
          proveedorOEmisor: origen,
          tipo: 'remito',
          tipoOperacion: 'gasto_operativo',
          categoriaGasto,
          total: montoGasto,
          cantidadItems: 0,
          esDuplicada: Boolean(esDuplicada),
          motivoDuplicado,
          archivoOrigenNombre,
          items: [],
        });
        totalFacturasGuardadas++;
        continue;
      }

      if (!itemsAprobados || itemsAprobados.length === 0) continue;

      if (tipoOperacion === 'venta_egreso') {
        const ventaId = `vta-fac-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const totalVenta = itemsAprobados.reduce((acc, it) => acc + (it.subtotal || it.cantidad * it.precioUnitario), 0);
        const nuevaVenta: VentaPOS = {
          id: ventaId,
          fecha: new Date().toISOString(),
          items: itemsAprobados.map((it) => ({
            productoId: it.coincidenciaProductoId || it.codigo || 'desconocido',
            codigoBarras: it.codigo || '',
            nombre: it.descripcion,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            subtotal: it.subtotal,
          })),
          subtotal: totalVenta,
          descuento: 0,
          total: totalVenta,
          metodoPago: 'efectivo',
          montoAbonado: totalVenta,
          vuelto: 0,
        };
        await db.ventas.add(nuevaVenta);
        ventasActualizadas.unshift(nuevaVenta);

        for (const item of itemsAprobados) {
          const idx = productosActualizados.findIndex(
            (p) => (item.coincidenciaProductoId && p.id === item.coincidenciaProductoId) ||
                   (item.codigo && p.codigoBarras === item.codigo) ||
                   p.nombre.toLowerCase().trim() === item.descripcion.toLowerCase().trim()
          );
          if (idx >= 0) {
            const actual = productosActualizados[idx];
            const nuevoStock = Math.max(0, actual.stockActual - item.cantidad);
            productosActualizados[idx] = {
              ...actual,
              stockActual: nuevoStock,
              stockTienda: Math.max(0, actual.stockTienda - item.cantidad),
              ventasUltimos30Dias: (actual.ventasUltimos30Dias || 0) + item.cantidad,
              estadoAlerta: nuevoStock <= actual.stockMinimo ? 'critico' : actual.estadoAlerta,
              fechaActualizacion: new Date().toISOString(),
            };
            await db.productos.put(productosActualizados[idx]);
          }
        }
      } else {
        // Compra / Ingreso de existencias
        for (const item of itemsAprobados) {
          // Desacoplar códigos incrustados en la descripción si los hubiera
          const desglose = desglosarCodigoYDescripcion(item.descripcion, item.codigo, item.sku);
          const codBuscado = (desglose.codigo || item.codigo || '').trim();
          const skuBuscado = (desglose.sku || item.sku || '').trim().toLowerCase();

          let idx = -1;
          if (item.coincidenciaProductoId) {
            idx = productosActualizados.findIndex((p) => p.id === item.coincidenciaProductoId);
          } else if (codBuscado.length >= 4) {
            idx = productosActualizados.findIndex((p) => p.codigoBarras === codBuscado || (p.sku && p.sku === codBuscado));
          }

          if (idx === -1 && skuBuscado.length >= 2) {
            idx = productosActualizados.findIndex((p) => p.sku && p.sku.toLowerCase() === skuBuscado);
          }

          if (idx === -1) {
            const cotejo = cotejarRenglonConCatalogo(desglose.descripcionLimpia, codBuscado, productosActualizados, desglose.sku);
            if (!cotejo.esNuevoProducto && cotejo.productoCoincidente) {
              idx = productosActualizados.findIndex((p) => p.id === cotejo.productoCoincidente!.id);
            }
          }

          if (idx >= 0) {
            const actual = productosActualizados[idx];
            const nuevoStock = actual.stockActual + item.cantidad;
            const nuevoCosto = item.precioUnitario > 0 ? item.precioUnitario : actual.precioCosto;
            const margen = actual.margenSugerido || 35;
            const nuevoPrecioVenta = Math.round(nuevoCosto * (1 + margen / 100));

            const codigoActualizado = (codBuscado.length >= 8 && (!actual.codigoBarras || actual.codigoBarras.length < 8))
              ? codBuscado
              : actual.codigoBarras;

            productosActualizados[idx] = {
              ...actual,
              codigoBarras: codigoActualizado,
              sku: actual.sku || desglose.sku || item.sku,
              stockActual: nuevoStock,
              stockDeposito: actual.stockDeposito + item.cantidad,
              precioCosto: nuevoCosto,
              precioVenta: nuevoPrecioVenta > actual.precioVenta ? nuevoPrecioVenta : actual.precioVenta,
              proveedor: origen || actual.proveedor,
              estadoAlerta: nuevoStock >= actual.stockMinimo ? 'optimo' : 'medio',
              alertaFacturaDuplicada: esDuplicada ? tipoComprobante : actual.alertaFacturaDuplicada,
              fechaActualizacion: new Date().toISOString(),
            };
            await db.productos.put(productosActualizados[idx]);
          } else {
            const codigoFinal = codBuscado.length >= 8
              ? codBuscado
              : generarEan13Determinista(desglose.descripcionLimpia);

            const nuevoProd: Producto = {
              id: `prod-inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              codigoBarras: codigoFinal,
              sku: desglose.sku || item.sku || undefined,
              nombre: desglose.descripcionLimpia || item.descripcion,
              categoria: 'Almacén General',
              rubro: 'Almacén',
              precioCosto: item.precioUnitario,
              precioVenta: Math.round(item.precioUnitario * 1.35),
              stockActual: item.cantidad,
              stockMinimo: Math.max(5, Math.round(item.cantidad * 0.3)),
              stockTienda: Math.ceil(item.cantidad * 0.6),
              stockDeposito: Math.floor(item.cantidad * 0.4),
              rotacion: 'alta',
              proveedor: origen,
              ventasUltimos30Dias: 0,
              diasAgotamiento: 30,
              estadoAlerta: 'optimo',
              unidadMedida: 'unidades',
              ivaPorcentaje: item.alicuotaIva || 21,
              margenSugerido: 35,
              alertaFacturaDuplicada: esDuplicada ? tipoComprobante : undefined,
              fechaActualizacion: new Date().toISOString(),
            };
            productosActualizados.unshift(nuevoProd);
            await db.productos.put(nuevoProd);
          }
          totalItemsAfectados++;
        }
      }

      // Guardar cada factura en el historial local persistente con ID y marca de tiempo únicos
      try {
        const totalFactura = itemsAprobados.reduce(
          (acc, it) => acc + (it.subtotal || it.cantidad * it.precioUnitario),
          0
        );
        const idxLote = lote.indexOf(fac);
        await guardarFacturaEnHistorial({
          id: `fac-hist-${Date.now()}-${idxLote}-${Math.random().toString(36).substring(2, 8)}`,
          fechaCarga: new Date(Date.now() - idxLote * 1000).toISOString(),
          numeroComprobante: tipoComprobante,
          proveedorOEmisor: origen,
          tipo: tipoOperacion === 'venta_egreso' ? 'factura_venta' : 'factura_compra',
          tipoOperacion,
          total: totalFactura,
          cantidadItems: itemsAprobados.length,
          esDuplicada: Boolean(esDuplicada),
          motivoDuplicado,
          archivoOrigenNombre,
          items: itemsAprobados,
        });

        // Registrar en auditoría de errores persistente si fue identificada como duplicada
        if (esDuplicada) {
          try {
            await guardarRegistroAuditoria({
              id: `err-dup-${Date.now()}-${idxLote}`,
              fecha: new Date().toISOString(),
              categoria: 'duplicado',
              tipoArchivo: archivoOrigenNombre?.endsWith('.pdf')
                ? 'pdf'
                : archivoOrigenNombre?.endsWith('.jpg') || archivoOrigenNombre?.endsWith('.png')
                ? 'jpg'
                : 'otro',
              archivoAfectado: archivoOrigenNombre || tipoComprobante,
              titulo: `Comprobante Duplicado Autorizado: ${tipoComprobante}`,
              descripcion: `Se autorizó e impactó en inventario el comprobante ${tipoComprobante} emitido por "${origen}" con ${itemsAprobados.length} líneas por un total de $${totalFactura.toLocaleString('es-AR')}, detectado previamente en el historial.`,
              causaRaiz: motivoDuplicado || 'Coincidencia con comprobante cargado con anterioridad.',
              impacto: 'Doble impacto en stock por confirmación del comerciante. Se requiere control de caja e inventario.',
              solucionAplicada: 'Registro permanente en historial de auditoría y banner de alerta en dashboard.',
              estado: 'advertencia',
              severidad: 'alta',
              detallesTecnicos: `Comprobante: ${tipoComprobante} | Proveedor: ${origen} | Archivo: ${archivoOrigenNombre || 'N/A'}`,
              registradoPor: 'Centinela de Duplicados NOST-IA',
            });
          } catch (errAudit) {
            console.warn('Error guardando registro de auditoría de duplicado:', errAudit);
          }
        }

        totalFacturasGuardadas++;
      } catch (err) {
        console.warn('Error guardando factura en historial:', err);
      }
    }

    setProductos([...productosActualizados]);
    setVentas([...ventasActualizadas]);
    await recargarHistorialFacturas();
    audioFeedback.playPosSaleSuccess();
    mostrarToast(
      `⚡ ¡Lote impactado con éxito! Se incorporaron ${totalFacturasGuardadas} facturas y ${totalItemsAfectados} líneas al inventario y al panel de control.`
    );
  }, [recargarHistorialFacturas, mostrarToast]);

  // Actualizar Prorrateo de Costo Fijo en todo el catálogo de productos
  const handleActualizarProrrateoEnInventario = useCallback(async (nuevoProrrateo: number) => {
    const prodsActuales = await db.productos.toArray();
    const actualizados = prodsActuales.map((p) => ({
      ...p,
      costoFijoProrrateado: nuevoProrrateo,
      fechaActualizacion: new Date().toISOString(),
    }));

    await db.productos.bulkPut(actualizados);
    setProductos(actualizados);
    mostrarToast(`✨ Prorrateo de +$${nuevoProrrateo.toFixed(2)} sincronizado en los ${actualizados.length} productos del catálogo.`);
  }, [mostrarToast]);

  // Carga masiva de stock CSV
  const handleBulkAddProductos = async (nuevos: Producto[]) => {
    await db.productos.bulkPut(nuevos);
    setProductos((prev) => [...nuevos, ...prev]);
    mostrarToast(`Se importaron ${nuevos.length} productos masivamente.`);
  };

  // Registro de Venta POS con descuento de stock en tiempo real
  const handleCompletarVenta = async (venta: VentaPOS) => {
    await db.ventas.add(venta);
    setVentas((prev) => [venta, ...prev]);

    // Descontar stock
    const prodsActualizados = [...productos];
    for (const item of venta.items) {
      const idx = prodsActualizados.findIndex((p) => p.id === item.productoId);
      if (idx >= 0) {
        const prod = prodsActualizados[idx];
        const nuevoStock = Math.max(0, prod.stockActual - item.cantidad);
        const nuevoTienda = Math.max(0, prod.stockTienda - item.cantidad);
        prodsActualizados[idx] = {
          ...prod,
          stockActual: nuevoStock,
          stockTienda: nuevoTienda,
          ventasUltimos30Dias: prod.ventasUltimos30Dias + item.cantidad,
          diasAgotamiento: Math.max(0, Math.round(nuevoStock / ((prod.ventasUltimos30Dias + 1) / 30))),
          estadoAlerta: nuevoStock <= prod.stockMinimo ? 'critico' : prod.estadoAlerta,
          fechaActualizacion: new Date().toISOString(),
        };
        await db.productos.put(prodsActualizados[idx]);
      }
    }

    setProductos(prodsActualizados);
    mostrarToast(`Venta por $${venta.total.toLocaleString('es-AR')} registrada.`);
  };

  // Métricas Principales del Tablero
  const metricas = useMemo(() => {
    const totalItems = productos.length;
    const stockTotalUnidades = productos.reduce((acc, p) => acc + p.stockActual, 0);
    const valuacionInventario = productos.reduce((acc, p) => acc + p.stockActual * p.precioCosto, 0);
    const enQuiebre = productos.filter((p) => p.estadoAlerta === 'critico').length;
    const enSobrestock = productos.filter((p) => p.estadoAlerta === 'sobrestock').length;
    const prorrateoUnit = calcularProrrateoUnitario(estrategia);

    return {
      totalItems,
      stockTotalUnidades,
      valuacionInventario,
      enQuiebre,
      enSobrestock,
      prorrateoUnit,
    };
  }, [productos, estrategia]);

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#00FF87] selection:text-black">
      {/* Cintillo Permanente Superior con Llamado a Aporte Solidario y Contratación */}
      <SolidarityTicker />

      {/* Barra de Estado Superior Cyber-Federal */}
      <header className="sticky top-0 z-40 border-b border-[#1E293B] bg-[#0E111A]/95 backdrop-blur-md px-4 py-2.5 shadow-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          {/* Logotipo & Visión Territorial */}
          <div className="flex items-center gap-3">
            {perfilComercio?.logoBase64 ? (
              <img
                src={perfilComercio.logoBase64}
                alt={perfilComercio.nombreComercio}
                className="h-10 w-10 rounded-xl object-contain bg-slate-950 border border-[#00FF87]/40 p-1 shadow-[0_0_12px_rgba(0,255,135,0.3)]"
              />
            ) : null}
            <MateSoberanoLogo size="md" />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-base font-extrabold tracking-wider text-white">
                  {perfilComercio?.nombreComercio || 'NOST-IA'}
                </h1>
                {licencia?.activa && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/80 bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-amber-500/20 px-2.5 py-0.5 font-mono text-[10px] font-black text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                    title={`Servicio Completo Mensual Habilitado: ${licencia.codigo}`}
                  >
                    <Award className="h-3 w-3 text-amber-300 fill-amber-300" />
                    <span>SERVICIO NOST-IA COMPLETO • MENSUAL</span>
                  </span>
                )}
                <span className="hidden sm:inline-block rounded-md border border-[#00FF87]/40 bg-[#00FF87]/10 px-2 py-0.5 font-mono text-[10px] text-[#00FF87] font-bold uppercase tracking-wider">
                  {perfilComercio?.rubro || 'Industrial • 100% Offline'}
                </span>
                <span className="hidden md:inline-block rounded-md border border-[#00D2FF]/40 bg-[#00D2FF]/10 px-2 py-0.5 font-mono text-[10px] text-[#00D2FF]">
                  {perfilComercio?.escala ? perfilComercio.escala.replace('_', ' ') : 'Nodo Soberano Local'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                {perfilComercio?.lemaOFrase || 'NOST-IA: Nodo Operativo Soberano y Territorial'}
                {perfilComercio?.nombreComerciante ? ` • Titular: ${perfilComercio.nombreComerciante}` : ''}
              </p>
            </div>
          </div>

          {/* Selector de Módulos (Tabs) */}
          <nav className="flex items-center gap-1 rounded-xl border border-[#1E293B] bg-[#141824] p-1 font-mono text-xs">
            <button
              onClick={() => setPestanaActiva('inventario')}
              className={`flex items-center gap-2 cursor-pointer rounded-lg px-3 py-1.5 transition-all ${
                pestanaActiva === 'inventario'
                  ? 'bg-[#00FF87] text-black font-bold shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Inventario & POS</span>
            </button>

            <button
              onClick={() => setPestanaActiva('analitica')}
              className={`flex items-center gap-2 cursor-pointer rounded-lg px-3 py-1.5 transition-all ${
                pestanaActiva === 'analitica'
                  ? 'bg-[#00D2FF] text-black font-bold shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              <span>Inteligencia Comercial & Stock</span>
            </button>

            <button
              onClick={() => setPestanaActiva('finanzas')}
              className={`flex items-center gap-2 cursor-pointer rounded-lg px-3 py-1.5 transition-all ${
                pestanaActiva === 'finanzas'
                  ? 'bg-amber-400 text-black font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building className="h-4 w-4" />
              <span>Finanzas & Contador Real</span>
            </button>

            <button
              onClick={() => setPestanaActiva('copiloto')}
              className={`flex items-center gap-2 cursor-pointer rounded-lg px-3 py-1.5 transition-all ${
                pestanaActiva === 'copiloto'
                  ? 'bg-[#FF2E93] text-white font-bold shadow-[0_0_10px_rgba(255,46,147,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>Compañero/a IA Territorial</span>
            </button>
          </nav>

          {/* Accesos Rápidos: Reporte Compras PDF, Facturas, Hoja de Ruta, Manual y Manifiesto */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarReporteModal(true)}
              icon={<Printer className="h-4 w-4 text-[#00D2FF]" />}
              title="Generar Reporte PDF A4 para Impresora de Quiebres y Compras"
              className="border-cyan-500/40 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-500/20 font-bold"
            >
              <span className="hidden sm:inline">Reporte PDF Compras</span>
              <span className="sm:hidden">Reporte</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarHistorialFacturasGeneral(true)}
              icon={<FileSpreadsheet className="h-4 w-4 text-[#00D2FF]" />}
              title="Auditoría e historial de facturas cargadas y comprobantes duplicados"
              className={facturasDuplicadasCount > 0 ? 'border-amber-500/60 bg-amber-500/10 text-amber-300' : ''}
            >
              <span className="hidden sm:inline">Facturas</span>
              {facturasDuplicadasCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-extrabold text-[10px] animate-pulse">
                  {facturasDuplicadasCount} dup
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarRoadmap(true)}
              icon={<Sparkles className="h-4 w-4 text-[#00FF87]" />}
              title="Módulos en transición, mejoras y futuras actualizaciones planificadas"
            >
              <span className="hidden sm:inline">Futuras Mejoras</span>
              <Badge variant="green" className="ml-1 text-[10px] px-1.5 py-0">Roadmap</Badge>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarCierreDiaBackup(true)}
              icon={<HardDrive className="h-4 w-4 text-[#00FF87]" />}
              title="Cierre de jornada comercial y resguardo de datos local"
              className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-500/20 font-bold"
            >
              <span className="hidden sm:inline">Cierre Día & Backup</span>
              <span className="sm:hidden">Cierre</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarActualizaciones(true)}
              icon={<RefreshCw className="h-4 w-4 text-[#00D2FF]" />}
              title="Sistema de Actualizaciones Soberanas y Parches"
              className="border-cyan-500/40 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-500/20"
            >
              <span className="hidden md:inline">Actualizaciones</span>
              <span className="md:hidden">v1.2</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarTroubleshooting(true)}
              icon={<HelpCircle className="h-4 w-4 text-amber-400" />}
              title="Manual de Solución de Problemas (Troubleshooting FAQ)"
              className="border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-500/20"
            >
              <span className="hidden lg:inline">FAQ / Ayuda</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMostrarManual(true)}
              icon={<BookOpen className="h-4 w-4 text-[#00FF87]" />}
              title="Manual paso a paso sin términos técnicos"
            >
              Manual
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarFilosofia(true)}
              icon={<Globe2 className="h-4 w-4 text-[#FFD700]" />}
              title="Filosofía Soberana, Código Abierto y Motor Qwen"
            >
              <span className="hidden sm:inline">Manifiesto</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarOnboarding(true)}
              icon={<Settings className="h-4 w-4 text-[#00D2FF]" />}
              title="Reconfigurar comercio, rubro o inventario"
            >
              <span className="hidden lg:inline">Configurar Negocio</span>
            </Button>

            {/* Offline Safety Guard Status Badge */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[10px] font-bold ${
                isOnline
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                  : 'border-cyan-500/50 bg-cyan-950/40 text-[#00D2FF] animate-pulse'
              }`}
              title={isOnline ? 'Conexión de red disponible. Base de datos 100% local.' : 'Modo 100% Offline Soberano Activo. Cero fugas de red.'}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-400" />
                  <span>ONLINE / LOCAL</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-[#00D2FF]" />
                  <span>100% OFFLINE</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Franja HUD de Telemetría y Métricas en Tiempo Real */}
      <section className="border-b border-[#1E293B] bg-[#0C0F17] px-4 py-3">
        <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            titulo="Catálogo & Stock"
            valor={`${metricas.totalItems} productos`}
            subtexto={`${metricas.stockTotalUnidades} unidades en stock`}
            icono={<Package className="h-4 w-4 text-[#00D2FF]" />}
            variante="azul"
          />

          <MetricCard
            titulo="Valuación Capital"
            valor={`$${(metricas.valuacionInventario / 1000).toFixed(1)} k`}
            subtexto="Costo reposición mayorista"
            icono={<DollarSign className="h-4 w-4 text-[#00FF87]" />}
            variante="verde"
          />

          <div
            onClick={() => setMostrarReporteModal(true)}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
            title="Click para ver reporte detallado y orden de compra sugerida"
          >
            <MetricCard
              titulo="Quiebres Críticos"
              valor={`${metricas.enQuiebre} productos`}
              subtexto={metricas.enQuiebre > 0 ? 'Reposición inminente (<7 días)' : 'Stock equilibrado'}
              icono={<AlertTriangle className="h-4 w-4 text-[#FF2E93]" />}
              variante={metricas.enQuiebre > 0 ? 'crimson' : 'verde'}
              alerta={metricas.enQuiebre > 0}
            />
          </div>

          <div
            onClick={() => setPestanaActiva('finanzas')}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
            title="Click para ver el panel de Finanzas Reales, Resumen Mensual y Prorrateo"
          >
            <MetricCard
              titulo="Prorrateo Costo Fijo"
              valor={`+$${metricas.prorrateoUnit.toFixed(1)}`}
              subtexto="Incidencia por unidad vendida"
              icono={<TrendingUp className="h-4 w-4 text-amber-400" />}
              variante="neutro"
            />
          </div>
        </div>
      </section>

      {/* Contenido Principal según Pestaña Activa */}
      <main className="mx-auto flex-1 w-full max-w-7xl p-4 space-y-5">
        {/* AVISO VISUAL CLARO Y PERMANENTE EN EL DASHBOARD POR FACTURAS DUPLICADAS */}
        {facturasDuplicadasCount > 0 && (
          <div className="mb-5 rounded-2xl border-2 border-amber-500/80 bg-amber-950/40 p-4 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.2)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-amber-300 text-sm tracking-wide uppercase">
                    ⚠️ AVISO VISUAL DE AUDITORÍA: FACTURA(S) DUPLICADA(S) EN EL COMERCIO
                  </span>
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-mono font-extrabold text-black uppercase">
                    {facturasDuplicadasCount} FACTURA(S) REPETIDA(S)
                  </span>
                </div>
                <p className="text-xs font-mono text-amber-100/90 mt-1.5 leading-relaxed">
                  El sistema detectó y registró mercadería con comprobantes repetidos bajo autorización expresa. Los productos afectados tienen el stock sumado dos veces y cuentan con registro permanente para control de caja e inventario.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMostrarHistorialFacturasGeneral(true)}
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-mono font-bold text-black shadow-lg transition-all"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Auditar Historial ({historialFacturasGlobal.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPestanaActiva('copiloto')}
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 px-3 py-2 text-xs font-mono font-bold text-cyan-300 shadow-lg transition-all"
                title="Abrir panel de Auditoría de Errores y Trazabilidad en Copiloto"
              >
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <span>Auditoría en Copiloto</span>
              </button>
            </div>
          </div>
        )}

        {/* Banner de Escáner Flotante si está abierto */}
        {mostrarScanner && (
          <div className="mb-6">
            <BarcodeCameraScanner
              productos={productos}
              onBarcodeDetected={handleBarcodeDetected}
              onClose={() => setMostrarScanner(false)}
            />
          </div>
        )}

        {/* 1. MÓDULO INVENTARIO Y POS */}
        {pestanaActiva === 'inventario' && (
          <div className="flex flex-col gap-4">
            <TechStackCreditBar seccion="inventario" />
            <InventoryTable
              productos={productos}
              onUpdateProducto={handleUpdateProducto}
              onDeleteProducto={handleDeleteProducto}
              onOpenCostModal={() => setMostrarCostModal(true)}
              onOpenBulkModal={() => setMostrarBulkModal(true)}
              onOpenInvoiceModal={() => handleAbrirInvoiceModal('compra_ingreso')}
              onOpenScannerModal={() => setMostrarScanner(true)}
              onOpenReporteModal={() => setMostrarReporteModal(true)}
              onAddManualProducto={() => {
                setProductoAEditar(null);
                setMostrarProductForm(true);
              }}
            />
          </div>
        )}

        {/* 2. MÓDULO INTELIGENCIA COMERCIAL & STOCK */}
        {pestanaActiva === 'analitica' && (
          <div className="flex flex-col gap-4">
            <IntelligentBusinessHub
              productos={productos}
              ventas={ventas}
              estrategia={estrategia}
            />
          </div>
        )}

        {/* 3. MÓDULO FINANZAS & CONTADOR REAL */}
        {pestanaActiva === 'finanzas' && (
          <div className="flex flex-col gap-4">
            <FinancialIntelligenceHub
              productos={productos}
              ventas={ventas}
              estrategia={estrategia}
              onOpenInvoiceModal={handleAbrirInvoiceModal}
              onUpdateEstrategia={handleSaveEstrategia}
              onActualizarProrrateoEnInventario={handleActualizarProrrateoEnInventario}
            />
          </div>
        )}

        {/* 4. MÓDULO COMPAÑERO/A IA TERRITORIAL */}
        {pestanaActiva === 'copiloto' && (
          <div className="flex flex-col gap-4">
            <LocalCopilotPanel
              productos={productos}
              puntos={puntos}
              estrategia={estrategia}
              ventas={ventas}
              onOpenPricingModal={() => setMostrarCostModal(true)}
              onNotificar={mostrarToast}
            />
          </div>
        )}
      </main>

      {/* Footer Cyber-Territorial Soberano */}
      <footer className="border-t border-[#1E293B] bg-[#0E111A] px-4 py-4 text-xs font-mono text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#00FF87]" />
            <span>NOST-IA • Nodo Operativo Soberano y Territorial • Resiliencia & Tecnología 100% Offline</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarModalReinicio(true)}
              className="cursor-pointer text-rose-400 hover:text-rose-300 hover:underline"
              title="Solicita clave de seguridad antes de reiniciar para evitar errores"
            >
              Reiniciar a Cero (Limpiar Todo)
            </button>
            <span>•</span>
            <button
              onClick={async () => {
                const json = await exportarBackupSoberano();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_nost_ia_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                mostrarToast('Copia de respaldo descargada.');
              }}
              className="cursor-pointer text-[#00D2FF] hover:underline"
            >
              Exportar Base Local (JSON)
            </button>
            <span>•</span>
            <button
              onClick={() => setMostrarFilosofia(true)}
              className="cursor-pointer text-[#FFD700] hover:underline"
            >
              Manifiesto y Filosofía Soberana (Qwen + Código Abierto)
            </button>
            <span>•</span>
            <button
              onClick={() => setMostrarManual(true)}
              className="cursor-pointer text-slate-400 hover:text-white"
            >
              Guía de Uso Inicial
            </button>
          </div>
        </div>
      </footer>

      {/* MODALES DEL SISTEMA */}

      {/* Modal Caja POS */}
      {mostrarPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8">
            <PosCashier
              productos={productos}
              cartItems={carritoPos}
              onUpdateCart={setCarritoPos}
              onCompletarVenta={handleCompletarVenta}
              onClose={() => setMostrarPosModal(false)}
            />
          </div>
        </div>
      )}

      {/* Modal Estrategia de Costos & Precios */}
      {mostrarCostModal && (
        <PricingStrategyModal
          estrategia={estrategia}
          productos={productos}
          onSaveEstrategia={handleSaveEstrategia}
          onApplyPriceToProduct={handleApplyPriceToProduct}
          onClose={() => setMostrarCostModal(false)}
        />
      )}

      {/* Modal Lector de Facturas */}
      {mostrarInvoiceModal && (
        <InvoiceReaderModal
          productosExistentes={productos}
          onCommitItemsToInventory={handleCommitInvoiceItems}
          onCommitBatchToInventory={handleCommitBatchInvoices}
          modoInicial={modoInicialInvoice}
          onClose={() => setMostrarInvoiceModal(false)}
        />
      )}

      {/* Modal Carga Masiva CSV */}
      {mostrarBulkModal && (
        <BulkImportModal
          onBulkAddProductos={handleBulkAddProductos}
          onClose={() => setMostrarBulkModal(false)}
        />
      )}

      {/* Modal Formulario Producto */}
      {mostrarProductForm && (
        <ProductFormModal
          producto={productoAEditar}
          estrategia={estrategia}
          onSave={handleSaveProductoManual}
          onClose={() => {
            setMostrarProductForm(false);
            setProductoAEditar(null);
          }}
        />
      )}

      {/* Modal Manual de Usuario Simplificado */}
      {mostrarManual && (
        <ManualSoberanoModal
          onClose={() => setMostrarManual(false)}
          onBackupRestored={() => {
            cargarDatos();
            mostrarToast('Base de datos restaurada correctamente.');
          }}
        />
      )}

      {/* Modal Manifiesto y Filosofía Soberana */}
      {mostrarFilosofia && (
        <FilosofiaModal onClose={() => setMostrarFilosofia(false)} />
      )}

      {/* Modal Hoja de Ruta y Futuras Mejoras */}
      {mostrarRoadmap && (
        <RoadmapModal
          onClose={() => setMostrarRoadmap(false)}
          onAbrirScanner={() => setMostrarScanner(true)}
          onAbrirPos={() => setMostrarPosModal(true)}
        />
      )}

      {/* Asistente de Configuración Soberana del Comercio (5 Pasos) */}
      {mostrarOnboarding && (
        <OnboardingWizard
          onFinalizarConfiguracion={handleFinalizarOnboarding}
          perfilActual={perfilComercio}
          onCancelar={perfilComercio ? () => setMostrarOnboarding(false) : undefined}
        />
      )}

      {/* Modal Historial de Facturas Procesadas y Auditoría */}
      {mostrarHistorialFacturasGeneral && (
        <InvoiceHistoryModal
          facturas={historialFacturasGlobal}
          onClose={() => setMostrarHistorialFacturasGeneral(false)}
        />
      )}

      {/* Modal Reporte de Compras PDF y Quiebres Críticos */}
      {mostrarReporteModal && (
        <ReporteComprasModal
          isOpen={mostrarReporteModal}
          onClose={() => setMostrarReporteModal(false)}
          productos={productos}
          ventas={ventas}
          perfilComercio={perfilComercio}
        />
      )}

      {/* Modal de Cierre de Día Comercial y Backup Soberano */}
      {mostrarCierreDiaBackup && (
        <CierreDiaBackupModal
          onCerrar={() => setMostrarCierreDiaBackup(false)}
          onDescargarBackup={async () => {
            const json = await exportarBackupSoberano();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fechaStr = new Date().toISOString().split('T')[0];
            a.download = `backup_nost_ia_${fechaStr}_cierre_diario.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            mostrarToast('Copia de respaldo del cierre diario descargada.');
          }}
          onRestaurarBackup={async (archivo: File) => {
            const res = await importarArchivoBackup(archivo);
            if (res.exito) {
              await cargarDatos();
              mostrarToast('Base de datos restaurada correctamente.');
            }
            return res;
          }}
        />
      )}

      {/* Modal del Sistema de Actualizaciones Soberanas */}
      {mostrarActualizaciones && (
        <ActualizacionesSoberanasModal
          onCerrar={() => setMostrarActualizaciones(false)}
          licencia={licencia}
          perfilComercio={perfilComercio}
        />
      )}

      {/* Modal de Solución de Problemas (Troubleshooting FAQ) */}
      {mostrarTroubleshooting && (
        <TroubleshootingModal
          onCerrar={() => setMostrarTroubleshooting(false)}
        />
      )}

      {/* Modal de Reinicio Seguro a Cero con Clave */}
      {mostrarModalReinicio && (
        <ReinicioSeguroModal
          perfilComercio={perfilComercio}
          onCancelar={() => setMostrarModalReinicio(false)}
          onDescargarBackupPrevio={async () => {
            const json = await exportarBackupSoberano();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_nost_ia_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            mostrarToast('Copia de respaldo previa descargada.');
          }}
          onConfirmar={async () => {
            await vaciarBaseDeDatosTotal();
            await cargarDatos();
            setMostrarModalReinicio(false);
            mostrarToast('Base de datos reiniciada a cero con éxito.');
          }}
        />
      )}

      {/* Toast Notification Flotante */}
      {toastMensaje && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-[#00FF87]/50 bg-[#0E111A] px-4 py-3 font-mono text-xs text-white shadow-[0_0_20px_rgba(0,255,135,0.25)] backdrop-blur-md animate-fade-in">
          <Sparkles className="h-4 w-4 text-[#00FF87]" />
          <span>{toastMensaje}</span>
        </div>
      )}
    </div>
  );
}
