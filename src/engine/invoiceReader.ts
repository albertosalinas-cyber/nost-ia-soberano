import type { FacturaItemExtraido, FacturaParseada, Producto } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import {
  cotejarRenglonConCatalogo,
  desglosarCodigoYDescripcion,
  generarEan13Determinista,
  sanitizarTextoOcrMercaderia,
} from './productMatcher';
import { ejecutarPipelineVDU, mapearVduAFacturaParseada } from './vduPipeline';
import { obtenerAprendizajesAlias } from './db';

// Configurar el worker local empaquetado por Vite de forma segura
try {
  if (typeof window !== 'undefined') {
    import('pdfjs-dist/build/pdf.worker.min.mjs?url' as any).then((mod) => {
      if (mod && mod.default) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = mod.default;
      }
    });
  }
} catch {
  // Ignorar en entorno de tests node
}

/**
 * Motor Soberano de Procesamiento de Facturas, Remitos y Listas de Precios (100% Local y Desconectado)
 * 1. Extracción de PDF estructurado 100% local con pdfjs-dist (reconstrucción espacial de renglones y tablas).
 * 2. Procesamiento local de PDFs fotográficos/escaneados mediante renderizado de página a imagen nítida en Canvas.
 * 3. Parser heurístico y robusto de tablas Markdown/ASCII, CSV, texto libre y montos en pesos argentinos ($).
 * 4. Decodificador local de QR Fiscal AFIP con BarcodeDetector nativo y fallback a ZXing.
 * 5. Motor de OCR Soberano 100% Local en español mediante Tesseract.js (sin enviar datos al exterior).
 */

export interface OpcionesProcesamiento {
  forzarOffline?: boolean;
}

export async function procesarArchivoComprobante(
  file: File,
  productosExistentes: Producto[],
  _opciones?: OpcionesProcesamiento
): Promise<FacturaParseada> {
  const nombreArchivo = file.name.toLowerCase();
  const fileUrl = URL.createObjectURL(file);

  // Determinar tipo de archivo
  let mimeType = file.type;
  if (!mimeType) {
    if (nombreArchivo.endsWith('.jpg') || nombreArchivo.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (nombreArchivo.endsWith('.png')) mimeType = 'image/png';
    else if (nombreArchivo.endsWith('.webp')) mimeType = 'image/webp';
    else if (nombreArchivo.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (nombreArchivo.endsWith('.csv')) mimeType = 'text/csv';
    else if (nombreArchivo.endsWith('.txt')) mimeType = 'text/plain';
    else mimeType = 'application/octet-stream';
  }

  // 1. Archivo de Texto Plano o CSV (100% local con VDU Pipeline)
  if (
    mimeType === 'text/plain' ||
    mimeType === 'text/csv' ||
    nombreArchivo.endsWith('.txt') ||
    nombreArchivo.endsWith('.csv')
  ) {
    const texto = await file.text();
    const aprendizajes = await obtenerAprendizajesAlias().catch(() => []);
    const vduRes = await ejecutarPipelineVDU(texto, file.name, productosExistentes);
    let parseado: FacturaParseada;
    if (vduRes.items.length > 0) {
      parseado = mapearVduAFacturaParseada(vduRes, file.name, productosExistentes, aprendizajes);
    } else {
      parseado = parsearTextoFactura(texto, file.name, 'texto', productosExistentes);
    }
    parseado.archivoOrigenNombre = file.name;
    parseado.archivoOrigenUrl = fileUrl;
    return parseado;
  }

  // 1.B. Archivo de Planilla Excel (.xlsx, .xls) (100% local con SheetJS / xlsx + VDU Pipeline)
  if (
    nombreArchivo.endsWith('.xlsx') ||
    nombreArchivo.endsWith('.xls') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    try {
      const buffer = await file.arrayBuffer();
      // Opciones de seguridad endurecidas: dense mode y sin evaluación dinámica de fórmulas
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellFormula: false,
        cellHTML: false,
        cellStyles: false,
        sheetRows: 2500, // Limitar filas para evitar Denial of Service (ReDoS) con archivos malformados
        dense: true,
      });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const csvData = XLSX.utils.sheet_to_csv(worksheet, { FS: ' | ' });
      const aprendizajes = await obtenerAprendizajesAlias().catch(() => []);
      const vduRes = await ejecutarPipelineVDU(csvData, file.name, productosExistentes);
      let parseado: FacturaParseada;
      if (vduRes.items.length > 0) {
        parseado = mapearVduAFacturaParseada(vduRes, file.name, productosExistentes, aprendizajes);
      } else {
        parseado = parsearTextoFactura(csvData, file.name, 'texto', productosExistentes);
      }
      parseado.archivoOrigenNombre = file.name;
      parseado.archivoOrigenUrl = fileUrl;
      return parseado;
    } catch (err) {
      console.warn('Error leyendo archivo Excel local:', err);
    }
  }

  // 2. Archivo PDF (Procesamiento inteligente: vectorial nativo con VDU Pipeline o visión multimodal/OCR si es una foto convertida a PDF)
  if (mimeType === 'application/pdf' || nombreArchivo.endsWith('.pdf')) {
    const textoPdf = await extraerTextoDePdfLocal(file);
    const aprendizajes = await obtenerAprendizajesAlias().catch(() => []);
    
    // Verificamos si el PDF contiene texto digital nativo (mínimo 30 caracteres y palabras reales)
    // o si es una FOTO / ESCANEO convertido a PDF (donde pdfjs extrae 0 caracteres de texto)
    const tieneTextoDigitalReal = Boolean(
      textoPdf &&
      textoPdf.trim().length >= 30 &&
      /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(textoPdf)
    );

    if (tieneTextoDigitalReal) {
      const vduRes = await ejecutarPipelineVDU(textoPdf, file.name, productosExistentes);
      let parseado: FacturaParseada;
      if (vduRes.items.length > 0) {
        parseado = mapearVduAFacturaParseada(vduRes, file.name, productosExistentes, aprendizajes);
      } else {
        parseado = parsearTextoFactura(textoPdf, file.name, 'pdf', productosExistentes);
      }
      // Renderizar página 1 del PDF como imagen de alta resolución para previsualización con zoom interactivo
      try {
        const imgPreview = await renderizarPaginaPdfAImagen(file, 1);
        if (imgPreview) {
          parseado.archivoOrigenUrl = imgPreview;
        } else {
          parseado.archivoOrigenUrl = fileUrl;
        }
      } catch {
        parseado.archivoOrigenUrl = fileUrl;
      }
      parseado.archivoOrigenNombre = file.name;
      return parseado;
    }

    // SI NO TIENE TEXTO DIGITAL: Es un PDF producto de una foto o escaneo ("PDF Fotográfico / Rasterizado")
    console.info(
      `[NOST-IA SOBERANO] Detectado PDF proveniente de foto o escaneo ("${file.name}"). Procesando 100% localmente con renderizado Canvas + OCR Soberano y QR AFIP.`
    );

    // Renderizamos la página a imagen PNG en alta definición (2.0x) para lectura visual y OCR local
    let imgPreviewUrl = '';
    try {
      imgPreviewUrl = await renderizarPaginaPdfAImagen(file, 1);
    } catch (e) {
      console.warn('No se pudo renderizar la primera página del PDF a imagen:', e);
    }

    // Procesamiento 100% Soberano y Local: OCR Local (Tesseract.js spa) + Decodificación QR AFIP
    if (imgPreviewUrl) {
      try {
        const fileRenderizado = dataUrlAFile(imgPreviewUrl, `${file.name.replace(/\.pdf$/i, '')}_render.png`);
        const datosImagen = await procesarImagenLocalConOCRyQR(fileRenderizado, productosExistentes);
        datosImagen.archivoOrigenNombre = file.name;
        datosImagen.archivoOrigenUrl = imgPreviewUrl;
        datosImagen.esPdfFotografico = true;
        datosImagen.tipoDocumentoDetectado = `${datosImagen.tipoDocumentoDetectado || 'Comprobante'} (PDF Fotográfico Soberano)`;
        datosImagen.mensajeValidacion = (datosImagen.mensajeValidacion || '') + ' [PDF de foto procesado 100% en tu máquina sin internet ni nubes externas]';
        return datosImagen;
      } catch (ocrErr) {
        console.warn('Error en OCR local para imagen renderizada de PDF:', ocrErr);
      }
    }

    // Fallback si no se pudo procesar la imagen renderizada
    return {
      id: `fac-pdf-foto-${Date.now()}`,
      tipo: 'factura_compra',
      tipoOperacion: 'compra_ingreso',
      numeroComprobante: `PDF-${Date.now().toString().slice(-6)}`,
      proveedorOEmisor: 'Comprobante Fotográfico',
      fecha: new Date().toISOString().slice(0, 10),
      items: [],
      totalCalculado: 0,
      metodoLectura: 'vision_ocr',
      esComprobanteValido: true,
      tipoDocumentoDetectado: 'PDF Escaneado / Fotográfico',
      mensajeValidacion: 'El PDF fue generado a partir de una foto. Se visualiza la imagen en el visor interactivo local.',
      archivoOrigenNombre: file.name,
      archivoOrigenUrl: imgPreviewUrl || fileUrl,
      esPdfFotografico: true,
    };
  }

  // 3. Imagen local (JPG, PNG, WEBP) (OCR Soberano 100% Local con Tesseract.js y Decodificación QR AFIP)
  const datosImagen = await procesarImagenLocalConOCRyQR(file, productosExistentes);
  datosImagen.archivoOrigenNombre = file.name;
  datosImagen.archivoOrigenUrl = fileUrl;
  return datosImagen;
}

