import type { EstrategiaCostos, CostosFijosMensuales } from '../types';

export interface DesglosePrecio {
  costoDirecto: number;
  costoFijoProrrateado: number;
  costoTotalUnitario: number;
  margenPorcentaje: number;
  gananciaNetaEstimada: number;
  precioAntesIva: number;
  alicuotaIva: number;
  montoIva: number;
  precioFinalSugerido: number;
  precioVentaActual?: number;
  diferenciaConActual?: number;
}

/**
 * Calcula la suma de todos los costos fijos mensuales
 */
export function calcularTotalCostosFijos(costos: CostosFijosMensuales): number {
  return (
    (costos.luz || 0) +
    (costos.agua || 0) +
    (costos.gas || 0) +
    (costos.internet || 0) +
    (costos.alquiler || 0) +
    (costos.salarios || 0) +
    (costos.mantenimiento || 0) +
    (costos.otros || 0)
  );
}

/**
 * Calcula el prorrateo de costo fijo por unidad basado en el volumen mensual proyectado
 */
export function calcularProrrateoUnitario(estrategia: EstrategiaCostos): number {
  const totalFijos = calcularTotalCostosFijos(estrategia.costosFijos);
  const unidades = Math.max(1, estrategia.unidadesMensualesEstimadas || 1);
  return Math.round((totalFijos / unidades) * 100) / 100;
}

/**
 * Calcula el desglose táctico y estratégico completo de un producto
 */
export function calcularDesglosePrecioProducto(
  precioCostoDirecto: number,
  estrategia: EstrategiaCostos,
  margenPersonalizado?: number,
  ivaPersonalizado?: number,
  precioVentaActual?: number
): DesglosePrecio {
  const costoFijoUnitario = calcularProrrateoUnitario(estrategia);
  const costoTotalUnitario = precioCostoDirecto + costoFijoUnitario;

  const margen = margenPersonalizado !== undefined ? margenPersonalizado : estrategia.margenGananciaObjetivo;
  const alicuota = ivaPersonalizado !== undefined ? ivaPersonalizado : estrategia.ivaPorcentajePorDefecto;

  // Precio base que cubre costo total + ganancia neta deseada
  const precioAntesIva = costoTotalUnitario * (1 + margen / 100);
  const gananciaNetaEstimada = precioAntesIva - costoTotalUnitario;
  const montoIva = precioAntesIva * (alicuota / 100);
  const precioFinalSugerido = Math.round(precioAntesIva + montoIva);

  const diferenciaConActual = precioVentaActual !== undefined ? precioVentaActual - precioFinalSugerido : undefined;

  return {
    costoDirecto: precioCostoDirecto,
    costoFijoProrrateado: costoFijoUnitario,
    costoTotalUnitario: Math.round(costoTotalUnitario * 100) / 100,
    margenPorcentaje: margen,
    gananciaNetaEstimada: Math.round(gananciaNetaEstimada * 100) / 100,
    precioAntesIva: Math.round(precioAntesIva * 100) / 100,
    alicuotaIva: alicuota,
    montoIva: Math.round(montoIva * 100) / 100,
    precioFinalSugerido,
    precioVentaActual,
    diferenciaConActual,
  };
}

export interface PuntoEquilibrio {
  costosFijosTotales: number;
  puntoEquilibrioPesos: number;
  puntoEquilibrioUnidades: number;
  margenContribucionPromedioPorcentaje: number;
}

/**
 * Calcula el Punto de Equilibrio (Break-Even Point) mensual:
 * ¿Cuánto dinero y cuántas unidades necesita vender el comercio por mes solo para cubrir costos fijos y no perder plata?
 */
