/**
 * MOTOR DE DETECCIÓN DE GASTOS FIJOS Y CENTINELA ANTI-ERROR HUMANO
 * NOST-IA - Inteligencia Financiera y Validación Pre-Commit
 *
 * 1. Clasifica la naturaleza del comprobante (Gasto Fijo vs Mercadería vs Venta).
 * 2. Infiere la subcategoría de gasto operativo (Luz, Gas, Agua, Internet, Alquiler, Salarios, etc.).
 * 3. Centinela Preventivo: Alerta al usuario si está subiendo un servicio a mercadería (evitando productos falsos)
 *    o mercadería a gastos (evitando pérdida de stock), con reorientación en 1 clic.
 * 4. 100% Determinista, Seguro contra ReDoS e Inyecciones, Offline.
 */

import type {
  CategoriaGastoFijo,
  NaturalezaComprobante,
  AlertaErrorIngesta,
  FacturaParseada,
} from '../types';

interface ReglaDeteccionGasto {
  categoria: CategoriaGastoFijo;
  patronesProveedor: RegExp[];
  patronesTexto: RegExp[];
  cuitsConocidos?: string[];
}

const REGLAS_GASTOS: ReglaDeteccionGasto[] = [
  {
    categoria: 'luz',
    patronesProveedor: [
      /\b(edenor|edesur|edelap|epec|epe|epesf|edemsa|secheep|enerfe|cooperativa el[eé]ctrica|coop el[eé]ctrica)\b/i,
      /\b(electricidad|energ[ií]a el[eé]ctrica|distribuidora el[eé]ctrica)\b/i,
    ],
    patronesTexto: [
      /\b(kwh|kilovatio|potencia contratada|cargo fijo t1|cargo variable|t1-g|t2-g|consumo activo|medidor n[°ºo]?|tarifa 1 general)\b/i,
      /\b(alumbrado p[uú]blico|enre|subsidio estado nacional|mercado el[eé]ctrico mayorista)\b/i,
    ],
    cuitsConocidos: ['30655116202', '30655116210', '30657864192'], // Edenor, Edesur, Edelap
  },
  {
    categoria: 'gas',
    patronesProveedor: [
      /\b(metrogas|naturgy|camuzzi|gasnea|gas del centro|gas cuyana|litoral gas|redengas)\b/i,
      /\b(distribuidora de gas|gas natural)\b/i,
    ],
    patronesTexto: [
      /\b(m3|metros c[uú]bicos|calor[ií]as|enargas|cargo fijo r|cargo por metro c[uú]bico|fondo fiduciario gas)\b/i,
      /\b(subsidio gas|consumo corregido|factor de correcci[oó]n|tarifa p1|tarifa p2)\b/i,
    ],
  },
  {
    categoria: 'agua',
    patronesProveedor: [
      /\b(aysa|aguas argentinas|aguas cordobesas|aguas santafesinas|aguas bonaerenses|absa|aguas del norte|aguas de corrientes)\b/i,
    ],
    patronesTexto: [
      /\b(agua y saneamiento|servicio cloacal|servicio de agua|m3 consumidos|cargo fijo de agua|er@s)\b/i,
    ],
    cuitsConocidos: ['30709565439'], // AySA
  },
  {
    categoria: 'internet',
    patronesProveedor: [
      /\b(telecom|personal|movistar|claro|fibertel|telecentro|iplan|sion|gigared|directv|metrotel)\b/i,
    ],
    patronesTexto: [
      /\b(abono mensual|banda ancha|megas|fibra [oó]ptica|telefon[ií]a|enacom|plan control|linea comercial|ip fija)\b/i,
    ],
  },
  {
    categoria: 'alquiler',
    patronesProveedor: [
      /\b(inmobiliaria|propiedades|locaciones|fideicomiso|administraci[oó]n de propiedades|consorcio)\b/i,
    ],
    patronesTexto: [
      /\b(alquiler|canon locativo|locaci[oó]n comercial|mes de alquiler|expensas|contrato de locaci[oó]n|recibo de alquiler|dep[oó]sito en garant[ií]a)\b/i,
    ],
  },
  {
    categoria: 'salarios',
    patronesProveedor: [
      /\b(sueldos|salarios|haberes|n[oó]mina|cargas sociales|afip f931|f\.931|sindicato|obra social)\b/i,
    ],
    patronesTexto: [
      /\b(recibo de sueldo|legajo|b[aá]sico de convenio|antig[uü]edad|presentismo|jubilaci[oó]n 11%|ley 19032|sac proporcional|vacaciones|art|contribuciones patronales)\b/i,
    ],
  },
  {
    categoria: 'mantenimiento',
    patronesProveedor: [
      /\b(mantenimiento|reparaciones|matafuegos|fumigaci[oó]n|refrigeraci[oó]n|electricista|plomero|cerrajer[ií]a)\b/i,
    ],
    patronesTexto: [
      /\b(servicio de mantenimiento|reparaci[oó]n de persiana|carga de matafuegos|control de plagas|abono mantenimiento)\b/i,
    ],
  },
  {
    categoria: 'impuestos_tasas',
    patronesProveedor: [
      /\b(municipalidad|municipio|arba|agip|rentas|afip|dgr|vep)\b/i,
    ],
    patronesTexto: [
      /\b(seguridad e higiene|tasa de comercio|abl|inmobiliario|patente|ingresos brutos|sircreb|monotributo|aut[oó]nomos|vep)\b/i,
    ],
  },
];