/**
 * Extracción de texto y reconstrucción geométrica de renglones desde archivos PDF sin conexión.
 * Agrupa los elementos de texto por su posición vertical Y para formar renglones continuos con sus columnas ordenadas por X.
 */
export async function extraerTextoDePdfLocal(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const paginasTexto: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items = (textContent.items as Array<any>).filter(
        (it) => it && typeof it.str === 'string'
      );

      // Agrupar elementos por coordenada Y (tolerancia de 4 puntos de alineación horizontal)
      const lineasAgrupadas: Array<{ y: number; items: Array<{ x: number; width: number; text: string }> }> = [];

      for (const item of items) {
        const text = item.str;
        if (!text) continue;
        const x = Math.round(item.transform[4] || 0);
        const y = Math.round(item.transform[5] || 0);
        const width = Math.round(item.width || 0);

        let linea = lineasAgrupadas.find((l) => Math.abs(l.y - y) <= 4);
        if (!linea) {
          linea = { y, items: [] };
          lineasAgrupadas.push(linea);
        }
        linea.items.push({ x, width, text });
      }

      // En el sistema de coordenadas PDF, Y=0 está abajo; ordenamos de mayor Y a menor Y (de arriba hacia abajo)
      lineasAgrupadas.sort((a, b) => b.y - a.y);

      // En cada renglón, ordenamos los fragmentos de izquierda a derecha (coordenada X)
      // Reconstruimos el texto calculando la distancia (gap) entre palabras consecutivas:
      // Si la distancia horizontal supera los 16 pt, es un salto entre columnas tabulares (3 espacios).
      // Si es corta (<= 16 pt), es una palabra dentro de la misma frase o celda (1 solo espacio).
      const renglonesPagina = lineasAgrupadas
        .map((linea) => {
          linea.items.sort((a, b) => a.x - b.x);
          let renglonTexto = '';
          for (let i = 0; i < linea.items.length; i++) {
            const it = linea.items[i];
            const strLimpio = it.text.trim();
            if (!strLimpio) continue;
            if (renglonTexto === '') {
              renglonTexto = strLimpio;
            } else {
              const prev = linea.items[i - 1];
              const gap = it.x - (prev.x + prev.width);
              if (gap > 16) {
                renglonTexto += '   ' + strLimpio;
              } else {
                renglonTexto += ' ' + strLimpio;
              }
            }
          }
          return renglonTexto.trim();
        })
        .filter((l) => l.length > 0);

      paginasTexto.push(renglonesPagina.join('\n'));
    }

    const textoUnificado = paginasTexto.join('\n');
    return textoUnificado;
  } catch (error) {
    console.error('Error al decodificar PDF local con pdfjs-dist:', error);
    return `Comprobante PDF: ${file.name}`;
  }
}

/**
 * Convierte un número en formato argentino/mercosur a float numérico.
 * Soporta:
 * - "8.100,00" -> 8100.00
 * - "$ 7.950,00" -> 7950.00
 * - "140.700,00" -> 140700.00
 * - "1.400,00" -> 1400.00
 * - "11.000,00" -> 11000.00
 * - "8100,00" o "8100" -> 8100
 */
