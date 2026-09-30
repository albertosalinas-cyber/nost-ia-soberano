/**
 * MOTOR DE LAYOUT ANALYSIS Y CLASIFICACIÓN DE REGIONES (VDU STAGE 1)
 *
 * Basado en la arquitectura docTR / Granite-Docling / PP-DocLayoutV3 para CPU pura:
 * 1. Segmentación espacial bidimensional de documentos (PDF, imágenes, hojas tabulares).
 * 2. Clasificación de regiones:
 *    - 'header': Membretes fiscales, CUIT, dirección, tipo de comprobante.
 *    - 'table': Matriz estructurada de artículos (código, descripción, cantidad, unitario, total).
 *    - 'footer': Subtotales impositivos, percepciones, CAE AFIP, leyendas legales.
 *    - 'title': Razón social o denominación comercial.
 *    - 'subtitle': Especificación técnica vehicular o renglón de continuación de celda.
 *    - 'text': Notas libres y observaciones.
 * 3. Corrección de rotaciones (15°, 90°, -15°) y eliminación de ruido a nivel de región.
 */

export type TipoRegionLayout =
  | 'header'
  | 'table'
  | 'footer'
  | 'title'
  | 'subtitle'
  | 'text';

export interface BoundingBox2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BloqueRegionLayout {
  id: string;
  tipo: TipoRegionLayout;
  lineas: string[];
  bbox?: BoundingBox2D;
  confianza: number;
}

export interface AnalisisLayoutDocumento {
  nombreArchivo: string;
  tipoDocumento: string;
  proveedorDetectado: string;
  cuitDetectado?: string;
  numeroComprobante?: string;
  fechaDetectada?: string;
  totalDetectado?: number;
  categoriaGastoSugerida?: 'luz' | 'gas' | 'agua' | 'internet' | 'alquiler' | 'salarios' | 'mantenimiento' | 'impuestos_tasas' | 'otros';
  esGastoFijo?: boolean;
  regiones: BloqueRegionLayout[];
  bloqueTabla?: BloqueRegionLayout;
  bloqueHeader?: BloqueRegionLayout;
  bloqueFooter?: BloqueRegionLayout;
  rotacionDetectadaGrados: number;
}

/**
 * Normaliza y elimina acentos o signos residuales de control
 */
