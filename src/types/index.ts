export type RubroTerritorial =
  | 'Almacén'
  | 'Granja'
  | 'Taller'
  | 'Cooperativa'
  | 'Cultivo'
  | 'Acopio'
  | 'Comedor'
  | 'Panadería';

export type EstadoAlertaStock = 'optimo' | 'medio' | 'critico' | 'sobrestock';

export interface Producto {
  id: string;
  codigoBarras: string;
  sku?: string;
  nombre: string;
  categoria: string;
  rubro: string;
  precioCosto: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  stockTienda: number;
  stockDeposito: number;
  rotacion: 'alta' | 'media' | 'baja';
  proveedor: string;
  ventasUltimos30Dias: number;
  diasAgotamiento: number;
  estadoAlerta: EstadoAlertaStock;
  unidadMedida: 'unidades' | 'kg' | 'litros' | 'paquete';
  ivaPorcentaje: number;
  costoFijoProrrateado?: number;
  margenSugerido?: number;
  alertaFacturaDuplicada?: string;
  fechaActualizacion: string;
}

export interface PuntoTerritorial {
  id: string;
  nombre: string;
  rubro: RubroTerritorial;
  subtitulo?: string;
  lat: number;
  lng: number;
  direccion: string;
  barrio: string;
  telefono: string;
  volumenMensual: number; // en miles de pesos o unidades
  estadoComercial: 'activo' | 'potencial' | 'en_pausa';
  contacto: string;
  capacidadAcopioKg?: number;
  notas: string;
}