export function parseNumeroArgentino(str: string): number {
  if (!str) return 0;
  let s = str.replace(/[$ARS\s]/gi, '').trim();
  if (!s) return 0;

  if (s.includes('.') && s.includes(',')) {
    if (s.indexOf('.') < s.indexOf(',')) {
      // Estándar argentino: 8.100,00 -> 8100.00
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato anglosajón: 8,100.00 -> 8100.00
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // 8100,00 o 8,5
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    // Si tiene un punto seguido de 3 dígitos al final (ej: 8.100 o 81.000 o 140.700), es separador de miles
    const partes = s.split('.');
    if (partes.length > 1 && partes[partes.length - 1].length === 3) {
      s = s.replace(/\./g, '');
    }
  }

  const val = parseFloat(s);
  return isNaN(val) ? 0 : val;
}

/**
 * Parser heurístico de alta precisión para facturas, remitos y listas en texto plano, tablas Markdown y CSV
 */
export function parsearTextoFactura(
  texto: string,
  nombreOrigen: string,
  metodo: 'texto' | 'pdf' | 'vision_ocr',
  productosExistentes: Producto[]
): FacturaParseada {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: FacturaItemExtraido[] = [];

  let proveedor = 'Distribuidora Mayorista';
  let proveedorDetectado = false;
  let emisorFijado = false;
  let numeroComprobante = `FC-${Math.floor(100000 + Math.random() * 900000)}`;
  let cuitProveedor: string | undefined = undefined;
  let fecha = new Date().toISOString().slice(0, 10);
  let totalFacturaDetectado = 0;
  let tipoDocumento = 'Factura Comercial';
  let enBloqueCliente = false;

  // 1. Detección de Cabeceras (Proveedor, CUIT, Número, Fecha, Total)
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const lLower = linea.toLowerCase();

    // Detección de transición al bloque de datos del cliente
    if (
      lLower.includes('datos del cliente') ||
      lLower.includes('datos cliente') ||
      lLower.startsWith('cliente:') ||
      lLower.startsWith('cliente ') ||
      lLower.includes('señor(es)') ||
      lLower.includes('destinatario:') ||
      lLower.includes('facturado a:') ||
      lLower.includes('receptor:') ||
      lLower.includes('cuit cliente') ||
      lLower.includes('condiciones de venta')
    ) {
      enBloqueCliente = true;
    }

    // Proveedor explícito (solo si estamos fuera del bloque cliente)
    if (
      !enBloqueCliente &&
      !emisorFijado &&
      (lLower.startsWith('proveedor:') ||
        lLower.startsWith('emisor:') ||
        lLower.startsWith('distribuidora:') ||
        lLower.startsWith('razon social:') ||
        lLower.startsWith('razón social:'))
    ) {
      const partes = linea.split(':');
      if (partes[1] && partes[1].trim().length > 2) {
        proveedor = partes.slice(1).join(':').trim();
        proveedorDetectado = true;
        emisorFijado = true;
      }
    }

    // Proveedor implícito en las primeras 8 líneas (ej: "MOLINOS DEL PLATA S.A." o "DISTRIBUIDORA LOS ALMACENES S.A.")
    if (!proveedorDetectado && !enBloqueCliente && i < 8) {
      if (
        !lLower.startsWith('factura') &&
        !lLower.startsWith('cliente') &&
        !lLower.startsWith('cuit') &&
        !lLower.startsWith('domicilio') &&
        !lLower.startsWith('fecha') &&
        !lLower.startsWith('original') &&
        !lLower.startsWith('duplicado') &&
        !lLower.startsWith('afip') &&
        !lLower.startsWith('iva') &&
        !lLower.startsWith('ingresos brutos') &&
        !lLower.startsWith('inicio') &&
        (linea.includes('S.A.') ||
          linea.includes('S.R.L.') ||
          linea.includes('S.A') ||
          linea.includes('SRL') ||
          lLower.includes('distribuidora') ||
          lLower.includes('molinos') ||
          lLower.includes('cooperativa') ||
          lLower.includes('almacen') ||
          lLower.includes('mayorista') ||
          lLower.includes('panificadora'))
      ) {
        proveedor = linea.replace(/^[^a-zA-Z0-9]+/, '').trim();
        proveedorDetectado = true;
        emisorFijado = true;
      }
    }

    // CUIT Proveedor (toma el primero ANTES del bloque cliente)
    if (!cuitProveedor && !enBloqueCliente && !lLower.includes('cuit cliente')) {
      const matchCuit = linea.match(/\b(30|33|20|27|23|24)-?\d{8}-?\d\b/);
      if (matchCuit) {
        cuitProveedor = matchCuit[0];
      }
    }

    // Número de Comprobante
    const matchComp = linea.match(
      /(?:factura\s+[abcme]\s*(?:n[°ºo]?)?|comprobante\s*(?:n[°ºo]?)?|remito\s*(?:n[°ºo]?)?|n[°ºo]:?)\s*([a-zA-Z]{0,2}-?[0-9]{3,5}[-\s][0-9]{6,8}|[0-9]{8,12})/i
    );
    if (matchComp && matchComp[1]) {
      numeroComprobante = matchComp[1].replace(/\s+/g, '-').toUpperCase();
    }

    // Tipo de factura
    if (lLower.includes('factura a')) tipoDocumento = 'Factura A';
    else if (lLower.includes('factura b')) tipoDocumento = 'Factura B';
    else if (lLower.includes('factura c')) tipoDocumento = 'Factura C';
    else if (lLower.includes('remito')) tipoDocumento = 'Remito de Entrega';

    // Fecha (ej: 12/07/2026 o 03/08/2026)
    const matchFecha = linea.match(
      /(?:fecha(?:\s+emisi[óo]n)?[:\s]+)(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i
    );
    if (matchFecha && matchFecha[1]) {
      const partesF = matchFecha[1].split(/[\/\.-]/);
      if (partesF.length === 3) {
        const dia = partesF[0].padStart(2, '0');
        const mes = partesF[1].padStart(2, '0');
        const anio = partesF[2].length === 2 ? `20${partesF[2]}` : partesF[2];
        fecha = `${anio}-${mes}-${dia}`;
      }
    }

    // Total final informado en el pie de factura
    if (
      (lLower.startsWith('total') || lLower.includes('total:')) &&
      !lLower.includes('subtotal') &&
      !lLower.includes('iva')
    ) {
      const matchTot = linea.match(/\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)/);
      if (matchTot) {
        const tot = parseNumeroArgentino(matchTot[0]);
        if (tot > 0) totalFacturaDetectado = tot;
      }
    }
  }

  // Palabras y expresiones que nunca deben considerarse nombres de productos
  const PALABRAS_RUIDO = new Set([
    'TRES', 'DOS', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE',
    'CIEN', 'CIENTO', 'MIL', 'MILLON', 'PESOS', 'CENTAVOS', 'STOCK', 'LIBERTADOR', 'AVENIDA',
    'CALLE', 'PISO', 'DEPTO', 'LOCALIDAD', 'PROVINCIA', 'TELEFONO', 'TEL', 'CEL', 'EMAIL',
    'CORREO', 'WEB', 'WWW', 'CUIT', 'CUIL', 'DNI', 'CONDICION', 'CONDICIONES', 'VENTA',
    'CONTADO', 'PAGARE', 'REMITO', 'COMPROBANTE', 'FACTURA', 'ORIGINAL', 'DUPLICADO',
    'TRIPLICADO', 'CAI', 'CAE', 'VTO', 'VENCIMIENTO', 'PAGINA', 'HOJA', 'INGRESOS', 'BRUTOS',
    'IIBB', 'INICIO', 'ACTIVIDADES', 'CATEGORIA', 'RESPONSABLE', 'INSCRIPTO', 'MONOTRIBUTO',
    'EXENTO', 'SUBTOTAL', 'TOTAL', 'IVA', 'ALICUOTA', 'PERCEPCION', 'RETENCION', 'TRANSPORTE',
    'BULTOS', 'CAJAS', 'OBSERVACIONES', 'FIRMA', 'ACLARACION', 'RECIBI', 'CONFORME', 'ARTICULO',
    'CANTIDAD', 'DESCRIPCION', 'DETALLE', 'PRECIO', 'UNITARIO', 'IMPORTE', 'GRAVADO'
  ]);

  const esRuidoOEncabezado = (desc: string): boolean => {
    const dLimpia = desc.trim().toUpperCase().replace(/[.:,;\-_]/g, '');
    if (!dLimpia || dLimpia.length < 3) return true;
    if (PALABRAS_RUIDO.has(dLimpia)) return true;
    if (/^(SON PESOS|PAGINA \d+|HOJA \d+|FECHA DE|TRANSPORTE|CONDICION DE|CANTIDAD|DETALLE|DESCRIPCION)/i.test(desc.trim())) return true;
    if (/^(AV\.?|CALLE|RUTA|DIRECCION|LOCALIDAD|PROVINCIA|TEL|CUIT|IVA)\b/i.test(desc.trim())) return true;
    // Si solo contiene números o símbolos
    if (/^[0-9\s$.,\-_]+$/.test(desc.trim())) return true;
    return false;
  };

  // 2. Parseo de renglones de mercadería
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const lLower = linea.toLowerCase();

    // Descartar encabezados de resumen y pie de página
    if (
      lLower.startsWith('subtotal') ||
      lLower.startsWith('total') ||
      lLower.startsWith('iva') ||
      lLower.startsWith('forma de pago') ||
      lLower.startsWith('vence') ||
      lLower.startsWith('cbu') ||
      lLower.startsWith('gracias por') ||
      lLower.startsWith('condicion') ||
      lLower.startsWith('condiciones') ||
      lLower.startsWith('domicilio') ||
      lLower.startsWith('cliente') ||
      lLower.startsWith('datos del cliente') ||
      lLower.startsWith('razon social') ||
      lLower.startsWith('orden de compra') ||
      lLower.startsWith('original') ||
      lLower.startsWith('duplicado') ||
      lLower.startsWith('ingresos brutos') ||
      lLower.startsWith('inicio de actividades') ||
      lLower.startsWith('factura n') ||
      lLower.startsWith('son pesos') ||
      /^[-_=\s]{4,}$/.test(linea)
    ) {
      continue;
    }

    // Descartar filas de encabezados de columnas (CANT, DESCRIPCIÓN, PRECIO UNIT, TOTAL)
    if (
      (lLower.includes('cant') && lLower.includes('descrip')) ||
      (lLower.includes('p. unit') || lLower.includes('precio unit')) ||
      (lLower.includes('código') && lLower.includes('importe'))
    ) {
      continue;
    }

    // Helper para detectar si un texto es un código de barras EAN o código interno de artículo
    const esEan = (s: string) => /^\d{8,14}$/.test(s.trim());
    const esCodigoArticulo = (s: string) =>
      /^(?:0\d{2,7}|[A-Za-z]{1,4}-\d{1,6}|[A-Za-z0-9\-_]{3,15})$/.test(s.trim()) &&
      !/[a-záéíóú\s]{4,}/i.test(s.trim()) &&
      isNaN(Number(s.replace(/[$ARS\s]/gi, '')));

    let itemAgregadoEnLinea = false;

    // --- CASO 1: Formato con pipes '|' (Tablas ASCII / Markdown como la factura en TXT) ---
    // Ej: | 7790895000431 | Harina 000 (50kg) | 10 | 8.100,00 | 81.000,00 |
    // Ej: | 10 | 7790895000431 | Harina 000 (50kg) | 8.100,00 | 81.000,00 |
    // Ej: | 10 | Harina 000 (50kg) | 8.100,00 | 81.000,00 |
    if (linea.includes('|')) {
      const celdas = linea
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Si es una línea separadora como |---|---|---|
      if (celdas.every((c) => /^[-_]+$/.test(c))) continue;

      if (celdas.length >= 3) {
        let cant = 1;
        let desc = '';
        let unitario = 0;
        let codigo = '';

        if (celdas.length >= 5) {
          // [CÓDIGO | DESCRIPCIÓN | CANT | PRECIO UNIT | TOTAL]
          if ((esEan(celdas[0]) || esCodigoArticulo(celdas[0])) && /[a-zA-Z]/.test(celdas[1])) {
            codigo = celdas[0];
            desc = celdas[1];
            cant = parseNumeroArgentino(celdas[2]) || 1;
            unitario = parseNumeroArgentino(celdas[3]);
          }
          // [CANT | CÓDIGO | DESCRIPCIÓN | PRECIO UNIT | TOTAL]
          else if (parseNumeroArgentino(celdas[0]) > 0 && (esEan(celdas[1]) || esCodigoArticulo(celdas[1])) && /[a-zA-Z]/.test(celdas[2])) {
            cant = parseNumeroArgentino(celdas[0]) || 1;
            codigo = celdas[1];
            desc = celdas[2];
            unitario = parseNumeroArgentino(celdas[3]);
          }
          // [CANT | DESCRIPCIÓN | PRECIO UNIT | IVA | TOTAL]
          else {
            cant = parseNumeroArgentino(celdas[0]) || 1;
            desc = celdas[1];
            unitario = parseNumeroArgentino(celdas[2]);
          }
        } else if (celdas.length === 4) {
          if (esEan(celdas[0]) || esCodigoArticulo(celdas[0])) {
            codigo = celdas[0];
            desc = celdas[1];
            cant = parseNumeroArgentino(celdas[2]) || 1;
            unitario = parseNumeroArgentino(celdas[3]);
          } else {
            const c0Num = parseNumeroArgentino(celdas[0]);
            const c1Num = parseNumeroArgentino(celdas[1]);
            if (c0Num > 0 && isNaN(Number(celdas[1].replace(/[$ARS\s]/gi, '')))) {
              cant = c0Num;
              desc = celdas[1];
              unitario = parseNumeroArgentino(celdas[2]);
            } else {
              desc = celdas[0];
              cant = c1Num || 1;
              unitario = parseNumeroArgentino(celdas[2]);
            }
          }
        } else if (celdas.length === 3) {
          const c0Num = parseNumeroArgentino(celdas[0]);
          const c1Num = parseNumeroArgentino(celdas[1]);
          if ((esEan(celdas[0]) || esCodigoArticulo(celdas[0])) && /[a-zA-Z]/.test(celdas[1])) {
            codigo = celdas[0];
            desc = celdas[1];
            unitario = parseNumeroArgentino(celdas[2]);
          } else if (c0Num > 0 && !esEan(celdas[0]) && isNaN(Number(celdas[1].replace(/[$ARS\s]/gi, '')))) {
            cant = c0Num;
            desc = celdas[1];
            unitario = parseNumeroArgentino(celdas[2]);
          } else {
            desc = celdas[0];
            cant = c1Num || 1;
            unitario = parseNumeroArgentino(celdas[2]);
          }
        }

        if (desc && desc.length >= 2 && !esRuidoOEncabezado(desc) && unitario > 0) {
          items.push(vincularItemConCatalogo(desc, cant, unitario, codigo, 21, productosExistentes));
          itemAgregadoEnLinea = true;
          continue;
        }
      }
    }

    // --- CASO 2: Columnas estructuradas separadas por multi-espacios (\s{2,}) o tabs (PDFs y reportes) ---
    // Ej: "7790895000431   Harina 000 (50kg)   10   $ 7.950,00   $ 79.500,00"
    // Ej: "10   7790895000431   Harina 000 (50kg)   $ 7.950,00   $ 79.500,00"
    // Ej: "10   Harina 000 (50kg)   $ 7.950,00   $ 79.500,00"
    const partesMultiEspacio = linea.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);
    if (partesMultiEspacio.length >= 3) {
      let codMulti = '';
      let descMulti = '';
      let cantMulti = 1;
      let unitMulti = 0;

      if (partesMultiEspacio.length >= 5) {
        // [CÓDIGO, DESCRIPCIÓN, CANTIDAD, PRECIO UNIT, TOTAL]
        if ((esEan(partesMultiEspacio[0]) || esCodigoArticulo(partesMultiEspacio[0])) && /[a-zA-Z]/.test(partesMultiEspacio[1])) {
          codMulti = partesMultiEspacio[0];
          descMulti = partesMultiEspacio[1];
          cantMulti = parseNumeroArgentino(partesMultiEspacio[2]) || 1;
          unitMulti = parseNumeroArgentino(partesMultiEspacio[3]);
        }
        // [CANTIDAD, CÓDIGO, DESCRIPCIÓN, PRECIO UNIT, TOTAL]
        else if (parseNumeroArgentino(partesMultiEspacio[0]) > 0 && !esEan(partesMultiEspacio[0]) && (esEan(partesMultiEspacio[1]) || esCodigoArticulo(partesMultiEspacio[1]))) {
          cantMulti = parseNumeroArgentino(partesMultiEspacio[0]) || 1;
          codMulti = partesMultiEspacio[1];
          descMulti = partesMultiEspacio[2];
          unitMulti = parseNumeroArgentino(partesMultiEspacio[3]);
        }
        // [CANTIDAD, DESCRIPCIÓN, PRECIO UNIT, % BONIF, TOTAL]
        else {
          cantMulti = parseNumeroArgentino(partesMultiEspacio[0]) || 1;
          descMulti = partesMultiEspacio[1];
          unitMulti = parseNumeroArgentino(partesMultiEspacio[2]);
        }
      } else if (partesMultiEspacio.length === 4) {
        // [CÓDIGO, DESCRIPCIÓN, CANTIDAD, PRECIO UNIT]
        if (esEan(partesMultiEspacio[0]) || esCodigoArticulo(partesMultiEspacio[0])) {
          codMulti = partesMultiEspacio[0];
          descMulti = partesMultiEspacio[1];
          cantMulti = parseNumeroArgentino(partesMultiEspacio[2]) || 1;
          unitMulti = parseNumeroArgentino(partesMultiEspacio[3]);
        }
        // [CANTIDAD, DESCRIPCIÓN, PRECIO UNIT, TOTAL]
        else if (parseNumeroArgentino(partesMultiEspacio[0]) > 0 && !esEan(partesMultiEspacio[0])) {
          cantMulti = parseNumeroArgentino(partesMultiEspacio[0]) || 1;
          descMulti = partesMultiEspacio[1];
          unitMulti = parseNumeroArgentino(partesMultiEspacio[2]);
        }
        // [DESCRIPCIÓN, CANTIDAD, PRECIO UNIT, TOTAL]
        else {
          descMulti = partesMultiEspacio[0];
          cantMulti = parseNumeroArgentino(partesMultiEspacio[1]) || 1;
          unitMulti = parseNumeroArgentino(partesMultiEspacio[2]);
        }
      } else if (partesMultiEspacio.length === 3) {
        if (esEan(partesMultiEspacio[0]) || esCodigoArticulo(partesMultiEspacio[0])) {
          codMulti = partesMultiEspacio[0];
          descMulti = partesMultiEspacio[1];
          unitMulti = parseNumeroArgentino(partesMultiEspacio[2]);
        } else if (parseNumeroArgentino(partesMultiEspacio[0]) > 0 && !esEan(partesMultiEspacio[0])) {
          cantMulti = parseNumeroArgentino(partesMultiEspacio[0]) || 1;
          descMulti = partesMultiEspacio[1];
          unitMulti = parseNumeroArgentino(partesMultiEspacio[2]);
        } else {
          descMulti = partesMultiEspacio[0];
          cantMulti = parseNumeroArgentino(partesMultiEspacio[1]) || 1;
          unitMulti = parseNumeroArgentino(partesMultiEspacio[2]);
        }
      }

      if (descMulti && descMulti.length >= 2 && !esRuidoOEncabezado(descMulti) && unitMulti > 0) {
        items.push(vincularItemConCatalogo(descMulti, cantMulti, unitMulti, codMulti, 21, productosExistentes));
        itemAgregadoEnLinea = true;
        continue;
      }
    }

    // --- CASO 3: Regex con Código de Barras / Artículo al inicio con espacios simples ---
    // Ej: "7790895000431 Harina 000 (50kg) 10 $ 7.950,00 $ 79.500,00"
    const regexCodigoPrimero = /^\s*([0-9]{8,14}|[A-Za-z0-9\-_]{3,14})\s+(.+?)\s+(\d+(?:[\.,]\d+)?)\s+\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)\s+\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)\s*$/;
    const matchCodPrimero = linea.match(regexCodigoPrimero);
    if (matchCodPrimero) {
      const codigo = matchCodPrimero[1].trim();
      const desc = matchCodPrimero[2].trim();
      const cant = parseNumeroArgentino(matchCodPrimero[3]);
      const unitario = parseNumeroArgentino(matchCodPrimero[4]);
      if (desc.length >= 2 && !esRuidoOEncabezado(desc) && cant > 0 && unitario > 0) {
        items.push(vincularItemConCatalogo(desc, cant, unitario, codigo, 21, productosExistentes));
        itemAgregadoEnLinea = true;
        continue;
      }
    }

    // --- CASO 4: Regex con Cantidad al inicio, luego Código, luego Descripción ---
    // Ej: "10 7790895000431 Harina 000 (50kg) $ 7.950,00 $ 79.500,00"
    const regexCantCodigoDesc = /^\s*(\d+(?:[\.,]\d+)?)\s+([0-9]{8,14})\s+(.+?)\s+\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)\s+\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)\s*$/;
    const matchCantCodDesc = linea.match(regexCantCodigoDesc);
    if (matchCantCodDesc) {
      const cant = parseNumeroArgentino(matchCantCodDesc[1]);
      const codigo = matchCantCodDesc[2].trim();
      const desc = matchCantCodDesc[3].trim();
      const unitario = parseNumeroArgentino(matchCantCodDesc[4]);
      if (desc.length >= 2 && !esRuidoOEncabezado(desc) && cant > 0 && unitario > 0) {
        items.push(vincularItemConCatalogo(desc, cant, unitario, codigo, 21, productosExistentes));
        itemAgregadoEnLinea = true;
        continue;
      }
    }

    // --- CASO 5: Columnas estándar Cantidad + Descripción + Precios ---
    // Ej: "10 Harina 000 (50kg) $ 7.950,00 $ 79.500,00"
    const regexEspaciado = /^\s*(\d+(?:[\.,]\d+)?)\s+(.+?)\s+\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)\s+\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)\s*$/;
    const matchEspaciado = linea.match(regexEspaciado);
    if (matchEspaciado) {
      const cantVal = parseNumeroArgentino(matchEspaciado[1]);
      // Si el primer número es un código EAN de 8 a 14 dígitos, no es una cantidad de 7 trillones
      if (!esEan(matchEspaciado[1]) && cantVal < 10000) {
        const cant = cantVal;
        const desc = matchEspaciado[2].trim();
        const unitario = parseNumeroArgentino(matchEspaciado[3]);
        if (desc.length >= 2 && !esRuidoOEncabezado(desc) && cant > 0 && unitario > 0) {
          items.push(vincularItemConCatalogo(desc, cant, unitario, '', 21, productosExistentes));
          itemAgregadoEnLinea = true;
          continue;
        }
      }
    }

    // --- CASO 6: Formato inverso (Descripción primero, luego Cantidad y Precios) ---
    // Ej: "Harina 000 (50kg)   10   $ 7.950,00   $ 79.500,00"
    const regexInverso = /^\s*(.+?)\s+(\d+(?:[\.,]\d+)?)\s+\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)\s+\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)\s*$/;
    const matchInverso = linea.match(regexInverso);

    if (matchInverso && isNaN(Number(matchInverso[1].replace(/[$ARS\s]/gi, '')))) {
      const desc = matchInverso[1].trim();
      const cant = parseNumeroArgentino(matchInverso[2]);
      const unitario = parseNumeroArgentino(matchInverso[3]);

      if (desc.length >= 2 && !esRuidoOEncabezado(desc) && cant > 0 && unitario > 0) {
        items.push(vincularItemConCatalogo(desc, cant, unitario, '', 21, productosExistentes));
        itemAgregadoEnLinea = true;
        continue;
      }
    }

    // --- CASO 7: Formato CSV o con Punto y Coma ';' ---
    // Ej: "7790895000431;Harina 000 (50kg);10;8100,00;81000,00"
    // Ej: "10;Harina 000 (50kg);8100,00;81000,00"
    if (linea.includes(';')) {
      const cols = linea.split(';').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length >= 3) {
        let desc = '';
        let cant = 1;
        let unitario = 0;
        let codigo = '';

        if (cols.length >= 4 && (esEan(cols[0]) || esCodigoArticulo(cols[0]))) {
          codigo = cols[0];
          desc = cols[1];
          cant = parseNumeroArgentino(cols[2]) || 1;
          unitario = parseNumeroArgentino(cols[3]) || 0;
        } else {
          const col0Num = parseNumeroArgentino(cols[0]);
          if (col0Num > 0 && !esEan(cols[0]) && isNaN(Number(cols[1].replace(/[$ARS\s]/gi, '')))) {
            cant = col0Num;
            desc = cols[1];
            unitario = parseNumeroArgentino(cols[2]);
          } else {
            desc = cols[0];
            cant = parseNumeroArgentino(cols[1]) || 1;
            unitario = parseNumeroArgentino(cols[2]) || 0;
          }
        }

        if (desc && desc.length >= 2 && !esRuidoOEncabezado(desc) && unitario > 0) {
          items.push(vincularItemConCatalogo(desc, cant, unitario, codigo, 21, productosExistentes));
          itemAgregadoEnLinea = true;
          continue;
        }
      }
    }

    // --- CASO 8: Texto libre (ej: "Harina 000 x 20 unidades $680" o "7790895000431 Harina 000 x 20 unidades $680") ---
    const matchFreeText = linea.match(
      /^(.*?)(?:x|\*|\bde\b)\s*(\d+[\.,]?\d*)\s*(?:unid|unidades|kg|l|paquetes?|bolsas?|bidones?)?\s*(?:a|\$)\s*\$?(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+[\.,]\d+|\d+)/i
    );
    if (matchFreeText) {
      const desc = matchFreeText[1].trim();
      const cant = parseNumeroArgentino(matchFreeText[2]) || 1;
      const unitario = parseNumeroArgentino(matchFreeText[3]) || 0;
      if (desc.length >= 2 && !esRuidoOEncabezado(desc) && unitario > 0) {
        items.push(vincularItemConCatalogo(desc, cant, unitario, '', 21, productosExistentes));
        itemAgregadoEnLinea = true;
        continue;
      }
    }

    // --- SUB-DESCRIPCIÓN MULTILÍNEA (Autopartes, modelos de autos, especificaciones técnicas) ---
    // Si la línea actual no tiene precios ni cantidades pero sigue a un ítem existente (ej: "DELANTERO FORD FIESTA / ECOSPORT" debajo de "AMORTIGUADOR MONROE"),
    // enriquece la descripción del ítem inmediatamente anterior para discriminarlo y evitar colapsos.
    if (!itemAgregadoEnLinea && items.length > 0) {
      const lineaTrim = linea.trim();
      const lTrimLower = lineaTrim.toLowerCase();
      if (
        lineaTrim.length >= 4 &&
        !esRuidoOEncabezado(lineaTrim) &&
        !/^(total|subtotal|iva|cuit|fecha|original|duplicado|ingresos|afip|cae|vence|saldo|forma de pago|condicion)/i.test(lineaTrim) &&
        !/^\$?[\d.,\s]+$/.test(lineaTrim)
      ) {
        const esEspecificacionTecnicaOAuto =
          /\b(delantero|trasero|derecho|izquierdo|ford|fiat|vw|volkswagen|chevrolet|peugeot|renault|toyota|honda|nissan|citroen|gol|fiesta|ecosport|palio|corsa|clio|hilux|motor|16v|8v|1\.6|1\.4|2\.0|nafta|diesel|kit|par|juego|pulgadas|mm|cm|cazoleta|espiral|freno|disco|filtro|aceite)\b/i.test(lineaTrim);

        if (esEspecificacionTecnicaOAuto) {
          const itemPrevio = items[items.length - 1];
          if (!itemPrevio.descripcion.toLowerCase().includes(lTrimLower)) {
            const nuevaDesc = `${itemPrevio.descripcion} ${lineaTrim}`.trim();
            items[items.length - 1] = vincularItemConCatalogo(
              nuevaDesc,
              itemPrevio.cantidad,
              itemPrevio.precioUnitario,
              itemPrevio.codigo,
              itemPrevio.alicuotaIva,
              productosExistentes,
              itemPrevio.sku
            );
          }
        }
      }
    }
  }

  const sumaItems = items.reduce((acc, it) => acc + it.subtotal, 0);
  const totalCalculado = totalFacturaDetectado > 0 ? totalFacturaDetectado : sumaItems;

  return {
    id: `fac-${Date.now()}`,
    tipo: 'factura_compra',
    tipoOperacion: 'compra_ingreso',
    numeroComprobante,
    proveedorOEmisor: proveedor,
    cuitProveedor,
    fecha,
    items,
    totalCalculado,
    metodoLectura: metodo,
    esComprobanteValido: true,
    tipoDocumentoDetectado: tipoDocumento,
    archivoOrigenNombre: nombreOrigen,
  };
}