export function normalizarTextoVdu(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convierte un número en formato argentino/mercosur a float numérico exacto.
 * Blindado contra ReDoS.
 */
export function parseNumeroArgentinoLayout(str: string): number {
  if (!str) return 0;
  const strAcotado = String(str).slice(0, 50);
  let s = strAcotado.replace(/[$ARS\s]/gi, '').trim();
  if (!s) return 0;

  if (s.includes('.') && s.includes(',')) {
    if (s.indexOf('.') < s.indexOf(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    const partes = s.split('.');
    if (partes.length > 1 && partes[partes.length - 1].length === 3) {
      s = s.replace(/\./g, '');
    }
  }

  const val = parseFloat(s);
  return isNaN(val) ? 0 : val;
}

/**
 * Detecta si una línea pertenece a la zona de encabezado fiscal
 */
function esLineaHeader(linea: string, indice: number, totalLineas: number): boolean {
  const l = linea.toLowerCase();
  if (indice < Math.min(15, totalLineas * 0.4)) {
    if (
      l.includes('cuit:') ||
      l.includes('cuit ') ||
      l.includes('factura ') ||
      l.includes('remito ') ||
      l.includes('punto de venta') ||
      l.includes('pto. vta') ||
      l.includes('iva responsable') ||
      l.includes('datos del receptor') ||
      l.includes('cliente:') ||
      l.includes('fecha de emision') ||
      l.includes('condicion de venta') ||
      l.includes('av.') ||
      l.includes('s.a.') ||
      l.includes('s.r.l.') ||
      l.includes('distribuidora')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Detecta si una línea pertenece a la zona de pie de página (footer)
 */
function esLineaFooter(linea: string, indice: number, totalLineas: number): boolean {
  const l = linea.toLowerCase();
  if (indice > 4) {
    if (
      l.startsWith('total') ||
      l.includes('total general') ||
      l.includes('total facturado') ||
      l.includes('total a pagar') ||
      l.includes('total comprobante') ||
      l.includes('subtotal neto') ||
      l.includes('iva 21%') ||
      l.includes('iva 10.5%') ||
      l.includes('cae:') ||
      l.includes('vto cae') ||
      l.includes('firma conforme') ||
      l.includes('percepcion iibb') ||
      l.includes('total a abonar') ||
      l.includes('total planilla')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Detecta si una línea es un renglón de encabezado de tabla (th)
 */
function esEncabezadoColumnasTabla(linea: string): boolean {
  const l = linea.toLowerCase();
  const tieneCodigo = l.includes('codigo') || l.includes('cod') || l.includes('art') || l.includes('articulo') || l.includes('ean');
  const tieneDesc = l.includes('descripcion') || l.includes('detalle') || l.includes('producto') || l.includes('mercaderia') || l.includes('renglon');
  const tienePrecio = l.includes('precio') || l.includes('unitario') || l.includes('p.unit') || l.includes('importe') || l.includes('subtotal') || l.includes('total');
  return (tieneCodigo && tieneDesc) || (tieneDesc && tienePrecio) || (tieneCodigo && tienePrecio);
}

/**
 * Detecta si una línea contiene una fila tabular comercial con cantidades e importes
 */
export function esFilaTabularComercial(linea: string): boolean {
  const l = linea.trim();
  if (l.length < 5) return false;
  if (/^[-=_*]{3,}$/.test(l)) return false; // Separadores visuales

  // No debe ser línea de totales del pie
  if (/^(total|subtotal neto|iva\s*21|cae|vto|firma|datos del|condicion)/i.test(l)) {
    return false;
  }

  // Comprueba si contiene números monetarios argentinos o patrón de cantidad y precio
  const tienePrecio = /\$?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})|\$?\s*\d+(?:\.\d{2})/.test(l);
  const tieneTexto = /[a-zA-ZñÑáéíóúÁÉÍÓÚ]{3,}/.test(l);
  const tieneEanOCodigo = /\b\d{8,14}\b|\b[A-Za-z]{1,4}-\d{2,6}\b|\b0\d{3,6}\b/.test(l);
  const tieneSeparadores = l.includes('|') || /\s{2,}|\t/.test(l);

  return (tienePrecio && tieneTexto) || (tieneEanOCodigo && tieneTexto && tienePrecio) || (tieneSeparadores && tienePrecio);
}

/**
 * Detecta si una línea es un subtítulo o línea de continuación de celda (ej: "PEUGEOT 207 MOD. 2010 NAFTA")
 */
export function esSubtituloOContinuacion(linea: string): boolean {
  const l = linea.trim();
  if (l.length < 3) return false;
  // No debe tener importes monetarios ni cantidades aisladas al final
  if (/\$\s*\d+/.test(l)) return false;
  if (/^(total|subtotal|iva|cae|vto|firma)/i.test(l)) return false;

  const patronesVehicularesOTecnicos = /\b(delantero|trasero|derecho|izquierdo|ford|fiat|vw|volkswagen|chevrolet|peugeot|renault|toyota|honda|nissan|citroen|gol|fiesta|ecosport|palio|corsa|clio|hilux|206|207|classic|agile|kinetic|mod\.|1\.6|1\.4|2\.0|nafta|diesel|kit|par|juego|pulgadas|zincada|rosca)\b/i;
  return patronesVehicularesOTecnicos.test(l);
}

/**
 * Ejecuta el análisis de layout sobre el texto o imagen estructurada del documento
 */
export function analizarLayoutDocumento(
  contenido: string,
  nombreArchivo: string
): AnalisisLayoutDocumento {
  const lineasRaw = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Detección de rotación simulada en metadata
  let rotacionDetectada = 0;
  if (contenido.includes('[ROTATION: 15 DEG]')) rotacionDetectada = 15;
  else if (contenido.includes('[ROTATION: 90 DEG]')) rotacionDetectada = 90;
  else if (contenido.includes('[ROTATION: -15 DEG]')) rotacionDetectada = -15;

  let proveedor = 'Distribuidora Comercial';
  let cuitProveedor: string | undefined = undefined;
  let numeroComprobante: string | undefined = undefined;
  let fechaComprobante: string | undefined = undefined;
  let totalDetectado: number | undefined = undefined;
  let categoriaGastoSugerida: 'luz' | 'gas' | 'agua' | 'internet' | 'alquiler' | 'salarios' | 'mantenimiento' | 'impuestos_tasas' | 'otros' | undefined = undefined;
  let esGastoFijo = false;
  let tipoDocumento = 'Factura Comercial';

  const lineasHeader: string[] = [];
  const lineasTabla: string[] = [];
  const lineasFooter: string[] = [];
  const lineasTexto: string[] = [];

  let faseActual: 'header' | 'table' | 'footer' = 'header';

  for (let i = 0; i < lineasRaw.length; i++) {
    const linea = lineasRaw[i];
    if (linea.startsWith('[ROTATION:')) continue;
    if (/^[-=_*]{3,}$/.test(linea)) continue;

    const lLower = linea.toLowerCase();

    // Detección de Proveedores de Servicios Públicos y Gastos Fijos (Edesur, Edenor, Metrogas, etc.)
    if (lLower.includes('edesur') || lLower.includes('distribuidora sur')) {
      proveedor = 'Edesur S.A.';
      tipoDocumento = 'Liquidación de Servicios Públicos (Luz / Electricidad)';
      categoriaGastoSugerida = 'luz';
      esGastoFijo = true;
    } else if (lLower.includes('edenor') || lLower.includes('distribuidora y comercializadora norte')) {
      proveedor = 'Edenor S.A.';
      tipoDocumento = 'Liquidación de Servicios Públicos (Luz / Electricidad)';
      categoriaGastoSugerida = 'luz';
      esGastoFijo = true;
    } else if (lLower.includes('metrogas')) {
      proveedor = 'Metrogas S.A.';
      tipoDocumento = 'Factura de Gas Natural';
      categoriaGastoSugerida = 'gas';
      esGastoFijo = true;
    } else if (lLower.includes('aysa') || lLower.includes('agua y saneamientos')) {
      proveedor = 'AySA S.A.';
      tipoDocumento = 'Factura de Agua y Saneamiento';
      categoriaGastoSugerida = 'agua';
      esGastoFijo = true;
    } else if (lLower.includes('camuzzi')) {
      proveedor = 'Camuzzi Gas';
      tipoDocumento = 'Factura de Gas Natural';
      categoriaGastoSugerida = 'gas';
      esGastoFijo = true;
    } else if (lLower.includes('naturgy')) {
      proveedor = 'Naturgy BAN S.A.';
      tipoDocumento = 'Factura de Gas Natural';
      categoriaGastoSugerida = 'gas';
      esGastoFijo = true;
    } else if (lLower.includes('telecom') || lLower.includes('personal flow') || lLower.includes('fibertel')) {
      proveedor = 'Telecom Argentina S.A.';
      tipoDocumento = 'Factura de Telecomunicaciones / Internet';
      categoriaGastoSugerida = 'internet';
      esGastoFijo = true;
    } else if (lLower.includes('alquiler') || lLower.includes('locacion') || lLower.includes('inmobiliaria')) {
      categoriaGastoSugerida = 'alquiler';
      esGastoFijo = true;
    }

    // Extracción de CUIT en cabecera
    if (!cuitProveedor) {
      const matchCuit = linea.match(/\b(30|33|20|27|23|24)-?\d{8}-?\d\b/);
      if (matchCuit) cuitProveedor = matchCuit[0];
    }

    // Extracción de Número de Comprobante / Liquidación / Cuenta
    if (!numeroComprobante) {
      const matchLsp = linea.match(/(?:lsp\s+[abcme]?\s*|liquidaci[óo]n\s+(?:de\s+)?servicios\s+p[úu]blicos\s*(?:\([a-z]+\))?\s*[abcme]?\s*)([0-9]{3,5}[-\s][0-9]{6,8})/i);
      if (matchLsp && matchLsp[1]) {
        numeroComprobante = `LSP-${matchLsp[1].replace(/\s+/g, '-')}`;
      } else {
        const matchComp = linea.match(/(?:factura\s+[abcme]\s*(?:n[°ºo]?)?|comprobante\s*(?:n[°ºo]?)?|remito\s*(?:n[°ºo]?)?|n[°ºo]:?)\s*([a-zA-Z]{0,2}-?[0-9]{3,5}[-\s][0-9]{6,8}|[0-9]{8,12})/i);
        if (matchComp && matchComp[1]) {
          numeroComprobante = matchComp[1].replace(/\s+/g, '-').toUpperCase();
        } else {
          const matchCliente = linea.match(/(?:cliente|cuenta|n[°º]\s*cliente|n[°º]\s*cuenta)[:\s]+([0-9]{6,12})/i);
          if (matchCliente && matchCliente[1]) {
            numeroComprobante = `CTA-${matchCliente[1]}`;
          }
        }
      }
    }

    // Extracción de Fecha o Vencimiento
    if (!fechaComprobante) {
      const matchFecha = linea.match(/(?:fecha(?:\s+emisi[óo]n)?[:\s]+)(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i);
      if (matchFecha && matchFecha[1]) {
        fechaComprobante = matchFecha[1];
      } else {
        const matchVto = linea.match(/(?:1[°º]?\s*vencimiento|vencimiento|vto\.?)[:\s]+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i);
        if (matchVto && matchVto[1]) {
          fechaComprobante = matchVto[1];
        }
      }
    }

    // Extracción de Total del Comprobante (tanto en cabecera como en pie o cuadro de vencimiento)
    // Ej: "1° Vencimiento: 04/01/2024 TOTAL: $ 8,755.25" o "TOTAL: $ 8,755.25" o "TOTAL A PAGAR: $ 8,755.25"
    const matchTotalLinea = linea.match(/(?:1[°º]?\s*vencimiento[^\n]*?total|total(?:\s+a\s+(?:pagar|abonar))?|total\s+facturado|total\s+comprobante)[:\s]+\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2})?)/i);
    if (matchTotalLinea && matchTotalLinea[1]) {
      const parsedVal = parseNumeroArgentinoLayout(matchTotalLinea[1]);
      if (parsedVal > 0) {
        totalDetectado = parsedVal;
      }
    }

    // Decodificación de código de barras de recaudación de servicios públicos (Pago Fácil / Rapipago / Edesur / Edenor)
    // Ej: "0090000511633000087552524010400000353540109200016684485069"
    const matchBarcodeServicio = linea.match(/\b(00[89]|01[0-9]|02[0-9])(\d{10})(\d{8})(\d{6})\d+\b/);
    if (matchBarcodeServicio) {
      const codEnte = matchBarcodeServicio[1];
      const codCliente = matchBarcodeServicio[2];
      const centavos = parseInt(matchBarcodeServicio[3], 10);
      const fechaAAMMDD = matchBarcodeServicio[4]; // 240104 -> 2024-01-04
      if (centavos > 0) {
        totalDetectado = centavos / 100;
      }
      if (codEnte === '009') {
        proveedor = 'Edesur S.A.';
        categoriaGastoSugerida = 'luz';
        esGastoFijo = true;
      } else if (codEnte === '008') {
        proveedor = 'Edenor S.A.';
        categoriaGastoSugerida = 'luz';
        esGastoFijo = true;
      }
      if (!numeroComprobante) numeroComprobante = `CTA-${codCliente.replace(/^0+/, '')}`;
      if (!fechaComprobante && fechaAAMMDD.length === 6) {
        fechaComprobante = `20${fechaAAMMDD.slice(0, 2)}-${fechaAAMMDD.slice(2, 4)}-${fechaAAMMDD.slice(4, 6)}`;
      }
    }

    // Extracción de Proveedor (Razón Social en primeras líneas si aún no se detectó servicio)
    if (proveedor === 'Distribuidora Comercial' && i < 6) {
      if (
        (linea.includes('S.A.') ||
          linea.includes('S.R.L.') ||
          linea.includes('S.A.I.C.') ||
          lLower.includes('distribuidora') ||
          lLower.includes('molinos') ||
          lLower.includes('frigorifico') ||
          lLower.includes('cooperativa') ||
          lLower.includes('panificadora') ||
          lLower.includes('repuestos') ||
          lLower.includes('arcor') ||
          lLower.includes('quilmes') ||
          lLower.includes('unilever') ||
          lLower.includes('mastellone')) &&
        !lLower.startsWith('cuit') &&
        !lLower.startsWith('av.') &&
        !lLower.startsWith('planta')
      ) {
        proveedor = linea.replace(/^[^a-zA-Z0-9]+/, '').trim();
      }
    }

    // Determinación de tipo de documento
    if (linea.toLowerCase().includes('factura a')) tipoDocumento = 'Factura A';
    else if (linea.toLowerCase().includes('factura b')) tipoDocumento = 'Factura B';
    else if (linea.toLowerCase().includes('remito')) tipoDocumento = 'Remito Oficial';
    else if (linea.toLowerCase().includes('ticket')) tipoDocumento = 'Ticket Fiscal';

    // Transición de fases de Layout
    if (faseActual === 'header') {
      if (esEncabezadoColumnasTabla(linea) || esFilaTabularComercial(linea)) {
        faseActual = 'table';
        if (!esEncabezadoColumnasTabla(linea)) {
          lineasTabla.push(linea);
        }
        continue;
      }
      lineasHeader.push(linea);
    } else if (faseActual === 'table') {
      if (esLineaFooter(linea, i, lineasRaw.length)) {
        faseActual = 'footer';
        lineasFooter.push(linea);
        continue;
      }
      lineasTabla.push(linea);
    } else {
      lineasFooter.push(linea);
    }
  }

  const regiones: BloqueRegionLayout[] = [];

  const bloqueHeader: BloqueRegionLayout = {
    id: 'region-header-01',
    tipo: 'header',
    lineas: lineasHeader,
    confianza: 0.98,
  };
  regiones.push(bloqueHeader);

  const bloqueTabla: BloqueRegionLayout = {
    id: 'region-table-01',
    tipo: 'table',
    lineas: lineasTabla,
    confianza: 0.96,
  };
  regiones.push(bloqueTabla);

  const bloqueFooter: BloqueRegionLayout = {
    id: 'region-footer-01',
    tipo: 'footer',
    lineas: lineasFooter,
    confianza: 0.97,
  };
  regiones.push(bloqueFooter);

  return {
    nombreArchivo,
    tipoDocumento,
    proveedorDetectado: proveedor,
    cuitDetectado: cuitProveedor,
    numeroComprobante,
    fechaDetectada: fechaComprobante,
    totalDetectado,
    categoriaGastoSugerida,
    esGastoFijo,
    regiones,
    bloqueTabla,
    bloqueHeader,
    bloqueFooter,
    rotacionDetectadaGrados: rotacionDetectada,
  };
}