export function calcularPuntoEquilibrioMensual(
  costosFijosTotales: number,
  margenContribucionPorcentaje: number = 35,
  precioPromedioUnitario: number = 2500
): PuntoEquilibrio {
  const fijos = Math.max(0, costosFijosTotales);
  const margenRatio = Math.max(0.05, Math.min(0.95, (margenContribucionPorcentaje || 35) / 100));
  
  // Punto de equilibrio en pesos: Costos Fijos / Margen de Contribución %
  const pePesos = Math.round(fijos / margenRatio);

  // Margen unitario en pesos = Precio * Margen %
  const precioUnit = Math.max(100, precioPromedioUnitario || 2500);
  const margenUnitPesos = precioUnit * margenRatio;
  const peUnidades = Math.ceil(fijos / Math.max(1, margenUnitPesos));

  return {
    costosFijosTotales: fijos,
    puntoEquilibrioPesos: pePesos,
    puntoEquilibrioUnidades: peUnidades,
    margenContribucionPromedioPorcentaje: Math.round(margenRatio * 100),
  };
}

export interface EstadoResultadosMensual {
  ventasBrutas: number;
  costoMercaderiaVendida: number;
  margenBrutoPesos: number;
  margenBrutoPorcentaje: number;
  totalGastosFijos: number;
  resultadoNetoRealPesos: number;
  resultadoNetoRealPorcentaje: number;
  estadoSalud: 'superavit_saludable' | 'zona_equilibrio' | 'deficit_operativo';
  coberturaPuntoEquilibrioPorcentaje: number;
  veredictoContador: string;
}

/**
 * Genera el Estado de Resultados Financiero Real (Contabilidad Práctica para Comerciantes)
 */
export function calcularEstadoResultadosMensual(
  ventasBrutas: number,
  costoMercaderiaVendida: number,
  totalGastosFijos: number
): EstadoResultadosMensual {
  const ventas = Math.max(0, ventasBrutas);
  const cmv = Math.max(0, costoMercaderiaVendida);
  const fijos = Math.max(0, totalGastosFijos);

  const margenBruto = ventas - cmv;
  const margenBrutoPorc = ventas > 0 ? (margenBruto / ventas) * 100 : 0;

  const resultadoNeto = margenBruto - fijos;
  const resultadoNetoPorc = ventas > 0 ? (resultadoNeto / ventas) * 100 : 0;

  // Cobertura del punto de equilibrio (Margen Bruto generado / Gastos Fijos)
  const cobertura = fijos > 0 ? Math.round((margenBruto / fijos) * 100) : 100;

  let estadoSalud: 'superavit_saludable' | 'zona_equilibrio' | 'deficit_operativo' = 'zona_equilibrio';
  let veredictoContador = '';

  if (resultadoNeto > fijos * 0.2) {
    estadoSalud = 'superavit_saludable';
    veredictoContador = `🟢 EXCELENTE SALUD FINANCIERA: Tu negocio cubrió el 100% de los gastos fijos del mes y generó un excedente neto real de $${resultadoNeto.toLocaleString('es-AR')} (${resultadoNetoPorc.toFixed(1)}% del total facturado).`;
  } else if (resultadoNeto >= 0) {
    estadoSalud = 'zona_equilibrio';
    veredictoContador = `🟡 ZONA DE EQUILIBRIO (Break-Even): Estás cubriendo los gastos fijos ($${fijos.toLocaleString('es-AR')}) pero con margen neto ajustado ($${resultadoNeto.toLocaleString('es-AR')}). Cualquier caída imprevista en ventas podría pasarte a déficit.`;
  } else {
    estadoSalud = 'deficit_operativo';
    const faltante = Math.abs(resultadoNeto);
    veredictoContador = `🔴 DÉFICIT OPERATIVO: Las ventas actuales no alcanzan para pagar los gastos fijos. Faltan $${faltante.toLocaleString('es-AR')} para cubrir luz, salarios, alquiler y servicios. Es urgente revisar precios o prorrateo.`;
  }

  return {
    ventasBrutas: Math.round(ventas),
    costoMercaderiaVendida: Math.round(cmv),
    margenBrutoPesos: Math.round(margenBruto),
    margenBrutoPorcentaje: Math.round(margenBrutoPorc * 10) / 10,
    totalGastosFijos: Math.round(fijos),
    resultadoNetoRealPesos: Math.round(resultadoNeto),
    resultadoNetoRealPorcentaje: Math.round(resultadoNetoPorc * 10) / 10,
    estadoSalud,
    coberturaPuntoEquilibrioPorcentaje: cobertura,
    veredictoContador,
  };
}
