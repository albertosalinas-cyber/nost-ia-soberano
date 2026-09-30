import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AnalisisDinamicaComercial } from './smartRestockEngine';

/**
 * Genera el documento PDF A4 estructurado y optimizado para impresoras térmicas, chorro o láser.
 * Utiliza paleta de alta legibilidad en escala de grises con acentos oscuros que no desperdicia tinta.
 */
export function generarPdfReporteCompras(analisis: AnalisisDinamicaComercial): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  let cursorY = 14;

  // -------------------------------------------------------------
  // ENCABEZADO FISCAL Y COMERCIAL (Optimizado para papel / impresora)
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39); // Slate 900
  doc.text('REPORTE DIARIO DE COMPRAS, VENTAS Y GESTIÓN DE QUIEBRES', marginX, cursorY);

  cursorY += 5.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${analisis.nombreComercio.toUpperCase()}  |  RUBRO: ${analisis.rubro.toUpperCase()}`, marginX, cursorY);

  cursorY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const infoExtra = [
    `Emisión: ${analisis.fechaEmision} a las ${analisis.horaEmision} hs`,
    analisis.direccion ? `Dir: ${analisis.direccion}` : '',
    analisis.telefono ? `Tel: ${analisis.telefono}` : '',
    'Sistema: NOST-IA Soberano Local',
  ]
    .filter(Boolean)
    .join('  •  ');
  doc.text(infoExtra, marginX, cursorY);

  cursorY += 3;
  // Línea divisoria nítida
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.4);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 5;

  // -------------------------------------------------------------
  // SECCIÓN 1: RESUMEN DE VENTAS Y COMPARATIVAS TEMPORALES
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. VENTAS Y COMPARATIVA DINÁMICA DE FACTURACIÓN', marginX, cursorY);
  cursorY += 4;

  const colWidth = (pageWidth - marginX * 2 - 6) / 4;
  const cardHeight = 17;

  // Tarjeta 1: Ventas Hoy
  dibujarTarjetaMetrica(
    doc,
    marginX,
    cursorY,
    colWidth,
    cardHeight,
    'VENTAS DE HOY',
    `$ ${analisis.ventasHoy.totalMonto.toLocaleString('es-AR')}`,
    `${analisis.ventasHoy.totalTickets} tickets  |  ${analisis.ventasHoy.unidadesVendidas} unid.`
  );

  // Tarjeta 2: Relación con Día Anterior
  const varDia = analisis.relacionDiaAnterior.porcentajeVariacion;
  const textoVarDia = `${varDia >= 0 ? '+' : ''}${varDia}% ($ ${analisis.relacionDiaAnterior.diferenciaMonto >= 0 ? '+' : ''}${analisis.relacionDiaAnterior.diferenciaMonto.toLocaleString('es-AR')})`;
  dibujarTarjetaMetrica(
    doc,
    marginX + colWidth + 2,
    cursorY,
    colWidth,
    cardHeight,
    'VS DÍA ANTERIOR',
    textoVarDia,
    `Ayer: $ ${analisis.relacionDiaAnterior.periodoAnterior.totalMonto.toLocaleString('es-AR')}`
  );

  // Tarjeta 3: Relación con Semana Anterior
  const varSem = analisis.relacionSemanaAnterior.porcentajeVariacion;
  const textoVarSem = `${varSem >= 0 ? '+' : ''}${varSem}% ($ ${analisis.relacionSemanaAnterior.diferenciaMonto >= 0 ? '+' : ''}${analisis.relacionSemanaAnterior.diferenciaMonto.toLocaleString('es-AR')})`;
  dibujarTarjetaMetrica(
    doc,
    marginX + (colWidth + 2) * 2,
    cursorY,
    colWidth,
    cardHeight,
    'VS SEMANA ANTERIOR',
    textoVarSem,
    `7d previos: $ ${analisis.relacionSemanaAnterior.periodoAnterior.totalMonto.toLocaleString('es-AR')}`
  );

  // Tarjeta 4: Relación con Mes Anterior
  const varMes = analisis.relacionMesAnterior.porcentajeVariacion;
  const textoVarMes = `${varMes >= 0 ? '+' : ''}${varMes}% ($ ${analisis.relacionMesAnterior.diferenciaMonto >= 0 ? '+' : ''}${analisis.relacionMesAnterior.diferenciaMonto.toLocaleString('es-AR')})`;
  dibujarTarjetaMetrica(
    doc,
    marginX + (colWidth + 2) * 3,
    cursorY,
    colWidth,
    cardHeight,
    'VS MES ANTERIOR',
    textoVarMes,
    `30d previos: $ ${analisis.relacionMesAnterior.periodoAnterior.totalMonto.toLocaleString('es-AR')}`
  );

  cursorY += cardHeight + 6;

  // -------------------------------------------------------------
  // SECCIÓN 2: ESTADO ACTUAL DE PRODUCTOS EN QUIEBRE CRÍTICO (TABLA)
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `2. PRODUCTOS EN QUIEBRE CRÍTICO Y REPOSICIÓN URGENTE (${analisis.quiebresCriticos.length} ARTÍCULOS)`,
    marginX,
    cursorY
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Inversión total urgente requerida: $ ${analisis.totalInversionReposicionUrgente.toLocaleString('es-AR')} (${analisis.totalUnidadesReposicionUrgente} unidades sugeridas a pedir)`,
    marginX + 115,
    cursorY
  );
  cursorY += 2.5;

  const filasQuiebres = analisis.quiebresCriticos.map((q) => [
    '[  ]', // Checkbox para control en mano con lapicera en mostrador/depósito
    q.codigoBarras || q.sku || '-',
    q.nombre,
    String(q.stockActual),
    String(q.stockMinimo),
    String(q.unidadesSugeridasPedir),
    `$ ${q.precioCosto.toLocaleString('es-AR')}`,
    `$ ${q.inversionEstimada.toLocaleString('es-AR')}`,
    q.proveedor,
    q.urgencia === 'QUIEBRE_TOTAL' ? 'QUIEBRE' : 'CRÍTICO',
  ]);

  if (filasQuiebres.length === 0) {
    filasQuiebres.push(['-', '-', 'No hay productos en quiebre crítico en este momento.', '-', '-', '-', '-', '-', '-', 'ÓPTIMO']);
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Chk', 'Cód. Barras / SKU', 'Descripción del Producto', 'Act', 'Mín', 'Pedir', 'Costo Unit.', 'Inversión', 'Distribuidor / Proveedor', 'Estado']],
    body: filasQuiebres,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      cellPadding: 1.6,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 'auto', fontStyle: 'bold' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28] }, // Rojo Pedir
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 32 },
      9: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const estadoVal = data.row.cells[9]?.text?.[0];
        if (estadoVal === 'QUIEBRE') {
          data.cell.styles.textColor = [185, 28, 28]; // Red 700
        }
      }
    },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 6;

  // Verificar si necesitamos salto de página antes de la sección 3
  if (cursorY > pageHeight - 50) {
    doc.addPage();
    cursorY = 14;
  }

  // -------------------------------------------------------------
  // SECCIÓN 3: ALERTAS PREDICTIVAS DE QUIEBRE (PRÓXIMOS 7 DÍAS)
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. ALERTAS PREDICTIVAS DE QUIEBRE (Anticipación antes del agotamiento)', marginX, cursorY);
  cursorY += 2.5;

  const filasAlertas = analisis.alertasPredictivas.map((a) => [
    '[  ]',
    a.nombre,
    `Stock: ${a.stockActual} (Mín: ${a.stockMinimo})`,
    `${a.consumoDiarioEstimado} un/día`,
    `En ${a.diasRestantesParaQuiebre} días (~${a.fechaEstimadaQuiebre})`,
    String(a.unidadesSugeridas),
    a.sugerenciaAccion,
  ]);

  if (filasAlertas.length === 0) {
    filasAlertas.push(['-', 'No se proyectan quiebres inminentes para los próximos 7 días.', '-', '-', '-', '-', 'Flujo de ventas y stock en equilibrio.']);
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Chk', 'Producto con Riesgo Próximo', 'Stock Presente', 'Rotación Diaria', 'Quiebre Estimado', 'Pedir', 'Recomendación Operativa']],
    body: filasAlertas,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85], // Slate 700
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 48, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 26, halign: 'center', textColor: [180, 83, 9] }, // Amber 700
      5: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 6;

  if (cursorY > pageHeight - 55) {
    doc.addPage();
    cursorY = 14;
  }

  // -------------------------------------------------------------
  // SECCIÓN 4: FECHAS ESPECIALES Y OPORTUNIDADES ESTACIONALES
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('4. CALENDARIO SOBERANO: ADELANTO A FECHAS ESPECIALES Y CLIMA', marginX, cursorY);
  cursorY += 2.5;

  const filasFechas = analisis.fechasEspecialesProximas.map((f) => [
    f.nombreEvento,
    `En ${f.diasRestantes} días (${f.fecha})`,
    f.impactoEsperado,
    f.accionSugeridaCompras,
    f.productosRecomendados.join(', '),
  ]);

  if (filasFechas.length === 0) {
    filasFechas.push(['Ciclo estándar', '-', 'Sin picos extraordinarios en los próximos 30 días.', 'Mantener reposición contra consumo habitual.', '-']);
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Evento / Temporada', 'Horizonte Temporal', 'Impacto en Demanda', 'Acción Sugerida para Compras', 'Líneas Recomendadas']],
    body: filasFechas,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105], // Slate 600
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [15, 23, 42],
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 44 },
      3: { cellWidth: 44 },
      4: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 6;

  if (cursorY > pageHeight - 55) {
    doc.addPage();
    cursorY = 14;
  }

  // -------------------------------------------------------------
  // SECCIÓN 5: CREATIVIDAD EN VENTAS: COMBOS Y DESAHOGO DE CAPITAL
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('5. PROPUESTAS CREATIVAS PARA IMPULSAR VENTAS Y DESAHOGO DE STOCK', marginX, cursorY);
  cursorY += 2.5;

  const filasIdeas = analisis.ideasCreativas.map((id) => [
    id.titulo,
    id.tipo === 'COMBO_DESAHOGO' ? 'DESAHOGO CAPITAL' : id.tipo === 'VENTA_CRUZADA' ? 'VENTA CRUZADA' : 'ESTRATEGIA',
    id.descripcion,
    id.beneficioEsperado,
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Propuesta Comercial', 'Objetivo Estratégico', 'Detalle de Implementación en Mostrador', 'Beneficio Proyectado']],
    body: filasIdeas,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [15, 23, 42],
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 45, textColor: [4, 120, 87] }, // Green 700
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 6;

  // -------------------------------------------------------------
  // SECCIÓN 6: ORDEN DE COMPRA MANUAL POR DISTRIBUIDOR (Para llamadas / WhatsApp)
  // -------------------------------------------------------------
  if (analisis.ordenCompraPorProveedor.length > 0) {
    if (cursorY > pageHeight - 60) {
      doc.addPage();
      cursorY = 14;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('6. GUÍA DE COMPRA MANUAL AGRUPADA POR PROVEEDOR (Para pedidos directos)', marginX, cursorY);
    cursorY += 2.5;

    for (const provGroup of analisis.ordenCompraPorProveedor) {
      if (cursorY > pageHeight - 35) {
        doc.addPage();
        cursorY = 14;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `• PROVEEDOR: ${provGroup.proveedor.toUpperCase()}  —  Total Estimado: $ ${provGroup.totalEstimado.toLocaleString('es-AR')} (${provGroup.unidadesTotales} unidades)`,
        marginX,
        cursorY
      );
      cursorY += 2;

      const filasItems = provGroup.items.map((it) => [
        '[  ]',
        it.codigo || it.sku || '-',
        it.producto,
        `Stock: ${it.stockActual}`,
        `Pedir: ${it.cantidadSugerida}`,
        `$ ${it.costoUnitario.toLocaleString('es-AR')}`,
        `$ ${it.subtotal.toLocaleString('es-AR')}`,
      ]);

      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['Chk', 'Código', 'Artículo', 'Stock', 'Cantidad', 'Costo Unit.', 'Subtotal Est.']],
        body: filasItems,
        theme: 'plain',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 7,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [15, 23, 42],
          cellPadding: 1.2,
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 26 },
          2: { cellWidth: 'auto', fontStyle: 'bold' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 4;
    }
  }

  // -------------------------------------------------------------
  // PIE DE PÁGINA Y NUMERACIÓN EN TODAS LAS HOJAS
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400

    doc.line(marginX, pageHeight - 8, pageWidth - marginX, pageHeight - 8);
    doc.text(
      `NOST-IA Sistema Soberano  |  Reporte de Compras y Dinámica Comercial  |  Página ${i} de ${totalPages}`,
      marginX,
      pageHeight - 4.5
    );

    doc.text(
      'Documento de gestión interna no fiscal. Verifique precios vigentes con sus proveedores.',
      pageWidth - marginX,
      pageHeight - 4.5,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Dibuja una tarjeta métrica enmarcada para la sección de ventas
 */
function dibujarTarjetaMetrica(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  titulo: string,
  valorPrincipal: string,
  subtitulo: string
) {
  // Fondo muy claro con borde
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(titulo, x + 2.5, y + 4.2);

  // Valor Principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(valorPrincipal, x + 2.5, y + 9.5);

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitulo, x + 2.5, y + 14);
}

/**
 * Descarga directamente el archivo PDF
 */
export function descargarPdfReporte(analisis: AnalisisDinamicaComercial): void {
  const doc = generarPdfReporteCompras(analisis);
  const fechaLimpia = analisis.fechaEmision.replace(/\//g, '-');
  const nombreArchivo = `Reporte_Compras_Quiebres_${fechaLimpia}.pdf`;
  doc.save(nombreArchivo);
}

/**
 * Genera Data URL del PDF para previsualización directa en iframe/visor
 */
export function obtenerPdfDataUrl(analisis: AnalisisDinamicaComercial): string {
  const doc = generarPdfReporteCompras(analisis);
  return doc.output('datauristring');
}