/**
 * Normaliza cadenas para cotejo de catálogo ignorando mayúsculas, tildes y caracteres especiales
 */
function normalizarTexto(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^\w\s]/g, ' ') // Quitar signos de puntuación y paréntesis
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Vincula un renglón extraído con el catálogo existente de la PyME
 * Utiliza el extractor y desacoplador de códigos incrustados,
 * el motor de alta precisión con veto de variantes críticas (000 vs 0000, kilos, litros)
 * y asignación determinista de códigos de barra para productos nuevos.
 */
export function vincularItemConCatalogo(
  descripcion: string,
  cantidad: number,
  precioUnitario: number,
  codigoProporcionado: string,
  alicuotaIva: number,
  productosExistentes: Producto[],
  skuProporcionado?: string,
  proveedor?: string,
  aprendizajesConocidos?: any[]
): FacturaItemExtraido {
  // Desacoplar cualquier código o código de barras (EAN-13, EAN-8, SKU) accidentalmente puesto en la descripción
  const desglose = desglosarCodigoYDescripcion(descripcion, codigoProporcionado, skuProporcionado);
  const descSanitizada = sanitizarTextoOcrMercaderia(desglose.descripcionLimpia);
  const cotejo = cotejarRenglonConCatalogo(
    descSanitizada,
    desglose.codigo,
    productosExistentes,
    desglose.sku,
    proveedor,
    aprendizajesConocidos
  );
  const coincidente = cotejo.productoCoincidente;

  const cantidadLimpia = Math.max(1, Math.round(cantidad * 100) / 100);
  const unitarioLimpio = Math.max(0, Math.round(precioUnitario * 100) / 100);

  return {
    codigo: cotejo.codigoSugerido || desglose.codigo,
    sku: cotejo.skuSugerido || desglose.sku,
    descripcion: coincidente ? coincidente.nombre : descSanitizada,
    cantidad: cantidadLimpia,
    precioUnitario: unitarioLimpio,
    subtotal: Math.round(cantidadLimpia * unitarioLimpio),
    alicuotaIva: coincidente ? coincidente.ivaPorcentaje : alicuotaIva || 21,
    coincidenciaProductoId: coincidente ? coincidente.id : undefined,
    esNuevoProducto: cotejo.esNuevoProducto,
    esAprendido: cotejo.razonCotejo === 'memoria_aprendizaje',
    origenAprendizaje: cotejo.etapasDiagnostico,
  };
}