export interface ItemVenta {
  productoId: string;
  codigoBarras: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface VentaPOS {
  id: string;
  fecha: string;
  items: ItemVenta[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: 'efectivo' | 'transferencia' | 'mercadopago' | 'fiado_libreta';
  nombreClienteFiado?: string;
  montoAbonado?: number;
  vuelto?: number;
}

export type CategoriaGastoFijo =
  | 'luz'
  | 'agua'
  | 'gas'
  | 'internet'
  | 'alquiler'
  | 'salarios'
  | 'mantenimiento'
  | 'impuestos_tasas'
  | 'otros';

export interface GastoOperativo {
  id: string;
  fecha: string; // ISO
  periodoMes: string; // YYYY-MM
  categoriaGasto: CategoriaGastoFijo;
  proveedor: string; // ej: 'Edenor S.A.', 'Metrogas', 'AySA', 'Sueldos'
  comprobante: string;
  cuitEmisor?: string;
  montoTotal: number;
  netoGravado?: number;
  ivaMonto?: number;
  percepciones?: number;
  observaciones?: string;
  archivoOrigenNombre?: string;
  fechaVencimiento?: string;
  impactaEnProrrateo: boolean;
}

export type NaturalezaComprobante =
  | 'mercaderia_reventa'
  | 'gasto_servicio'
  | 'venta_cliente'
  | 'desconocido';

export interface AlertaErrorIngesta {
  tipoError:
    | 'gasto_en_compra'
    | 'gasto_en_venta'
    | 'compra_en_gasto'
    | 'venta_en_gasto'
    | 'venta_en_compra'
    | 'nota_credito_en_compra'
    | 'duplicado'
    | 'fecha_anomala'
    | 'importe_sospechoso'
    | 'cuit_propio'
    | 'sin_items_comerciales';
  nivelSeveridad: 'critico' | 'advertencia' | 'informativo';
  titulo: string;
  mensaje: string;
  seccionActual: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo';
  seccionSugerida?: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo';
  categoriaGastoSugerida?: CategoriaGastoFijo;
  accionRecomendadaTexto?: string;
  puedeForzar: boolean;
}

export interface CostosFijosMensuales {
  luz: number;
  agua: number;
  gas: number;
  internet: number;
  alquiler: number;
  salarios: number;
  mantenimiento: number;
  impuestos_tasas?: number;
  otros: number;
}

export interface EstrategiaCostos {
  costosFijos: CostosFijosMensuales;
  unidadesMensualesEstimadas: number;
  margenGananciaObjetivo: number; // porcentaje (ej 35%)
  ivaPorcentajePorDefecto: number; // 21, 10.5, 0
}

export interface FacturaItemExtraido {
  codigo?: string;
  sku?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  alicuotaIva?: number;
  coincidenciaProductoId?: string;
  esNuevoProducto?: boolean;
  esAprendido?: boolean;
  origenAprendizaje?: string;
}

export interface AprendizajeAlias {
  id: string;
  textoOriginal: string;
  proveedor?: string;
  productoIdDestino: string;
  productoNombreDestino: string;
  codigoBarrasDestino: string;
  skuDestino?: string;
  vecesAplicado: number;
  fechaCreacion: string;
  fechaUltimoUso: string;
  origen: 'usuario_correccion' | 'confirmacion_factura' | 'auto_inferido';
}

export interface FacturaProcesadaHistorial {
  id: string;
  fechaCarga: string; // ISO
  numeroComprobante: string;
  proveedorOEmisor: string;
  clienteOReceptor?: string;
  tipo: 'factura_compra' | 'factura_venta' | 'remito';
  tipoOperacion: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo';
  categoriaGasto?: CategoriaGastoFijo;
  total: number;
  cantidadItems: number;
  esDuplicada: boolean;
  motivoDuplicado?: string;
  archivoOrigenNombre?: string;
  items: FacturaItemExtraido[];
}

export interface FacturaCommitPayload {
  items: FacturaItemExtraido[];
  tipoComprobante: string;
  origen: string;
  tipoOperacion: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo';
  categoriaGasto?: CategoriaGastoFijo;
  esDuplicada?: boolean;
  motivoDuplicado?: string;
  archivoOrigenNombre?: string;
}

export interface FacturaParseada {
  id: string;
  tipo: 'factura_compra' | 'factura_venta' | 'remito';
  tipoOperacion?: 'compra_ingreso' | 'venta_egreso' | 'gasto_operativo';
  categoriaGastoSugerida?: CategoriaGastoFijo;
  esGastoFijoDetectado?: boolean;
  alertaSeccion?: AlertaErrorIngesta;
  numeroComprobante: string;
  proveedorOEmisor: string;
  clienteOReceptor?: string;
  fecha: string;
  periodoMes?: string;
  fechaVencimiento?: string;
  esPdfFotografico?: boolean;
  items: FacturaItemExtraido[];
  totalCalculado: number;
  metodoLectura: 'texto' | 'pdf' | 'vision_ocr';
  cuitProveedor?: string;
  tipoDocumentoDetectado?: string;
  esComprobanteValido?: boolean;
  mensajeValidacion?: string;
  observaciones?: string;
  archivoOrigenNombre?: string;
  archivoOrigenUrl?: string;
  esDuplicadaDetectada?: boolean;
  motivoDuplicado?: string;
  facturaPreviaCoincidente?: {
    id: string;
    fechaCarga: string;
    numeroComprobante: string;
    total: number;
  };
}

export type RolCopiloto =
  | 'auditor_ventas'
  | 'centinela_stock'
  | 'estratega_comercial'
  | 'asistente_general';

export type PeriodoFiltroAnalitica =
  | 'diario'
  | 'semanal'
  | 'quincenal'
  | 'mensual'
  | 'semestral'
  | 'anual';

export interface LicenciaSoberana {
  activa: boolean;
  codigo: string;
  titular?: string;
  comercio?: string;
  fechaActivacion?: string;
  tipoLicencia?: 'soberano_completo' | 'territorial_ilimitado';
  emisor?: string;
  hashVerificacion?: string;
}

export interface MensajeCopiloto {
  id: string;
  emisor: 'usuario' | 'copiloto' | 'sistema';
  texto: string;
  timestamp: string;
  sugerencias?: string[];
  datos?: Record<string, unknown>;
}

export interface FiltroTerritorial {
  rubro: string; // 'Todos' o rubro especifico
  radioKm: number;
  centroSeleccionadoId?: string;
  busquedaTexto: string;
}

export type TipoEscalaEmpresa =
  | 'microemprendimiento'
  | 'pequena_pyme'
  | 'mediana_empresa'
  | 'cooperativa_comunitaria';

export type RubroComercio =
  | 'Panadería'
  | 'Cooperativa'
  | 'Kiosco'
  | 'Comedor'
  | 'Guardería'
  | 'Ferretería'
  | 'Cerrajería'
  | 'Peluquería'
  | 'Supermercado Chino'
  | 'Rotisería'
  | 'Confitería'
  | 'Local de Ropas'
  | 'Zapatillería'
  | 'Gomería'
  | 'Almacén de Barrio'
  | 'Verdulería'
  | 'Farmacia'
  | 'Taller Mecánico'
  | 'Otro';

export interface PerfilComercio {
  nombreComerciante: string;
  nombreComercio: string;
  rubro: RubroComercio;
  escala: TipoEscalaEmpresa;
  cuit?: string;
  telefono?: string;
  direccion?: string;
  logoBase64?: string;
  configurado: boolean;
  fechaConfiguracion?: string;
  lemaOFrase?: string;
  // Blindaje de Seguridad Criptográfico (Hash SHA-256 + Salt único)
  claveSeguridadHash?: string;
  claveSeguridadSalt?: string;
  fechaClaveActualizacion?: string;
}

export interface CintilloSoberanoConfig {
  tituloBadge: string;
  leyendaPrincipal: string;
  aliasAportes: string;
  cvuAportes: string;
  emailContacto: string;
  celularWhatsapp: string;
  titularAportes: string;
  bajadaManifiesto: string;
  velocidadSegundos: number;
  itemsMarquee: string[];
}

export type CategoriaAuditoriaError =
  | 'lectura_documento'
  | 'duplicado'
  | 'parsing_ocr'
  | 'validacion_catalogo'
  | 'sistema';

export type EstadoAuditoriaError =
  | 'solucionado'
  | 'mitigado'
  | 'advertencia'
  | 'observacion';

export type SeveridadAuditoria = 'critica' | 'alta' | 'media' | 'baja';

export interface RegistroAuditoriaError {
  id: string;
  fecha: string; // ISO
  categoria: CategoriaAuditoriaError;
  tipoArchivo?: 'pdf' | 'jpg' | 'txt' | 'xlsx' | 'pos' | 'db' | 'otro';
  archivoAfectado?: string;
  titulo: string;
  descripcion: string;
  causaRaiz: string;
  impacto: string;
  solucionAplicada: string;
  estado: EstadoAuditoriaError;
  severidad: SeveridadAuditoria;
  detallesTecnicos?: string;
  registradoPor?: string;
}


