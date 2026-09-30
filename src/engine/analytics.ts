import type { Producto, PuntoTerritorial, EstadoAlertaStock } from '../types';

/**
 * Fórmula de Haversine para calcular distancia esférica real entre dos coordenadas (en km)
 */
export function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio medio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

/**
 * Actualiza el modelo predictivo de quiebre de stock basado en ventas de 30 días
 */
export function evaluarEstadoStock(producto: Producto): {
  diasAgotamiento: number;
  estadoAlerta: EstadoAlertaStock;
} {
  const ventas30 = Math.max(0, producto.ventasUltimos30Dias || 0);
  const consumoDiario = ventas30 > 0 ? ventas30 / 30 : 0.05;
  const diasRestantes = Math.round(producto.stockActual / consumoDiario);

  let estado: EstadoAlertaStock = 'optimo';

  if (producto.stockActual <= 0 || diasRestantes <= 5 || producto.stockActual <= producto.stockMinimo) {
    estado = 'critico';
  } else if (diasRestantes <= 14) {
    estado = 'medio';
  } else if (diasRestantes > 90 && producto.stockActual > producto.stockMinimo * 3) {
    estado = 'sobrestock';
  }

  return {
    diasAgotamiento: diasRestantes,
    estadoAlerta: estado,
  };
}

/**
 * Motor analítico de filtrado espacial y territorial tipo DuckDB
 */
export interface AnaliticaTerritorial {
  totalPuntos: number;
  puntosFiltrados: (PuntoTerritorial & { distanciaKm?: number })[];
  porRubro: Record<string, number>;
  volumenTotalMensual: number;
  promedioVolumenPorPunto: number;
  puntosActivos: number;
  puntosPotenciales: number;
}

export function ejecutarConsultaTerritorial(
  puntos: PuntoTerritorial[],
  filtro: {
    rubro: string;
    radioKm: number;
    centroCoord?: { lat: number; lng: number };
    busquedaTexto: string;
  }
): AnaliticaTerritorial {
  const query = filtro.busquedaTexto.trim().toLowerCase();

  const procesados = puntos
    .map((p) => {
      let distancia: number | undefined;
      if (filtro.centroCoord) {
        distancia = calcularDistanciaKm(
          filtro.centroCoord.lat,
          filtro.centroCoord.lng,
          p.lat,
          p.lng
        );
      }
      return { ...p, distanciaKm: distancia };
    })
    .filter((p) => {
      // Filtro de rubro
      if (filtro.rubro !== 'Todos' && p.rubro !== filtro.rubro) {
        return false;
      }
      // Filtro espacial radial
      if (filtro.centroCoord && p.distanciaKm !== undefined) {
        if (p.distanciaKm > filtro.radioKm) {
          return false;
        }
      }
      // Filtro de texto
      if (query.length > 0) {
        const coincide =
          p.nombre.toLowerCase().includes(query) ||
          p.barrio.toLowerCase().includes(query) ||
          p.direccion.toLowerCase().includes(query) ||
          p.rubro.toLowerCase().includes(query) ||
          p.notas.toLowerCase().includes(query);
        if (!coincide) return false;
      }
      return true;
    });

  const porRubro: Record<string, number> = {};
  let volumenTotal = 0;
  let activos = 0;
  let potenciales = 0;

  procesados.forEach((p) => {
    porRubro[p.rubro] = (porRubro[p.rubro] || 0) + 1;
    volumenTotal += p.volumenMensual || 0;
    if (p.estadoComercial === 'activo') activos++;
    if (p.estadoComercial === 'potencial') potenciales++;
  });

  return {
    totalPuntos: puntos.length,
    puntosFiltrados: procesados,
    porRubro,
    volumenTotalMensual: volumenTotal,
    promedioVolumenPorPunto: procesados.length > 0 ? Math.round(volumenTotal / procesados.length) : 0,
    puntosActivos: activos,
    puntosPotenciales: potenciales,
  };
}