/**
 * Detecta si el texto o proveedor corresponde a un gasto fijo / servicio público
 */
export function detectarNaturalezaYTipoGasto(
  proveedor: string,
  textoCompleto: string,
  cuit?: string
): {
  naturaleza: NaturalezaComprobante;
  categoriaGasto?: CategoriaGastoFijo;
  confianza: number;
  motivoDetectado: string;
} {
  const provLimpio = proveedor.toLowerCase().slice(0, 80);
  const textoLimpio = textoCompleto.toLowerCase().slice(0, 4000);
  const cuitLimpio = (cuit || '').replace(/\D/g, '');

  // 1. Revisar reglas específicas de servicios públicos y gastos fijos
  for (const regla of REGLAS_GASTOS) {
    // Coincidencia por CUIT
    if (regla.cuitsConocidos && cuitLimpio && regla.cuitsConocidos.includes(cuitLimpio)) {
      return {
        naturaleza: 'gasto_servicio',
        categoriaGasto: regla.categoria,
        confianza: 0.99,
        motivoDetectado: `CUIT oficial de empresa prestadora de servicios (${regla.categoria.toUpperCase()}).`,
      };
    }

    // Coincidencia por nombre de proveedor
    for (const patProv of regla.patronesProveedor) {
      if (patProv.test(provLimpio)) {
        return {
          naturaleza: 'gasto_servicio',
          categoriaGasto: regla.categoria,
          confianza: 0.95,
          motivoDetectado: `Nombre del emisor reconocido como proveedor de ${regla.categoria.toUpperCase()} ("${proveedor}").`,
        };
      }
    }

    // Coincidencia por contenido del documento
    let coincidenciasContenido = 0;
    for (const patTexto of regla.patronesTexto) {
      if (patTexto.test(textoLimpio)) {
        coincidenciasContenido++;
      }
    }

    if (coincidenciasContenido >= 2) {
      return {
        naturaleza: 'gasto_servicio',
        categoriaGasto: regla.categoria,
        confianza: 0.9,
        motivoDetectado: `Términos técnicos inequívocos de ${regla.categoria.toUpperCase()} detectados en el comprobante.`,
      };
    }
  }

  // 2. Detección de Ticket de Venta a Cliente
  if (
    textoLimpio.includes('a consumidor final') ||
    textoLimpio.includes('ticket factura b') ||
    textoLimpio.includes('ticket factura c') ||
    provLimpio.includes('ticket venta') ||
    provLimpio.includes('comprobante de venta')
  ) {
    return {
      naturaleza: 'venta_cliente',
      confianza: 0.85,
      motivoDetectado: 'Estructura correspondiente a ticket o comprobante emitido a consumidor final.',
    };
  }

  // 3. Si tiene palabras de mercadería para reventa o distribuidores mayoristas
  const esMercaderia =
    /\b(bultos|pallets?|cajones|pack|mayorista|distribuidora|harina|aceite|fideos|yerba|arroz|galletitas|art[ií]culos|unid|unidades|monroe|freno|tornillo|chapa)\b/i.test(
      textoLimpio
    );

  if (esMercaderia) {
    return {
      naturaleza: 'mercaderia_reventa',
      confianza: 0.9,
      motivoDetectado: 'Renglones comerciales de mercadería física para reventa identificados.',
    };
  }

  return {
    naturaleza: 'desconocido',
    confianza: 0.5,
    motivoDetectado: 'No se detectó un patrón categórico inequívoco.',
  };
}

/**
 * Valida la coherencia entre la sección activa y la naturaleza detectada del comprobante.
 * Blindaje contra errores humanos naturales y atípicos.
 */