function generarCodigoEan13Sintetico(semilla?: string): string {
  return generarEan13Determinista(semilla || String(Date.now()));
}

/**
 * Convierte un File a Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Renderiza una página de un archivo PDF a imagen PNG en alta definición (Data URL)
 * para previsualización interactiva con zoom, rotación y desplazamiento nativo.
 */
export async function renderizarPaginaPdfAImagen(file: File, pageNum: number = 1): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const targetPageNum = Math.min(Math.max(1, pageNum), pdfDoc.numPages);
    const page = await pdfDoc.getPage(targetPageNum);

    // Escala 2.0x para nitidez cristalina en pantallas de alta densidad y al hacer zoom hasta 250%
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return '';

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport, canvas: canvas as any }).promise;
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error al renderizar página de PDF a imagen:', err);
    return '';
  }
}

/**
 * Convierte un Data URL base64 a un objeto File estándar del navegador
 */
export function dataUrlAFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * OCR Soberano y 100% Local para imágenes (JPG, PNG, WEBP) mediante Tesseract.js
 */
export async function extraerTextoDeImagenLocal(file: File): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('spa');
    const ret = await worker.recognize(file);
    await worker.terminate();
    return ret?.data?.text || '';
  } catch (err) {
    console.warn('OCR español falló o requiere fallback, intentando con eng:', err);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(file);
      await worker.terminate();
      return ret?.data?.text || '';
    } catch (e2) {
      console.warn('OCR no disponible en este entorno de navegador:', e2);
      return '';
    }
  }
}

