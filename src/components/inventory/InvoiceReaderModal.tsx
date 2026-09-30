import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  Sparkles,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  Image as ImageIcon,
  Check,
  Zap,
  HelpCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Copy,
  Search,
  Brain,
  Building,
  Receipt,
  Flame,
  Droplets,
  Wifi,
  Users,
  Wrench,
  ShieldAlert,
  Scale,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  procesarArchivoComprobante,
  parsearTextoFactura,
  renderizarPaginaPdfAImagen,
} from '../../engine/invoiceReader';
import {
  cotejarRenglonConCatalogo,
  desglosarCodigoYDescripcion,
  generarEan13Determinista,
} from '../../engine/productMatcher';
import { audioFeedback } from '../../engine/audioFeedback';
import {
  verificarFacturaDuplicada,
  obtenerHistorialFacturas,
  guardarRegistroAuditoria,
  obtenerAprendizajesAlias,
  guardarAprendizajeAlias,
} from '../../engine/db';
import {
  validarCoherenciaSeccionEIngesta,
  detectarNaturalezaYTipoGasto,
} from '../../engine/expenseDetector';
import { InvoiceHistoryModal } from './InvoiceHistoryModal';
import { MemoriaAprendizajeModal } from './MemoriaAprendizajeModal';
import type {
  Producto,
  FacturaParseada,
  FacturaItemExtraido,
  FacturaProcesadaHistorial,
  AprendizajeAlias,
  CategoriaGastoFijo,
  AlertaErrorIngesta,
} from '../../types';

interface InvoiceReaderModalProps {
  productosExistentes: Producto[];
  onCommitItemsToInventory: (
    itemsAprobados: FacturaItemExtraido[],
    tipoComprobante: string,
    origen: string,
    tipoOperacion: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo',
    esDuplicada?: boolean,
    motivoDuplicado?: string,
    archivoOrigenNombre?: string,
    categoriaGasto?: CategoriaGastoFijo,
    montoTotalGasto?: number
  ) => void;
  onCommitBatchToInventory?: (
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
  ) => Promise<void>;
  cuitPropioComercio?: string;
  modoInicial?: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo';
  costoFijoUnitarioActual?: number;
  onClose: () => void;
}

interface ArchivoEnCola {
  id: string;
  file: File;
  nombre: string;
  tamanoFormateado: string;
  esImagen: boolean;
  esPdf: boolean;
  esTexto: boolean;
  contenidoTexto?: string;
  previewUrl?: string;
  originalBlobUrl?: string;
  esFacturaProbable: boolean;
  esCapturaProbable: boolean;
  estado: 'listo' | 'procesando' | 'exito' | 'error';
  impactada?: boolean;
  resultado?: FacturaParseada;
  errorMsg?: string;
}