export function validarCoherenciaSeccionEIngesta(
  factura: FacturaParseada,
  seccionActiva: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo',
  cuitPropioComercio?: string
): AlertaErrorIngesta | null {
  const textoParaAnalizar = `${factura.proveedorOEmisor} ${factura.observaciones || ''} ${factura.items.map((i) => i.descripcion).join(' ')}`;
  const deteccion = detectarNaturalezaYTipoGasto(
    factura.proveedorOEmisor,
    textoParaAnalizar,
    factura.cuitProveedor
  );

  // 1. ERROR CRÍTICO: Gasto Fijo / Servicio subido en Compra de Mercadería
  if (
    seccionActiva === 'compra_ingreso' &&
    deteccion.naturaleza === 'gasto_servicio' &&
    deteccion.categoriaGasto
  ) {
    return {
      tipoError: 'gasto_en_compra',
      nivelSeveridad: 'critico',
      titulo: '⚠️ Factura de Servicio / Gasto Fijo detectada en Compra de Mercadería',
      mensaje: `El comprobante de "${factura.proveedorOEmisor}" corresponde a un Gasto Fijo Operativo (${deteccion.categoriaGasto.toUpperCase()}), NO a mercadería para reventa. Si lo confirmas aquí, inventariará cargos de servicio como productos falsos en tu stock.`,
      seccionActual: 'compra_ingreso',
      seccionSugerida: 'gasto_operativo',
      categoriaGastoSugerida: deteccion.categoriaGasto,
      accionRecomendadaTexto: 'Cambiar a Gastos Fijos (Recomendado)',
      puedeForzar: true,
    };
  }

  // 1.B. ERROR CRÍTICO: Gasto Fijo / Servicio subido en Factura de Venta
  if (
    seccionActiva === 'venta_egreso' &&
    deteccion.naturaleza === 'gasto_servicio' &&
    deteccion.categoriaGasto
  ) {
    return {
      tipoError: 'gasto_en_venta',
      nivelSeveridad: 'critico',
      titulo: '⚠️ Factura de Gasto Fijo subida en Factura de Venta',
      mensaje: `Estás subiendo una factura de gasto operativo (${deteccion.categoriaGasto.toUpperCase()}) en la sección de Ventas. Si continúas, registrarás un costo como un ingreso de venta.`,
      seccionActual: 'venta_egreso',
      seccionSugerida: 'gasto_operativo',
      categoriaGastoSugerida: deteccion.categoriaGasto,
      accionRecomendadaTexto: 'Mover a Gastos Fijos (Recomendado)',
      puedeForzar: true,
    };
  }

  // 2. ERROR CRÍTICO: Mercadería de Reventa subida en Gastos Fijos
  if (
    seccionActiva === 'gasto_operativo' &&
    (deteccion.naturaleza === 'mercaderia_reventa' || factura.items.length >= 1) &&
    factura.items.some((it) => it.cantidad > 0 && it.precioUnitario > 0 && it.descripcion.length > 3)
  ) {
    // Si no es un servicio conocido y tiene ítems mercantiles
    if (deteccion.naturaleza !== 'gasto_servicio') {
      return {
        tipoError: 'compra_en_gasto',
        nivelSeveridad: 'critico',
        titulo: '⚠️ Factura de Mercadería detectada en Gastos Fijos',
        mensaje: `Este comprobante de "${factura.proveedorOEmisor}" contiene artículos de mercadería comercializable para reventa (${factura.items.map(i => i.descripcion).slice(0, 2).join(', ')}). Si lo confirmas como Gasto Fijo, NO sumará existencias a tu stock físico y tu inventario quedará desfasado.`,
        seccionActual: 'gasto_operativo',
        seccionSugerida: 'compra_ingreso',
        accionRecomendadaTexto: 'Cambiar a Compra de Mercadería (Recomendado)',
        puedeForzar: true,
      };
    }
  }

  // 3. ERROR: Ticket de Venta a Cliente subido en Compra de Mercadería
  if (seccionActiva === 'compra_ingreso' && deteccion.naturaleza === 'venta_cliente') {
    return {
      tipoError: 'venta_en_compra',
      nivelSeveridad: 'advertencia',
      titulo: '⚠️ Ticket de Venta detectado en Compra de Mercadería',
      mensaje: `El documento parece ser un Ticket a Consumidor Final o factura de venta. Si querías registrar una salida de mercadería, debes usar la sección "Factura de Venta".`,
      seccionActual: 'compra_ingreso',
      seccionSugerida: 'venta_egreso',
      accionRecomendadaTexto: 'Cambiar a Factura de Venta',
      puedeForzar: true,
    };
  }

  // 3.B. ERROR: Ticket de Venta a Cliente subido en Gastos Fijos
  if (seccionActiva === 'gasto_operativo' && deteccion.naturaleza === 'venta_cliente') {
    return {
      tipoError: 'venta_en_gasto',
      nivelSeveridad: 'advertencia',
      titulo: '⚠️ Ticket de Venta detectado en Gastos Fijos',
      mensaje: `El documento corresponde a una Venta a Consumidor Final, no a un gasto operativo del negocio.`,
      seccionActual: 'gasto_operativo',
      seccionSugerida: 'venta_egreso',
      accionRecomendadaTexto: 'Mover a Factura de Venta',
      puedeForzar: true,
    };
  }

  // 3.C. ERROR: Nota de Crédito subida en Factura de Compra directa
  const docLower = `${factura.tipoDocumentoDetectado || ''} ${factura.numeroComprobante || ''} ${factura.observaciones || ''}`.toLowerCase();
  if (seccionActiva === 'compra_ingreso' && (docLower.includes('nota de credito') || docLower.includes('nota de crédito') || docLower.includes('nc '))) {
    return {
      tipoError: 'nota_credito_en_compra',
      nivelSeveridad: 'advertencia',
      titulo: '⚠️ Nota de Crédito detectada en Ingreso de Mercadería',
      mensaje: `Este comprobante parece ser una NOTA DE CRÉDITO. Las notas de crédito anulan o descuentan compras anteriores. Si la ingresas aquí, sumará unidades al stock en vez de descontarlas.`,
      seccionActual: 'compra_ingreso',
      accionRecomendadaTexto: 'Verificar Comprobante',
      puedeForzar: true,
    };
  }

  // 4. ERROR: CUIT propio del comercio puesto como emisor en compra
  const cuitPropioLimpio = (cuitPropioComercio || '').replace(/\D/g, '');
  const cuitProvLimpio = (factura.cuitProveedor || '').replace(/\D/g, '');
  if (
    cuitPropioLimpio &&
    cuitProvLimpio &&
    cuitPropioLimpio.length === 11 &&
    cuitPropioLimpio === cuitProvLimpio &&
    seccionActiva === 'compra_ingreso'
  ) {
    return {
      tipoError: 'cuit_propio',
      nivelSeveridad: 'advertencia',
      titulo: '⚠️ CUIT Propio del Comercio en Emisor',
      mensaje: `El CUIT emisor (${factura.cuitProveedor}) coincide con el CUIT de tu propio negocio. Es probable que sea una factura emitida por vos (Venta) y no una factura recibida (Compra).`,
      seccionActual: 'compra_ingreso',
      seccionSugerida: 'venta_egreso',
      accionRecomendadaTexto: 'Mover a Factura de Venta',
      puedeForzar: true,
    };
  }

  // 5. ERROR: Fecha anómala (demasiado vieja o futura)
  if (factura.fecha) {
    const añoDoc = parseInt(factura.fecha.slice(0, 4), 10);
    const añoActual = new Date().getFullYear();
    if (!isNaN(añoDoc) && (añoDoc < añoActual - 1 || añoDoc > añoActual + 1)) {
      return {
        tipoError: 'fecha_anomala',
        nivelSeveridad: 'advertencia',
        titulo: '⚠️ Fecha Anómala Detectada en Comprobante',
        mensaje: `La fecha del documento (${factura.fecha}) tiene un año fuera de rango (${añoDoc}). Verifica si se trata de un archivo antiguo o un error de lectura de fecha antes de procesarlo.`,
        seccionActual: seccionActiva,
        accionRecomendadaTexto: 'Revisar Fecha Manualmente',
        puedeForzar: true,
      };
    }
  }

  // 6. ERROR: Monto Cero o Vacío en Gasto
  if (seccionActiva === 'gasto_operativo' && factura.totalCalculado <= 0) {
    return {
      tipoError: 'importe_sospechoso',
      nivelSeveridad: 'advertencia',
      titulo: '⚠️ Importe Total en $0',
      mensaje: `No se detectó un importe a pagar válido en el comprobante de gasto. Revisa o ingresa el monto manualmente en la casilla de total.`,
      seccionActual: seccionActiva,
      accionRecomendadaTexto: 'Ingresar Monto Manual',
      puedeForzar: false,
    };
  }

  return null;
}