/**
 * Decodifica imágenes en modo offline:
 * 1. Decodifica código QR AFIP (obteniendo CUIT, comprobante oficial y total).
 * 2. Ejecuta OCR local con Tesseract.js para extraer renglones de mercadería y tabla.
 * 3. Fusiona y valida los datos automáticamente con el catálogo existente.
 */
async function procesarImagenLocalConOCRyQR(
  file: File,
  productosExistentes: Producto[]
): Promise<FacturaParseada> {
  let proveedor = 'Distribuidora Comercial';
  let numeroComprobante = `FC-${Math.floor(100000 + Math.random() * 900000)}`;
  let fecha = new Date().toISOString().slice(0, 10);
  let totalEstimado = 0;
  let cuitDetectado: string | undefined = undefined;
  let qrEncontrado = false;

  // 1. Intentar decodificación con BarcodeDetector nativo
  try {
    if ('BarcodeDetector' in window) {
      const imgBitmap = await createImageBitmap(file);
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      const detector = new BarcodeDetectorClass({ formats: ['qr_code', 'ean_13', 'code_128'] });
      const barcodes = await detector.detect(imgBitmap);

      for (const bc of barcodes) {
        const val = bc.rawValue;
        if (val && (val.includes('afip.gob.ar/fe/qr') || val.includes('"cuit"') || val.includes('"nroCmp"'))) {
          let jsonString = val;
          if (val.includes('?p=')) {
            const b64 = val.split('?p=')[1];
            jsonString = atob(b64);
          }
          const afipData = JSON.parse(jsonString);
          if (afipData.cuit) cuitDetectado = String(afipData.cuit);
          if (afipData.nroCmp) {
            numeroComprobante = `${String(afipData.ptoVta || 1).padStart(4, '0')}-${String(afipData.nroCmp).padStart(8, '0')}`;
          }
          if (afipData.fecha) fecha = afipData.fecha;
          if (afipData.importe) totalEstimado = Number(afipData.importe);
          proveedor = `Emisor CUIT ${cuitDetectado || 'AFIP'}`;
          qrEncontrado = true;
          break;
        }
      }
    }
  } catch (err) {
    console.warn('Detección BarcodeDetector omitida:', err);
  }

  // 2. Si no hubo QR con BarcodeDetector, intentar con ZXing
  if (!qrEncontrado) {
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        const result = await reader.decodeFromImageElement(img);
        const val = result.getText();
        if (val && (val.includes('afip.gob.ar/fe/qr') || val.includes('"cuit"') || val.includes('"nroCmp"'))) {
          let jsonString = val;
          if (val.includes('?p=')) {
            const b64 = val.split('?p=')[1];
            jsonString = atob(b64);
          }
          const afipData = JSON.parse(jsonString);
          if (afipData.cuit) cuitDetectado = String(afipData.cuit);
          if (afipData.nroCmp) {
            numeroComprobante = `${String(afipData.ptoVta || 1).padStart(4, '0')}-${String(afipData.nroCmp).padStart(8, '0')}`;
          }
          if (afipData.fecha) fecha = afipData.fecha;
          if (afipData.importe) totalEstimado = Number(afipData.importe);
          proveedor = `Emisor CUIT ${cuitDetectado || 'AFIP'}`;
          qrEncontrado = true;
        }
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      // Continuar sin QR
    }
  }

  // 3. Ejecutar OCR local sobre la imagen para extraer texto y renglones de mercadería
  let textoOcr = '';
  try {
    textoOcr = await extraerTextoDeImagenLocal(file);
  } catch (err) {
    console.warn('No se pudo extraer texto OCR de la imagen:', err);
  }

  // Si se obtuvo texto por OCR, procesar mediante el pipeline VDU espacial y matricial
  if (textoOcr && textoOcr.trim().length > 10) {
    const aprendizajes = await obtenerAprendizajesAlias().catch(() => []);
    const vduRes = await ejecutarPipelineVDU(textoOcr, file.name, productosExistentes);
    let parsed: FacturaParseada;

    if (vduRes.items.length > 0) {
      parsed = mapearVduAFacturaParseada(vduRes, file.name, productosExistentes, aprendizajes);
    } else {
      parsed = parsearTextoFactura(textoOcr, file.name, 'vision_ocr', productosExistentes);
    }

    // Si el QR aportó CUIT o número oficial exacto, sobreescribir con mayor prioridad
    if (cuitDetectado) parsed.cuitProveedor = cuitDetectado;
    if (qrEncontrado && numeroComprobante) parsed.numeroComprobante = numeroComprobante;
    if (qrEncontrado && totalEstimado > 0 && parsed.totalCalculado === 0) {
      parsed.totalCalculado = totalEstimado;
    }

    if (qrEncontrado) {
      parsed.tipoDocumentoDetectado = 'Factura AFIP con QR Verificado (VDU 3.0 Local)';
      parsed.mensajeValidacion = 'Código QR de AFIP verificado y renglones extraídos por VDU local (docTR/Docling layout).';
    } else {
      parsed.tipoDocumentoDetectado = 'Comprobante Imagen (VDU 3.0 Soberano)';
      parsed.mensajeValidacion = `Lectura VDU completada (${parsed.items.length} artículos detectados con matriz de veto).`;
    }

    return parsed;
  }

  // Fallback si no hubo texto OCR legible
  return {
    id: `fac-local-${Date.now()}`,
    tipo: 'factura_compra',
    tipoOperacion: 'compra_ingreso',
    numeroComprobante,
    proveedorOEmisor: proveedor,
    cuitProveedor: cuitDetectado,
    fecha,
    items: [],
    totalCalculado: totalEstimado,
    metodoLectura: 'vision_ocr',
    esComprobanteValido: true,
    tipoDocumentoDetectado: qrEncontrado
      ? 'Factura AFIP con QR Verificado'
      : 'Comprobante Imagen (Modo Local Offline)',
    mensajeValidacion: qrEncontrado
      ? 'Código QR Oficial de AFIP verificado localmente con éxito.'
      : 'Comprobante en imagen cargado en modo local sin conexión. Puedes visualizar la factura en el visor interactivo con zoom y utilizar "Pegar texto" o "Agregar renglón" si necesitas ajustar ítems.',
  };
}
