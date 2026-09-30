import type { Producto, AprendizajeAlias } from '../types';

/**
 * MOTOR MULTI-RUBRO DE COTEJO Y DESAMBIGUACIÓN SEMÁNTICA (5 ETAPAS)
 *
 * Diseñado con rigor matemático y semántico para comercio minorista, mayorista, panaderías,
 * ferreterías, farmacias, kioscos y distribuidoras.
 *
 * 5 ETAPAS EN CASCADA:
 * ETAPA 0: Memoria de Aprendizaje Adaptativo Persistente (Reglas de alias aprendidas por el comerciante)
 * ETAPA 1: Sanitización Contextual de OCR y Normalización de Errores Tipográficos
 * ETAPA 2: Extractor de ADN de Producto (Fingerprint Semántico Multirrubro)
 * ETAPA 3: Matriz de Vetos Inquebrantables (Hard Constraints)
 * ETAPA 4: Scoring Multidimensional Ponderado con Umbral Estricto
 * ETAPA 5: Memoria de Aprendizaje y Resolución por SKU / Códigos de Barra
 */

export interface ADNProducto {
  textoOriginal: string;
  sustantivoRaiz: string;
  discriminadoresCriticos: Set<string>; // 0, 00, 000, 0000, leudante, integral, etc.
  magnitud?: { valor: number; unidad: string; texto: string }; // { valor: 50, unidad: 'kg' }, { valor: 5, unidad: 'l' }
  empaque?: string; // 'bolsa', 'bidon', 'botella', 'lata', 'pack'
  marcaOAtributo?: string; // marcas o palabras clave secundarias
  tokensGenerales: string[];
}

export interface ResultadoCotejoMercaderia {
  productoCoincidente?: Producto;
  esNuevoProducto: boolean;
  scoreSimilitud: number;
  razonCotejo:
    | 'codigo_exacto'
    | 'sku_exacto'
    | 'nombre_identico'
    | 'alta_confianza_semantica'
    | 'memoria_aprendizaje'
    | 'sin_coincidencia';
  codigoSugerido: string;
  skuSugerido?: string;
  nombreNormalizado: string;
  etapasDiagnostico?: string;
  aprendizajeAplicado?: boolean;
}

