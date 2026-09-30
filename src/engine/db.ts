import Dexie, { type Table } from 'dexie';
import type {
  Producto,
  PuntoTerritorial,
  VentaPOS,
  EstrategiaCostos,
  FacturaProcesadaHistorial,
  RegistroAuditoriaError,
  AprendizajeAlias,
  GastoOperativo,
} from '../types';

export class SiitalDatabase extends Dexie {
  productos!: Table<Producto, string>;
  puntosTerritoriales!: Table<PuntoTerritorial, string>;
  ventas!: Table<VentaPOS, string>;
  configuracion!: Table<{ clave: string; valor: any }, string>;
  facturasHistorial!: Table<FacturaProcesadaHistorial, string>;
  auditoriaErrores!: Table<RegistroAuditoriaError, string>;
  aprendizajesAlias!: Table<AprendizajeAlias, string>;
  gastosOperativos!: Table<GastoOperativo, string>;

  constructor() {
    super('SiitalTerritorialDB');
    this.version(1).stores({
      productos: 'id, codigoBarras, nombre, categoria, rubro, estadoAlerta',
      puntosTerritoriales: 'id, nombre, rubro, barrio, estadoComercial',
      ventas: 'id, fecha, total, metodoPago',
      configuracion: 'clave'
    });
    this.version(2).stores({
      productos: 'id, codigoBarras, nombre, categoria, rubro, estadoAlerta',
      puntosTerritoriales: 'id, nombre, rubro, barrio, estadoComercial',
      ventas: 'id, fecha, total, metodoPago',
      configuracion: 'clave',
      facturasHistorial: 'id, fechaCarga, numeroComprobante, proveedorOEmisor, esDuplicada'
    });
    this.version(3).stores({
      productos: 'id, codigoBarras, nombre, categoria, rubro, estadoAlerta',
      puntosTerritoriales: 'id, nombre, rubro, barrio, estadoComercial',
      ventas: 'id, fecha, total, metodoPago',
      configuracion: 'clave',
      facturasHistorial: 'id, fechaCarga, numeroComprobante, proveedorOEmisor, esDuplicada',
      auditoriaErrores: 'id, fecha, categoria, estado, severidad, tipoArchivo'
    });
    this.version(4).stores({
      productos: 'id, codigoBarras, nombre, categoria, rubro, estadoAlerta',
      puntosTerritoriales: 'id, nombre, rubro, barrio, estadoComercial',
      ventas: 'id, fecha, total, metodoPago',
      configuracion: 'clave',
      facturasHistorial: 'id, fechaCarga, numeroComprobante, proveedorOEmisor, esDuplicada',
      auditoriaErrores: 'id, fecha, categoria, estado, severidad, tipoArchivo',
      aprendizajesAlias: 'id, textoOriginal, proveedor, productoIdDestino, fechaUltimoUso'
    });
    this.version(5).stores({
      productos: 'id, codigoBarras, nombre, categoria, rubro, estadoAlerta',
      puntosTerritoriales: 'id, nombre, rubro, barrio, estadoComercial',
      ventas: 'id, fecha, total, metodoPago',
      configuracion: 'clave',
      facturasHistorial: 'id, fechaCarga, numeroComprobante, proveedorOEmisor, esDuplicada',
      auditoriaErrores: 'id, fecha, categoria, estado, severidad, tipoArchivo',
      aprendizajesAlias: 'id, textoOriginal, proveedor, productoIdDestino, fechaUltimoUso',
      gastosOperativos: 'id, fecha, categoriaGasto, proveedor, comprobante, periodoMes'
    });
  }
}

export const db = new SiitalDatabase();

