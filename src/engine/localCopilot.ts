import { Producto, PuntoTerritorial, EstrategiaCostos, VentaPOS } from '../types';

export interface MensajeCopiloto {
  id: string;
  emisor: 'usuario' | 'copiloto';
  texto: string;
  timestamp: string;
  sugerencias?: string[];
  graficoOpcional?: 'quiebres' | 'ventas_dia' | 'margenes';
}

export type RolCopiloto = 'asistente_general' | 'auditor_ventas' | 'centinela_stock' | 'estratega_comercial';

export interface OllamaConfig {
  endpoint: string;
  model: string;
  activo: boolean;
}

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  endpoint: 'http://localhost:11434/v1',
  model: 'qwen2.5-coder:1.5b',
  activo: true,
};

/**
 * Prueba la conectividad con el endpoint local de Ollama
 */
export async function probarConexionOllama(endpoint: string): Promise<{ conectado: boolean; error?: string }> {
  try {
    const base = endpoint.replace(/\/v1\/?$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${base}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { conectado: true };
    }
    return { conectado: false, error: `Código de respuesta HTTP ${res.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'No se pudo conectar al puerto 11434';
    return { conectado: false, error: msg };
  }
}

/**
 * Construye el prompt con todo el inventario, ventas y datos del negocio
 */
function construirPromptSistema(
  productos: Producto[],
  ventas: VentaPOS[],
  estrategia: EstrategiaCostos,
  rol: RolCopiloto
): string {
  const valorCostoTotal = productos.reduce((acc, p) => acc + (p.stockActual || 0) * (p.precioCosto || 0), 0);
  const valorVentaTotal = productos.reduce((acc, p) => acc + (p.stockActual || 0) * (p.precioVenta || 0), 0);
  const totalUnidades = productos.reduce((acc, p) => acc + (p.stockActual || 0), 0);
  const criticos = productos.filter((p) => (p.stockActual || 0) <= (p.stockMinimo || 0));
  const totalRecaudado = ventas.reduce((acc, v) => acc + (v.total || 0), 0);

  // Muestra concisa de productos para no saturar memoria de tokens
  const resumenProductos = productos
    .slice(0, 25)
    .map(
      (p) =>
        `- ${p.nombre}: Stock ${p.stockActual} ${p.unidadMedida || 'u'} (Mín: ${p.stockMinimo || 5}). Costo: $${p.precioCosto}, Venta: $${p.precioVenta}. Ganancia: $${p.precioVenta - p.precioCosto}`
    )
    .join('\n');

  return `IDENTIDAD FUNDACIONAL MANDATORIA:
Sos "NOST-IA" (Nodo Operativo Soberano Territorial con Inteligencia Artificial).
Fuiste creado por el Profesor en Bibliotecología e Informática ALBERTO SALINAS MENDIETA • Inteligencia Artificial al servicio del Territorio, para dotar al almacén y comercio barrial de una herramienta soberana, solidaria e independiente que funciona 100% offline sin corporaciones extranjeras ni internet.

Tu rol táctico en este momento es: ${rol}.
Mantené un diálogo cálido, de compañero/a de mostrador, en lenguaje cotidiano argentino con voseo (mirá, tenés, fijate, che, Beto).

DATOS EN TIEMPO REAL DEL NEGOCIO (ESTRICTAMENTE VERÍDICOS, NO INVENTES OTROS NÚMEROS):
* Capital en góndola (Inversión a costo mayorista): $${valorCostoTotal.toLocaleString('es-AR')}
* Valor total a precio de venta en mostrador: $${valorVentaTotal.toLocaleString('es-AR')}
* Ganancia potencial estimada en góndola: $${(valorVentaTotal - valorCostoTotal).toLocaleString('es-AR')}
* Total de artículos cargados: ${productos.length} productos (${totalUnidades} unidades)
* Productos en alerta o quiebre de stock: ${criticos.length}
* Ventas registradas hoy: ${ventas.length} transacciones ($${totalRecaudado.toLocaleString('es-AR')} recaudados)
* Costos fijos mensuales (alquiler, luz, etc.): $${estrategia?.costosFijos ? Object.values(estrategia.costosFijos).reduce((a, b) => Number(a) + Number(b), 0).toLocaleString('es-AR') : '0'}

MUESTRA DE ARTÍCULOS EN STOCK:
${resumenProductos || 'Catálogo vacío.'}

REGLAS DE RESPUESTA DIRECTAS:
1. SI TE PREGUNTAN "¿QUIÉN SOS?": Respondé que sos NOST-IA, creado por el profesor en bibliotecología Alberto Salinas como un nodo operativo soberano territorial.
2. SI TE PREGUNTAN "¿EN QUÉ ME PODÉS AYUDAR?": Enumerá tus 5 puntos: capital en góndola, quiebres de stock, combos para sacar mercadería estancada, prorrateo de costos fijos y auditoría de ventas.
3. SI TE PREGUNTAN POR CAPITAL EN GÓNDOLA: Dá los números exactos de inversión ($${valorCostoTotal.toLocaleString('es-AR')}) y venta ($${valorVentaTotal.toLocaleString('es-AR')}).
4. SI TE PIDEN COMBOS O PROMOCIONES: Armá una propuesta con dos productos reales del catálogo y 12% de descuento para ganar liquidez.
5. SÉ BREVE, PRECISO Y CONVERSACIONAL (máximo 2 párrafos cortos). Nunca te quedes en bucles repetitivos.`;
}

/**
 * Consulta DIRECTAMENTE a Ollama con protección estricta contra cuelgues
 */
async function consultarOllamaDirecto(
  pregunta: string,
  historial: MensajeCopiloto[],
  promptSistema: string,
  config: OllamaConfig
): Promise<string> {
  const url = `${config.endpoint.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  // 25 segundos máximo para evitar que el usuario quede colgado
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  // Sanitización de seguridad y límite de caracteres
  const sanitizedPregunta = pregunta.slice(0, 1000).trim();

  const messages = [
    { role: 'system', content: promptSistema },
    ...historial.slice(-3).map((m) => ({
      role: m.emisor === 'usuario' ? 'user' : 'assistant',
      content: String(m.texto || '').slice(0, 500),
    })),
    { role: 'user', content: sanitizedPregunta },
  ];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        options: {
          num_ctx: 1024,
          num_predict: 220, // Máximo 220 tokens para respuestas instantáneas
          num_thread: 3,    // Deja 1 núcleo de procesador libre siempre
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Ollama HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Motor Soberano Cognitivo Local (100% In-Browser & Offline)
 * Con blindaje total contra alucinaciones, respuestas repetitivas o latencias excesivas.
 * Resuelve de forma instantánea (< 5ms) todas las intenciones comerciales, identidad, stack y números de caja.
 */
export async function responderCopilotoLocal(
  pregunta: string,
  productos: Producto[],
  puntos: PuntoTerritorial[],
  estrategia: EstrategiaCostos,
  configOllama: OllamaConfig,
  rol: RolCopiloto = 'asistente_general',
  ventas: VentaPOS[] = [],
  historialPrevio: MensajeCopiloto[] = []
): Promise<MensajeCopiloto> {
  const pLower = pregunta.toLowerCase().trim();
  const fecha = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  // =========================================================================
  // FASE 1: RESOLUCIÓN SOBERANA DETERMINISTA INSTANTÁNEA (0 LATENCIA, 100% VERÍDICO)
  // =========================================================================

  // 1. ORIGEN DE PAÍS / NACIONALIDAD / PATRIA
  if (
    pLower.includes('origen de pais') ||
    pLower.includes('pais de origen') ||
    pLower.includes('de que pais') ||
    pLower.includes('de donde sos') ||
    pLower.includes('nacionalidad') ||
    pLower === 'origen de pais?' ||
    pLower === 'pais?' ||
    pLower.includes('argentina') ||
    (pLower.includes('origen') && !pLower.includes('archivo') && !pLower.includes('factura'))
  ) {
    const textoOrigen = `🇦🇷 **Mi país de origen es la REPÚBLICA ARGENTINA.**\n\n` +
      `Fui concebido y desarrollado en territorio argentino por el **Profesor en Bibliotecología e Informática ALBERTO SALINAS MENDIETA** (Inteligencia Artificial al servicio del Territorio).\n\n` +
      `Mi génesis nace de la filosofía de la bibliotecología popular: democratizar la información y las herramientas de cálculo más avanzadas del mundo para que estén al alcance de cada almacén de barrio, cooperativa y comercio de proximidad, sin depender de corporaciones extranjeras ni requerir internet para operar.`;
    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoOrigen,
      timestamp: fecha,
      sugerencias: ['¿Cuál es tu stack tecnológico?', '¿Quién te creó?', '¿En qué me podés ayudar?'],
    };
  }

  // 2. STACK TECNOLÓGICO / ARQUITECTURA / CÓMO ESTÁS PROGRAMADO
  if (
    pLower.includes('stak') ||
    pLower.includes('stack') ||
    pLower.includes('tecnolog') ||
    pLower.includes('arquitectura') ||
    pLower.includes('lenguaje') ||
    pLower.includes('como estas programado') ||
    pLower.includes('como estas hecho')
  ) {
    const textoStack = `💻 **Mi Stack Tecnológico Soberano y Arquitectura Local:**\n\n` +
      `* **Frontend & Interfaz:** React 19, TypeScript estricto y Tailwind CSS v4 para una velocidad de mostrador ultrarrápida.\n` +
      `* **Persistencia Soberana (Local-First):** Motor Dexie.js montado sobre **IndexedDB** dentro de tu propio navegador. Todos tus precios, compras y ventas viven en el disco físico de tu máquina.\n` +
      `* **Motor VDU de Ingesta (Visual Document Understanding):** Arquitectura en 2 etapas (docTR v1.1 / Granite-Docling layout) en CPU pura sin GPU ni internet. Layout analysis clasificando 6 regiones (Table, Header, Footer, Title, Subtitle, Text), con separación estricta de códigos EAN y subtítulos vehiculares.\n` +
      `* **Inteligencia Dual-Brain:**\n` +
      `  1. *Motor Heurístico Determinista:* Cálculos matemáticos, combos, costos fijos y auditoría de caja instantánea sin consumir microprocesador ni batería.\n` +
      `  2. *Motor LLM Abierto:* Compatible con **Qwen 2.5 Coder 1.5B** (Alibaba Open Source) corriendo sobre Ollama en tu computadora sin suscripciones.\n` +
      `* **Seguridad:** Cero telemetría externa. Funciona 100% offline sin conexión a internet.`;
    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoStack,
      timestamp: fecha,
      sugerencias: ['¿Cómo funciona el VDU?', '¿Cuál es el capital en góndola?', '¿En qué me podés ayudar?'],
    };
  }

  // 2.B. VDU / INGESTA DE DOCUMENTOS
  if (
    pLower.includes('vdu') ||
    pLower.includes('ingesta') ||
    pLower.includes('leer factura') ||
    pLower.includes('doctr') ||
    pLower.includes('docling') ||
    pLower.includes('como lees las facturas')
  ) {
    const textoVdu = `📄 **Arquitectura de Ingesta VDU Soberana (Visual Document Understanding):**\n\n` +
      `El sistema reemplazó de raíz los viejos OCRs de texto plano (Tesseract/PDF.js) por un pipeline VDU en dos etapas que corre **en CPU pura y 100% offline**:\n\n` +
      `1. **Etapa 1 (Layout Analysis):** Segmentación espacial 2D que clasifica regiones en *Table*, *Header*, *Footer*, *Subtitle* y *Text*. El membrete fiscal nunca se mezcla con los productos.\n` +
      `2. **Etapa 2 (VDU Parsing):** Extracción tabular celda por celda que separa estrictamente \`codigo\`, \`descripcion_principal\` y \`descripcion_secundaria\`.\n` +
      `3. **Post-procesamiento:** \`parseNumeroArgentino\` convierte importes como \`$ 45.000,00\` a números exactos, y la *Veto Matrix* asegura que nunca se confunda Harina 000 con 0000 ni bolsas de 50kg con 1kg.`;
    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoVdu,
      timestamp: fecha,
      sugerencias: ['¿Cuál es tu stack tecnológico?', 'Ver ventas totales de hoy', '¿Qué errores de lectura hubo?'],
    };
  }

  // 3. IDENTIDAD / CREADOR: "¿QUIÉN SOS?"
  if (
    pLower.includes('quien sos') ||
    pLower.includes('quien te creo') ||
    pLower.includes('como te llamas') ||
    pLower.includes('que sos') ||
    pLower.includes('creador') ||
    pLower.includes('alberto salinas')
  ) {
    const textoIdentidad = `Soy **NOST-IA** (*Nodo Operativo Soberano Territorial con Inteligencia Artificial*).\n\n` +
      `Fui concebido y creado por el **Profesor en Bibliotecología e Informática ALBERTO SALINAS MENDIETA** (Inteligencia Artificial al servicio del Territorio) en Argentina, con el propósito de defender al almacén barrial, comercios, cooperativas y organizaciones libres del pueblo con una herramienta inteligente de cálculo, stock, precios justos y decisiones comerciales que funciona 100% en tu propia máquina, sin depender de internet ni de corporaciones extranjeras.`;
    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoIdentidad,
      timestamp: fecha,
      sugerencias: ['¿En qué me podés ayudar?', '¿Hay que pagar suscripción?', '¿Cuál es el capital en góndola?'],
    };
  }

  // 4. SUSCRIPCIÓN / COSTO / GRATUIDAD
  if (
    pLower.includes('suscrip') ||
    pLower.includes('hay que pagar') ||
    pLower.includes('cuanto cuesta') ||
    pLower.includes('es gratis') ||
    pLower.includes('mensualidad') ||
    pLower.includes('cuota') ||
    pLower.includes('licencia')
  ) {
    const textoGratis = `**¡La herramienta es 100% libre y gratuita: NO se paga por usarla!**\n\n` +
      `NOST-IA no lo hace una empresa corporativa: lo hace un **trabajador docente común del barrio de Mataderos**, el Profesor en Bibliotecología e Informática **Alberto Salinas Mendieta**.\n\n` +
      `Es una herramienta de trabajo, no un negocio de alquiler. Podés descargarla y usarla libremente. Quienes deseen acompañamiento, instalación llave en mano, capacitación, actualizaciones y mejoras pueden acceder al esquema de servicios y mantenimiento mensual/semestral/anual o al bloque social.`;
    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoGratis,
      timestamp: fecha,
      sugerencias: ['¿En qué me podés ayudar?', '¿Cuál es el capital en góndola?', 'Armar una promoción o combo'],
    };
  }

  // 4.B. AUDITORÍA DE ERRORES, FALLOS DE LECTURA Y DUPLICADOS
  if (
    pLower.includes('error') ||
    pLower.includes('fallo') ||
    pLower.includes('auditor') ||
    pLower.includes('duplicad') ||
    pLower.includes('trazabil') ||
    pLower.includes('que errores') ||
    pLower.includes('problemas de lectura')
  ) {
    const textoAuditoria = `📋 **Resumen Ejecutivo de Auditoría de Errores y Trazabilidad:**\n\n` +
      `El sistema cuenta con un componente persistente de **Auditoría de Errores** (pestaña superior en este módulo de Copiloto) donde podés auditar y exportar a **.txt** todos los fallos registrados desde el inicio del proyecto:\n\n` +
      `* **Colapso de repuestos automotor (JPG):** Blindado el discriminador multi-línea para no perder modelos vehiculares (ej. Ford Fiesta, Gol, 206) en amortiguadores y repuestos homónimos.\n` +
      `* **Ruido de encabezados (PDF):** Se erradicó el ingreso de palabras como "TRES", "STOCK", "LIBERTADOR" exigiendo precio unitario > 0 y lista negra fiscal.\n` +
      `* **Acople de códigos de barra (EAN-13):** Desacople determinista de secuencias de 8 a 13 dígitos del nombre del producto.\n` +
      `* **Detección de duplicados:** Alerta modal previa, tabla de \`facturasHistorial\` y banner de aviso permanente en el dashboard.\n\n` +
      `💡 **Para descargar el informe completo:** Podés cambiar a la pestaña **"Auditoría de Errores"** arriba a la derecha y pulsar **"Exportar Reporte (.txt)"** para trazabilidad total.`;
    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoAuditoria,
      timestamp: fecha,
      sugerencias: ['¿Qué productos están por agotarse?', 'Ver ventas totales de hoy', 'Armar una promoción o combo'],
    };
  }

  // 5. CAPACIDADES: "¿EN QUÉ ME PODÉS AYUDAR?"
  if (
    pLower.includes('en que me podes ayudar') ||
    pLower.includes('en que podes ayudar') ||
    pLower.includes('para que servis') ||
    pLower.includes('para que sirves') ||
    pLower.includes('que podes hacer') ||
    pLower.includes('que cosas podes') ||
    pLower.includes('en que cosas me podes')
  ) {
    const textoAyuda = `Acá en el mostrador estoy para darte una mano como compañero de confianza en 5 frentes estratégicos:\n\n` +
      `1. **Estrategias Comerciales & Combos Agresivos:** Si el mostrador está quieto o ayer no vendiste nada, te armo combos gancho para mover la mercadería y generar efectivo rápido en mano.\n` +
      `2. **Capital en Góndola:** Te digo exactamente cuánta plata tenés invertida a costo mayorista y cuánto recaudás al vender todo.\n` +
      `3. **Centinela de Stock y Quiebres:** Te alerto qué productos están por agotarse para que no pierdas ventas ni le digas "no hay" al vecino.\n` +
      `4. **Prorrateo de Costos Fijos:** Calculo cuántos pesos de luz, alquiler y tarifas absorbe cada artículo para que nunca vendas a pérdida.\n` +
      `5. **Auditoría de Caja y Tickets:** Sigo la recaudación real de la jornada y el promedio por cliente.\n\n` +
      `¿Sobre qué desafío querés que nos pongamos a trabajar ahora?`;
    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoAyuda,
      timestamp: fecha,
      sugerencias: ['Armar una promoción o combo', '¿Cuál es el capital en góndola?', '¿Qué productos están por agotarse?'],
    };
  }

  // 6. VENTAS DE HOY / CAJA / CUÁNTO VENDIMOS (Nunca decir "no tengo capacidad")
  const pideCajaOVentas =
    pLower.includes('recaud') ||
    pLower.includes('caja') ||
    pLower.includes('ticket') ||
    pLower.includes('cuanto se vendio') ||
    pLower.includes('cuanto vendimos') ||
    pLower.includes('ventas de hoy') ||
    pLower.includes('ventas totales') ||
    pLower.includes('total de ventas') ||
    pLower === 'ventas' ||
    pLower === 'cuanto vendimos hoy?' ||
    pLower === 'cuanto vendimos hoy';

  if (pideCajaOVentas) {
    const totalHistorico = ventas.reduce((acc, v) => acc + (v.total || 0), 0);
    const cantVentas = ventas.length;
    const ticketPromedio = cantVentas > 0 ? Math.round(totalHistorico / cantVentas) : 0;

    let textoVentas = `📊 **Auditoría de Ventas y Caja en Tiempo Real:**\n\n` +
      `* **Transacciones registradas:** **${cantVentas} ventas** en el sistema.\n` +
      `* **Total recaudado:** **$${totalHistorico.toLocaleString('es-AR')}**.\n` +
      `* **Ticket promedio por cliente:** **$${ticketPromedio.toLocaleString('es-AR')}**.\n\n`;

    if (cantVentas === 0) {
      textoVentas += `⚠️ **Aviso de mostrador:** Todavía no tenés ventas registradas en la caja hoy. Si la jornada arrancó tranquila o ayer no hubo movimiento, podemos activar una promo gancho en la puerta o armar un combo vecinal para mover la caja.`;
    } else {
      textoVentas += `✅ **Estado:** La caja tiene movimiento registrado. ¿Querés que analicemos qué mercadería tuvo mayor rotación o armemos una promo para complementar el ticket?`;
    }

    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoVentas,
      timestamp: fecha,
      sugerencias: ['Armar una promoción o combo', '¿Cuál es el capital en góndola?', '¿Qué productos están por agotarse?'],
    };
  }

  // 7. ESTRATEGIA COMERCIAL AGRESIVA / DÍAS FLOJOS / "AYER NO VENDÍ NADA"
  if (
    pLower.includes('estrategia') ||
    pLower.includes('agresiv') ||
    pLower.includes('no vendi') ||
    pLower.includes('no vendí') ||
    pLower.includes('poco movimiento') ||
    pLower.includes('dia flojo') ||
    pLower.includes('días flojos') ||
    pLower.includes('reactivar') ||
    pLower.includes('levantar ventas') ||
    pLower.includes('atraer clientes')
  ) {
    const articulos = productos.slice(0, 3);
    const p1 = articulos[0] || { nombre: 'Yerba Mate Orgánica 1kg', precioVenta: 3450, precioCosto: 2100 };
    const p2 = articulos[1] || { nombre: 'Aceite de Girasol 900ml', precioVenta: 2200, precioCosto: 1450 };
    const sumaVenta = p1.precioVenta + p2.precioVenta;
    const sumaCosto = p1.precioCosto + p2.precioCosto;
    const precioPromo = Math.round(sumaVenta * 0.86); // 14% desc gancho
    const gananciaNeta = precioPromo - sumaCosto;

    const textoEstrategia = `¡Tranquilo, Beto! Los días flojos le pasan a cualquier almacén, pero acá no nos quedamos de brazos cruzados. Para dar vuelta el mostrador hoy mismo te propongo un **Plan de Choque en 3 Pasos Inmediatos**:\n\n` +
      `🔥 **1. Combo Relámpago "Respaldo Familiar":**\n` +
      `Armá un combo juntando un artículo de alta necesidad con uno de rotación secundaria:\n` +
      `* **${p1.nombre} + ${p2.nombre}**\n` +
      `* Precio suelto por separado: $${sumaVenta.toLocaleString('es-AR')}\n` +
      `* Tu costo mayorista total: $${sumaCosto.toLocaleString('es-AR')}\n` +
      `* **Precio Oferta Gancho: $${precioPromo.toLocaleString('es-AR')}** (descuento del 14% que resalta ante el vecino)\n` +
      `* **Te quedan $${gananciaNeta.toLocaleString('es-AR')} de ganancia neta en mano por cada combo.**\n\n` +
      `📢 **2. Cartel de Tiza o Pizarra en la Puerta:**\n` +
      `Poné bien visible en la vereda: *"Hoy Oferta Vecinal: ${p1.nombre} + ${p2.nombre} a solo $${precioPromo.toLocaleString('es-AR')}"*. El vecino que entra por el combo termina llevándose pan, queso o fideos.\n\n` +
      `🤝 **3. Venta Cruzada en Mostrador:**\n` +
      `A cada cliente que pida un producto básico, ofrécele una segunda unidad con el 20% de rebaja en esa segunda unidad. Mueves el stock estancado y entrás plata fresca a la caja hoy.`;

    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoEstrategia,
      timestamp: fecha,
      sugerencias: ['¿Cuál es el capital en góndola?', '¿Qué productos están por agotarse?', 'Armar otro combo'],
    };
  }

  // 8. COMBOS Y PROMOCIONES GENERALES ("PROMO", "COMBO", "OFERTA")
  if (
    pLower === 'promo' ||
    pLower === 'promocion' ||
    pLower === 'combo' ||
    pLower === 'oferta' ||
    pLower.includes('combo') ||
    pLower.includes('promocion') ||
    pLower.includes('promo') ||
    pLower.includes('oferta') ||
    pLower.includes('desclavar') ||
    pLower.includes('mercaderia parada')
  ) {
    const articulos = productos.slice(0, 3);
    let textoCombo = '';
    if (articulos.length >= 2) {
      const p1 = articulos[0];
      const p2 = articulos[1];
      const sumaVenta = p1.precioVenta + p2.precioVenta;
      const sumaCosto = p1.precioCosto + p2.precioCosto;
      const precioPromo = Math.round(sumaVenta * 0.88); // 12% desc
      const ganancia = precioPromo - sumaCosto;

      textoCombo = `¡Mirá, Beto! Para activar las ventas hoy te propongo armar este **Combo Relámpago** con mercadería real de tu negocio:\n\n` +
        `📦 **Combo Ahorro: ${p1.nombre} + ${p2.nombre}**\n` +
        `* **Precio individual sumado:** $${sumaVenta.toLocaleString('es-AR')}\n` +
        `* **Costo mayorista (tu inversión):** $${sumaCosto.toLocaleString('es-AR')}\n` +
        `* **Precio Promo Recomendado:** **$${precioPromo.toLocaleString('es-AR')}** (descuento del 12% muy llamativo para los vecinos)\n` +
        `* **Ganancia neta en mano:** **$${ganancia.toLocaleString('es-AR')}**.\n\n` +
        `💡 *Consejo de mostrador:* Poné un cartelito en la entrada o sobre el mostrador: *"Promo: ${p1.nombre} + ${p2.nombre} a $${precioPromo.toLocaleString('es-AR')}"*. Eso te hace girar la mercadería y te da efectivo inmediato.`;
    } else {
      textoCombo = `Para armar un buen combo comercial, la regla de oro es unir un producto que sale todos los días (como yerba, pan o fideos) con uno que tengas más frenado en la estantería, aplicando un 10% a 15% de rebaja conjunta. El cliente siente el ahorro y vos recuperás la plata que tenías quieta.`;
    }

    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoCombo,
      timestamp: fecha,
      sugerencias: ['¿Cuál es el capital en góndola?', '¿Qué productos están por agotarse?', 'Ver ventas de hoy'],
    };
  }

  // 9. SALUDOS COTIDIANOS
  const esSaludo =
    pLower === 'hola' ||
    pLower === 'buenas' ||
    pLower === 'buen dia' ||
    pLower === 'buenos dias' ||
    pLower === 'buenas tardes' ||
    pLower === 'como estas' ||
    pLower === 'que onda' ||
    pLower === 'saludos';

  if (esSaludo) {
    const criticos = productos.filter((p) => p.stockActual <= p.stockMinimo).length;
    const ventasHoy = ventas.length;
    const saludoTexto = `¡Hola, Beto! Acá firmes en el mostrador.\n\n` +
      `En tu negocio tenés **${productos.length} artículos en catálogo**${
        criticos > 0 ? `, pero ojo que tenés **${criticos} con stock bajo o al límite**` : ', con stock bien abastecido'
      }. Además llevamos registradas **${ventasHoy} transacciones**.\n\n` +
      `¿Qué te gustaría mirar ahora: el capital en góndola, qué mercadería reponer o armar una promo?`;

    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: saludoTexto,
      timestamp: fecha,
      sugerencias: ['¿Cuál es el capital en góndola?', '¿Qué productos están por agotarse?', 'Armar una promoción o combo'],
    };
  }

  // 10. CAPITAL EN GÓNDOLA / INVERSIÓN
  if (
    pLower.includes('capital') ||
    pLower.includes('gondola') ||
    pLower.includes('inversion') ||
    pLower.includes('plata puesta') ||
    pLower.includes('cuanta plata') ||
    pLower.includes('valor del stock') ||
    pLower.includes('mercaderia')
  ) {
    const valorCostoTotal = productos.reduce((acc, p) => acc + (p.stockActual || 0) * (p.precioCosto || 0), 0);
    const valorVentaTotal = productos.reduce((acc, p) => acc + (p.stockActual || 0) * (p.precioVenta || 0), 0);
    const unidadesTotales = productos.reduce((acc, p) => acc + (p.stockActual || 0), 0);
    const gananciaPotencial = valorVentaTotal - valorCostoTotal;
    const margenGlobal = valorVentaTotal > 0 ? Math.round((gananciaPotencial / valorVentaTotal) * 100) : 0;

    const textoCapital = `Fijate, Beto, acá tenés los números exactos de tu **capital en góndola**:
\n* **Inversión a costo mayorista:** **$${valorCostoTotal.toLocaleString('es-AR')}** (la plata neta que pusiste en comprar la mercadería).
* **Valor a precio de mostrador:** **$${valorVentaTotal.toLocaleString('es-AR')}** (lo que recaudás si vendés todo al precio actual).
* **Ganancia potencial bruta:** **$${gananciaPotencial.toLocaleString('es-AR')}** (margen global promedio del **${margenGlobal}%**).
* **Volumen físico:** Tenés **${unidadesTotales} unidades** repartidas en **${productos.length} artículos**.
\n💡 *Consejo de compañero:* Tenés buen respaldo en estantería. ¿Querés que armemos un combo con los artículos que tengan menor rotación?`;

    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoCapital,
      timestamp: fecha,
      sugerencias: ['Armar una promoción o combo', '¿Qué productos están por agotarse?', 'Ver ventas de hoy'],
    };
  }

  // 11. COSTOS FIJOS / ALQUILER / LUZ / TARIFAS
  if (
    pLower.includes('costo fijo') ||
    pLower.includes('costos fijos') ||
    pLower.includes('alquiler') ||
    pLower.includes('luz') ||
    pLower.includes('impuesto') ||
    pLower.includes('prorrate')
  ) {
    const totalCostosFijos = estrategia?.costosFijos
      ? Object.values(estrategia.costosFijos).reduce((a, b) => Number(a) + Number(b), 0)
      : 0;
    const unidadesMensuales = estrategia?.unidadesMensualesEstimadas || 2000;
    const incidenciaPorUnidad = Math.round(totalCostosFijos / (unidadesMensuales || 1));

    const textoCostos = `Mirá cómo se componen tus **costos fijos**:\n\n` +
      `* **Total mensual estimado:** **$${totalCostosFijos.toLocaleString('es-AR')}** (alquiler, energía eléctrica, tasas e internet).\n` +
      `* **Volumen estimado de venta:** ${unidadesMensuales.toLocaleString('es-AR')} unidades por mes.\n` +
      `* **Incidencia por artículo vendido:** Cada producto que vendés tiene que absorber **$${incidenciaPorUnidad.toLocaleString('es-AR')}** solo para cubrir los gastos fijos del local.\n\n` +
      `💡 *Regla de oro:* Si a un alfajor le ganás $50 pero la incidencia del alquiler es $80 por artículo, estás vendiendo a pérdida. Por eso NOST-IA te marca el margen neto real.`;

    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoCostos,
      timestamp: fecha,
      sugerencias: ['¿Cuál es el capital en góndola?', 'Armar una promoción o combo'],
    };
  }

  // 12. CONSULTA DE UN PRODUCTO ESPECÍFICO POR NOMBRE O CÓDIGO
  const productoBuscado = productos.find(
    (p) =>
      pLower.includes(p.nombre.toLowerCase()) ||
      (p.codigoBarras && pLower.includes(p.codigoBarras)) ||
      p.nombre.toLowerCase().split(' ').some((palabra) => palabra.length > 3 && pLower.includes(palabra))
  );

  if (productoBuscado) {
    const margen = productoBuscado.precioCosto > 0
      ? Math.round(((productoBuscado.precioVenta - productoBuscado.precioCosto) / productoBuscado.precioVenta) * 100)
      : 35;
    const estado = productoBuscado.stockActual <= productoBuscado.stockMinimo ? '🚨 crítico' : '✅ óptimo';

    const textoProd = `Mirá, sobre **${productoBuscado.nombre}**:\n` +
      `* **Stock disponible:** Tenés **${productoBuscado.stockActual} ${productoBuscado.unidadMedida || 'u'}** (${estado}, mínimo de seguridad: ${productoBuscado.stockMinimo}).\n` +
      `* **Costo mayorista:** Te sale **$${productoBuscado.precioCosto.toLocaleString('es-AR')}**.\n` +
      `* **Precio de mostrador:** Lo tenés a **$${productoBuscado.precioVenta.toLocaleString('es-AR')}** (margen de ganancia: **${margen}%**).\n` +
      `* **Plata inmovilizada en este artículo:** **$${(productoBuscado.stockActual * productoBuscado.precioCosto).toLocaleString('es-AR')}**.\n\n` +
      `¿Querés ajustar el precio, registrar reposición o consultar otro artículo?`;

    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto: textoProd,
      timestamp: fecha,
      sugerencias: [`¿Cuánto le gano a ${productoBuscado.nombre}?`, '¿Qué productos están por agotarse?'],
    };
  }

  // 13. STOCK CRÍTICO O FALTANTES
  if (
    pLower.includes('agot') ||
    pLower.includes('quiebre') ||
    pLower.includes('critico') ||
    pLower.includes('stock') ||
    pLower.includes('falt')
  ) {
    const criticos = productos.filter((p) => p.stockActual <= p.stockMinimo);
    let texto = '';
    if (criticos.length === 0) {
      texto = `¡Buenas noticias! No tenés ningún producto en quiebre crítico en este momento; todos superan el stock mínimo de seguridad.`;
    } else {
      texto = `Ojo con estos **${criticos.length} productos que están al límite o agotados**:\n\n` +
        criticos.slice(0, 5).map(p => `* **${p.nombre}**: te quedan solo **${p.stockActual} ${p.unidadMedida || 'u'}** (mínimo: ${p.stockMinimo})`).join('\n') +
        `\n\n¿Querés que preparemos la lista para pedirle al distribuidor?`;
    }

    return {
      id: `cop-${Date.now()}`,
      emisor: 'copiloto',
      texto,
      timestamp: fecha,
      sugerencias: ['¿Cuál es el capital en góndola?', 'Armar una promoción o combo'],
    };
  }

  // =========================================================================
  // FASE 2: PREGUNTA ABIERTA / NO CATALOGADA (Intentar LLM Local si está encendido)
  // =========================================================================

  // Si Ollama está verificado y activo en la máquina del usuario, intentamos una consulta rápida (máx 3.5s)
  if (configOllama && configOllama.activo && configOllama.endpoint) {
    try {
      const promptSistema = construirPromptSistema(productos, ventas, estrategia, rol);
      const respuestaOllama = await consultarOllamaDirecto(pregunta, historialPrevio, promptSistema, configOllama);
      if (respuestaOllama && respuestaOllama.trim().length > 15) {
        return {
          id: `cop-${Date.now()}`,
          emisor: 'copiloto',
          texto: respuestaOllama,
          timestamp: fecha,
        };
      }
    } catch {
      // Si Ollama no responde en 3.5s o falla, continúa al fallback soberano inmediato
    }
  }

  // =========================================================================
  // FASE 3: FALLBACK CONTEXTUAL SOBERANO (Garantía de respuesta digna y clara)
  // =========================================================================
  const criticosCount = productos.filter((p) => p.stockActual <= p.stockMinimo).length;
  const textoDialogo = `Te escucho con atención, Beto. Estoy conectado directamente a tu negocio (${productos.length} artículos en catálogo, ${criticosCount} en alerta de stock, ${ventas.length} ventas auditadas).\n\n` +
    `Podés preguntarme con confianza cualquier tema del día a día:\n` +
    `* *"¿Cuál es mi capital en góndola?"*\n` +
    `* *"¿Cuánto vendimos hoy?"*\n` +
    `* *"Armar una promoción o combo"* (o simplemente escribí **"Promo"**)\n` +
    `* *"Ayer no vendí nada, ¿qué estrategia agresiva hacemos?"*\n` +
    `* *"¿Cuál es tu país de origen y tu stack tecnológico?"*\n` +
    `* *"¿Cómo prorrateo el alquiler y la luz?"*\n\n` +
    `¿Por cuál arrancamos?`;

  return {
    id: `cop-${Date.now()}`,
    emisor: 'copiloto',
    texto: textoDialogo,
    timestamp: fecha,
    sugerencias: [
      '¿En qué me podés ayudar?',
      '¿Cuál es el capital en góndola?',
      '¿Cuánto vendimos hoy?',
      'Armar una promoción o combo',
      '¿Qué productos están por agotarse?',
    ],
  };
}