export const InvoiceReaderModal: React.FC<InvoiceReaderModalProps> = ({
  productosExistentes,
  onCommitItemsToInventory,
  onCommitBatchToInventory,
  cuitPropioComercio,
  modoInicial,
  costoFijoUnitarioActual = 185,
  onClose,
}) => {
  // Tipo de Operación: Compra (suma existencias), Gasto Fijo (prorrateo sin stock), o Venta (descuenta existencias)
  const [tipoOperacion, setTipoOperacion] = useState<'compra_ingreso' | 'venta_egreso' | 'gasto_operativo'>(
    modoInicial || 'compra_ingreso'
  );
  const [categoriaGastoSeleccionada, setCategoriaGastoSeleccionada] = useState<CategoriaGastoFijo>('luz');
  const [montoGastoEditado, setMontoGastoEditado] = useState<number>(0);
  const [alertaCentinelaIgnorada, setAlertaCentinelaIgnorada] = useState<boolean>(false);

  // Cola de múltiples archivos subidos (hasta 5 o más sin límite)
  const [colaArchivos, setColaArchivos] = useState<ArchivoEnCola[]>([]);
  const [archivoActivoId, setArchivoActivoId] = useState<string | null>(null);

  // Estados de Procesamiento
  const [cargando, setCargando] = useState<boolean>(false);
  const [etapaAnalisis, setEtapaAnalisis] = useState<string>('Iniciando...');
  const [facturaParseada, setFacturaParseada] = useState<FacturaParseada | null>(null);

  // Edición de Renglones
  const [itemsEditables, setItemsEditables] = useState<FacturaItemExtraido[]>([]);
  const [itemsSeleccionados, setItemsSeleccionados] = useState<Record<number, boolean>>({});
  const [proveedorEditado, setProveedorEditado] = useState<string>('');
  const [numeroEditado, setNumeroEditado] = useState<string>('');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Estados de Detección de Duplicados e Historial
  const [duplicadaInfo, setDuplicadaInfo] = useState<{
    esDuplicada: boolean;
    facturaPrevia?: FacturaProcesadaHistorial;
    motivo?: string;
  } | null>(null);
  const [forzarSubidaDuplicada, setForzarSubidaDuplicada] = useState<boolean>(false);
  const [mostrarHistorialModal, setMostrarHistorialModal] = useState<boolean>(false);
  const [mostrarMemoriaModal, setMostrarMemoriaModal] = useState<boolean>(false);
  const [historialFacturas, setHistorialFacturas] = useState<FacturaProcesadaHistorial[]>([]);
  const [aprendizajesGlobales, setAprendizajesGlobales] = useState<AprendizajeAlias[]>([]);

  // Identificar el archivo activo en la cola
  const archivoActivo = colaArchivos.find((a) => a.id === archivoActivoId);

  // Cargar historial de facturas y memoria de aprendizajes existente al abrir
  const recargarAprendizajes = async () => {
    try {
      const lista = await obtenerAprendizajesAlias();
      setAprendizajesGlobales(lista);
    } catch (e) {
      console.warn('Error cargando aprendizajes:', e);
    }
  };

  useEffect(() => {
    obtenerHistorialFacturas().then((lista) => setHistorialFacturas(lista));
    recargarAprendizajes();
  }, []);

  // Verificar si la factura actual está duplicada
  useEffect(() => {
    if (!facturaParseada) {
      setDuplicadaInfo(null);
      return;
    }

    const num = numeroEditado || facturaParseada.numeroComprobante;
    const prov = proveedorEditado || facturaParseada.proveedorOEmisor;
    const total = facturaParseada.totalCalculado;
    const archivoNombre = archivoActivo?.nombre || facturaParseada.archivoOrigenNombre;

    verificarFacturaDuplicada(num, prov, total, archivoNombre).then((res) => {
      setDuplicadaInfo(res.esDuplicada ? res : null);
      if (!res.esDuplicada) {
        setForzarSubidaDuplicada(false);
      }
    });
  }, [numeroEditado, proveedorEditado, facturaParseada, archivoActivo]);

  // Detección automática de tipo de gasto e inicialización de montos
  useEffect(() => {
    if (facturaParseada) {
      setMontoGastoEditado(facturaParseada.totalCalculado || 0);
      const textoParaAnalizar = `${facturaParseada.proveedorOEmisor} ${facturaParseada.observaciones || ''} ${facturaParseada.items.map((i) => i.descripcion).join(' ')}`;
      const det = detectarNaturalezaYTipoGasto(
        facturaParseada.proveedorOEmisor,
        textoParaAnalizar,
        facturaParseada.cuitProveedor
      );
      if (det.categoriaGasto) {
        setCategoriaGastoSeleccionada(det.categoriaGasto);
      }
      setAlertaCentinelaIgnorada(false);
    }
  }, [facturaParseada]);

  // Alerta Centinela Anti-Error Humano (Evaluación en tiempo real antes de commit)
  const alertaCentinela = useMemo(() => {
    if (!facturaParseada || alertaCentinelaIgnorada) return null;
    return validarCoherenciaSeccionEIngesta(facturaParseada, tipoOperacion, cuitPropioComercio);
  }, [facturaParseada, tipoOperacion, cuitPropioComercio, alertaCentinelaIgnorada]);

  // Controles del visor de la imagen de factura
  const [zoomNivel, setZoomNivel] = useState<number>(1);
  const [rotacion, setRotacion] = useState<number>(0);
  const [mostrarVisorSplit, setMostrarVisorSplit] = useState<boolean>(true);
  const [copiadoTexto, setCopiadoTexto] = useState<boolean>(false);

  // Estados dedicados para la Previsualización de Comprobantes TXT / CSV
  const [filtroTextoVisor, setFiltroTextoVisor] = useState<string>('');
  const [tamanoFuenteTxt, setTamanoFuenteTxt] = useState<number>(12);
  const [textoCopiadoFeedback, setTextoCopiadoFeedback] = useState<boolean>(false);

  // Copiar contenido del comprobante TXT al portapapeles
  const handleCopiarTextoTxt = () => {
    const texto = archivoActivo?.contenidoTexto || '';
    if (texto) {
      navigator.clipboard.writeText(texto);
      setTextoCopiadoFeedback(true);
      setTimeout(() => setTextoCopiadoFeedback(false), 2000);
      audioFeedback.playBarcodeSuccess();
    }
  };

  // Asegurar la carga reactiva inmediata de texto plano para comprobantes .txt / .csv
  useEffect(() => {
    if (archivoActivo?.esTexto && !archivoActivo.contenidoTexto && archivoActivo.file) {
      archivoActivo.file.text().then((txt) => {
        setColaArchivos((prev) =>
          prev.map((a) => (a.id === archivoActivo.id ? { ...a, contenidoTexto: txt } : a))
        );
      }).catch(console.warn);
    }
  }, [archivoActivoId, archivoActivo]);

  // Entrada Manual y pegado
  const [mostrarPegarTexto, setMostrarPegarTexto] = useState<boolean>(false);
  const [textoManual, setTextoManual] = useState<string>('');

  // Drag & drop
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Soporte de pegado directo desde portapapeles (Ctrl+V para capturas o fotos)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const archivosPegados: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) archivosPegados.push(file);
        }
      }

      if (archivosPegados.length > 0) {
        e.preventDefault();
        agregarArchivosACola(archivosPegados);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [colaArchivos]);

  // Transformar Files a items en cola con heurística de clasificación y extracción inmediata
  const agregarArchivosACola = async (nuevosFiles: File[]) => {
    if (nuevosFiles.length === 0) return;

    const nuevasEntradasPromesas = nuevosFiles.map(async (file, idx) => {
      const nombreLower = file.name.toLowerCase();
      const esImagen = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|avif)$/i.test(nombreLower);
      const esPdf = file.type === 'application/pdf' || nombreLower.endsWith('.pdf');
      const esTexto = file.type === 'text/plain' || file.type === 'text/csv' || /\.(txt|csv|tsv)$/i.test(nombreLower);

      // Heurística de detección inteligente de Factura vs Captura de pantalla
      const tienePalabraFactura =
        nombreLower.includes('factura') ||
        nombreLower.includes('ticket') ||
        nombreLower.includes('remito') ||
        nombreLower.includes('inv') ||
        nombreLower.includes('comprobante') ||
        nombreLower.includes('afip') ||
        nombreLower.includes('cuenta');

      const tienePalabraCaptura =
        nombreLower.includes('screenshot') ||
        nombreLower.includes('captura') ||
        nombreLower.includes('pantalla') ||
        nombreLower.startsWith('image') ||
        nombreLower.startsWith('screen');

      // Si se llama "factura jpg.jpg" o similar, o es pdf/txt, prioridad absoluta como factura
      const esFacturaProbable = tienePalabraFactura || (!tienePalabraCaptura && (esPdf || esImagen || esTexto));
      const esCapturaProbable = tienePalabraCaptura && !tienePalabraFactura;

      let originalBlobUrl: string | undefined = undefined;
      let previewUrl: string | undefined = undefined;
      let contenidoTexto: string | undefined = undefined;

      if (esImagen || esTexto) {
        originalBlobUrl = URL.createObjectURL(file);
        previewUrl = originalBlobUrl;
      } else if (esPdf) {
        originalBlobUrl = URL.createObjectURL(file);
        // Para PDF no asignamos el blob URL a previewUrl porque un elemento <img> no puede renderizar PDFs
        previewUrl = undefined;
      }

      // Si es un archivo de texto (.txt, .csv), cargar su contenido en memoria de inmediato
      if (esTexto) {
        try {
          contenidoTexto = await file.text();
        } catch (e) {
          console.warn('Error leyendo texto inicial de archivo:', e);
        }
      }

      const nuevaEntrada: ArchivoEnCola = {
        id: `file-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        nombre: file.name,
        tamanoFormateado: formatearTamano(file.size),
        esImagen,
        esPdf,
        esTexto,
        previewUrl,
        originalBlobUrl,
        contenidoTexto,
        esFacturaProbable,
        esCapturaProbable,
        estado: 'listo',
      };

      // Si es un PDF, renderizar asíncronamente su primera página a imagen nítida
      if (esPdf) {
        renderizarPaginaPdfAImagen(file, 1)
          .then((imgDataUrl) => {
            if (imgDataUrl) {
              setColaArchivos((prev) =>
                prev.map((item) =>
                  item.id === nuevaEntrada.id ? { ...item, previewUrl: imgDataUrl } : item
                )
              );
            }
          })
          .catch((e) => console.warn('Renderizado previo omitido:', e));
      }

      return nuevaEntrada;
    });

    const nuevasEntradas = await Promise.all(nuevasEntradasPromesas);

    setColaArchivos((prev) => {
      const combinados = [...prev, ...nuevasEntradas];
      // Al agregar comprobantes (incluso si ya había una factura activa), activar y procesar la nueva factura
      const nuevoSeleccionado = nuevasEntradas[0] || combinados[combinados.length - 1];
      if (nuevoSeleccionado) {
        setArchivoActivoId(nuevoSeleccionado.id);
        procesarArchivoEspecifico(nuevoSeleccionado);
      }
      return combinados;
    });

    audioFeedback.playBarcodeSuccess();
  };

  const formatearTamano = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      agregarArchivosACola(Array.from(files));
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = () => {
    setArrastrando(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      agregarArchivosACola(Array.from(e.dataTransfer.files));
    }
  };

  // Procesar archivo específico
  const procesarArchivoEspecifico = async (itemEnCola: ArchivoEnCola) => {
    setCargando(true);
    setEtapaAnalisis('Leyendo archivo y ejecutando análisis...');
    setMensajeExito(null);

    // Actualizar estado en la cola
    setColaArchivos((prev) =>
      prev.map((a) => (a.id === itemEnCola.id ? { ...a, estado: 'procesando' } : a))
    );

    try {
      let txtContenido = itemEnCola.contenidoTexto;
      if (itemEnCola.esTexto && !txtContenido) {
        try {
          txtContenido = await itemEnCola.file.text();
        } catch (e) {
          console.warn('Error leyendo archivo de texto:', e);
        }
      }

      setEtapaAnalisis('Extrayendo datos fiscales con Motor Soberano Local (VDU + OCR + QR)...');
      const resultado = await procesarArchivoComprobante(itemEnCola.file, productosExistentes);

      setFacturaParseada(resultado);
      setProveedorEditado(resultado.proveedorOEmisor);
      setNumeroEditado(resultado.numeroComprobante);
      setItemsEditables(resultado.items);

      // Si es un gasto operativo o se detectó categoría, inicializar campos dedicados
      if (resultado.categoriaGastoSugerida) {
        setCategoriaGastoSeleccionada(resultado.categoriaGastoSugerida);
      }
      if (resultado.totalCalculado > 0) {
        setMontoGastoEditado(resultado.totalCalculado);
      }

      // Seleccionar todos por defecto
      const sel: Record<number, boolean> = {};
      resultado.items.forEach((_, idx) => {
        sel[idx] = true;
      });
      setItemsSeleccionados(sel);

      // Si el comprobante no arrojó ningún ítem con precio/cantidad válida, registrar en auditoría persistente
      // (Omitir si es un Gasto Operativo/Servicio donde no hay ítems de stock, o si tiene un total detectado válido)
      if (resultado.items.length === 0 && tipoOperacion !== 'gasto_operativo' && resultado.totalCalculado === 0) {
        guardarRegistroAuditoria({
          id: `err-vacio-${Date.now()}`,
          fecha: new Date().toISOString(),
          categoria: 'lectura_documento',
          tipoArchivo: itemEnCola.file.name.endsWith('.pdf') ? 'pdf' : itemEnCola.file.name.endsWith('.txt') ? 'txt' : 'jpg',
          archivoAfectado: itemEnCola.file.name,
          titulo: `Comprobante sin renglones comerciales detectados: ${itemEnCola.file.name}`,
          descripcion: `Se procesó el archivo "${itemEnCola.file.name}" pero no se detectaron renglones con precio unitario o estructura de factura válida.`,
          causaRaiz: resultado.mensajeValidacion || 'Formato no estructurado o texto borroso/ilegible en OCR.',
          impacto: 'Ningún artículo pudo ser incorporado al catálogo.',
          solucionAplicada: 'Revisar formato del comprobante o registrar manualmente.',
          estado: 'observacion',
          severidad: 'media',
          detallesTecnicos: `Método: ${resultado.metodoLectura} | Archivo: ${itemEnCola.file.name}`,
          registradoPor: 'Lector Territorial NOST-IA',
        }).catch(() => {});
      }

      setColaArchivos((prev) =>
        prev.map((a) => {
          if (a.id === itemEnCola.id) {
            return {
              ...a,
              estado: 'exito',
              resultado,
              contenidoTexto: txtContenido || a.contenidoTexto,
              previewUrl: resultado.archivoOrigenUrl || a.previewUrl,
            };
          }
          return a;
        })
      );

      audioFeedback.playBarcodeSuccess();
    } catch (err: any) {
      console.error('Error al procesar comprobante:', err);
      // Registrar falla técnica en auditoría
      guardarRegistroAuditoria({
        id: `err-lectura-${Date.now()}`,
        fecha: new Date().toISOString(),
        categoria: 'lectura_documento',
        tipoArchivo: itemEnCola.file.name.endsWith('.pdf') ? 'pdf' : itemEnCola.file.name.endsWith('.txt') ? 'txt' : 'jpg',
        archivoAfectado: itemEnCola.file.name,
        titulo: `Fallo en decodificación de comprobante: ${itemEnCola.file.name}`,
        descripcion: `Error al procesar "${itemEnCola.file.name}": ${err?.message || 'Error en lectura'}.`,
        causaRaiz: err?.message || 'Excepción no controlada en motor de lectura',
        impacto: 'Interrupción en la previsualización del archivo.',
        solucionAplicada: 'Reintentar con motor local alternativo o convertir a PDF/texto plano.',
        estado: 'advertencia',
        severidad: 'alta',
        detallesTecnicos: String(err?.stack || err),
        registradoPor: 'Lector Territorial NOST-IA',
      }).catch(() => {});

      setColaArchivos((prev) =>
        prev.map((a) =>
          a.id === itemEnCola.id
            ? { ...a, estado: 'error', errorMsg: err?.message || 'Error en lectura' }
            : a
        )
      );
    } finally {
      setCargando(false);
    }
  };

  const handleCambiarArchivoActivo = (id: string) => {
    setArchivoActivoId(id);
    const target = colaArchivos.find((a) => a.id === id);
    if (!target) return;

    if (target.resultado) {
      setFacturaParseada(target.resultado);
      setProveedorEditado(target.resultado.proveedorOEmisor);
      setNumeroEditado(target.resultado.numeroComprobante);
      setItemsEditables(target.resultado.items);
      const sel: Record<number, boolean> = {};
      target.resultado.items.forEach((_, idx) => (sel[idx] = true));
      setItemsSeleccionados(sel);
    } else {
      procesarArchivoEspecifico(target);
    }
  };

  // Procesar todos los archivos en cola de forma secuencial
  const handleProcesarTodosEnCola = async () => {
    if (colaArchivos.length === 0 || cargando) return;
    setCargando(true);
    for (const item of colaArchivos) {
      if (item.estado !== 'exito') {
        try {
          setEtapaAnalisis(`Procesando en lote: ${item.nombre}...`);
          let txt = item.contenidoTexto;
          if (item.esTexto && !txt) {
            try {
              txt = await item.file.text();
            } catch {}
          }
          const res = await procesarArchivoComprobante(item.file, productosExistentes);
          setColaArchivos((prev) =>
            prev.map((a) => (a.id === item.id ? { ...a, estado: 'exito', resultado: res, contenidoTexto: txt || a.contenidoTexto } : a))
          );
          if (!facturaParseada) {
            setFacturaParseada(res);
            setProveedorEditado(res.proveedorOEmisor);
            setNumeroEditado(res.numeroComprobante);
            setItemsEditables(res.items);
            const sel: Record<number, boolean> = {};
            res.items.forEach((_, idx) => (sel[idx] = true));
            setItemsSeleccionados(sel);
          }
        } catch (err: any) {
          setColaArchivos((prev) =>
            prev.map((a) => (a.id === item.id ? { ...a, estado: 'error', errorMsg: err?.message } : a))
          );
        }
      }
    }
    setCargando(false);
    audioFeedback.playBarcodeSuccess();
  };

  const handleEliminarArchivo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setColaArchivos((prev) => {
      const filtrados = prev.filter((a) => a.id !== id);
      if (archivoActivoId === id) {
        if (filtrados.length > 0) {
          setArchivoActivoId(filtrados[0].id);
          if (filtrados[0].resultado) {
            setFacturaParseada(filtrados[0].resultado);
            setItemsEditables(filtrados[0].resultado.items);
          }
        } else {
          setArchivoActivoId(null);
          setFacturaParseada(null);
          setItemsEditables([]);
        }
      }
      return filtrados;
    });
  };

  const handleToggleSeleccion = (idx: number) => {
    setItemsSeleccionados((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleUpdateItem = (idx: number, campo: keyof FacturaItemExtraido, valor: any) => {
    setItemsEditables((prev) => {
      const copia = [...prev];
      const actual = { ...copia[idx], [campo]: valor };
      if (campo === 'cantidad' || campo === 'precioUnitario') {
        const cant = campo === 'cantidad' ? Number(valor) || 0 : actual.cantidad;
        const pu = campo === 'precioUnitario' ? Number(valor) || 0 : actual.precioUnitario;
        actual.subtotal = Math.round(cant * pu);
      }

      // Si el usuario edita la descripción manualmente, desacoplar códigos y re-evaluar con el catálogo
      if (campo === 'descripcion') {
        const desglose = desglosarCodigoYDescripcion(String(valor || ''), actual.codigo, actual.sku);
        actual.descripcion = desglose.descripcionLimpia;
        if (desglose.codigo && (!actual.codigo || desglose.codigoDetectado)) {
          actual.codigo = desglose.codigo;
        }
        if (desglose.sku && !actual.sku) {
          actual.sku = desglose.sku;
        }

        const cotejo = cotejarRenglonConCatalogo(desglose.descripcionLimpia, actual.codigo, productosExistentes, actual.sku, proveedorEditado || facturaParseada?.proveedorOEmisor, aprendizajesGlobales);
        actual.esNuevoProducto = cotejo.esNuevoProducto;
        actual.coincidenciaProductoId = cotejo.productoCoincidente?.id;
        actual.esAprendido = cotejo.razonCotejo === 'memoria_aprendizaje';
        actual.origenAprendizaje = cotejo.etapasDiagnostico;
        if (!cotejo.esNuevoProducto && cotejo.productoCoincidente) {
          actual.codigo = cotejo.productoCoincidente.codigoBarras;
          actual.descripcion = cotejo.productoCoincidente.nombre;

          // Guardar aprendizaje de la corrección
          guardarAprendizajeAlias({
            textoOriginal: String(valor || ''),
            proveedor: proveedorEditado || facturaParseada?.proveedorOEmisor,
            productoIdDestino: cotejo.productoCoincidente.id,
            productoNombreDestino: cotejo.productoCoincidente.nombre,
            codigoBarrasDestino: cotejo.productoCoincidente.codigoBarras,
            skuDestino: cotejo.productoCoincidente.sku,
            origen: 'usuario_correccion',
          }).then(() => recargarAprendizajes());
        } else if (!actual.codigo || actual.codigo.startsWith('779')) {
          actual.codigo = cotejo.codigoSugerido;
        }
      }

      // Si el usuario edita el código manualmente, chequear si coincide con algún producto existente
      if (campo === 'codigo' && valor) {
        const codLimpio = String(valor).trim();
        actual.codigo = codLimpio;
        const prodMatch = productosExistentes.find((p) => p.codigoBarras === codLimpio || (p.sku && p.sku === codLimpio));
        if (prodMatch) {
          actual.esNuevoProducto = false;
          actual.coincidenciaProductoId = prodMatch.id;
          actual.descripcion = prodMatch.nombre;
        } else {
          // Re-chequear por nombre
          const cotejo = cotejarRenglonConCatalogo(actual.descripcion, codLimpio, productosExistentes, actual.sku);
          actual.esNuevoProducto = cotejo.esNuevoProducto;
          actual.coincidenciaProductoId = cotejo.productoCoincidente?.id;
        }
      }

      copia[idx] = actual;
      return copia;
    });
  };

  // Depura códigos y códigos de barras incrustados en las descripciones de todos los ítems
  const handleDepurarCodigos = () => {
    let corregidos = 0;
    setItemsEditables((prev) =>
      prev.map((item) => {
        const desglose = desglosarCodigoYDescripcion(item.descripcion, item.codigo, item.sku);
        if (desglose.codigoDetectado || desglose.descripcionLimpia !== item.descripcion) {
          corregidos++;
          const cotejo = cotejarRenglonConCatalogo(
            desglose.descripcionLimpia,
            desglose.codigo,
            productosExistentes,
            desglose.sku
          );
          const coincidente = cotejo.productoCoincidente;
          return {
            ...item,
            codigo: cotejo.codigoSugerido || desglose.codigo,
            sku: cotejo.skuSugerido || desglose.sku,
            descripcion: coincidente ? coincidente.nombre : desglose.descripcionLimpia,
            coincidenciaProductoId: coincidente ? coincidente.id : undefined,
            esNuevoProducto: cotejo.esNuevoProducto,
          };
        }
        return item;
      })
    );
    if (corregidos > 0) {
      audioFeedback.playBarcodeSuccess();
    }
  };

  const handleAgregarItemManual = () => {
    const descDefecto = 'Nuevo Producto / Renglón';
    const nuevo: FacturaItemExtraido = {
      codigo: generarEan13Determinista(`${descDefecto}-${Date.now()}`),
      descripcion: descDefecto,
      cantidad: 10,
      precioUnitario: 1000,
      subtotal: 10000,
      alicuotaIva: 21,
      esNuevoProducto: true,
    };
    setItemsEditables((prev) => [...prev, nuevo]);
    setItemsSeleccionados((prev) => ({
      ...prev,
      [itemsEditables.length]: true,
    }));
  };

  const handleEliminarItem = (idx: number) => {
    setItemsEditables((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProcesarTextoManual = () => {
    if (!textoManual.trim()) return;
    setCargando(true);
    const resultado = parsearTextoFactura(
      textoManual,
      'Entrada Manual / Pegado',
      'texto',
      productosExistentes
    );
    setFacturaParseada(resultado);
    setProveedorEditado(resultado.proveedorOEmisor);
    setNumeroEditado(resultado.numeroComprobante);
    setItemsEditables(resultado.items);

    const sel: Record<number, boolean> = {};
    resultado.items.forEach((_, idx) => (sel[idx] = true));
    setItemsSeleccionados(sel);
    setCargando(false);
    audioFeedback.playBarcodeSuccess();
  };

  // Impacto de la factura activa con transición automática si hay más comprobantes en la cola
  const handleConfirmarImpacto = () => {
    const numComp = numeroEditado || facturaParseada?.numeroComprobante || 'S/N';
    const prov =
      proveedorEditado ||
      facturaParseada?.proveedorOEmisor ||
      (tipoOperacion === 'venta_egreso'
        ? 'Cliente / Consumidor Final'
        : tipoOperacion === 'gasto_operativo'
        ? 'Prestador de Servicios'
        : 'Distribuidora Central');

    // Rama Gasto Fijo Operativo (Cero impacto en stock, alimenta costos fijos y prorrateo)
    if (tipoOperacion === 'gasto_operativo') {
      const montoTotalGasto = montoGastoEditado > 0 ? montoGastoEditado : (facturaParseada?.totalCalculado || 0);
      if (montoTotalGasto <= 0) {
        audioFeedback.playAlert();
        alert('Por favor ingresa un monto total válido para el gasto operativo.');
        return;
      }

      onCommitItemsToInventory(
        [],
        numComp,
        prov,
        'gasto_operativo',
        duplicadaInfo?.esDuplicada,
        duplicadaInfo?.motivo,
        archivoActivo?.nombre || facturaParseada?.archivoOrigenNombre,
        categoriaGastoSeleccionada,
        montoTotalGasto
      );

      audioFeedback.playPosSaleSuccess();

      // Marcar el archivo activo como impactado
      const actualId = archivoActivoId;
      const colaActualizada = colaArchivos.map((a) =>
        a.id === actualId ? { ...a, impactada: true } : a
      );
      setColaArchivos(colaActualizada);

      // Buscar si quedan más comprobantes pendientes sin impactar
      const pendientes = colaActualizada.filter((a) => a.id !== actualId && !a.impactada);

      if (pendientes.length > 0) {
        const siguiente = pendientes[0];
        setMensajeExito(
          `✅ Gasto Fijo "${archivoActivo?.nombre || 'actual'}" registrado ($${montoTotalGasto.toLocaleString('es-AR')}). Continuando con: "${siguiente.nombre}" (${pendientes.length} restante${pendientes.length > 1 ? 's' : ''})...`
        );
        handleCambiarArchivoActivo(siguiente.id);
      } else {
        setMensajeExito(
          `✅ ¡Gasto Fijo registrado con éxito! Monto: $${montoTotalGasto.toLocaleString('es-AR')}. Costos fijos y prorrateo de productos actualizados en catálogo.`
        );
        setTimeout(() => {
          onClose();
        }, 1500);
      }
      return;
    }

    const aprobados = itemsEditables.filter((_, idx) => itemsSeleccionados[idx]);
    if (aprobados.length === 0) return;

    onCommitItemsToInventory(
      aprobados,
      numComp,
      prov,
      tipoOperacion,
      duplicadaInfo?.esDuplicada,
      duplicadaInfo?.motivo,
      archivoActivo?.nombre || facturaParseada?.archivoOrigenNombre
    );

    // Guardar reglas en memoria de aprendizaje de NOST-IA para no repetir confusiones
    aprobados.forEach((item) => {
      if (item.coincidenciaProductoId) {
        guardarAprendizajeAlias({
          textoOriginal: item.descripcion,
          proveedor: prov,
          productoIdDestino: item.coincidenciaProductoId,
          productoNombreDestino: item.descripcion,
          codigoBarrasDestino: item.codigo || '',
          skuDestino: item.sku,
          origen: 'confirmacion_factura',
        }).catch(console.warn);
      }
    });

    audioFeedback.playPosSaleSuccess();

    // Marcar el archivo activo como impactado
    const actualId = archivoActivoId;
    const colaActualizada = colaArchivos.map((a) =>
      a.id === actualId ? { ...a, impactada: true } : a
    );
    setColaArchivos(colaActualizada);

    // Buscar si quedan más comprobantes pendientes sin impactar
    const pendientes = colaActualizada.filter((a) => a.id !== actualId && !a.impactada);

    if (pendientes.length > 0) {
      const siguiente = pendientes[0];
      setMensajeExito(
        `✅ Factura "${archivoActivo?.nombre || 'actual'}" impactada con éxito. Continuando con: "${siguiente.nombre}" (${pendientes.length} restante${pendientes.length > 1 ? 's' : ''})...`
      );
      handleCambiarArchivoActivo(siguiente.id);
      setTimeout(() => setMensajeExito(null), 3500);
    } else {
      setMensajeExito(
        tipoOperacion === 'venta_egreso'
          ? `¡Factura(s) registradas con éxito! Se descontaron ${aprobados.length} líneas del stock y se computó en el tablero territorial.`
          : `¡Factura(s) incorporadas con éxito al inventario y registradas en el historial!`
      );
      setTimeout(() => {
        onClose();
      }, 1800);
    }
  };

  // Impacto en lote de TODAS las facturas de la cola (Garantiza impacto total de los N archivos)
  const handleImpactarTodasLasFacturas = async () => {
    if (colaArchivos.length === 0 || cargando) return;
    setCargando(true);
    setEtapaAnalisis('Preparando e impactando todo el lote de facturas en inventario e historial...');

    try {
      const loteAImpactar: Array<{
        itemsAprobados: FacturaItemExtraido[];
        tipoComprobante: string;
        origen: string;
        tipoOperacion: 'compra_ingreso' | 'venta_egreso';
        esDuplicada?: boolean;
        motivoDuplicado?: string;
        archivoOrigenNombre?: string;
      }> = [];

      for (const item of colaArchivos) {
        if (item.impactada) continue;

        let res = item.resultado;
        if (!res) {
          setEtapaAnalisis(`Analizando archivo: ${item.nombre}...`);
          res = await procesarArchivoComprobante(item.file, productosExistentes);
        }

        let itemsAImpactar: FacturaItemExtraido[] = [];
        let numComp = res.numeroComprobante || 'S/N';
        let prov =
          res.proveedorOEmisor ||
          (tipoOperacion === 'venta_egreso' ? 'Cliente / Consumidor Final' : 'Distribuidora Central');

        // Si es el archivo activo y fue editado por el usuario en pantalla, usar sus valores
        if (item.id === archivoActivoId && itemsEditables.length > 0) {
          itemsAImpactar = itemsEditables.filter((_, idx) => itemsSeleccionados[idx]);
          if (numeroEditado) numComp = numeroEditado;
          if (proveedorEditado) prov = proveedorEditado;
        } else {
          itemsAImpactar = res.items;
        }

        // Si el número de comprobante es genérico S/N, usar el nombre del archivo para que tenga identidad única en el historial
        if (!numComp || numComp === 'S/N' || numComp.trim() === '') {
          numComp = item.nombre.replace(/\.[^/.]+$/, '').toUpperCase();
        }

        if (itemsAImpactar.length > 0) {
          loteAImpactar.push({
            itemsAprobados: itemsAImpactar,
            tipoComprobante: numComp,
            origen: prov,
            tipoOperacion,
            esDuplicada: duplicadaInfo?.esDuplicada && item.id === archivoActivoId ? true : false,
            motivoDuplicado: duplicadaInfo?.motivo,
            archivoOrigenNombre: item.nombre,
          });
        }
      }

      if (loteAImpactar.length === 0) {
        setCargando(false);
        setMensajeExito('No hay comprobantes pendientes con mercadería para impactar.');
        return;
      }

      setEtapaAnalisis(`Impactando lote de ${loteAImpactar.length} facturas en inventario y panel...`);

      if (onCommitBatchToInventory) {
        await onCommitBatchToInventory(loteAImpactar);
      } else {
        for (const fac of loteAImpactar) {
          onCommitItemsToInventory(
            fac.itemsAprobados,
            fac.tipoComprobante,
            fac.origen,
            fac.tipoOperacion,
            fac.esDuplicada,
            fac.motivoDuplicado
          );
        }
      }

      // Marcar todas como impactadas en el estado local
      setColaArchivos((prev) => prev.map((a) => ({ ...a, impactada: true })));

      // Recargar el historial local del modal para que se vea reflejado de inmediato
      const nuevoHist = await obtenerHistorialFacturas();
      setHistorialFacturas(nuevoHist);

      audioFeedback.playPosSaleSuccess();
      const totalRenglones = loteAImpactar.reduce((acc, f) => acc + f.itemsAprobados.length, 0);
      setMensajeExito(
        `⚡ ¡Se impactaron con éxito ${loteAImpactar.length} facturas completas (${totalRenglones} renglones) en inventario, ventas y en el historial!`
      );

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al impactar lote de comprobantes:', err);
      audioFeedback.playAlert();
    } finally {
      setCargando(false);
    }
  };

  // Calcular totales de los items seleccionados
  const totalMercaderiaSeleccionada = itemsEditables
    .filter((_, idx) => itemsSeleccionados[idx])
    .reduce((acc, it) => acc + it.subtotal, 0);

  const cantidadTotalUnidades = itemsEditables
    .filter((_, idx) => itemsSeleccionados[idx])
    .reduce((acc, it) => acc + it.cantidad, 0);

  const cantNuevosProductos = itemsEditables
    .filter((_, idx) => itemsSeleccionados[idx])
    .filter((it) => it.esNuevoProducto).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl border border-[#1E293B] bg-[#0A0D14] text-[#F8FAFC] shadow-2xl my-4 max-h-[94vh] flex flex-col overflow-hidden">
        {/* INPUT DE ARCHIVO PERMANENTE (Siempre montado en el DOM para responder a cualquier botón) */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={handleInputChange}
          disabled={cargando}
          className="hidden"
        />

        {/* Cabecera Táctica NOST-IA */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#1E293B] bg-[#0E121C] px-6 py-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30 shadow-[0_0_15px_rgba(0,255,135,0.2)]">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono tracking-wide text-white">
                  Lector y Auditor de Facturas VDU v3.0
                </h2>
                <span className="rounded bg-[#00FF87]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#00FF87] border border-[#00FF87]/30">
                  MOTOR VDU SOBERANO • CPU PURA
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Pipeline VDU: Ingesta Tabular (SheetJS) + Reconstrucción 2D (Mozilla PDF.js) + Layout Espacial 2D (docTR / Docling) + Normalizador Numérico Argentino.
              </p>
            </div>
          </div>

          {/* Selector Táctico: Factura de Compra vs Gastos Fijos vs Factura de Venta */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setTipoOperacion('compra_ingreso');
                  setAlertaCentinelaIgnorada(false);
                }}
                className={`cursor-pointer px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                  tipoOperacion === 'compra_ingreso'
                    ? 'bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/50 shadow-[0_0_8px_rgba(0,255,135,0.2)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Suma mercadería física al inventario"
              >
                <ArrowDownLeft className="h-3.5 w-3.5 text-[#00FF87]" />
                <span>📥 Compra (+ Stock)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoOperacion('gasto_operativo');
                  setAlertaCentinelaIgnorada(false);
                }}
                className={`cursor-pointer px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                  tipoOperacion === 'gasto_operativo'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Registra gastos de luz, alquiler, sueldos, agua, etc. Impacta en prorrateo sin alterar stock"
              >
                <Building className="h-3.5 w-3.5 text-amber-400" />
                <span>🏢 Gastos Fijos (Servicios)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoOperacion('venta_egreso');
                  setAlertaCentinelaIgnorada(false);
                }}
                className={`cursor-pointer px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                  tipoOperacion === 'venta_egreso'
                    ? 'bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/50 shadow-[0_0_8px_rgba(0,210,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Descuenta mercadería del inventario y registra la venta"
              >
                <ArrowUpRight className="h-3.5 w-3.5 text-[#00D2FF]" />
                <span>📤 Venta (- Stock)</span>
              </button>
            </div>

            <button
              onClick={() => setMostrarMemoriaModal(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/30 px-3 py-1.5 text-xs font-mono font-bold text-purple-300 hover:border-purple-400 hover:bg-purple-900/40 transition-all shadow-sm"
              title="Ver y administrar las asociaciones y reglas aprendidas por NOST-IA"
            >
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              <span>Memoria ({aprendizajesGlobales.length})</span>
            </button>

            <button
              onClick={() => setMostrarHistorialModal(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono font-bold text-slate-300 hover:border-[#00D2FF] hover:text-[#00D2FF] transition-all"
              title="Ver todas las facturas procesadas y auditar duplicados"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#00D2FF]" />
              <span>Historial ({historialFacturas.length})</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-[#00FF87]/40 bg-[#00FF87]/15 px-3 py-1.5 text-xs font-mono font-bold text-[#00FF87] hover:bg-[#00FF87]/25 shadow-[0_0_10px_rgba(0,255,135,0.15)] transition-all"
              title="Abrir selector para cargar más comprobantes o fotos"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Cargar más facturas</span>
            </button>

            <button
              onClick={onClose}
              className="cursor-pointer text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* GALERÍA / COLA DE ARCHIVOS SUBIDOS (Permite gestionar captura vs factura real) */}
          {colaArchivos.length > 0 && (
            <div className="rounded-xl border border-[#1E293B] bg-[#0E1320] p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Cola de Archivos Cargados ({colaArchivos.length})
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    — Soporta hasta 5 o más archivos de cualquier formato
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {colaArchivos.filter((a) => !a.impactada).length > 1 && (
                    <button
                      onClick={handleImpactarTodasLasFacturas}
                      disabled={cargando}
                      className="cursor-pointer text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-500/20 text-[#00FF87] border border-[#00FF87]/50 hover:bg-emerald-500/30 flex items-center gap-1.5 font-bold shadow-[0_0_12px_rgba(0,255,135,0.25)] transition-all"
                      title="Impactar simultáneamente todas las facturas cargadas en inventario e historial"
                    >
                      <Zap className="h-3.5 w-3.5 text-[#00FF87]" />
                      <span>Impactar Lote ({colaArchivos.filter((a) => !a.impactada).length} facturas)</span>
                    </button>
                  )}
                  {colaArchivos.length > 1 && (
                    <button
                      onClick={handleProcesarTodosEnCola}
                      disabled={cargando}
                      className="cursor-pointer text-xs font-mono px-2.5 py-1 rounded-lg bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/40 hover:bg-[#00D2FF]/30 flex items-center gap-1 transition-colors"
                      title="Procesar automáticamente todos los archivos subidos en lote"
                    >
                      <RefreshCw className="h-3 w-3" /> Re-analizar ({colaArchivos.length})
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer text-xs font-mono text-[#00FF87] hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Agregar más
                  </button>
                </div>
              </div>

              {/* Fila de Tarjetas de Archivos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {colaArchivos.map((item) => {
                  const esActivo = item.id === archivoActivoId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleCambiarArchivoActivo(item.id)}
                      className={`relative cursor-pointer rounded-xl border p-2.5 transition-all flex items-center gap-3 ${
                        esActivo
                          ? 'border-[#00FF87] bg-[#00FF87]/10 shadow-[0_0_12px_rgba(0,255,135,0.25)]'
                          : 'border-[#1E293B] bg-[#141926] hover:border-slate-600 hover:bg-[#182030]'
                      }`}
                    >
                      {/* Miniatura o Ícono con Previsualización Clara de TXT */}
                      <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
                        {item.esTexto ? (
                          <div className="h-full w-full bg-slate-950 p-1 flex flex-col justify-between font-mono text-[8px] text-cyan-300 border border-cyan-500/30">
                            <div className="flex items-center justify-between text-[9px] text-[#00FF87] font-bold">
                              <span>TXT</span>
                              <FileText className="h-3 w-3 text-cyan-400" />
                            </div>
                            <div className="opacity-70 truncate leading-none text-[8px] text-slate-300">
                              {item.contenidoTexto ? item.contenidoTexto.slice(0, 24) : 'Doc Texto'}
                            </div>
                          </div>
                        ) : item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.nombre}
                            className="h-full w-full object-cover"
                          />
                        ) : item.esPdf ? (
                          <FileText className="h-6 w-6 text-red-400" />
                        ) : (
                          <FileText className="h-6 w-6 text-slate-400" />
                        )}
                      </div>

                      {/* Información del archivo */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-bold text-white truncate" title={item.nombre}>
                          {item.nombre}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.tamanoFormateado}
                          </span>
                          {item.impactada ? (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-black">
                              ✓ IMPACTADA
                            </span>
                          ) : item.esCapturaProbable ? (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Captura
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/30">
                              {item.esTexto ? 'Factura TXT' : 'Factura'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botón de Borrar */}
                      <button
                        onClick={(e) => handleEliminarArchivo(item.id, e)}
                        className="cursor-pointer text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                        title="Quitar archivo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Advertencia Resumida si el archivo activo es una captura de pantalla */}
          {facturaParseada && facturaParseada.esComprobanteValido === false && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <p className="text-xs font-mono text-amber-200">
                    <span className="font-bold text-amber-300">Captura detectada: </span>
                    {facturaParseada.mensajeValidacion || 'Selecciona la factura o comprobante original en la lista superior para procesar sus renglones.'}
                  </p>
                </div>
                {colaArchivos.length > 1 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {colaArchivos
                      .filter((a) => a.id !== archivoActivoId)
                      .slice(0, 2)
                      .map((otro) => (
                        <button
                          key={otro.id}
                          onClick={() => handleCambiarArchivoActivo(otro.id)}
                          className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-[#00FF87]/40 bg-[#00FF87]/15 px-2.5 py-1 text-[11px] font-mono font-bold text-[#00FF87] hover:bg-[#00FF87]/25"
                        >
                          <ArrowRight className="h-3 w-3" /> Ver {otro.nombre.slice(0, 18)}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zona de Arrastrar o Cargar cuando no hay archivos o para agregar */}
          {colaArchivos.length === 0 && !facturaParseada && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                arrastrando
                  ? 'border-[#00FF87] bg-[#00FF87]/10 scale-[0.99]'
                  : 'border-[#1E293B] bg-[#0E121E] hover:border-[#00FF87]/50 hover:bg-[#111626]'
              }`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30 mb-4 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
                {cargando ? (
                  <RefreshCw className="h-8 w-8 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
              </div>

              <h3 className="text-base font-bold font-mono text-white">
                {cargando ? etapaAnalisis : 'Arrastra aquí tus Archivos o Comprobantes (hasta 5 o más)'}
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 font-mono max-w-lg">
                Soporta selección de múltiples archivos simultáneos de cualquier formato (PDF, JPG, PNG, TXT, CSV, etc.). También puedes pegar imágenes directamente con <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">Ctrl + V</kbd>.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-mono text-slate-300">
                  📸 Fotos, JPG & PNG
                </span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-mono text-slate-300">
                  📄 Facturas PDF & AFIP
                </span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-mono text-slate-300">
                  📑 Archivos de Texto TXT & CSV
                </span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-mono text-slate-300">
                  📦 Hasta 5+ archivos simultáneos
                </span>
              </div>
            </div>
          )}

          {/* Opciones Rápidas: Pegar Texto o Demo */}
          {colaArchivos.length === 0 && !facturaParseada && (
            <div className="flex flex-col gap-2 rounded-xl border border-[#1E293B] bg-[#0E1320] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300 font-semibold">
                  ¿Deseas pegar el texto del comprobante o probar una factura demo?
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarPegarTexto(!mostrarPegarTexto)}
                  className="cursor-pointer text-xs font-mono text-[#00D2FF] hover:underline"
                >
                  {mostrarPegarTexto ? 'Ocultar caja de texto' : 'Pegar texto directo'}
                </button>
              </div>

              {mostrarPegarTexto && (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    rows={4}
                    placeholder="Ejemplo:&#10;Yerba Mate Orgánica Cooperativa 1kg | Cant: 20 | Unitario: $2100&#10;Aceite de Girasol Primera Prensada 900ml | Cant: 15 | Unitario: $1450"
                    value={textoManual}
                    onChange={(e) => setTextoManual(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-white placeholder-slate-500 focus:border-[#00FF87] focus:outline-none"
                  />
                  <Button variant="cyber" size="sm" onClick={handleProcesarTextoManual}>
                    Interpretar Texto Pegado
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#1E293B] text-xs font-mono text-slate-400 gap-2">
                <span>Cargar comprobante mayorista de ejemplo rápido:</span>
                <button
                  type="button"
                  onClick={() => {
                    const textoSimulado = `FACTURA A 0001-00049281\nPROVEEDOR: Distribuidora Mayorista Central Sur\nCUIT: 30-71234567-8\nFECHA: 2026-09-16\nHarina de Trigo 000 Agroecológica 1kg | Cant: 30 | Unitario: $680\nYerba Mate Orgánica Cooperativa 1kg | Cant: 25 | Unitario: $2100\nFideos Tallarines al Huevo Artesanales 500g | Cant: 20 | Unitario: $850\nAceite de Girasol Primera Prensada 900ml | Cant: 35 | Unitario: $1450\nLeche Entera Fortificada 1L Sachett | Cant: 40 | Unitario: $950`;
                    const res = parsearTextoFactura(
                      textoSimulado,
                      'Factura_Mayorista_Demo.txt',
                      'texto',
                      productosExistentes
                    );
                    setFacturaParseada(res);
                    setProveedorEditado(res.proveedorOEmisor);
                    setNumeroEditado(res.numeroComprobante);
                    setItemsEditables(res.items);
                    const sel: Record<number, boolean> = {};
                    res.items.forEach((_, i) => (sel[i] = true));
                    setItemsSeleccionados(sel);
                    audioFeedback.playBarcodeSuccess();
                  }}
                  className="cursor-pointer rounded border border-[#00FF87]/40 bg-[#00FF87]/10 px-3 py-1 font-bold text-[#00FF87] hover:bg-[#00FF87]/20"
                >
                  Cargar Factura Mayorista Demo
                </button>
              </div>
            </div>
          )}

          {/* VISTA DUAL: VISOR DE IMAGEN ORIGINAL + TABLA DE RENGLONES EXTRAÍDOS */}
          {facturaParseada && (
            <div className="space-y-4">
              {/* Alerta de Cuidado y Aviso de Factura Duplicada */}
              {duplicadaInfo?.esDuplicada && (
                <div className="rounded-2xl border-2 border-amber-500 bg-amber-950/40 p-4 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                      <AlertTriangle className="h-6 w-6 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-mono font-bold text-amber-300 text-sm tracking-wide flex items-center gap-2">
                          ⚠️ ALERTA DE CUIDADO: FACTURA PROBABLEMENTE DUPLICADA
                        </h4>
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500 text-black font-extrabold uppercase">
                          COMPROBANTE REPETIDO
                        </span>
                      </div>
                      <p className="text-xs text-amber-100 font-mono mt-2 leading-relaxed">
                        {duplicadaInfo.motivo}
                      </p>
                      <p className="text-xs text-amber-200/80 mt-1 font-mono">
                        Si vuelves a cargar esta factura, los stocks y costos de reposición se sumarán nuevamente al inventario. Si decides subirla de todos modos, quedará registrada con una advertencia visual permanente en el Dashboard y en el Historial para su debida auditoría contable.
                      </p>

                      <div className="mt-3 pt-3 border-t border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-mono font-bold text-amber-300 bg-amber-500/15 px-3 py-2 rounded-xl border border-amber-500/40 hover:bg-amber-500/25 transition-all">
                          <input
                            type="checkbox"
                            checked={forzarSubidaDuplicada}
                            onChange={(e) => setForzarSubidaDuplicada(e.target.checked)}
                            className="rounded border-amber-500 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                          />
                          <span>Marcar y permitir ingresar esta factura duplicada bajo conocimiento del comerciante</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setMostrarHistorialModal(true)}
                          className="cursor-pointer text-xs font-mono text-[#00D2FF] hover:underline flex items-center gap-1 font-bold"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          Ver Historial de Facturas
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alerta Centinela Anti-Error Humano (Mismatch de Sección / Servicio vs Mercadería) */}
              {alertaCentinela && (
                <div className="rounded-2xl border-2 border-amber-500/80 bg-amber-950/60 p-4 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-fade-in backdrop-blur-md">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                        <ShieldAlert className="h-6 w-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-mono font-bold text-amber-300 text-sm tracking-wide">
                            {alertaCentinela.titulo}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500 text-black font-extrabold uppercase">
                            CENTINELA PREVENTIVO
                          </span>
                        </div>
                        <p className="text-xs text-amber-100 font-mono mt-1.5 leading-relaxed">
                          {alertaCentinela.mensaje}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end md:self-center">
                      {alertaCentinela.seccionSugerida && (
                        <button
                          type="button"
                          onClick={() => {
                            setTipoOperacion(alertaCentinela.seccionSugerida!);
                            if (alertaCentinela.categoriaGastoSugerida) {
                              setCategoriaGastoSeleccionada(alertaCentinela.categoriaGastoSugerida);
                            }
                            setAlertaCentinelaIgnorada(true);
                            audioFeedback.playBarcodeSuccess();
                          }}
                          className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-mono font-extrabold text-black hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all"
                        >
                          <Zap className="h-4 w-4" />
                          <span>{alertaCentinela.accionRecomendadaTexto || 'Cambiar Sección Automáticamente'}</span>
                        </button>
                      )}

                      {alertaCentinela.puedeForzar && (
                        <button
                          type="button"
                          onClick={() => setAlertaCentinelaIgnorada(true)}
                          className="cursor-pointer text-xs font-mono text-amber-300/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          Continuar de todos modos
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de Datos del Comprobante */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1E293B] bg-[#0E1320] p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={duplicadaInfo?.esDuplicada ? 'danger' : 'green'}>
                    {duplicadaInfo?.esDuplicada
                      ? '⚠️ DUPLICADA'
                      : (facturaParseada.metodoLectura === 'gemini_vision' ? '✨ IA MULTIMODAL' : 'OFFLINE')}
                  </Badge>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Emisor / Proveedor:</span>
                    <input
                      type="text"
                      value={proveedorEditado}
                      onChange={(e) => setProveedorEditado(e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs font-mono font-bold text-[#00D2FF] focus:border-[#00FF87] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Comprobante N°:</span>
                    <input
                      type="text"
                      value={numeroEditado}
                      onChange={(e) => setNumeroEditado(e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs font-mono font-bold text-white focus:border-[#00FF87] focus:outline-none"
                    />
                  </div>

                  {facturaParseada.fecha && (
                    <span className="text-xs font-mono text-slate-400">
                      Fecha: <strong className="text-slate-200">{facturaParseada.fecha}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(archivoActivo?.previewUrl || archivoActivo?.esTexto || archivoActivo?.contenidoTexto) && (
                    <button
                      onClick={() => setMostrarVisorSplit(!mostrarVisorSplit)}
                      className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {mostrarVisorSplit ? 'Ocultar Documento' : 'Ver Documento'}
                    </button>
                  )}
                  <button
                    onClick={() => setMostrarPegarTexto(!mostrarPegarTexto)}
                    className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-white"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#00D2FF]" />
                    {mostrarPegarTexto ? 'Ocultar Caja de Texto' : 'Pegar / Ajustar Texto'}
                  </button>
                  <button
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#00FF87]/40 bg-[#00FF87]/15 px-3 py-1.5 text-xs font-mono font-bold text-[#00FF87] hover:bg-[#00FF87]/25 shadow-[0_0_8px_rgba(0,255,135,0.2)] transition-all"
                    title="Cargar otra factura o comprobante"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Cargar más facturas</span>
                  </button>
                </div>
              </div>

              {/* Caja de Pegado / Edición Rápida de Texto si está activa */}
              {mostrarPegarTexto && (
                <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      Pegar texto plano, tabla ASCII o CSV del comprobante:
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Formato de tabla con barras '|', comas o espacios
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Ejemplo:&#10;| 10 | Harina 000 (50kg) | 8.100,00 | 81.000,00 |&#10;| 5  | Harina 0000 (50kg) | 8.800,00 | 44.000,00 |&#10;| 10 | Aceite (bidón 5L)  | 1.400,00 | 14.000,00 |"
                    value={textoManual}
                    onChange={(e) => setTextoManual(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-white placeholder-slate-500 focus:border-[#00FF87] focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="cyber" size="sm" onClick={handleProcesarTextoManual}>
                      Interpretar y Actualizar Renglones
                    </Button>
                  </div>
                </div>
              )}

              {/* Layout Dividido: Visor de Imagen / PDF / TXT a la izquierda, Tabla a la derecha */}
              <div className={`grid gap-4 ${mostrarVisorSplit && (archivoActivo?.previewUrl || archivoActivo?.esTexto || archivoActivo?.esPdf) ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
                {/* Panel de Visualización del Documento Original */}
                {mostrarVisorSplit && (archivoActivo?.previewUrl || archivoActivo?.esTexto || archivoActivo?.esPdf) && (
                  <div className="lg:col-span-5 rounded-xl border border-[#1E293B] bg-[#07090F] p-3 flex flex-col h-[540px]">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1E293B] text-xs font-mono text-slate-400">
                      <div className="flex items-center gap-1.5 truncate max-w-[220px]" title={archivoActivo.nombre}>
                        {archivoActivo.esTexto ? (
                          <FileText className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5 text-[#00FF87] shrink-0" />
                        )}
                        <span className="font-bold text-white truncate">
                          {archivoActivo.nombre}
                        </span>
                        {archivoActivo.esTexto && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            TXT
                          </span>
                        )}
                        {facturaParseada?.esPdfFotografico && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30" title="PDF generado a partir de una foto o escaneo (procesado con Visión/OCR)">
                            PDF Foto
                          </span>
                        )}
                      </div>

                      {archivoActivo.esTexto ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTamanoFuenteTxt((prev) => Math.max(10, prev - 1))}
                            className="cursor-pointer px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono"
                            title="Disminuir tamaño de letra (A-)"
                          >
                            A-
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {tamanoFuenteTxt}px
                          </span>
                          <button
                            type="button"
                            onClick={() => setTamanoFuenteTxt((prev) => Math.min(18, prev + 1))}
                            className="cursor-pointer px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono"
                            title="Aumentar tamaño de letra (A+)"
                          >
                            A+
                          </button>
                          <button
                            type="button"
                            onClick={handleCopiarTextoTxt}
                            className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors flex items-center gap-1 text-[11px]"
                            title="Copiar texto al portapapeles"
                          >
                            {textoCopiadoFeedback ? (
                              <Check className="h-3.5 w-3.5 text-[#00FF87]" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          {(archivoActivo.originalBlobUrl || archivoActivo.previewUrl) && (
                            <a
                              href={archivoActivo.originalBlobUrl || archivoActivo.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={archivoActivo.nombre}
                              className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="Abrir o descargar archivo original"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setZoomNivel((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                            className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            title="Alejar (-)"
                          >
                            <ZoomOut className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoomNivel(1.0)}
                            className="cursor-pointer px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] transition-colors"
                            title="Restablecer tamaño (100%)"
                          >
                            {Math.round(zoomNivel * 100)}%
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoomNivel((z) => Math.min(3.0, Math.round((z + 0.25) * 100) / 100))}
                            className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            title="Acercar (+)"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRotacion((r) => (r + 90) % 360)}
                            className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            title="Rotar 90°"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          {(archivoActivo.originalBlobUrl || archivoActivo.previewUrl) && (
                            <a
                              href={archivoActivo.originalBlobUrl || archivoActivo.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="Abrir archivo original en pestaña nueva"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Si es Archivo de Texto: Buscador de texto interno */}
                    {archivoActivo.esTexto && (
                      <div className="pt-2 pb-1.5">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar en el comprobante TXT..."
                            value={filtroTextoVisor}
                            onChange={(e) => setFiltroTextoVisor(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-8 pr-3 py-1 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                          />
                          {filtroTextoVisor && (
                            <button
                              onClick={() => setFiltroTextoVisor('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contenedor del visor: Si es texto, renderizar consola de texto plano con numeración; si no, imagen/PDF */}
                    {archivoActivo.esTexto ? (
                      <div className="flex-1 overflow-auto rounded-lg bg-[#030712] p-2.5 border border-slate-800 select-text font-mono">
                        {(() => {
                          const texto = archivoActivo.contenidoTexto || '';
                          if (!texto) {
                            return (
                              <div className="flex h-full items-center justify-center text-slate-500 text-xs italic">
                                Cargando texto del comprobante...
                              </div>
                            );
                          }
                          const lineas = texto.split(/\r?\n/);
                          const lineasFiltradas = filtroTextoVisor
                            ? lineas.map((linea, idx) => ({ linea, num: idx + 1 })).filter((item) =>
                                item.linea.toLowerCase().includes(filtroTextoVisor.toLowerCase())
                              )
                            : lineas.map((linea, idx) => ({ linea, num: idx + 1 }));

                          return (
                            <div className="min-w-full inline-block" style={{ fontSize: `${tamanoFuenteTxt}px`, lineHeight: 1.6 }}>
                              {lineasFiltradas.length === 0 ? (
                                <p className="text-amber-400 p-2">
                                  No se encontraron coincidencias para "{filtroTextoVisor}".
                                </p>
                              ) : (
                                lineasFiltradas.map(({ linea, num }) => {
                                  const esCabecera =
                                    linea.includes('---') ||
                                    linea.includes('===') ||
                                    linea.toUpperCase().includes('FACTURA') ||
                                    linea.toUpperCase().includes('TOTAL') ||
                                    linea.toUpperCase().includes('CANTIDAD');
                                  const tienePrecio = linea.includes('$') || /\d+[.,]\d{2}/.test(linea);

                                  return (
                                    <div
                                      key={num}
                                      className={`flex items-start hover:bg-slate-800/40 rounded px-1 transition-colors ${
                                        esCabecera ? 'text-cyan-300 font-bold' : tienePrecio ? 'text-emerald-200' : 'text-slate-200'
                                      }`}
                                    >
                                      <span className="w-9 shrink-0 select-none text-right pr-3 text-slate-600 font-mono text-[11px] opacity-75">
                                        {num}
                                      </span>
                                      <span className="whitespace-pre flex-1 font-mono">
                                        {linea || ' '}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : !archivoActivo.previewUrl ? (
                      <div className="flex-1 overflow-auto rounded-lg bg-[#030712] p-6 flex flex-col items-center justify-center border border-slate-900 text-center font-mono">
                        <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
                        <span className="text-xs text-slate-300 font-bold">
                          Renderizando página del comprobante PDF...
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1 max-w-[260px]">
                          Generando imagen de alta definición para previsualización interactiva con zoom y rotación
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto rounded-lg bg-[#030712] p-3 relative flex items-start justify-center border border-slate-900 select-none">
                        <div
                          style={{
                            width: `${Math.round(zoomNivel * 100)}%`,
                            minWidth: `${Math.round(zoomNivel * 320)}px`,
                            maxWidth: zoomNivel <= 1 ? '100%' : 'none',
                            transform: `rotate(${rotacion}deg)`,
                            transformOrigin: 'top center',
                            transition: 'width 0.15s ease-out, transform 0.2s ease',
                          }}
                          className="flex flex-col items-center"
                        >
                          <img
                            src={archivoActivo.previewUrl}
                            alt="Comprobante original"
                            className="w-full h-auto object-contain rounded shadow-2xl border border-slate-800 pointer-events-auto"
                            draggable={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Panel de Tabla de Renglones Extraídos o Formulario de Gasto */}
                <div className={mostrarVisorSplit && (archivoActivo?.previewUrl || archivoActivo?.esTexto || archivoActivo?.esPdf) ? 'lg:col-span-7' : 'w-full'}>
                  {tipoOperacion === 'gasto_operativo' ? (
                    <div className="rounded-xl border border-amber-500/40 bg-[#07090F] p-5 space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-amber-400" />
                          <span className="text-sm font-bold font-mono text-white">
                            Registro de Gasto Fijo Operativo / Servicios
                          </span>
                        </div>
                        <Badge variant="amber" className="text-[10px] font-mono font-bold uppercase">
                          CERO IMPACTO EN STOCK
                        </Badge>
                      </div>

                      {/* Selector de Categoría con Botones e Íconos */}
                      <div className="space-y-2">
                        <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                          <span>Categoría del Servicio o Gasto:</span>
                          <span className="text-[10px] text-amber-300 font-normal">
                            Selecciona para clasificar en el Resumen Mensual
                          </span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { id: 'luz', label: '⚡ Luz / Edenor', icon: Zap },
                            { id: 'gas', label: '🔥 Gas Natural', icon: Flame },
                            { id: 'agua', label: '💧 Agua y Cloacas', icon: Droplets },
                            { id: 'internet', label: '🌐 Internet / Tel', icon: Wifi },
                            { id: 'alquiler', label: '🏢 Alquiler Local', icon: Building },
                            { id: 'salarios', label: '👥 Salarios / Sueldos', icon: Users },
                            { id: 'mantenimiento', label: '🔧 Mantenimiento', icon: Wrench },
                            { id: 'impuestos_tasas', label: '🏛️ Tasas / Impuestos', icon: Scale },
                            { id: 'otros', label: '📦 Otros Gastos', icon: Receipt },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setCategoriaGastoSeleccionada(cat.id as CategoriaGastoFijo)}
                              className={`cursor-pointer p-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                                categoriaGastoSeleccionada === cat.id
                                  ? 'border-amber-400 bg-amber-500/25 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                  : 'border-slate-800 bg-[#0E121E] text-slate-400 hover:text-white hover:border-slate-700'
                              }`}
                            >
                              <cat.icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Monto Total y Datos del Comprobante */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="rounded-xl border border-slate-800 bg-[#0E121E] p-4">
                          <label className="text-xs font-mono text-slate-400 block mb-1">
                            Importe Total del Comprobante ($):
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-amber-400 font-mono">$</span>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={montoGastoEditado || ''}
                              onChange={(e) => setMontoGastoEditado(Number(e.target.value))}
                              placeholder="0.00"
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-8 pr-4 py-2 font-mono text-xl font-bold text-amber-300 focus:border-amber-400 focus:outline-none"
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 mt-1 block">
                            Importe a imputar en los costos fijos del mes
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-[#0E121E] p-4 flex flex-col justify-between">
                          <div>
                            <span className="text-[11px] font-mono text-slate-400 uppercase">Prestador & Comprobante:</span>
                            <div className="text-sm font-mono font-bold text-white mt-1 truncate">
                              {proveedorEditado || facturaParseada?.proveedorOEmisor || 'Prestador de Servicios'}
                            </div>
                            <div className="text-xs font-mono text-cyan-300 mt-0.5">
                              N° {numeroEditado || facturaParseada?.numeroComprobante || 'S/N'}
                            </div>
                          </div>
                          <div className="text-[11px] font-mono text-emerald-400 mt-2">
                            ✓ No generará productos falsos en stock
                          </div>
                        </div>
                      </div>

                      {/* Blindaje Contable Soberano */}
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1.5 font-mono text-xs text-emerald-200">
                        <div className="flex items-center gap-2 font-bold text-emerald-300">
                          <ShieldAlert className="h-4 w-4" />
                          Garantía Contable y Protección de Inventario
                        </div>
                        <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                          • <strong>Sin stock espurio:</strong> Edenor, Metrogas o Telecom nunca ingresarán como mercadería vendible.<br />
                          • <strong>Impacto en Resumen Mensual:</strong> Se suma a la suma total de egresos fijos del mes.<br />
                          • <strong>Prorrateo Automático:</strong> Este costo se distribuye en cada unidad para darte el precio de venta real sugerido.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#1E293B] bg-[#07090F] overflow-hidden">
                      <div className="flex items-center justify-between bg-[#0E121E] px-4 py-2.5 border-b border-[#1E293B]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                          Líneas de Mercadería Facturadas ({itemsEditables.length})
                        </span>
                        <button
                          onClick={handleAgregarItemManual}
                          className="cursor-pointer text-[11px] font-mono text-[#00FF87] hover:underline flex items-center gap-1 ml-2"
                        >
                          <Plus className="h-3 w-3" /> Agregar línea
                        </button>
                        <button
                          onClick={handleDepurarCodigos}
                          className="cursor-pointer text-[11px] font-mono text-[#00D2FF] hover:underline flex items-center gap-1 ml-2"
                          title="Desacoplar códigos de barras incrustados en nombres y revincular con el catálogo"
                        >
                          <Sparkles className="h-3 w-3" /> Separar Códigos
                        </button>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Podes editar cantidades, costos y códigos antes de impactar
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#0D111A] text-slate-400 uppercase tracking-wider border-b border-[#1E293B] sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5 w-8 text-center">Sel</th>
                            <th className="p-2.5">Descripción / Producto</th>
                            <th className="p-2.5 w-24">SKU</th>
                            <th className="p-2.5 text-center w-20">Cant.</th>
                            <th className="p-2.5 text-right w-24">Costo ($)</th>
                            <th className="p-2.5 text-right w-24">Subtotal ($)</th>
                            <th className="p-2.5 text-center w-20">Catálogo</th>
                            <th className="p-2.5 w-8 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E293B]">
                          {itemsEditables.map((item, idx) => {
                            const seleccionado = itemsSeleccionados[idx] ?? true;
                            return (
                              <tr
                                key={idx}
                                className={`transition-colors ${
                                  seleccionado
                                    ? 'bg-transparent hover:bg-slate-900/50'
                                    : 'opacity-40 bg-slate-950'
                                }`}
                              >
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={seleccionado}
                                    onChange={() => handleToggleSeleccion(idx)}
                                    className="cursor-pointer rounded border-slate-700 text-[#00FF87] focus:ring-0"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={item.descripcion}
                                    onChange={(e) =>
                                      handleUpdateItem(idx, 'descripcion', e.target.value)
                                    }
                                    className="w-full rounded border border-slate-800 bg-slate-900/80 px-2 py-1 text-white font-medium focus:border-[#00FF87] focus:outline-none"
                                  />
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                    <span>Código EAN:</span>
                                    <input
                                      type="text"
                                      value={item.codigo || ''}
                                      onChange={(e) => handleUpdateItem(idx, 'codigo', e.target.value)}
                                      className="rounded border border-slate-800 bg-slate-950 px-1 py-0.2 text-[10px] text-slate-300 w-28 focus:border-[#00FF87] focus:outline-none"
                                    />
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    placeholder="SKU..."
                                    value={item.sku || ''}
                                    onChange={(e) => handleUpdateItem(idx, 'sku', e.target.value)}
                                    className="w-24 rounded border border-slate-800 bg-slate-900/80 px-1.5 py-1 text-[11px] text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
                                  />
                                </td>
                                <td className="p-2.5 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.cantidad}
                                    onChange={(e) =>
                                      handleUpdateItem(
                                        idx,
                                        'cantidad',
                                        Math.max(1, parseInt(e.target.value) || 1)
                                      )
                                    }
                                    className="w-16 rounded border border-slate-800 bg-slate-900/80 px-1.5 py-1 text-center text-white focus:border-[#00FF87] focus:outline-none"
                                  />
                                </td>
                                <td className="p-2.5 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.precioUnitario}
                                    onChange={(e) =>
                                      handleUpdateItem(
                                        idx,
                                        'precioUnitario',
                                        Math.max(0, parseFloat(e.target.value) || 0)
                                      )
                                    }
                                    className="w-20 rounded border border-slate-800 bg-slate-900/80 px-1.5 py-1 text-right text-white focus:border-[#00FF87] focus:outline-none"
                                  />
                                </td>
                                <td className="p-2.5 text-right font-bold text-[#00FF87]">
                                  ${item.subtotal.toLocaleString('es-AR')}
                                </td>
                                <td className="p-2.5 text-center">
                                  {item.esAprendido ? (
                                    <span
                                      className="inline-flex items-center gap-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 text-[10px] font-mono font-bold shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                                      title={item.origenAprendizaje || 'Reconocido por aprendizaje de correcciones previas'}
                                    >
                                      🧠 Aprendido
                                    </span>
                                  ) : item.esNuevoProducto ? (
                                    <Badge variant="blue">+ Nuevo</Badge>
                                  ) : (
                                    <Badge variant="green">Existente</Badge>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    onClick={() => handleEliminarItem(idx)}
                                    className="cursor-pointer text-slate-400 hover:text-rose-400 p-1 rounded"
                                    title="Quitar línea"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {itemsEditables.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">
                                <p className="text-xs font-mono font-semibold text-slate-300">
                                  No se detectaron renglones automáticos en este comprobante.
                                </p>
                                <p className="text-[11px] font-mono text-slate-400 mt-1">
                                  Puedes ingresar los artículos manualmente o abrir la caja de texto para pegarlos.
                                </p>
                                <div className="mt-3 flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleAgregarItemManual}
                                    className="cursor-pointer rounded border border-[#00FF87]/40 bg-[#00FF87]/15 px-3 py-1.5 text-xs font-mono font-bold text-[#00FF87] hover:bg-[#00FF87]/25 inline-flex items-center gap-1"
                                  >
                                    <Plus className="h-3.5 w-3.5" /> Agregar renglón manual
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMostrarPegarTexto(true)}
                                    className="cursor-pointer rounded border border-[#00D2FF]/40 bg-[#00D2FF]/15 px-3 py-1.5 text-xs font-mono font-bold text-[#00D2FF] hover:bg-[#00D2FF]/25 inline-flex items-center gap-1"
                                  >
                                    <FileText className="h-3.5 w-3.5" /> Pegar texto de comprobante
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* PANEL INFERIOR DE IMPACTO DIRECTO AL STOCK O REGISTRO DE GASTO */}
              {tipoOperacion === 'gasto_operativo' ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/40 bg-amber-950/30 p-4">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-amber-300">
                      Gasto Operativo a Registrar ({categoriaGastoSeleccionada.toUpperCase()}):
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-200">
                      ${(montoGastoEditado || facturaParseada?.totalCalculado || 0).toLocaleString('es-AR')}
                    </div>
                    <div className="text-xs font-mono text-slate-300 mt-0.5">
                      Impacto cero en existencias de stock • Se imputa en el Resumen Mensual y Prorrateo de Costos Fijos
                    </div>
                  </div>

                  <Button
                    variant="cyber"
                    size="lg"
                    onClick={handleConfirmarImpacto}
                    disabled={montoGastoEditado <= 0 && (!facturaParseada || facturaParseada.totalCalculado <= 0)}
                    icon={<Building className="h-5 w-5 text-black" />}
                    className="font-bold shadow-[0_0_15px_rgba(245,158,11,0.35)] bg-amber-400 text-black hover:bg-amber-300 border-amber-300"
                  >
                    Confirmar y Registrar Gasto Fijo (${(montoGastoEditado || facturaParseada?.totalCalculado || 0).toLocaleString('es-AR')})
                  </Button>
                </div>
              ) : (
                <div
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                    tipoOperacion === 'venta_egreso'
                      ? 'border-[#00D2FF]/40 bg-[#00D2FF]/10'
                      : 'border-[#00FF87]/30 bg-[#00FF87]/10'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <div
                        className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                          tipoOperacion === 'venta_egreso' ? 'text-[#00D2FF]' : 'text-[#00FF87]'
                        }`}
                      >
                        {tipoOperacion === 'venta_egreso'
                          ? 'Total Facturado en Venta a Descontar:'
                          : 'Total a Incorporar al Inventario:'}
                      </div>
                      <div className="text-2xl font-bold font-mono text-white">
                        ${totalMercaderiaSeleccionada.toLocaleString('es-AR')}
                      </div>
                    </div>

                    <div className="border-l border-slate-700/50 pl-4 hidden sm:block">
                      <div className="text-[11px] font-mono text-slate-400">
                        Renglones seleccionados:{' '}
                        <strong className="text-white">
                          {itemsEditables.filter((_, i) => itemsSeleccionados[i]).length}
                        </strong>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Total unidades a {tipoOperacion === 'venta_egreso' ? 'descontar' : 'sumar'}:{' '}
                        <strong
                          className={tipoOperacion === 'venta_egreso' ? 'text-rose-400' : 'text-[#00FF87]'}
                        >
                          {tipoOperacion === 'venta_egreso' ? '-' : '+'}
                          {cantidadTotalUnidades} unid.
                        </strong>
                      </div>
                      {tipoOperacion === 'compra_ingreso' && cantNuevosProductos > 0 && (
                        <div className="text-[11px] font-mono text-[#00FF87]">
                          + {cantNuevosProductos} productos nuevos a dar de alta
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Botón Maestro en Lote cuando hay más de 1 comprobante */}
                    {colaArchivos.length > 1 && (
                      <Button
                        variant="cyber"
                        size="lg"
                        onClick={handleImpactarTodasLasFacturas}
                        disabled={cargando || colaArchivos.filter((a) => !a.impactada).length === 0}
                        icon={<Zap className="h-5 w-5 text-black" />}
                        className="font-bold shadow-[0_0_20px_rgba(0,255,135,0.35)]"
                      >
                        ⚡ Impactar TODAS las Facturas ({colaArchivos.filter((a) => !a.impactada).length} pendientes) al Inventario + Historial
                      </Button>
                    )}

                    {/* Botón para Comprobante Individual */}
                    <Button
                      variant={
                        duplicadaInfo?.esDuplicada
                          ? 'danger'
                          : colaArchivos.length > 1
                          ? 'outline'
                          : tipoOperacion === 'venta_egreso'
                          ? 'primary'
                          : 'cyber'
                      }
                      size={colaArchivos.length > 1 ? 'md' : 'lg'}
                      onClick={handleConfirmarImpacto}
                      disabled={
                        itemsEditables.filter((_, i) => itemsSeleccionados[i]).length === 0 ||
                        (Boolean(duplicadaInfo?.esDuplicada) && !forzarSubidaDuplicada)
                      }
                      icon={
                        duplicadaInfo?.esDuplicada ? (
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        ) : tipoOperacion === 'venta_egreso' ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5" />
                        )
                      }
                    >
                      {duplicadaInfo?.esDuplicada
                        ? (!forzarSubidaDuplicada
                            ? '⚠️ Tildar casilla de duplicada para procesar'
                            : '⚠️ Confirmar e Impactar Factura DUPLICADA')
                        : colaArchivos.length > 1
                        ? tipoOperacion === 'venta_egreso'
                          ? `Impactar Solo Esta Venta (${colaArchivos.findIndex((a) => a.id === archivoActivoId) + 1} de ${colaArchivos.length})`
                          : `Impactar Solo Esta Factura (${colaArchivos.findIndex((a) => a.id === archivoActivoId) + 1} de ${colaArchivos.length})`
                        : tipoOperacion === 'venta_egreso'
                        ? 'Impactar Venta y Descontar Stock'
                        : 'Impactar Directamente en Stock (+)'}
                    </Button>
                  </div>
                </div>
              )}

              {mensajeExito && (
                <div
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-mono animate-pulse ${
                    tipoOperacion === 'venta_egreso'
                      ? 'border-[#00D2FF] bg-[#00D2FF]/20 text-[#00D2FF]'
                      : 'border-[#00FF87] bg-[#00FF87]/20 text-[#00FF87]'
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-bold">{mensajeExito}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Historial de Facturas */}
      {mostrarHistorialModal && (
        <InvoiceHistoryModal
          facturas={historialFacturas}
          onClose={() => setMostrarHistorialModal(false)}
        />
      )}

      {/* Modal de Memoria de Aprendizaje Adaptativo */}
      {mostrarMemoriaModal && (
        <MemoriaAprendizajeModal
          onClose={() => setMostrarMemoriaModal(false)}
          onActualizado={recargarAprendizajes}
        />
      )}
    </div>
  );
};