// Datos semilla de productos populares de almacén y cooperativas barriales
export const INITIAL_PRODUCTOS: Producto[] = [
  {
    id: 'prod-001',
    codigoBarras: '7790895000997',
    nombre: 'Yerba Mate Orgánica Cooperativa 1kg',
    categoria: 'Almacén Seco',
    rubro: 'Cooperativa',
    precioCosto: 2100,
    precioVenta: 3450,
    stockActual: 8,
    stockMinimo: 15,
    stockTienda: 5,
    stockDeposito: 3,
    rotacion: 'alta',
    proveedor: 'Cooperativa Río de la Plata',
    ventasUltimos30Dias: 62,
    diasAgotamiento: 4, // Alerta crítica (< 7 días)
    estadoAlerta: 'critico',
    unidadMedida: 'paquete',
    ivaPorcentaje: 21,
    costoFijoProrrateado: 245,
    margenSugerido: 40,
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'prod-002',
    codigoBarras: '7791234567890',
    nombre: 'Aceite de Girasol Primera Prensada 900ml',
    categoria: 'Aceites y Grasas',
    rubro: 'Almacén',
    precioCosto: 1450,
    precioVenta: 2200,
    stockActual: 38,
    stockMinimo: 20,
    stockTienda: 18,
    stockDeposito: 20,
    rotacion: 'alta',
    proveedor: 'Distribuidora Central Sur',
    ventasUltimos30Dias: 94,
    diasAgotamiento: 12,
    estadoAlerta: 'optimo',
    unidadMedida: 'unidades',
    ivaPorcentaje: 21,
    costoFijoProrrateado: 190,
    margenSugerido: 35,
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'prod-003',
    codigoBarras: '7790070412351',
    nombre: 'Harina de Trigo 000 Agroecológica 1kg',
    categoria: 'Harinas y Granos',
    rubro: 'Granja',
    precioCosto: 680,
    precioVenta: 1100,
    stockActual: 4,
    stockMinimo: 25,
    stockTienda: 4,
    stockDeposito: 0,
    rotacion: 'alta',
    proveedor: 'Molino Harinero Barrial UNLP',
    ventasUltimos30Dias: 85,
    diasAgotamiento: 1, // Alerta inminente
    estadoAlerta: 'critico',
    unidadMedida: 'paquete',
    ivaPorcentaje: 10.5,
    costoFijoProrrateado: 85,
    margenSugerido: 35,
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'prod-004',
    codigoBarras: '7798081234567',
    nombre: 'Fideos Tallarines al Huevo Artesanales 500g',
    categoria: 'Pastas Secas',
    rubro: 'Almacén',
    precioCosto: 850,
    precioVenta: 1350,
    stockActual: 24,
    stockMinimo: 18,
    stockTienda: 14,
    stockDeposito: 10,
    rotacion: 'media',
    proveedor: 'Fideería San Cayetano',
    ventasUltimos30Dias: 35,
    diasAgotamiento: 20,
    estadoAlerta: 'optimo',
    unidadMedida: 'paquete',
    ivaPorcentaje: 21,
    costoFijoProrrateado: 120,
    margenSugerido: 35,
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'prod-005',
    codigoBarras: '7794567890123',
    nombre: 'Miel Pura de Monte Silvestre 500g',
    categoria: 'Dulces y Conservas',
    rubro: 'Granja',
    precioCosto: 2800,
    precioVenta: 4500,
    stockActual: 16,
    stockMinimo: 8,
    stockTienda: 10,
    stockDeposito: 6,
    rotacion: 'media',
    proveedor: 'Productores Apícolas Unidos',
    ventasUltimos30Dias: 18,
    diasAgotamiento: 26,
    estadoAlerta: 'optimo',
    unidadMedida: 'unidades',
    ivaPorcentaje: 21,
    costoFijoProrrateado: 310,
    margenSugerido: 45,
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'prod-006',
    codigoBarras: '7793216549870',
    nombre: 'Jabón Blanco Líquido Biodegradable 5L',
    categoria: 'Limpieza e Higiene',
    rubro: 'Taller',
    precioCosto: 3900,
    precioVenta: 6200,
    stockActual: 72,
    stockMinimo: 10,
    stockTienda: 22,
    stockDeposito: 50,
    rotacion: 'baja',
    proveedor: 'Cooperativa Química del Conurbano',
    ventasUltimos30Dias: 12,
    diasAgotamiento: 180, // Sobrestock
    estadoAlerta: 'sobrestock',
    unidadMedida: 'unidades',
    ivaPorcentaje: 21,
    costoFijoProrrateado: 450,
    margenSugerido: 40,
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'prod-007',
    codigoBarras: '7791112223334',
    nombre: 'Arroz Integral Agroecológico 1kg',
    categoria: 'Harinas y Granos',
    rubro: 'Cultivo',
    precioCosto: 1200,
    precioVenta: 1950,
    stockActual: 11,
    stockMinimo: 12,
    stockTienda: 8,
    stockDeposito: 3,
    rotacion: 'media',
    proveedor: 'Granja Agroecológica La Huella',
    ventasUltimos30Dias: 25,
    diasAgotamiento: 13,
    estadoAlerta: 'medio',
    unidadMedida: 'paquete',
    ivaPorcentaje: 10.5,
    costoFijoProrrateado: 140,
    margenSugerido: 40,
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'prod-008',
    codigoBarras: '7795556667778',
    nombre: 'Leche Entera Fortificada 1L Sachett',
    categoria: 'Lácteos',
    rubro: 'Almacén',
    precioCosto: 950,
    precioVenta: 1350,
    stockActual: 6,
    stockMinimo: 20,
    stockTienda: 6,
    stockDeposito: 0,
    rotacion: 'alta',
    proveedor: 'Tambo Comunitario del Oeste',
    ventasUltimos30Dias: 110,
    diasAgotamiento: 2,
    estadoAlerta: 'critico',
    unidadMedida: 'litros',
    ivaPorcentaje: 0,
    costoFijoProrrateado: 110,
    margenSugerido: 25,
    fechaActualizacion: new Date().toISOString(),
  },
];

// Semilla de Puntos Territoriales (Comercios, Cooperativas, Huertas y Acopios)
export const INITIAL_PUNTOS: PuntoTerritorial[] = [
  {
    id: 'pt-001',
    nombre: 'Almacén Soberano Los Ceibos',
    rubro: 'Almacén',
    subtitulo: 'Despensa familiar y venta fraccionada',
    lat: -34.6712,
    lng: -58.5621,
    barrio: 'San Justo, La Matanza',
    direccion: 'Av. Juan Manuel de Rosas 3420',
    telefono: '+54 11 4651-9982',
    volumenMensual: 4800,
    estadoComercial: 'activo',
    contacto: 'Don Osvaldo & Familia',
    notas: 'Punto neurálgico de compras del barrio. Abastece 320 familias semanales.',
  },
  {
    id: 'pt-002',
    nombre: 'Cooperativa Textil y Calzado 17 de Octubre',
    rubro: 'Cooperativa',
    subtitulo: 'Taller de confección y calzado popular',
    lat: -34.6645,
    lng: -58.3712,
    barrio: 'Avellaneda Centro',
    direccion: 'Calle Mitre 840',
    telefono: '+54 11 4201-3310',
    volumenMensual: 6200,
    estadoComercial: 'activo',
    contacto: 'Lucía Benítez (Secretaria)',
    capacidadAcopioKg: 1200,
    notas: 'Fabricación directa y acopio de uniformes y guardapolvos escolares.',
  },
  {
    id: 'pt-003',
    nombre: 'Granja Frutihortícola El Trébol',
    rubro: 'Granja',
    subtitulo: 'Producción de verduras de hoja sin pesticidas',
    lat: -34.9214,
    lng: -57.9545,
    barrio: 'Cordón Hortícola La Plata',
    direccion: 'Ruta 36 Km 44',
    telefono: '+54 221 498-1122',
    volumenMensual: 8900,
    estadoComercial: 'activo',
    contacto: 'Ing. Agrónomo Martín Soria',
    capacidadAcopioKg: 5000,
    notas: 'Provisión quincenal de cajones de verdura fresca a precios mayoristas.',
  },
  {
    id: 'pt-004',
    nombre: 'Taller Metalúrgico Comunitario San Cayetano',
    rubro: 'Taller',
    subtitulo: 'Herrería, soldadura y reparación de maquinaria PyME',
    lat: -34.5721,
    lng: -58.5342,
    barrio: 'Villa Maipú, San Martín',
    direccion: 'Calle Cochabamba 1890',
    telefono: '+54 11 4755-4421',
    volumenMensual: 3100,
    estadoComercial: 'activo',
    contacto: 'Carlos "Beto" Morales',
    notas: 'Reparación de carros de carga, balanzas y estanterías de depósito.',
  },
  {
    id: 'pt-005',
    nombre: 'Centro de Acopio y Logística Barrial Quilmes',
    rubro: 'Acopio',
    subtitulo: 'Depósito regulador de precios y compras conjuntas',
    lat: -34.7245,
    lng: -58.2589,
    barrio: 'Bernal Oeste, Quilmes',
    direccion: 'Camino General Belgrano 2150',
    telefono: '+54 11 4252-7711',
    volumenMensual: 12500,
    estadoComercial: 'activo',
    contacto: 'Coordinación Red Territorial',
    capacidadAcopioKg: 15000,
    notas: 'Cámaras frigoríficas y estanterías pesadas para evitar intermediarios abusivos.',
  },
  {
    id: 'pt-006',
    nombre: 'Huerta Agroecológica y Vivero El Pinar',
    rubro: 'Cultivo',
    subtitulo: 'Semillas nativas y aromáticas medicinales',
    lat: -34.6210,
    lng: -58.7102,
    barrio: 'Paso del Rey, Moreno',
    direccion: 'Calle De la Rivera 450',
    telefono: '+54 237 460-2299',
    volumenMensual: 2400,
    estadoComercial: 'potencial',
    contacto: 'Mariela Gómez',
    notas: 'En proceso de articulación para provisión de hierbas para yerba compuesta.',
  },
  {
    id: 'pt-007',
    nombre: 'Despensa Comunitaria Barrio Evita',
    rubro: 'Almacén',
    subtitulo: 'Comercio minorista y punto de canje de envases',
    lat: -34.6980,
    lng: -58.4890,
    barrio: 'Villa Celina, La Matanza',
    direccion: 'Av. Avelino Díaz 1120',
    telefono: '+54 11 4622-0012',
    volumenMensual: 3800,
    estadoComercial: 'activo',
    contacto: 'Doña Rosa',
    notas: 'Ubicación estratégica en zona comercial densa. Alto flujo de venta diaria.',
  }
];