// ---------------------------------------------------------------------------------
// ETAPA 1: Sanitización Contextual de OCR
// ---------------------------------------------------------------------------------
export function sanitizarTextoOcrMercaderia(texto: string): string {
  if (!texto) return '';
  let res = texto;

  // 0. Sanitización XSS: eliminar etiquetas HTML, scripts, handlers y caracteres de inyección
  res = res.replace(/<[^>]*>?/gm, ' ');
  res = res.replace(/onerror\s*=|onload\s*=|javascript:/gi, ' ');
  res = res.replace(/[<>"'`]/g, ' ');

  // 1. Corrección de bidones, botellas y litros donde '1' o 'l' se confunden (ej: "bidón 51" -> "bidón 5L")
  res = res.replace(/\b(bid[oó]n|botella|pack|caja|balde|lata)\s*(\d+)1\b/gi, '$1 $2L');
  res = res.replace(/\b(\d+)\s*(?:lt|lts|litros?)\b/gi, '$1L');
  res = res.replace(/\b(\d+)\s*l\b/gi, '$1L');

  // 2. Corrección de gramos y kilos
  res = res.replace(/\b(\d+)\s*(?:kgr?|kilos?)\b/gi, '$1kg');
  res = res.replace(/\b(\d+)\s*(?:gr?|gramos?)\b/gi, '$1g');
  res = res.replace(/\b(\d+)\s*(?:cc|cm3|ml)\b/gi, '$1ml');

  // 3. Normalizar ceros de harina (evitar confusión entre letra O mayúscula/minúscula y el número cero)
  res = res.replace(/\b([oO0]{3,4})\b/g, (match) => '0'.repeat(match.length));

  // 4. Fracciones comunes en pulgadas (Ferretería: 1/2, 3/4, 1/4)
  res = res.replace(/\b1\/2\s*(?:"|pulgadas?|pulg)?\b/gi, '1/2"');
  res = res.replace(/\b3\/4\s*(?:"|pulgadas?|pulg)?\b/gi, '3/4"');
  res = res.replace(/\b1\/4\s*(?:"|pulgadas?|pulg)?\b/gi, '1/4"');

  return res.trim();
}

// ---------------------------------------------------------------------------------
// ETAPA 2: Extractor de ADN de Producto (Fingerprint Semántico Multirrubro)
// ---------------------------------------------------------------------------------
export function extraerADNProducto(texto: string): ADNProducto {
  const limpio = sanitizarTextoOcrMercaderia(texto);
  const normalizado = limpio
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // sin tildes
    .replace(/[^\w\s\d\/"\.]/g, ' ')
    .trim();

  const palabras = normalizado.split(/\s+/).filter(Boolean);

  const discriminadoresCriticos = new Set<string>();
  let magnitud: { valor: number; unidad: string; texto: string } | undefined;
  let empaque: string | undefined;
  let sustantivoRaiz = '';
  const tokensGenerales: string[] = [];

  const empaquesConocidos = ['bidon', 'botella', 'bolsa', 'pack', 'caja', 'pote', 'balde', 'lata', 'frasco', 'sachet'];
  const discriminadoresConocidos = [
    '0', '00', '000', '0000',
    'leudante', 'integral', 'comun', 'fresca', 'seca',
    'retornable', 'descartable', 'zero', 'light', 'original',
    'girasol', 'maiz', 'oliva', 'mezcla',
    'fina', 'gruesa', 'entera', 'descremada',
    '1/2"', '3/4"', '1/4"', '1"', '2"'
  ];

  for (const p of palabras) {
    // A) Detectar grados de ceros (harinas)
    if (/^0+$/.test(p)) {
      discriminadoresCriticos.add(p);
      continue;
    }

    // B) Detectar magnitudes (ej: 50kg, 25kg, 5l, 1.5l, 500g, 900ml)
    const matchMag = p.match(/^(\d+(?:\.\d+)?)(kg|g|l|ml)$/);
    if (matchMag) {
      const val = parseFloat(matchMag[1]);
      const u = matchMag[2];
      magnitud = { valor: val, unidad: u, texto: `${val}${u}` };
      discriminadoresCriticos.add(`${val}${u}`);
      continue;
    }

    // C) Detectar medidas en pulgadas
    if (/^\d+\/\d+"?$/.test(p) || /^\d+"$/.test(p)) {
      const pulg = p.endsWith('"') ? p : `${p}"`;
      discriminadoresCriticos.add(pulg);
      continue;
    }

    // D) Detectar empaque
    if (empaquesConocidos.includes(p)) {
      empaque = p;
      continue;
    }

    // E) Detectar discriminadores de calidad o variedad
    if (discriminadoresConocidos.includes(p)) {
      discriminadoresCriticos.add(p);
      continue;
    }

    // F) Stopwords comunes en facturación
    const stopwords = new Set(['de', 'del', 'la', 'el', 'en', 'y', 'para', 'con', 'sin', 'por', 'a', 'x']);
    if (stopwords.has(p)) continue;

    // G) Sustantivo raíz (primer sustantivo significativo: harina, aceite, tornillo, fideos, yerba)
    if (!sustantivoRaiz && p.length > 2 && isNaN(Number(p))) {
      sustantivoRaiz = p;
    }

    if (p.length > 1) {
      tokensGenerales.push(p);
    }
  }

  return {
    textoOriginal: texto,
    sustantivoRaiz,
    discriminadoresCriticos,
    magnitud,
    empaque,
    tokensGenerales,
  };
}

// ---------------------------------------------------------------------------------
// ETAPA 3: Matriz de Vetos Inquebrantables (Hard Constraints)
// ---------------------------------------------------------------------------------
export function evaluarVetosIncompatibles(adnA: ADNProducto, adnB: ADNProducto): { vetado: boolean; motivo?: string } {
  // 1. VETO DE CEROS (0 vs 00 vs 000 vs 0000): Incompatible al 100%
  for (const discA of adnA.discriminadoresCriticos) {
    if (/^0+$/.test(discA)) {
      for (const discB of adnB.discriminadoresCriticos) {
        if (/^0+$/.test(discB) && discA !== discB) {
          return { vetado: true, motivo: `Calidades incompatibles (${discA} vs ${discB})` };
        }
      }
    }
  }

  // 2. VETO DE MAGNITUD NUMÉRICA DISPARE (ej: 50kg vs 1kg, o 5L vs 1.5L)
  if (adnA.magnitud && adnB.magnitud) {
    if (
      adnA.magnitud.unidad === adnB.magnitud.unidad &&
      Math.abs(adnA.magnitud.valor - adnB.magnitud.valor) > 0.01
    ) {
      return {
        vetado: true,
        motivo: `Presentaciones de diferente gramaje/volumen (${adnA.magnitud.texto} vs ${adnB.magnitud.texto})`,
      };
    }
  }

  // 3. VETO DE MEDIDAS DE FERRETERÍA EN PULGADAS (ej: 1/2" vs 3/4")
  for (const discA of adnA.discriminadoresCriticos) {
    if (discA.includes('"')) {
      for (const discB of adnB.discriminadoresCriticos) {
        if (discB.includes('"') && discA !== discB) {
          return { vetado: true, motivo: `Calibres dispares (${discA} vs ${discB})` };
        }
      }
    }
  }

  // 4. VETO DE VARIEDADES OPUESTAS (ej: 'leudante' vs 'integral' o 'fresca' vs 'seca')
  const opuestos: [string, string][] = [
    ['leudante', 'integral'],
    ['leudante', 'comun'],
    ['fresca', 'seca'],
    ['retornable', 'descartable'],
    ['zero', 'original'],
    ['fina', 'gruesa'],
    ['entera', 'descremada'],
  ];

  for (const [opA, opB] of opuestos) {
    const tieneOpA = adnA.discriminadoresCriticos.has(opA);
    const tieneOpB = adnA.discriminadoresCriticos.has(opB);
    const bTieneOpA = adnB.discriminadoresCriticos.has(opA);
    const bTieneOpB = adnB.discriminadoresCriticos.has(opB);

    if ((tieneOpA && bTieneOpB) || (tieneOpB && bTieneOpA)) {
      return { vetado: true, motivo: `Variedades mutuamente excluyentes (${opA} vs ${opB})` };
    }
  }

  return { vetado: false };
}

// ---------------------------------------------------------------------------------
// ETAPA 4: Scoring Multidimensional Ponderado
// ---------------------------------------------------------------------------------
export function calcularScoreSemantico(descFactura: string, descCatalogo: string): number {
  const adnFac = extraerADNProducto(descFactura);
  const adnCat = extraerADNProducto(descCatalogo);

  // Evaluar vetos estrictos
  const veto = evaluarVetosIncompatibles(adnFac, adnCat);
  if (veto.vetado) {
    return 0; // Veto inquebrantable
  }

  let score = 0;

  // 1. Coincidencia de Sustantivo Raíz (40%)
  if (adnFac.sustantivoRaiz && adnCat.sustantivoRaiz) {
    if (adnFac.sustantivoRaiz === adnCat.sustantivoRaiz) {
      score += 40;
    } else if (
      adnFac.sustantivoRaiz.includes(adnCat.sustantivoRaiz) ||
      adnCat.sustantivoRaiz.includes(adnFac.sustantivoRaiz)
    ) {
      score += 30;
    } else {
      // Si los sustantivos raíces son distintos (ej: 'aceite' vs 'fideo'), no es el mismo producto
      return 0;
    }
  }

  // 2. Coincidencia de Magnitud / Presentación (30%)
  if (adnFac.magnitud && adnCat.magnitud) {
    if (
      adnFac.magnitud.valor === adnCat.magnitud.valor &&
      adnFac.magnitud.unidad === adnCat.magnitud.unidad
    ) {
      score += 30;
    }
  } else if (!adnFac.magnitud && !adnCat.magnitud) {
    score += 20; // Ninguno especifica magnitud, neutral
  }

  // 3. Coincidencia de Discriminadores Críticos (20%)
  let discriminadoresCoincidentes = 0;
  for (const disc of adnFac.discriminadoresCriticos) {
    if (adnCat.discriminadoresCriticos.has(disc)) {
      discriminadoresCoincidentes++;
    }
  }
  if (adnFac.discriminadoresCriticos.size > 0) {
    const ratio = discriminadoresCoincidentes / adnFac.discriminadoresCriticos.size;
    score += Math.round(ratio * 20);
  } else {
    score += 10;
  }

  // 4. Coincidencia Residual de Tokens Generales (Jaccard - 10%)
  const setA = new Set(adnFac.tokensGenerales);
  const setB = new Set(adnCat.tokensGenerales);
  let inter = 0;
  for (const t of setA) {
    if (setB.has(t)) inter++;
  }
  const union = new Set([...setA, ...setB]).size;
  if (union > 0) {
    score += Math.round((inter / union) * 10);
  }

  return Math.min(100, score);
}

// ---------------------------------------------------------------------------------
// Generador Determinista de Código EAN-13
// ---------------------------------------------------------------------------------
export function generarEan13Determinista(semilla: string): string {
  let hash = 2166136261;
  const str = semilla.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const positivo = Math.abs(hash);
  const cuerpo = `779${String(positivo).padStart(9, '0').slice(-9)}`;

  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(cuerpo[i], 10);
    suma += i % 2 === 0 ? digito * 1 : digito * 3;
  }
  const resto = suma % 10;
  const digitoVerificador = resto === 0 ? 0 : 10 - resto;

  return `${cuerpo}${digitoVerificador}`;
}

// ---------------------------------------------------------------------------------
// Generador de SKU Predictivo para Comercios sin Códigos de Barra
// (ej: "Harina 000 (50kg)" -> "HAR-000-50KG")
// ---------------------------------------------------------------------------------
export function generarSkuPredictivo(descripcion: string): string {
  const adn = extraerADNProducto(descripcion);
  const partes: string[] = [];

  if (adn.sustantivoRaiz) {
    partes.push(adn.sustantivoRaiz.slice(0, 4).toUpperCase());
  } else {
    partes.push('ART');
  }

  for (const crit of adn.discriminadoresCriticos) {
    partes.push(crit.toUpperCase().replace(/[^\w\d]/g, ''));
  }

  if (adn.magnitud) {
    partes.push(`${adn.magnitud.valor}${adn.magnitud.unidad.toUpperCase()}`);
  }

  if (partes.length === 1) {
    partes.push(Math.abs(semillaHash(descripcion)).toString().slice(0, 4));
  }

  return partes.join('-').slice(0, 20);
}

function semillaHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

// ---------------------------------------------------------------------------------
// Extractor y Separador de Códigos de Barra y Artículos Mezclados en la Denominación
// (Evita que códigos como "7790895000431 Harina 000" o "00124 Harina" se sumen al nombre)
// ---------------------------------------------------------------------------------
export interface DesgloseCodigoDescripcion {
  codigo: string;
  sku?: string;
  descripcionLimpia: string;
  codigoDetectado: boolean;
}

export function desglosarCodigoYDescripcion(
  texto: string,
  codigoExistente?: string,
  skuExistente?: string
): DesgloseCodigoDescripcion {
  if (!texto) {
    return {
      codigo: (codigoExistente || '').trim(),
      sku: skuExistente?.trim(),
      descripcionLimpia: '',
      codigoDetectado: false,
    };
  }

  let limpio = texto.trim();
  let codigoDetectado = (codigoExistente || '').trim();
  let skuDetectado = skuExistente?.trim();
  let huboExtraccion = false;

  // 1. Patrón EAN / Barcode al inicio (8 a 14 dígitos, típico 779... de Argentina)
  // Ej: "7790895000431 Harina 000 (50kg)"
  // Ej: "7790895000431 - Harina 000 (50kg)"
  // Ej: "[7790895000431] Harina 000 (50kg)"
  // Ej: "COD: 7790895000431 Harina 000"
  // Ej: "EAN: 7790895000431 Harina 000"
  const regexEanInicio = /^(?:\[|\()? *(?:(?:cod(?:igo|\.|\:)?|art(?:iculo|\.|\:)?|ean(?:\:)?)\s*)?([0-9]{8,14}) *(?:\]|\))? *[-–—:\/\|\.]? *(.+)$/i;
  const matchEan = limpio.match(regexEanInicio);
  if (matchEan) {
    const cod = matchEan[1].trim();
    const resto = matchEan[2].trim();
    // Validar que el resto contenga texto alfabético descriptivo
    if (resto.length >= 2 && /[a-zA-ZñÑáéíóúÁÉÍÓÚ]/.test(resto)) {
      if (!codigoDetectado || codigoDetectado.length < 8) {
        codigoDetectado = cod;
      }
      limpio = resto;
      huboExtraccion = true;
    }
  }

  // 2. Patrón de Código de Artículo Interno / Alfanumérico al inicio con prefijo explícito (COD:, ART:, SKU:)
  // Ej: "COD: 104 Harina 000 (50kg)"
  // Ej: "ART-102: Aceite de Girasol 1.5L"
  // Ej: "SKU: HAR-000-50 Harina 000"
  if (!huboExtraccion) {
    const regexPrefijo = /^(?:(?:cod(?:igo|\.|\:)?|art(?:iculo|\.|\:)?|sku(?:\:)?)\s*[:\.]?)\s*([A-Za-z0-9\-_]{2,16})\s*[-–—:\/\|\.]?\s*(.+)$/i;
    const matchPref = limpio.match(regexPrefijo);
    if (matchPref) {
      const cod = matchPref[1].trim();
      const resto = matchPref[2].trim();
      if (resto.length >= 2 && /[a-zA-ZñÑáéíóúÁÉÍÓÚ]/.test(resto)) {
        if (!codigoDetectado) codigoDetectado = cod;
        if (!skuDetectado) skuDetectado = cod;
        limpio = resto;
        huboExtraccion = true;
      }
    }
  }

  // 3. Patrón de código con ceros a la izquierda o alfanumérico claro al inicio
  // Ej: "00124 Harina 000 (50kg)"
  // Ej: "00042 - Aceite 1.5L"
  // Ej: "A-102 Tornillo Parker"
  if (!huboExtraccion) {
    const regexCodigoCeros = /^(?:\[|\()? *(0\d{2,7}|[A-Z]{1,4}-\d{1,6}) *(?:\]|\))? *[-–—:\/\|\.]? *(.+)$/i;
    const matchCeros = limpio.match(regexCodigoCeros);
    if (matchCeros) {
      const cod = matchCeros[1].trim();
      const resto = matchCeros[2].trim();
      if (resto.length >= 2 && /[a-zA-ZñÑáéíóúÁÉÍÓÚ]/.test(resto)) {
        if (!codigoDetectado) codigoDetectado = cod;
        if (!skuDetectado) skuDetectado = cod;
        limpio = resto;
        huboExtraccion = true;
      }
    }
  }

  // 4. Patrón de código / barcode al final entre corchetes o paréntesis o con guión
  // Ej: "Harina 000 (50kg) [7790895000431]"
  // Ej: "Harina 000 (50kg) (COD: 7790895000431)"
  // Ej: "Harina 000 (50kg) - 7790895000431"
  const regexFinal = /^(.*?)\s*[-–—:\/\|]?\s*(?:\[|\(|\b)(?:cod(?:igo|\.|\:)?|ean(?:\:)?\s*)?([0-9]{8,14}|[A-Z0-9\-_]{4,14})(?:\]|\)|\b)\s*$/i;
  const matchFinal = limpio.match(regexFinal);
  if (matchFinal && matchFinal[1] && matchFinal[2]) {
    const resto = matchFinal[1].trim();
    const cod = matchFinal[2].trim();
    if (resto.length >= 3 && /[a-zA-ZñÑáéíóúÁÉÍÓÚ]/.test(resto) && (cod.length >= 8 || /^\d{8,14}$/.test(cod))) {
      if (!codigoDetectado || codigoDetectado.length < 8) {
        codigoDetectado = cod;
      }
      limpio = resto;
      huboExtraccion = true;
    }
  }

  // 5. Limpieza de separadores residuales al inicio o al final del nombre
  limpio = limpio
    .replace(/^[-–—:\/\|\.\s]+/, '')
    .replace(/[-–—:\/\|\.\s]+$/, '')
    .trim();

  return {
    codigo: codigoDetectado,
    sku: skuDetectado,
    descripcionLimpia: limpio,
    codigoDetectado: huboExtraccion,
  };
}

// ---------------------------------------------------------------------------------
// ETAPA 5: Cotejo y Vinculación Integral con Memoria de Alias y Soporte SKU
// ---------------------------------------------------------------------------------
export function cotejarRenglonConCatalogo(
  descripcionExtraida: string,
  codigoExtraido: string | undefined,
  productosExistentes: Producto[],
  skuExtraido?: string,
  proveedor?: string,
  aprendizajesConocidos?: AprendizajeAlias[]
): ResultadoCotejoMercaderia {
  // 0. Extraer y desacoplar cualquier código o código de barras accidentalmente incrustado en el nombre
  const desglose = desglosarCodigoYDescripcion(descripcionExtraida, codigoExtraido, skuExtraido);
  const descSanitizada = sanitizarTextoOcrMercaderia(desglose.descripcionLimpia);
  const codigoTrim = desglose.codigo ? desglose.codigo.trim() : '';
  const skuTrim = desglose.sku ? desglose.sku.trim() : (skuExtraido ? skuExtraido.trim() : '');

  // 0.B. ETAPA 0: MEMORIA DE APRENDIZAJE ADAPTATIVO (Reglas aprendidas previamente por el comerciante)
  if (aprendizajesConocidos && aprendizajesConocidos.length > 0) {
    const descNorm = descSanitizada.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const provNorm = (proveedor || '').toLowerCase().trim();

    const reglaAprendida = aprendizajesConocidos.find((a) => {
      const aNorm = a.textoOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const matchTexto = aNorm === descNorm || (descNorm.length >= 6 && (descNorm.includes(aNorm) || aNorm.includes(descNorm)));
      if (!matchTexto) return false;
      if (a.proveedor && provNorm && !provNorm.includes(a.proveedor.toLowerCase().trim())) {
        return false;
      }
      return true;
    });

    if (reglaAprendida) {
      const prodDestino = productosExistentes.find((p) => p.id === reglaAprendida.productoIdDestino);
      if (prodDestino) {
        return {
          productoCoincidente: prodDestino,
          esNuevoProducto: false,
          scoreSimilitud: 100,
          razonCotejo: 'memoria_aprendizaje',
          codigoSugerido: prodDestino.codigoBarras,
          skuSugerido: prodDestino.sku || generarSkuPredictivo(prodDestino.nombre),
          nombreNormalizado: prodDestino.nombre,
          etapasDiagnostico: `🧠 Reconocido por Memoria de Aprendizaje (aplicado ${reglaAprendida.vecesAplicado} veces)`,
          aprendizajeAplicado: true,
        };
      }
    }
  }

  // 1. Cotejo primario: Coincidencia por Código de Barras
  if (codigoTrim && codigoTrim.length >= 4) {
    const prodPorCodigo = productosExistentes.find(
      (p) => p.codigoBarras === codigoTrim || (p.sku && p.sku === codigoTrim)
    );
    if (prodPorCodigo) {
      return {
        productoCoincidente: prodPorCodigo,
        esNuevoProducto: false,
        scoreSimilitud: 100,
        razonCotejo: 'codigo_exacto',
        codigoSugerido: prodPorCodigo.codigoBarras,
        skuSugerido: prodPorCodigo.sku || generarSkuPredictivo(prodPorCodigo.nombre),
        nombreNormalizado: prodPorCodigo.nombre,
        etapasDiagnostico: 'Coincidencia directa por código de barras / EAN',
      };
    }
  }

  // 2. Cotejo por SKU explícito
  if (skuTrim && skuTrim.length >= 2) {
    const prodPorSku = productosExistentes.find((p) => p.sku && p.sku.toLowerCase() === skuTrim.toLowerCase());
    if (prodPorSku) {
      return {
        productoCoincidente: prodPorSku,
        esNuevoProducto: false,
        scoreSimilitud: 100,
        razonCotejo: 'sku_exacto',
        codigoSugerido: prodPorSku.codigoBarras,
        skuSugerido: prodPorSku.sku,
        nombreNormalizado: prodPorSku.nombre,
        etapasDiagnostico: 'Coincidencia directa por SKU comercial',
      };
    }
  }

  // 3. Cotejo por Nombre Idéntico Exacto (usando la descripción desglosada y limpia)
  const normA = descSanitizada.toLowerCase().replace(/\s+/g, ' ');
  const prodNombreExacto = productosExistentes.find(
    (p) => p.nombre.toLowerCase().replace(/\s+/g, ' ') === normA
  );
  if (prodNombreExacto) {
    return {
      productoCoincidente: prodNombreExacto,
      esNuevoProducto: false,
      scoreSimilitud: 100,
      razonCotejo: 'nombre_identico',
      codigoSugerido: codigoTrim && codigoTrim.length >= 8 ? codigoTrim : prodNombreExacto.codigoBarras,
      skuSugerido: prodNombreExacto.sku || generarSkuPredictivo(prodNombreExacto.nombre),
      nombreNormalizado: prodNombreExacto.nombre,
      etapasDiagnostico: 'Coincidencia 100% idéntica por denominación',
    };
  }

  // 4. Cotejo Semántico Multirrubro con Matriz de Vetos y Scoring Ponderado
  let mejorMatch: { producto: Producto; score: number } | null = null;

  for (const prod of productosExistentes) {
    const score = calcularScoreSemantico(descSanitizada, prod.nombre);
    // Umbral de alta confianza estricto (85% o más)
    if (score >= 85) {
      if (!mejorMatch || score > mejorMatch.score) {
        mejorMatch = { producto: prod, score };
      }
    }
  }

  if (mejorMatch) {
    return {
      productoCoincidente: mejorMatch.producto,
      esNuevoProducto: false,
      scoreSimilitud: mejorMatch.score,
      razonCotejo: 'alta_confianza_semantica',
      codigoSugerido: codigoTrim && codigoTrim.length >= 8 ? codigoTrim : mejorMatch.producto.codigoBarras,
      skuSugerido: mejorMatch.producto.sku || generarSkuPredictivo(mejorMatch.producto.nombre),
      nombreNormalizado: mejorMatch.producto.nombre,
      etapasDiagnostico: `Cotejo semántico validado (${mejorMatch.score}% sin vetos)`,
    };
  }

  // 5. Es un Producto Nuevo: Asignar código EAN-13 y SKU deterministas
  // Si la factura trajo un código real (EAN-13 de 8 a 14 dígitos), conservarlo para no perderlo
  const codigoNuevo =
    codigoTrim && codigoTrim.length >= 8 ? codigoTrim : generarEan13Determinista(descSanitizada);
  const skuNuevo = skuTrim || generarSkuPredictivo(descSanitizada);

  return {
    productoCoincidente: undefined,
    esNuevoProducto: true,
    scoreSimilitud: 0,
    razonCotejo: 'sin_coincidencia',
    codigoSugerido: codigoNuevo,
    skuSugerido: skuNuevo,
    nombreNormalizado: descSanitizada,
    etapasDiagnostico: 'Producto nuevo catalogado con EAN-13 y SKU deterministas',
  };
}

/**
 * Reconciliador de Ítems del Pipeline VDU con el Catálogo de la PyME
 * Procesa la entidad estructurada VDU: reconciliación por EAN/SKU primero,
 * y por similitud de tokens con matriz de vetos después.
 */
export function reconciliarItemVduConCatalogo(
  item: {
    codigo: string | null;
    descripcion_principal: string;
    descripcion_secundaria?: string | null;
    cantidad: number;
    precio_unitario: string;
    precio_total: string;
  },
  productosExistentes: Producto[]
): ResultadoCotejoMercaderia {
  // 1. Cotejo prioritario por Código de Barras / EAN
  const codTrim = (item.codigo || '').trim();
  if (codTrim && codTrim.length >= 4) {
    const prodPorCodigo = productosExistentes.find(
      (p) => p.codigoBarras === codTrim || (p.sku && p.sku === codTrim)
    );
    if (prodPorCodigo) {
      return {
        productoCoincidente: prodPorCodigo,
        esNuevoProducto: false,
        scoreSimilitud: 100,
        razonCotejo: 'codigo_exacto',
        codigoSugerido: prodPorCodigo.codigoBarras,
        skuSugerido: prodPorCodigo.sku || generarSkuPredictivo(prodPorCodigo.nombre),
        nombreNormalizado: prodPorCodigo.nombre,
        etapasDiagnostico: 'Coincidencia directa por código de barras / EAN (Pipeline VDU)',
      };
    }
  }

  // 2. Denominación unificada sin contaminar el código
  const descCompleta = item.descripcion_secundaria
    ? `${item.descripcion_principal} [${item.descripcion_secundaria}]`
    : item.descripcion_principal;

  return cotejarRenglonConCatalogo(
    descCompleta,
    item.codigo || undefined,
    productosExistentes
  );
}