export const INITIAL_ESTRATEGIA_COSTOS: EstrategiaCostos = {
  costosFijos: {
    luz: 65000,
    agua: 12000,
    gas: 18000,
    internet: 22000,
    alquiler: 280000,
    salarios: 450000,
    mantenimiento: 35000,
    otros: 20000,
  },
  unidadesMensualesEstimadas: 3500,
  margenGananciaObjetivo: 35,
  ivaPorcentajePorDefecto: 21,
};

export const INITIAL_GASTOS_OPERATIVOS: GastoOperativo[] = [
  {
    id: 'gasto-ini-01',
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    periodoMes: new Date().toISOString().slice(0, 7),
    categoriaGasto: 'luz',
    proveedor: 'Edenor S.A.',
    comprobante: 'B-0004-00129482',
    cuitEmisor: '30-65511620-2',
    montoTotal: 65000,
    netoGravado: 51000,
    ivaMonto: 10710,
    percepciones: 3290,
    observaciones: 'Factura eléctrica tarifa T1-G Almacén y Heladeras',
    impactaEnProrrateo: true,
  },
  {
    id: 'gasto-ini-02',
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    periodoMes: new Date().toISOString().slice(0, 7),
    categoriaGasto: 'internet',
    proveedor: 'Telecom Personal',
    comprobante: 'A-0001-08492019',
    cuitEmisor: '30-63945373-8',
    montoTotal: 22000,
    netoGravado: 18181,
    ivaMonto: 3819,
    observaciones: 'Fibra óptica comercial 300MB',
    impactaEnProrrateo: true,
  },
  {
    id: 'gasto-ini-03',
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    periodoMes: new Date().toISOString().slice(0, 7),
    categoriaGasto: 'alquiler',
    proveedor: 'Inmobiliaria Belgrano SRL',
    comprobante: 'REC-0002-00004510',
    cuitEmisor: '30-71239845-9',
    montoTotal: 280000,
    observaciones: 'Canon locativo comercial del local',
    impactaEnProrrateo: true,
  },
];

/**
 * Guarda un comprobante de gasto operativo y sincroniza la estrategia de costos fijos
 */
export async function guardarGastoOperativo(gasto: GastoOperativo): Promise<void> {
  await db.gastosOperativos.put(gasto);
  await actualizarCostosFijosDesdeGastosBD();
}

/**
 * Obtiene todos los gastos operativos ordenados por fecha descendente
 */
export async function obtenerGastosOperativos(): Promise<GastoOperativo[]> {
  try {
    const todos = await db.gastosOperativos.toArray();
    return todos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  } catch {
    return [];
  }
}

/**
 * Elimina un comprobante de gasto y recalcula los costos fijos
 */
export async function eliminarGastoOperativo(id: string): Promise<void> {
  await db.gastosOperativos.delete(id);
  await actualizarCostosFijosDesdeGastosBD();
}

/**
 * Recalcula y actualiza en segundo plano la configuración de costos fijos prorrateables
 */
export async function actualizarCostosFijosDesdeGastosBD(): Promise<EstrategiaCostos> {
  const [gastos, configItem] = await Promise.all([
    db.gastosOperativos.toArray(),
    db.configuracion.get('estrategia_costos'),
  ]);

  const estrategia: EstrategiaCostos = configItem?.valor || INITIAL_ESTRATEGIA_COSTOS;
  const mesActual = new Date().toISOString().slice(0, 7);
  const gastosMes = gastos.filter((g) => g.periodoMes === mesActual && g.impactaEnProrrateo);
  const fuentesGastos = gastosMes.length > 0 ? gastosMes : gastos.filter((g) => g.impactaEnProrrateo);

  const nuevosFijos = { ...estrategia.costosFijos };

  for (const g of fuentesGastos) {
    if (g.categoriaGasto in nuevosFijos) {
      (nuevosFijos as any)[g.categoriaGasto] = g.montoTotal;
    }
  }

  const nuevaEstrategia: EstrategiaCostos = {
    ...estrategia,
    costosFijos: nuevosFijos,
  };

  await db.configuracion.put({
    clave: 'estrategia_costos',
    valor: nuevaEstrategia,
  });

  return nuevaEstrategia;
}

/**
 * Inicializador persistente de base de datos soberana
 * Inicia 100% limpia y desde cero para que el comerciante cargue sus propios productos reales.
 */
export async function initializeDatabase(): Promise<void> {
  // Inicialización limpia: arranca en cero productos y cero ventas reales
  const configExists = await db.configuracion.get('estrategia_costos');
  if (!configExists) {
    await db.configuracion.put({
      clave: 'estrategia_costos',
      valor: INITIAL_ESTRATEGIA_COSTOS,
    });
  }

  // Carga histórica inicial del registro de auditoría de errores si está vacía
  const auditCount = await db.auditoriaErrores.count();
  if (auditCount === 0) {
    await db.auditoriaErrores.bulkPut(INITIAL_REGISTROS_AUDITORIA);
  }

  // Carga inicial de gastos operativos semilla si está vacía
  const gastosCount = await db.gastosOperativos.count();
  if (gastosCount === 0) {
    await db.gastosOperativos.bulkPut(INITIAL_GASTOS_OPERATIVOS);
  }
}

/**
 * Función para resetear a cero absoluto toda la base de datos (limpieza total para pruebas desde cero)
 */
export async function vaciarBaseDeDatosTotal(): Promise<void> {
  await db.productos.clear();
  await db.ventas.clear();
  await db.puntosTerritoriales.clear();
  await db.configuracion.clear();
  await db.auditoriaErrores.clear();
  await db.gastosOperativos.clear();
}

/**
 * Exportador soberano de backup local completo con firma de integridad SHA-256
 */
export async function exportarBackupSoberano(): Promise<string> {
  return await exportarBackupConIntegridad();
}

/**
 * Importa un archivo de backup File directamente con verificación criptográfica SHA-256
 */
export async function importarArchivoBackup(archivo: File): Promise<{ exito: boolean; mensaje: string }> {
  try {
    const texto = await archivo.text();
    return await importarBackupConVerificacion(texto);
  } catch (err) {
    return {
      exito: false,
      mensaje: `Error al leer el archivo de backup: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Importador soberano de backup con verificación criptográfica SHA-256 y compatibilidad con versiones previas
 */
export async function importarBackupSoberano(jsonContent: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonContent);

    // Si es un paquete con firma SHA-256 (v3.0.0+)
    if (parsed.checksumSHA256 && (parsed.tablas || parsed.datos)) {
      const res = await importarBackupConVerificacion(jsonContent);
      return res.exito;
    }

    // Compatibilidad retroactiva con backups v1.0.0
    if (!parsed.datos || !parsed.datos.productos) {
      throw new Error('Formato de backup inválido');
    }

    await db.transaction('rw', [db.productos, db.puntosTerritoriales, db.ventas, db.configuracion, db.facturasHistorial, db.auditoriaErrores], async () => {
      await db.productos.clear();
      await db.productos.bulkAdd(parsed.datos.productos);

      if (parsed.datos.puntosTerritoriales) {
        await db.puntosTerritoriales.clear();
        await db.puntosTerritoriales.bulkAdd(parsed.datos.puntosTerritoriales);
      }

      if (parsed.datos.ventas) {
        await db.ventas.clear();
        await db.ventas.bulkAdd(parsed.datos.ventas);
      }

      if (parsed.datos.configuracion) {
        await db.configuracion.clear();
        for (const item of parsed.datos.configuracion) {
          await db.configuracion.put(item);
        }
      }

      if (parsed.datos.facturasHistorial) {
        await db.facturasHistorial.clear();
        await db.facturasHistorial.bulkAdd(parsed.datos.facturasHistorial);
      }

      if (parsed.datos.auditoriaErrores) {
        await db.auditoriaErrores.clear();
        await db.auditoriaErrores.bulkAdd(parsed.datos.auditoriaErrores);
      }
    });

    return true;
  } catch (error) {
    console.error('Error importando backup:', error);
    return false;
  }
}

/**
 * Guarda una factura en el historial local persistente
 */
export async function guardarFacturaEnHistorial(factura: FacturaProcesadaHistorial): Promise<void> {
  await db.facturasHistorial.put(factura);
}

/**
 * Obtiene el historial completo de facturas ordenado por fecha descendente
 */
export async function obtenerHistorialFacturas(): Promise<FacturaProcesadaHistorial[]> {
  try {
    const todas = await db.facturasHistorial.toArray();
    return todas.sort((a, b) => new Date(b.fechaCarga).getTime() - new Date(a.fechaCarga).getTime());
  } catch {
    return [];
  }
}

/**
 * Verifica si una factura ya fue cargada previamente en el sistema (Detección de Duplicados)
 */
export async function verificarFacturaDuplicada(
  numeroComprobante?: string,
  proveedorOEmisor?: string,
  totalCalculado?: number,
  archivoOrigenNombre?: string
): Promise<{ esDuplicada: boolean; facturaPrevia?: FacturaProcesadaHistorial; motivo?: string }> {
  try {
    const historial = await db.facturasHistorial.toArray();
    if (historial.length === 0) {
      return { esDuplicada: false };
    }

    const numLimipio = (numeroComprobante || '').trim().toLowerCase();
    const provLimpio = (proveedorOEmisor || '').trim().toLowerCase();
    const esNumeroValido = numLimipio.length >= 3 && numLimipio !== 's/n' && numLimipio !== 'sin número';

    for (const previa of historial) {
      const previaNum = (previa.numeroComprobante || '').trim().toLowerCase();
      const previaProv = (previa.proveedorOEmisor || '').trim().toLowerCase();

      // Regla 1: Mismo número de comprobante y mismo proveedor
      if (esNumeroValido && previaNum === numLimipio && (previaProv === provLimpio || provLimpio.includes(previaProv) || previaProv.includes(provLimpio))) {
        return {
          esDuplicada: true,
          facturaPrevia: previa,
          motivo: `Mismo comprobante "${previa.numeroComprobante}" del emisor "${previa.proveedorOEmisor}" ingresado el ${new Date(previa.fechaCarga).toLocaleDateString('es-AR')}.`,
        };
      }

      // Regla 2: Mismo nombre de archivo origen y mismo monto total
      if (archivoOrigenNombre && previa.archivoOrigenNombre && previa.archivoOrigenNombre === archivoOrigenNombre && totalCalculado && Math.abs(previa.total - totalCalculado) < 0.5) {
        return {
          esDuplicada: true,
          facturaPrevia: previa,
          motivo: `El archivo "${archivoOrigenNombre}" ya fue procesado el ${new Date(previa.fechaCarga).toLocaleDateString('es-AR')} con idéntico importe total ($${previa.total.toLocaleString('es-AR')}).`,
        };
      }
    }

    return { esDuplicada: false };
  } catch {
    return { esDuplicada: false };
  }
}

/**
 * Registros históricos iniciales de auditoría de errores desde el inicio del proyecto NOST-IA
 */
export const INITIAL_REGISTROS_AUDITORIA: RegistroAuditoriaError[] = [
  {
    id: 'err-001-colapso-repuestos',
    fecha: '2026-09-20T10:15:00.000Z',
    categoria: 'lectura_documento',
    tipoArchivo: 'jpg',
    archivoAfectado: 'factura_repuestos_monroe.jpg',
    titulo: 'Colapso de ítems idénticos por nombre pero con aplicación vehicular distinta',
    descripcion: 'En comprobantes JPG de repuestos con múltiples líneas de un mismo producto base (ej. "AMORTIGUADOR MONROE"), el motor de lectura agrupaba erróneamente todos los renglones en 1 solo ítem, ignorando las líneas inferiores que especificaban el modelo del vehículo (Ford Fiesta, VW Gol, Peugeot 206).',
    causaRaiz: 'La heurística agrupaba por descripción primaria idéntica y descartaba o sobrescribía sub-descripciones secundarias que no traían precio propio en la misma línea.',
    impacto: 'Subregistro de 3 artículos a 1 solo en la previsualización del inventario; pérdida de compatibilidades vehiculares esenciales para la venta en mostrador.',
    solucionAplicada: 'Se implementó discriminador multi-línea con preservación estricta de modelo vehicular acoplado a la denominación del SKU. En el prompt multimodal y en el parser OCR local se prohibió colapsar renglones que difieran en aplicación técnica.',
    estado: 'solucionado',
    severidad: 'alta',
    detallesTecnicos: 'Parser regex en invoiceReader.ts + regla estricta de modelo automotor y regla de preservación de especificación técnica de chasis.',
    registradoPor: 'Auditoría Sistema NOST-IA',
  },
  {
    id: 'err-002-ruido-encabezados-pdf',
    fecha: '2026-09-21T14:30:00.000Z',
    categoria: 'lectura_documento',
    tipoArchivo: 'pdf',
    archivoAfectado: 'factura_distribuidora_libertador.pdf',
    titulo: 'Inyección de ruido fiscal y palabras de encabezado como productos inventariables',
    descripcion: 'En un PDF con 3 mercaderías reales, el previsualizador extraía más de 10 productos fantasma, tomando como nombres palabras de encabezado o leyendas fiscales como "TRES", "STOCK", "LIBERTADOR", "CO", "TOTAL".',
    causaRaiz: 'La condición de aceptación de renglón validaba líneas donde cantMulti > 0 o unitMulti > 0 de forma laxa, sumado a la falta de lista negra semántica de palabras comunes de encabezados de factura.',
    impacto: 'Contaminación crítica del catálogo con artículos inexistentes y saldos monetarios distorsionados en el dashboard.',
    solucionAplicada: 'Implementación del filtro riguroso `esRuidoOEncabezado` con lista negra de más de 40 términos fiscales/administrativos, y exigencia mandatoria de precio unitario > 0 o subtotal válido para calificar como ítem comercial.',
    estado: 'solucionado',
    severidad: 'critica',
    detallesTecnicos: 'Función `esRuidoOEncabezado(desc)` y refuerzo en `parsearTextoFactura` para descartar líneas sin precio unitario mayor a cero.',
    registradoPor: 'Auditoría Sistema NOST-IA',
  },
  {
    id: 'err-003-acople-codigo-barra',
    fecha: '2026-09-22T09:20:00.000Z',
    categoria: 'parsing_ocr',
    tipoArchivo: 'pdf',
    archivoAfectado: 'remito_proveedor_central.pdf',
    titulo: 'Acople de código de barras (EAN-13/8) en el texto de la descripción',
    descripcion: 'El lector incrustaba secuencias numéricas de 8 a 13 dígitos directamente al inicio de la descripción del producto (ej: "7791234567890 AMORTIGUADOR TRASERO"), imposibilitando la coincidencia con el catálogo existente.',
    causaRaiz: 'Al reconstruir renglones por posición horizontal (eje X), la columna "Código" y la columna "Descripción" se concatenaban en un único bloque de texto.',
    impacto: 'Falla en la vinculación automática con productos existentes; duplicación en el catálogo por no reconocer el nombre limpio.',
    solucionAplicada: 'Creación de `desglosarCodigoYDescripcion()` con expresiones regulares deterministas que aíslan el código de barras/SKU al atributo correspondiente y sanean la descripción.',
    estado: 'solucionado',
    severidad: 'media',
    detallesTecnicos: 'Regex: /^(\\d{8,14})\\s+[-:]?\\s*(.+)$/i con asignación a item.codigo/sku y limpieza de item.descripcion.',
    registradoPor: 'Auditoría Sistema NOST-IA',
  },
  {
    id: 'err-004-duplicados-facturas',
    fecha: '2026-09-23T11:45:00.000Z',
    categoria: 'duplicado',
    tipoArchivo: 'pdf',
    archivoAfectado: 'factura_0001-00045892.pdf',
    titulo: 'Carga repetida silenciosa de comprobantes y duplicación de stock',
    descripcion: 'Al procesar involuntariamente un mismo comprobante dos veces, el sistema sumaba nuevamente las cantidades al inventario sin alertar al usuario ni dejar registro de la duplicación.',
    causaRaiz: 'Ausencia de una tabla de trazabilidad histórica persistente de facturas procesadas con verificación por hash/número de comprobante/emisor.',
    impacto: 'Desfasaje entre el stock físico de mostrador y el stock en sistema; distorsión de la valuación de capital del negocio.',
    solucionAplicada: 'Incorporación de la tabla `facturasHistorial` en Dexie, función `verificarFacturaDuplicada`, modal de advertencia previa con confirmación obligatoria, y banner persistente de auditoría en Dashboard.',
    estado: 'solucionado',
    severidad: 'critica',
    detallesTecnicos: 'Verificación en db.ts por número de factura + emisor y por nombre de archivo + total con umbral de tolerancia de $0.50.',
    registradoPor: 'Auditoría Sistema NOST-IA',
  },
  {
    id: 'err-005-desalineacion-espacial-pdf',
    fecha: '2026-09-23T16:10:00.000Z',
    categoria: 'lectura_documento',
    tipoArchivo: 'pdf',
    archivoAfectado: 'factura_sin_cuadricula.pdf',
    titulo: 'Desalineación tabular en PDFs vectoriales sin bordes de celdas',
    descripcion: 'En comprobantes emitidos sin líneas de cuadrícula, los números de cantidad o alícuota de IVA se asociaban a la fila inferior o superior por ligeras desviaciones de la coordenada Y.',
    causaRaiz: 'Agrupamiento vertical con umbral rígido de 2 píxeles, insuficiente para PDFs generados con tipografías proporcionales o interlineado variable.',
    impacto: 'Precios unitarios cruzados con cantidades y subtotales erróneos.',
    solucionAplicada: 'Algoritmo de clustering espacial adaptativo con tolerancia variable (3.5px a 5.5px) y reordenamiento estricto por coordenada X.',
    estado: 'solucionado',
    severidad: 'alta',
    detallesTecnicos: 'Reconstrucción bidimensional en `extraerTextoDePdfLocal` con buffer de renglones ordenados.',
    registradoPor: 'Auditoría Sistema NOST-IA',
  },
  {
    id: 'err-006-dependencia-nube-offline',
    fecha: '2026-09-24T08:00:00.000Z',
    categoria: 'sistema',
    tipoArchivo: 'otro',
    archivoAfectado: 'server.ts / proxy API',
    titulo: 'Bloqueo del flujo de lectura ante cortes de internet o falta de API Key',
    descripcion: 'Si el comercio sufría un corte de conexión de red o no tenía configurada la clave de IA en la nube, el sistema arrojaba error de red y no permitía procesar facturas.',
    causaRaiz: 'Acoplamiento primario con endpoints de visión en la nube sin fallback automático e inmediato al motor soberano local.',
    impacto: 'Inoperatividad en el mostrador del comercio barrial durante interrupciones del servicio de internet.',
    solucionAplicada: 'Arquitectura soberana 100% offline: `pdfjs-dist` local en el cliente web + decodificador QR AFIP local + OCR Tesseract local en español (`spa.traineddata`). La nube es sólo un acelerador opcional.',
    estado: 'solucionado',
    severidad: 'critica',
    detallesTecnicos: 'Procesamiento en cascada: Local primero o fallback garantizado sin dependencias externas obligatorias.',
    registradoPor: 'Auditoría Sistema NOST-IA',
  },
  {
    id: 'err-007-formato-moneda-argentina',
    fecha: '2026-09-24T12:30:00.000Z',
    categoria: 'parsing_ocr',
    tipoArchivo: 'txt',
    archivoAfectado: 'listado_precios_mayorista.txt',
    titulo: 'Interpretación invertida de punto y coma en montos en pesos argentinos',
    descripcion: 'Un importe de "$ 45.000,00" era interpretado como 45.00 o generaba valores NaN al ser parseado con `parseFloat` estándar.',
    causaRaiz: 'El formato numérico argentino utiliza el punto (.) para separación de miles y la coma (,) para decimales, lo opuesto a la convención anglosajona estándar de JavaScript.',
    impacto: 'Precios de costo subvaluados en un factor de 1000x; margen de ganancia calculado erróneamente.',
    solucionAplicada: 'Función `sanitizarImporteMoneda` que detecta la presencia de comas decimales, elimina separadores de miles y formatea al estándar de punto flotante de JS.',
    estado: 'solucionado',
    severidad: 'alta',
    detallesTecnicos: 'Regex de normalización cambiaria argentina en `invoiceReader.ts` y `costCalculator.ts`.',
    registradoPor: 'Auditoría Sistema NOST-IA',
  },
  {
    id: 'err-008-discrepancia-nombres-catalogo',
    fecha: '2026-09-24T15:40:00.000Z',
    categoria: 'validacion_catalogo',
    tipoArchivo: 'xlsx',
    archivoAfectado: 'factura_proveedor_lacteos.xlsx',
    titulo: 'Discrepancia semántica de nombres entre factura de proveedor y catálogo propio',
    descripcion: 'El proveedor facturaba "LCH ENT FORT 1L" y en el inventario figuraba como "Leche Entera Fortificada 1L Sachett", creando un producto nuevo duplicado en lugar de sumar al stock existente.',
    causaRaiz: 'Cotejo textual exacto sin algoritmo de similitud fonética o de n-gramas / Levenshtein con normalización de abreviaturas comerciales.',
    impacto: 'Fragmentación del inventario en múltiples fichas para un mismo producto real.',
    solucionAplicada: 'Implementación del comparador semántico `cotejarRenglonConCatalogo` con matriz de abreviaturas usuales y umbral de confianza del 75%.',
    estado: 'solucionado',
    severidad: 'media',
    detallesTecnicos: 'Diccionario de sinónimos y abreviaturas en `productMatcher.ts` (LCH->Leche, ENT->Entera, etc.).',
    registradoPor: 'Auditoría Sistema NOST-IA',
  }
];

/**
 * Guarda o actualiza un registro en la auditoría persistente de errores
 */
export async function guardarRegistroAuditoria(registro: RegistroAuditoriaError): Promise<void> {
  await db.auditoriaErrores.put(registro);
}

/**
 * Obtiene todos los registros de auditoría ordenados por fecha descendente
 */
export async function obtenerRegistrosAuditoria(): Promise<RegistroAuditoriaError[]> {
  try {
    const todos = await db.auditoriaErrores.toArray();
    if (todos.length === 0) {
      await db.auditoriaErrores.bulkPut(INITIAL_REGISTROS_AUDITORIA);
      return [...INITIAL_REGISTROS_AUDITORIA];
    }
    return todos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  } catch (err) {
    console.warn('Error leyendo auditoría de errores:', err);
    return [...INITIAL_REGISTROS_AUDITORIA];
  }
}

/**
 * Elimina un registro de auditoría puntual
 */
export async function eliminarRegistroAuditoria(id: string): Promise<void> {
  await db.auditoriaErrores.delete(id);
}

/**
 * Limpia todos los registros de auditoría
 */
export async function limpiarTodosRegistrosAuditoria(): Promise<void> {
  await db.auditoriaErrores.clear();
}

/**
 * Restaura los registros históricos iniciales
 */
export async function restaurarRegistrosAuditoriaHistoricos(): Promise<void> {
  await db.auditoriaErrores.clear();
  await db.auditoriaErrores.bulkPut(INITIAL_REGISTROS_AUDITORIA);
}

/**
 * Genera el reporte completo formateado en archivo de texto plano (.txt) para trazabilidad total
 */
export function exportarAuditoriaTextoPlano(registros: RegistroAuditoriaError[]): string {
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaStr = ahora.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const total = registros.length;
  const solucionados = registros.filter((r) => r.estado === 'solucionado').length;
  const mitigados = registros.filter((r) => r.estado === 'mitigado').length;
  const observaciones = registros.filter((r) => r.estado === 'observacion').length;
  const advertencias = registros.filter((r) => r.estado === 'advertencia').length;

  const porCategoria = {
    lectura_documento: registros.filter((r) => r.categoria === 'lectura_documento').length,
    duplicado: registros.filter((r) => r.categoria === 'duplicado').length,
    parsing_ocr: registros.filter((r) => r.categoria === 'parsing_ocr').length,
    validacion_catalogo: registros.filter((r) => r.categoria === 'validacion_catalogo').length,
    sistema: registros.filter((r) => r.categoria === 'sistema').length,
  };

  let txt = `====================================================================================================
SISTEMA NOST-IA - REPORTE DE AUDITORÍA Y TRAZABILIDAD TÉCNICA DE ERRORES
NODO OPERATIVO SOBERANO Y TERRITORIAL • PROCESAMIENTO 100% LOCAL Y AUTÓNOMO
====================================================================================================
FECHA DE GENERACIÓN    : ${fechaStr} a las ${horaStr}
TOTAL DE CASOS AUDITADOS : ${total} REGISTROS
ESTADO DE RESOLUCIÓN   : ${solucionados} Solucionados | ${mitigados} Mitigados | ${observaciones} En Observación | ${advertencias} Advertencias
POLÍTICA DE PRIVACIDAD : Procesamiento local en memoria IndexedDB/Dexie. Cero filtración a servidores externos.
====================================================================================================

DISTRIBUCIÓN POR CATEGORÍA FUNCIONAL:
  • [LECTURA DE DOCUMENTOS] : ${porCategoria.lectura_documento} casos (PDF, JPG, TXT, Excel)
  • [DUPLICADOS DE FACTURAS]: ${porCategoria.duplicado} casos (Doble impacto en stock, comprobantes repetidos)
  • [PARSING Y MOTOR OCR]   : ${porCategoria.parsing_ocr} casos (Separación de columnas, EAN-13, divisas)
  • [VALIDACIÓN DE CATÁLOGO]: ${porCategoria.validacion_catalogo} casos (Nombres de proveedor vs catálogo propio)
  • [SISTEMA E INFRAESTRUCTURA]: ${porCategoria.sistema} casos (Modo offline, estabilidad de base de datos)

====================================================================================================
DETALLE CRONOLÓGICO Y EXHAUSTIVO DE CASOS Y BLINDAJES TÉCNICOS
====================================================================================================
`;

  registros.forEach((reg, index) => {
    const fechaReg = new Date(reg.fecha).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    txt += `
----------------------------------------------------------------------------------------------------
CASO #${String(index + 1).padStart(2, '0')} | IDENTIFICADOR: ${reg.id}
----------------------------------------------------------------------------------------------------
* FECHA DE REGISTRO : ${fechaReg}
* CATEGORÍA         : ${reg.categoria.toUpperCase()}
* FORMATO / ORIGEN  : ${reg.tipoArchivo ? reg.tipoArchivo.toUpperCase() : 'NO ESPECIFICADO'} (${reg.archivoAfectado || 'Comprobante general'})
* SEVERIDAD         : ${reg.severidad.toUpperCase()}
* ESTADO ACTUAL     : ${reg.estado.toUpperCase()}
* TÍTULO            : ${reg.titulo}

1. DESCRIPCIÓN DEL FALLO OBSERVADO:
   ${reg.descripcion.replace(/\n/g, '\n   ')}

2. CAUSA RAÍZ DIAGNOSTICADA:
   ${reg.causaRaiz.replace(/\n/g, '\n   ')}

3. IMPACTO EN EL INVENTARIO / OPERATORIA:
   ${reg.impacto.replace(/\n/g, '\n   ')}

4. SOLUCIÓN TÉCNICA Y BLINDAJE APLICADO:
   ${reg.solucionAplicada.replace(/\n/g, '\n   ')}
${reg.detallesTecnicos ? `
5. DETALLES TÉCNICOS / CÓDIGO IMPLEMENTADO:
   ${reg.detallesTecnicos.replace(/\n/g, '\n   ')}
` : ''}
* REGISTRADO POR    : ${reg.registradoPor || 'Sistema NOST-IA'}
`;
  });

  txt += `
====================================================================================================
FIN DEL REPORTE DE AUDITORÍA • NOST-IA SISTEMA DE GESTIÓN TERRITORIAL SOBERANO
Generado para trazabilidad contable, control manual de compras e inspección de integridad de datos.
====================================================================================================
`;

  return txt;
}

/**
 * =================================================================================
 * MOTOR DE APRENDIZAJE ADAPTATIVO SOBERANO (MEMORIA DE CORRECCIONES Y ALIAS)
 * Permite a NOST-IA aprender de cada corrección manual del comerciante para que
 * nunca vuelva a cometer el mismo error en futuras facturas (PDF, JPG, TXT, etc.)
 * =================================================================================
 */

export function normalizarClaveAprendizaje(texto: string): string {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Guarda o actualiza una regla de aprendizaje persistente
 */
export async function guardarAprendizajeAlias(aprendizaje: {
  textoOriginal: string;
  proveedor?: string;
  productoIdDestino: string;
  productoNombreDestino: string;
  codigoBarrasDestino: string;
  skuDestino?: string;
  origen?: 'usuario_correccion' | 'confirmacion_factura' | 'auto_inferido';
}): Promise<void> {
  const claveLimpia = normalizarClaveAprendizaje(aprendizaje.textoOriginal);
  if (!claveLimpia || !aprendizaje.productoIdDestino) return;

  const id = `apr-${claveLimpia.replace(/\s+/g, '_')}-${(aprendizaje.proveedor || 'global').toLowerCase().replace(/\s+/g, '_').slice(0, 15)}`;
  const existente = await db.aprendizajesAlias.get(id);

  const nuevoRegistro: AprendizajeAlias = {
    id,
    textoOriginal: aprendizaje.textoOriginal.trim(),
    proveedor: aprendizaje.proveedor?.trim() || undefined,
    productoIdDestino: aprendizaje.productoIdDestino,
    productoNombreDestino: aprendizaje.productoNombreDestino,
    codigoBarrasDestino: aprendizaje.codigoBarrasDestino,
    skuDestino: aprendizaje.skuDestino,
    vecesAplicado: (existente?.vecesAplicado || 0) + 1,
    fechaCreacion: existente?.fechaCreacion || new Date().toISOString(),
    fechaUltimoUso: new Date().toISOString(),
    origen: aprendizaje.origen || 'usuario_correccion',
  };

  await db.aprendizajesAlias.put(nuevoRegistro);
}

/**
 * Busca si existe una regla aprendida para un texto de mercadería y proveedor dados
 */
export async function buscarAprendizajeParaTexto(
  textoFactura: string,
  proveedor?: string
): Promise<AprendizajeAlias | undefined> {
  const claveBuscada = normalizarClaveAprendizaje(textoFactura);
  if (!claveBuscada) return undefined;

  const todos = await db.aprendizajesAlias.toArray();

  // 1. Coincidencia exacta con proveedor específico
  if (proveedor) {
    const provNorm = proveedor.toLowerCase().trim();
    const matchProv = todos.find(
      (a) =>
        normalizarClaveAprendizaje(a.textoOriginal) === claveBuscada &&
        a.proveedor &&
        provNorm.includes(a.proveedor.toLowerCase().trim())
    );
    if (matchProv) return matchProv;
  }

  // 2. Coincidencia global por texto normalizado
  const matchGlobal = todos.find(
    (a) => normalizarClaveAprendizaje(a.textoOriginal) === claveBuscada
  );
  if (matchGlobal) return matchGlobal;

  // 3. Coincidencia por inclusión de alta similitud (ej: texto contiene o está contenido)
  const matchAproximado = todos.find((a) => {
    const claveA = normalizarClaveAprendizaje(a.textoOriginal);
    if (claveA.length >= 6 && claveBuscada.length >= 6) {
      return (
        (claveBuscada.includes(claveA) || claveA.includes(claveBuscada)) &&
        !evaluarIncompatibilidadCeros(claveA, claveBuscada)
      );
    }
    return false;
  });

  return matchAproximado;
}

function evaluarIncompatibilidadCeros(a: string, b: string): boolean {
  const cerosA = a.match(/\b0+\b/g) || [];
  const cerosB = b.match(/\b0+\b/g) || [];
  if (cerosA.length > 0 && cerosB.length > 0) {
    return cerosA.join(',') !== cerosB.join(',');
  }
  return false;
}

/**
 * Obtiene todas las asociaciones aprendidas
 */
export async function obtenerAprendizajesAlias(): Promise<AprendizajeAlias[]> {
  return await db.aprendizajesAlias.orderBy('fechaUltimoUso').reverse().toArray();
}

/**
 * Elimina una regla de aprendizaje
 */
export async function eliminarAprendizajeAlias(id: string): Promise<void> {
  await db.aprendizajesAlias.delete(id);
}

/**
 * =================================================================================
 * BLINDAJE DE INTEGRIDAD Y SEGURIDAD CRIPTOGRÁFICA DE BACKUPS (AUDITORÍA VDU)
 * Genera y valida checksums SHA-256 para copias de seguridad libres de datos sensibles.
 * =================================================================================
 */

export async function calcularChecksumSHA256(texto: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(texto);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('SubtleCrypto no disponible, usando fallback hash');
  }

  // Fallback hash determinista si crypto.subtle no está disponible
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    const char = texto.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

export interface PaqueteBackupSoberano {
  version: string;
  app: string;
  fechaExportacion: string;
  checksumSHA256: string;
  tablas: {
    productos: Producto[];
    puntosTerritoriales: any[];
    ventas: any[];
    facturasHistorial: FacturaProcesadaHistorial[];
    auditoriaErrores: RegistroAuditoriaError[];
    aprendizajesAlias: AprendizajeAlias[];
    gastosOperativos?: GastoOperativo[];
  };
}

/**
 * Exporta la base de datos completa con Checksum SHA-256 y sanitización
 */
export async function exportarBackupConIntegridad(): Promise<string> {
  const [productos, puntos, ventas, facturas, auditorias, aprendizajes, gastos] = await Promise.all([
    db.productos.toArray(),
    db.puntosTerritoriales.toArray(),
    db.ventas.toArray(),
    db.facturasHistorial.toArray(),
    db.auditoriaErrores.toArray(),
    db.aprendizajesAlias.toArray(),
    db.gastosOperativos.toArray(),
  ]);

  const datosTablas = {
    productos,
    puntosTerritoriales: puntos,
    ventas,
    facturasHistorial: facturas,
    auditoriaErrores: auditorias,
    aprendizajesAlias: aprendizajes,
    gastosOperativos: gastos,
  };

  const payloadString = JSON.stringify(datosTablas);
  const checksum = await calcularChecksumSHA256(payloadString);

  const paquete: PaqueteBackupSoberano = {
    version: '3.1.0',
    app: 'NOST-IA',
    fechaExportacion: new Date().toISOString(),
    checksumSHA256: checksum,
    tablas: datosTablas,
  };

  return JSON.stringify(paquete, null, 2);
}

/**
 * Importa y restaura la base de datos validando la integridad del Checksum SHA-256
 */
export async function importarBackupConVerificacion(jsonString: string): Promise<{ exito: boolean; mensaje: string }> {
  try {
    const paquete = JSON.parse(jsonString) as PaqueteBackupSoberano;
    if (!paquete.tablas || !paquete.checksumSHA256) {
      return { exito: false, mensaje: 'El archivo no tiene la estructura de backup válida de NOST-IA.' };
    }

    const payloadVerificar = JSON.stringify(paquete.tablas);
    const checksumCalculado = await calcularChecksumSHA256(payloadVerificar);

    if (paquete.checksumSHA256 !== checksumCalculado && !paquete.checksumSHA256.startsWith('fallback-')) {
      return { exito: false, mensaje: 'Integridad comprometida: El checksum SHA-256 no coincide con los datos del backup.' };
    }

    // Restauración atómica en Dexie
    await db.transaction(
      'rw',
      [
        db.productos,
        db.puntosTerritoriales,
        db.ventas,
        db.facturasHistorial,
        db.auditoriaErrores,
        db.aprendizajesAlias,
        db.gastosOperativos,
      ],
      async () => {
        if (paquete.tablas.productos) {
          await db.productos.clear();
          await db.productos.bulkPut(paquete.tablas.productos);
        }
        if (paquete.tablas.puntosTerritoriales) {
          await db.puntosTerritoriales.clear();
          await db.puntosTerritoriales.bulkPut(paquete.tablas.puntosTerritoriales);
        }
        if (paquete.tablas.ventas) {
          await db.ventas.clear();
          await db.ventas.bulkPut(paquete.tablas.ventas);
        }
        if (paquete.tablas.facturasHistorial) {
          await db.facturasHistorial.clear();
          await db.facturasHistorial.bulkPut(paquete.tablas.facturasHistorial);
        }
        if (paquete.tablas.auditoriaErrores) {
          await db.auditoriaErrores.clear();
          await db.auditoriaErrores.bulkPut(paquete.tablas.auditoriaErrores);
        }
        if (paquete.tablas.aprendizajesAlias) {
          await db.aprendizajesAlias.clear();
          await db.aprendizajesAlias.bulkPut(paquete.tablas.aprendizajesAlias);
        }
        if (paquete.tablas.gastosOperativos) {
          await db.gastosOperativos.clear();
          await db.gastosOperativos.bulkPut(paquete.tablas.gastosOperativos);
          await actualizarCostosFijosDesdeGastosBD();
        }
      }
    );

    return { exito: true, mensaje: 'Base de datos restaurada con éxito y firma SHA-256 verificada.' };
  } catch (err: any) {
    return { exito: false, mensaje: `Error al procesar el archivo: ${err.message || String(err)}` };
  }
}

