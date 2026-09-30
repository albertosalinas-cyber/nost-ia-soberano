import React, { useState, useRef, useMemo } from 'react';
import {
  Store,
  User,
  Layers,
  Sparkles,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Download,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  Check,
  Building2,
  Tag,
  Boxes,
  Zap,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import { MateSoberanoLogo } from '../ui/MateSoberanoLogo';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { audioFeedback } from '../../engine/audioFeedback';
import { db } from '../../engine/db';
import { evaluarSeguridadClave, hashClaveSegura } from '../../engine/securityEngine';
import type { PerfilComercio, RubroComercio, TipoEscalaEmpresa, Producto } from '../../types';

interface OnboardingWizardProps {
  onFinalizarConfiguracion: (perfil: PerfilComercio, productosIniciales: Producto[]) => void;
  perfilActual?: PerfilComercio | null;
  onCancelar?: () => void;
}

// Lista exhaustiva de rubros territoriales solicitados
const RUBROS_DISPONIBLES: {
  nombre: RubroComercio;
  icono: string;
  descripcion: string;
  unidadDefault: 'unidades' | 'kg' | 'litros' | 'paquete';
  margenDefault: number;
}[] = [
  { nombre: 'Panadería', icono: '🥖', descripcion: 'Panificados, masas, facturas, harinas y confitería.', unidadDefault: 'kg', margenDefault: 45 },
  { nombre: 'Cooperativa', icono: '🤝', descripcion: 'Autogestión obrera, distribución popular y precios justos.', unidadDefault: 'paquete', margenDefault: 25 },
  { nombre: 'Kiosco', icono: '🍬', descripcion: 'Golosinas, bebidas frías, cigarrillos y alta rotación.', unidadDefault: 'unidades', margenDefault: 40 },
  { nombre: 'Comedor', icono: '🍲', descripcion: 'Raciones comunitarias, insumos por bulto y acopio.', unidadDefault: 'kg', margenDefault: 15 },
  { nombre: 'Guardería', icono: '🧸', descripcion: 'Insumos de cuidado infantil, higiene y meriendas.', unidadDefault: 'unidades', margenDefault: 20 },
  { nombre: 'Ferretería', icono: '🔧', descripcion: 'Herramientas, tornillería, plomería y electricidad.', unidadDefault: 'unidades', margenDefault: 50 },
  { nombre: 'Cerrajería', icono: '🔑', descripcion: 'Copias de llaves, candados, cerrojos y servicios.', unidadDefault: 'unidades', margenDefault: 60 },
  { nombre: 'Peluquería', icono: '✂️', descripcion: 'Cortes, tinturas, estética capilar y productos.', unidadDefault: 'unidades', margenDefault: 65 },
  { nombre: 'Supermercado Chino', icono: '🛒', descripcion: 'Almacén general, fiambrería, lácteos y bebidas.', unidadDefault: 'unidades', margenDefault: 32 },
  { nombre: 'Rotisería', icono: '🍗', descripcion: 'Comidas preparadas, viandas, minutas y bebidas.', unidadDefault: 'unidades', margenDefault: 55 },
  { nombre: 'Confitería', icono: '🥐', descripcion: 'Cafetería, postres, sándwiches y eventos.', unidadDefault: 'unidades', margenDefault: 50 },
  { nombre: 'Local de Ropas', icono: '👕', descripcion: 'Prendas, temporadas, calzado liviano y accesorios.', unidadDefault: 'unidades', margenDefault: 60 },
  { nombre: 'Zapatillería', icono: '👟', descripcion: 'Zapatillas deportivas, calzado urbano y de trabajo.', unidadDefault: 'unidades', margenDefault: 50 },
  { nombre: 'Gomería', icono: '🛞', descripcion: 'Cubiertas, parches, cámaras y servicios de ruedas.', unidadDefault: 'unidades', margenDefault: 55 },
  { nombre: 'Almacén de Barrio', icono: '🏪', descripcion: 'Abarrotes, fideos, aceites, lácteos y fiado barrial.', unidadDefault: 'unidades', margenDefault: 35 },
  { nombre: 'Verdulería', icono: '🍎', descripcion: 'Frutas, verduras, pesables por kg y mermas.', unidadDefault: 'kg', margenDefault: 40 },
  { nombre: 'Farmacia', icono: '💊', descripcion: 'Perfumería, medicamentos de venta libre e higiene.', unidadDefault: 'unidades', margenDefault: 38 },
  { nombre: 'Taller Mecánico', icono: '🚗', descripcion: 'Repuestos de autos, lubricantes, filtros y servicios.', unidadDefault: 'unidades', margenDefault: 50 },
  { nombre: 'Otro', icono: '📦', descripcion: 'Comercio o servicio personalizado.', unidadDefault: 'unidades', margenDefault: 40 },
];

const ESCALAS_DISPONIBLES: { tipo: TipoEscalaEmpresa; etiqueta: string; detalle: string }[] = [
  { tipo: 'microemprendimiento', etiqueta: 'Microemprendimiento', detalle: '1 a 3 trabajadores, negocio familiar o unipersonal' },
  { tipo: 'pequena_pyme', etiqueta: 'Pequeña PyME', detalle: '4 a 15 empleados, local a la calle o taller con depósito' },
  { tipo: 'mediana_empresa', etiqueta: 'Mediana Empresa', detalle: '16+ trabajadores, distribución mayorista o varias sucursales' },
  { tipo: 'cooperativa_comunitaria', etiqueta: 'Cooperativa / Espacio Popular', detalle: 'Gestión colectiva, asociación barrial o comedor' },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onFinalizarConfiguracion,
  perfilActual,
  onCancelar,
}) => {
  const [pasoActual, setPasoActual] = useState<number>(1);

  // Formulario Paso 1: Datos del Comerciante y Comercio
  const [nombreComerciante, setNombreComerciante] = useState<string>(perfilActual?.nombreComerciante || '');
  const [nombreComercio, setNombreComercio] = useState<string>(perfilActual?.nombreComercio || '');
  const [escala, setEscala] = useState<TipoEscalaEmpresa>(perfilActual?.escala || 'pequena_pyme');
  const [telefono, setTelefono] = useState<string>(perfilActual?.telefono || '');
  const [direccion, setDireccion] = useState<string>(perfilActual?.direccion || '');

  // Clave Maestra de Seguridad y Reinicio Protegido (Ciberseguridad)
  const [claveSeguridad, setClaveSeguridad] = useState<string>('');
  const [confirmarClave, setConfirmarClave] = useState<string>('');
  const [mostrarClave, setMostrarClave] = useState<boolean>(false);
  const [quiereModificarClave, setQuiereModificarClave] = useState<boolean>(
    !perfilActual?.claveSeguridadHash
  );

  // Formulario Paso 2: Rubro
  const [rubroSeleccionado, setRubroSeleccionado] = useState<RubroComercio>(
    perfilActual?.rubro || 'Almacén de Barrio'
  );

  // Formulario Paso 3: Símbolo / Logo
  const [logoBase64, setLogoBase64] = useState<string | undefined>(perfilActual?.logoBase64);
  const [lemaOFrase, setLemaOFrase] = useState<string>(
    perfilActual?.lemaOFrase || 'Compromiso territorial y precios justos para el barrio'
  );
  const fileLogoRef = useRef<HTMLInputElement | null>(null);

  // Formulario Paso 4: Base de Datos Inicial (CSV / Excel)
  const [archivoCsvNombre, setArchivoCsvNombre] = useState<string | null>(null);
  const [productosImportados, setProductosImportados] = useState<Producto[]>([]);
  const [errorCsv, setErrorCsv] = useState<string | null>(null);
  const [modoCatalogo, setModoCatalogo] = useState<'csv' | 'catalogo_base'>('catalogo_base');
  const fileCsvRef = useRef<HTMLInputElement | null>(null);

  // Cargar catálogo inicial por defecto del rubro seleccionado si el usuario no tiene CSV
  const generarCatalogoBaseParaRubro = (rubro: RubroComercio): Producto[] => {
    const configRubro = RUBROS_DISPONIBLES.find((r) => r.nombre === rubro) || RUBROS_DISPONIBLES[0];
    const timestamp = Date.now();

    const itemsPorRubro: Record<RubroComercio, { nombre: string; costo: number; unidad: 'unidades' | 'kg' | 'litros' | 'paquete'; cat: string }[]> = {
      Panadería: [
        { nombre: 'Pan Criollo Francés Tradicional', costo: 1200, unidad: 'kg', cat: 'Panificados' },
        { nombre: 'Medialunas de Manteca Artesanales (Docena)', costo: 3600, unidad: 'unidades', cat: 'Facturas' },
        { nombre: 'Facturas Surtidas de Crema y Dulce de Leche', costo: 3200, unidad: 'unidades', cat: 'Facturas' },
        { nombre: 'Pan de Miga Blanco Especial x Plancha', costo: 1800, unidad: 'unidades', cat: 'Especialidades' },
        { nombre: 'Chipá Casero con Queso Criollo x 250g', costo: 2100, unidad: 'paquete', cat: 'Especialidades' },
        { nombre: 'Galletas Marineras con Salvado 500g', costo: 1400, unidad: 'paquete', cat: 'Secos' },
      ],
      Cooperativa: [
        { nombre: 'Yerba Mate Orgánica Cooperativa 1kg', costo: 2100, unidad: 'paquete', cat: 'Producción Cooperativa' },
        { nombre: 'Dulce de Leche Artesanal Familiar 400g', costo: 1650, unidad: 'unidades', cat: 'Lácteos Cooperativos' },
        { nombre: 'Miel Pura de Monte Silvestre 500g', costo: 1900, unidad: 'unidades', cat: 'Alimentos Populares' },
        { nombre: 'Aceite de Oliva Primera Prensada 500ml', costo: 3400, unidad: 'litros', cat: 'Producción Cooperativa' },
        { nombre: 'Harina Integral de Molino Social 1kg', costo: 750, unidad: 'kg', cat: 'Granos y Harinas' },
      ],
      Kiosco: [
        { nombre: 'Alfajor Triple Cobertura Chocolate 70g', costo: 850, unidad: 'unidades', cat: 'Golosinas' },
        { nombre: 'Gaseosa Cola Primera Línea 500ml', costo: 950, unidad: 'unidades', cat: 'Bebidas Frías' },
        { nombre: 'Agua Mineral Sin Gas 500ml', costo: 600, unidad: 'unidades', cat: 'Bebidas Frías' },
        { nombre: 'Chicles de Menta Sin Azúcar x 14u', costo: 550, unidad: 'unidades', cat: 'Golosinas' },
        { nombre: 'Papas Fritas Clásicas Saladas 95g', costo: 1100, unidad: 'paquete', cat: 'Snacks' },
      ],
      Ferretería: [
        { nombre: 'Cinta Aisladora Negra Ignífuga 20 metros', costo: 1100, unidad: 'unidades', cat: 'Electricidad' },
        { nombre: 'Destornillador Imantado Phillips 6x100mm', costo: 2800, unidad: 'unidades', cat: 'Herramientas de Mano' },
        { nombre: 'Tarugos de Nylon n°8 con Tope (Caja x 100u)', costo: 1950, unidad: 'paquete', cat: 'Fijaciones' },
        { nombre: 'Disco de Corte Extra Fino para Amoladora 115mm', costo: 1350, unidad: 'unidades', cat: 'Abrasivos' },
        { nombre: 'Llave Francesa Ajustable Cromada 8 pulgadas', costo: 6200, unidad: 'unidades', cat: 'Herramientas' },
      ],
      'Supermercado Chino': [
        { nombre: 'Arroz Largo Fino Selección 1kg', costo: 1450, unidad: 'paquete', cat: 'Almacén Seco' },
        { nombre: 'Fideos Tallarines al Huevo 500g', costo: 850, unidad: 'paquete', cat: 'Pastas Secas' },
        { nombre: 'Aceite de Girasol Primera Prensada 900ml', costo: 1550, unidad: 'litros', cat: 'Aceites' },
        { nombre: 'Puré de Tomates Tetra Brik 520g', costo: 680, unidad: 'unidades', cat: 'Conservas' },
        { nombre: 'Lavandina Desinfectante Concentrada 1 Litro', costo: 920, unidad: 'litros', cat: 'Limpieza' },
      ],
      Peluquería: [
        { nombre: 'Servicio: Corte Clásico Caballero / Barbería', costo: 2000, unidad: 'unidades', cat: 'Servicios de Corte' },
        { nombre: 'Servicio: Corte Femenino & Brushing', costo: 3500, unidad: 'unidades', cat: 'Servicios de Corte' },
        { nombre: 'Champú Neutro de Lavado Profesional 1L', costo: 4200, unidad: 'litros', cat: 'Cuidado Capilar' },
        { nombre: 'Cera Modeladora Efecto Mate 100g', costo: 2900, unidad: 'unidades', cat: 'Peinado y Reventa' },
      ],
      Rotisería: [
        { nombre: 'Pollo al Spiedo con Guarnición de Papas', costo: 6500, unidad: 'unidades', cat: 'Platos Principales' },
        { nombre: 'Empanadas de Carne Cortada a Cuchillo (Docena)', costo: 7200, unidad: 'unidades', cat: 'Empanadas' },
        { nombre: 'Milanesa Napolitana con Papas Fritas (Porción)', costo: 5200, unidad: 'unidades', cat: 'Minutas' },
        { nombre: 'Pizza Muzzarella al Molde Artesanal', costo: 4800, unidad: 'unidades', cat: 'Pizzas' },
      ],
      'Local de Ropas': [
        { nombre: 'Remera Algodón Peinado Lisa (Talle S al XL)', costo: 4500, unidad: 'unidades', cat: 'Remeras y Tops' },
        { nombre: 'Pantalón Jean Clásico Recto Elastizado', costo: 14000, unidad: 'unidades', cat: 'Pantalones' },
        { nombre: 'Buzo Canguro Frisa Invisible con Capucha', costo: 16500, unidad: 'unidades', cat: 'Abrigos' },
        { nombre: 'Pack 3 Pares de Medias Algodón Soquete', costo: 2800, unidad: 'paquete', cat: 'Accesorios' },
      ],
      Gomería: [
        { nombre: 'Servicio: Parche vulcanizado en frío para auto', costo: 1800, unidad: 'unidades', cat: 'Servicios de Gomería' },
        { nombre: 'Válvula de Seguridad Tubeless Auto TR414', costo: 950, unidad: 'unidades', cat: 'Repuestos Neumáticos' },
        { nombre: 'Servicio: Alineación Láser Delantera', costo: 8500, unidad: 'unidades', cat: 'Servicios Mecánicos' },
        { nombre: 'Cubierta Rodado 14 175/65/14 Urbana', costo: 68000, unidad: 'unidades', cat: 'Neumáticos' },
      ],
      Comedor: [
        { nombre: 'Leche Entera Fortificada en Polvo 1kg', costo: 3200, unidad: 'kg', cat: 'Desayuno y Merienda' },
        { nombre: 'Lentejas Secas Seleccionadas Bolsa 5kg', costo: 8500, unidad: 'kg', cat: 'Legumbres' },
        { nombre: 'Polenta Instantánea Fortificada Bolsa 5kg', costo: 4200, unidad: 'kg', cat: 'Harinas y Granos' },
        { nombre: 'Arvejas Secas Partidas Bolsa 5kg', costo: 5100, unidad: 'kg', cat: 'Legumbres' },
      ],
      Guardería: [
        { nombre: 'Pañales Descartables Talle G (Paquete x 36)', costo: 6800, unidad: 'paquete', cat: 'Higiene Infantil' },
        { nombre: 'Toallitas Húmedas Hipoalergénicas x 50u', costo: 1750, unidad: 'paquete', cat: 'Higiene' },
        { nombre: 'Galletitas de Vainilla Fortificadas 400g', costo: 1100, unidad: 'paquete', cat: 'Merienda' },
      ],
      Cerrajería: [
        { nombre: 'Copia de Llave Tipo Yardeni / Diente de Sierra', costo: 850, unidad: 'unidades', cat: 'Copias de Llaves' },
        { nombre: 'Copia de Llave Cruz de Seguridad 4 Puntas', costo: 2200, unidad: 'unidades', cat: 'Copias de Llaves' },
        { nombre: 'Candado de Bronce Macizo Reforzado 50mm', costo: 5600, unidad: 'unidades', cat: 'Cerrajería y Candados' },
      ],
      Confitería: [
        { nombre: 'Café Espresso Doble de Especialidad', costo: 1200, unidad: 'unidades', cat: 'Cafetería' },
        { nombre: 'Porción Torta Selva Negra Artesanal', costo: 2800, unidad: 'unidades', cat: 'Pastelería Fina' },
        { nombre: 'Sándwich de Miga Jamón y Queso x 6u', costo: 3400, unidad: 'unidades', cat: 'Salados' },
      ],
      Zapatillería: [
        { nombre: 'Zapatilla Urbana Lona Clásica Unisex (36-44)', costo: 18500, unidad: 'unidades', cat: 'Calzado Urbano' },
        { nombre: 'Zapatilla Deportiva Running Mesh Respirable', costo: 32000, unidad: 'unidades', cat: 'Calzado Deportivo' },
        { nombre: 'Plantillas Acolchadas de Confort Recortables', costo: 3200, unidad: 'unidades', cat: 'Accesorios Calzado' },
      ],
      'Almacén de Barrio': [
        { nombre: 'Yerba Mate Suave 1kg Paquete', costo: 2400, unidad: 'paquete', cat: 'Almacén' },
        { nombre: 'Harina de Trigo 000 Común 1kg', costo: 680, unidad: 'kg', cat: 'Harinas' },
        { nombre: 'Aceite de Girasol 900ml', costo: 1450, unidad: 'litros', cat: 'Aceites' },
        { nombre: 'Fideos Guiseros Tirabuzón 500g', costo: 820, unidad: 'paquete', cat: 'Pastas' },
        { nombre: 'Azúcar Blanco Común Tipo A 1kg', costo: 950, unidad: 'kg', cat: 'Almacén' },
      ],
      Verdulería: [
        { nombre: 'Papa Negra de Campo Especial', costo: 550, unidad: 'kg', cat: 'Tubérculos' },
        { nombre: 'Cebolla Criolla Seleccionada', costo: 700, unidad: 'kg', cat: 'Hortalizas' },
        { nombre: 'Tomate Redondo Maduro de Estación', costo: 1400, unidad: 'kg', cat: 'Verduras de Fruto' },
        { nombre: 'Banana Comercial Ecuador Dulce', costo: 1600, unidad: 'kg', cat: 'Frutas' },
      ],
      Farmacia: [
        { nombre: 'Alcohol en Gel Sanitizante con Dosificador 250ml', costo: 1400, unidad: 'unidades', cat: 'Higiene' },
        { nombre: 'Gasas Estériles en Sobres Individuales (Caja x 20)', costo: 1800, unidad: 'paquete', cat: 'Primeros Auxilios' },
        { nombre: 'Jabón Neutro Hipoalergénico en Barra 90g', costo: 850, unidad: 'unidades', cat: 'Cuidado Personal' },
      ],
      'Taller Mecánico': [
        { nombre: 'Aceite Semisintético para Motor 10W40 (Bidón 4L)', costo: 24500, unidad: 'litros', cat: 'Lubricantes' },
        { nombre: 'Filtro de Aceite Blindado Universal', costo: 4800, unidad: 'unidades', cat: 'Filtros' },
        { nombre: 'Líquido Refrigerante Anticongelante Listo para Usar 1L', costo: 3200, unidad: 'litros', cat: 'Fluidos' },
      ],
      Otro: [
        { nombre: 'Artículo Principal del Comercio 01', costo: 1000, unidad: 'unidades', cat: 'General' },
        { nombre: 'Artículo Principal del Comercio 02', costo: 2000, unidad: 'unidades', cat: 'General' },
      ],
    };

    const listaItems = itemsPorRubro[rubro] || itemsPorRubro['Almacén de Barrio'];
    const margen = configRubro.margenDefault;

    return listaItems.map((item, idx) => {
      const precioVenta = Math.round(item.costo * (1 + margen / 100));
      return {
        id: `prod-init-${timestamp}-${idx}`,
        codigoBarras: `779${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        nombre: item.nombre,
        categoria: item.cat,
        rubro: rubro,
        precioCosto: item.costo,
        precioVenta,
        stockActual: 25,
        stockMinimo: 8,
        stockTienda: 18,
        stockDeposito: 7,
        rotacion: 'alta',
        proveedor: 'Distribuidora Central',
        ventasUltimos30Dias: 14,
        diasAgotamiento: 28,
        estadoAlerta: 'optimo',
        unidadMedida: item.unidad,
        ivaPorcentaje: 21,
        margenSugerido: margen,
        fechaActualizacion: new Date().toISOString(),
      };
    });
  };

  // Manejador de subida de Logo del Comercio
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setLogoBase64(reader.result as string);
      audioFeedback.playBarcodeSuccess();
    };
    reader.readAsDataURL(file);
  };

  // Manejador de subida de CSV / Excel del Inventario
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorCsv(null);
    setArchivoCsvNombre(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      procesarArchivoCsv(text, file.name);
    };
    reader.onerror = () => {
      setErrorCsv('Error al leer el archivo. Asegúrate de que sea un archivo de texto o CSV legible.');
    };
    reader.readAsText(file);
  };

  // Procesador inteligente de CSV con reconocimiento flexible de columnas
  const procesarArchivoCsv = (contenido: string, nombreArchivo: string) => {
    try {
      const lineas = contenido.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lineas.length < 2) {
        throw new Error('El archivo debe tener al menos una fila de encabezados y una fila con datos de productos.');
      }

      // Determinar delimitador (coma o punto y coma)
      const cabecera = lineas[0].toLowerCase();
      const delimitador = cabecera.includes(';') ? ';' : ',';
      const columnas = lineas[0].split(delimitador).map((c) => c.trim().toLowerCase().replace(/^["']|["']$/g, ''));

      // Detección de índices de columnas clave
      let idxCodigo = columnas.findIndex((c) => c.includes('codigo') || c.includes('barcode') || c.includes('ean') || c.includes('sku'));
      let idxNombre = columnas.findIndex((c) => c.includes('nombre') || c.includes('producto') || c.includes('descripcion') || c.includes('articulo'));
      let idxCategoria = columnas.findIndex((c) => c.includes('categoria') || c.includes('rubro') || c.includes('seccion') || c.includes('familia'));
      let idxCosto = columnas.findIndex((c) => c.includes('costo') || c.includes('compra') || c.includes('precio_costo') || c.includes('p.costo'));
      let idxVenta = columnas.findIndex((c) => c.includes('venta') || c.includes('precio') || c.includes('pvp') || c.includes('precio_venta'));
      let idxStock = columnas.findIndex((c) => c.includes('stock') || c.includes('cantidad') || c.includes('existencia') || c.includes('unidades'));
      let idxStockMin = columnas.findIndex((c) => c.includes('minimo') || c.includes('stock_min'));
      let idxUnidad = columnas.findIndex((c) => c.includes('unidad') || c.includes('medida') || c.includes('um'));

      // Fallbacks posicionales estándar si no se identificaron por nombre
      if (idxCodigo === -1) idxCodigo = 0;
      if (idxNombre === -1) idxNombre = 1;
      if (idxCategoria === -1) idxCategoria = 2;
      if (idxCosto === -1) idxCosto = 3;
      if (idxVenta === -1) idxVenta = 4;
      if (idxStock === -1) idxStock = 5;

      const prodsParseados: Producto[] = [];

      for (let i = 1; i < lineas.length; i++) {
        const fila = lineas[i].split(delimitador).map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (fila.length < 2) continue;

        const nombre = fila[idxNombre] || `Artículo Fila ${i}`;
        if (!nombre || nombre.length < 2) continue;

        const codigo = fila[idxCodigo] && /^\d{4,16}$/.test(fila[idxCodigo])
          ? fila[idxCodigo]
          : `779${Math.floor(1000000000 + Math.random() * 9000000000)}`;

        const categoria = (idxCategoria >= 0 && fila[idxCategoria]) || 'Almacén General';
        const costoRaw = (idxCosto >= 0 && fila[idxCosto]) ? fila[idxCosto].replace(/[^\d\.,]/g, '').replace(',', '.') : '1000';
        const costo = parseFloat(costoRaw) || 1000;

        let venta = costo * 1.4;
        if (idxVenta >= 0 && fila[idxVenta]) {
          const ventaRaw = fila[idxVenta].replace(/[^\d\.,]/g, '').replace(',', '.');
          const v = parseFloat(ventaRaw);
          if (v > 0) venta = v;
        }

        const stock = (idxStock >= 0 && parseInt(fila[idxStock])) || 20;
        const stockMin = (idxStockMin >= 0 && parseInt(fila[idxStockMin])) || 8;
        const unidadRaw = (idxUnidad >= 0 && fila[idxUnidad]?.toLowerCase()) || 'unidades';

        let unidad: 'unidades' | 'kg' | 'litros' | 'paquete' = 'unidades';
        if (unidadRaw.includes('kg') || unidadRaw.includes('kilo')) unidad = 'kg';
        else if (unidadRaw.includes('lit') || unidadRaw.includes('l')) unidad = 'litros';
        else if (unidadRaw.includes('paq') || unidadRaw.includes('pack')) unidad = 'paquete';

        prodsParseados.push({
          id: `prod-csv-${Date.now()}-${i}`,
          codigoBarras: codigo,
          nombre,
          categoria,
          rubro: rubroSeleccionado,
          precioCosto: Math.round(costo),
          precioVenta: Math.round(venta),
          stockActual: stock,
          stockMinimo: stockMin,
          stockTienda: Math.ceil(stock * 0.6),
          stockDeposito: Math.floor(stock * 0.4),
          rotacion: stock > 30 ? 'media' : 'alta',
          proveedor: 'Importación CSV',
          ventasUltimos30Dias: 0,
          diasAgotamiento: 30,
          estadoAlerta: 'optimo',
          unidadMedida: unidad,
          ivaPorcentaje: 21,
          margenSugerido: Math.round(((venta - costo) / costo) * 100) || 40,
          fechaActualizacion: new Date().toISOString(),
        });
      }

      if (prodsParseados.length === 0) {
        throw new Error('No se pudieron extraer productos válidos. Revisa el formato del archivo.');
      }

      setProductosImportados(prodsParseados);
      setModoCatalogo('csv');
      audioFeedback.playBarcodeSuccess();
    } catch (err: any) {
      console.error('Error al parsear CSV:', err);
      setErrorCsv(err?.message || 'Error al interpretar el archivo CSV');
    }
  };

  // Descarga de Plantilla CSV Oficial de Ejemplo según el rubro
  const descargarPlantillaCsv = () => {
    const configRubro = RUBROS_DISPONIBLES.find((r) => r.nombre === rubroSeleccionado) || RUBROS_DISPONIBLES[0];
    const encabezados = 'Codigo_Barras,Nombre_Producto,Categoria,Costo_Unitario,Precio_Venta,Stock_Actual,Stock_Minimo,Unidad_Medida\n';
    const ejemplos = generarCatalogoBaseParaRubro(rubroSeleccionado)
      .slice(0, 5)
      .map(
        (p) =>
          `"${p.codigoBarras}","${p.nombre}","${p.categoria}",${p.precioCosto},${p.precioVenta},${p.stockActual},${p.stockMinimo},"${p.unidadMedida}"`
      )
      .join('\n');

    const contenidoCompleto = encabezados + ejemplos;
    const blob = new Blob([contenidoCompleto], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `plantilla_inventario_${rubroSeleccionado.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    audioFeedback.playBarcodeSuccess();
  };

  // Evaluación Criptográfica de la Clave de Seguridad
  const evaluacionClave = useMemo(
    () => evaluarSeguridadClave(claveSeguridad),
    [claveSeguridad]
  );
  const clavesCoinciden = claveSeguridad === confirmarClave;
  const tieneClavePreviaValida = Boolean(
    perfilActual?.claveSeguridadHash && !quiereModificarClave
  );
  const claveValidaParaAvanzar =
    tieneClavePreviaValida ||
    (evaluacionClave.esValida && clavesCoinciden && claveSeguridad.length >= 4);

  // Validación de pasos
  const puedeAvanzarPaso1 =
    nombreComerciante.trim().length >= 2 &&
    nombreComercio.trim().length >= 2 &&
    claveValidaParaAvanzar;
  const puedeAvanzarPaso2 = Boolean(rubroSeleccionado);
  const puedeAvanzarPaso3 = true; // Símbolo es opcional
  const puedeAvanzarPaso4 = modoCatalogo === 'catalogo_base' || productosImportados.length > 0;

  // Finalizar configuración: "Dar a luz a NOST-IA"
  const handleDarALuzNostIa = async () => {
    audioFeedback.playPosSaleSuccess();

    let hashClave = perfilActual?.claveSeguridadHash;
    let saltClave = perfilActual?.claveSeguridadSalt;

    if (claveSeguridad && quiereModificarClave) {
      const cryptoRes = await hashClaveSegura(claveSeguridad);
      hashClave = cryptoRes.hash;
      saltClave = cryptoRes.salt;
      try {
        await db.configuracion.put({
          clave: 'clave_maestra_hash',
          valor: { hash: hashClave, salt: saltClave, fechaCreacion: new Date().toISOString() },
        });
      } catch (err) {
        console.warn('Error guardando hash de clave maestra:', err);
      }
    } else if (!hashClave) {
      // Clave de seguridad predeterminada si no se modificó
      const cryptoRes = await hashClaveSegura('NOST-IA');
      hashClave = cryptoRes.hash;
      saltClave = cryptoRes.salt;
    }

    const perfilFinal: PerfilComercio = {
      nombreComerciante: nombreComerciante.trim(),
      nombreComercio: nombreComercio.trim(),
      rubro: rubroSeleccionado,
      escala,
      telefono: telefono.trim() || undefined,
      direccion: direccion.trim() || undefined,
      logoBase64,
      lemaOFrase: lemaOFrase.trim(),
      configurado: true,
      fechaConfiguracion: new Date().toISOString(),
      claveSeguridadHash: hashClave,
      claveSeguridadSalt: saltClave,
      fechaClaveActualizacion: new Date().toISOString(),
    };

    const catalogoAImpactar =
      modoCatalogo === 'csv' && productosImportados.length > 0
        ? productosImportados
        : generarCatalogoBaseParaRubro(rubroSeleccionado);

    onFinalizarConfiguracion(perfilFinal, catalogoAImpactar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-5 backdrop-blur-lg overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-[#00FF87]/40 bg-[#0A0E18] text-[#F8FAFC] shadow-[0_0_50px_rgba(0,255,135,0.15)] flex flex-col overflow-hidden my-4 max-h-[95vh]">
        {/* Cabecera del Asistente con Símbolo Soberano */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#1E293B] bg-[#0E1424] px-6 py-4">
          <div className="flex items-center gap-3">
            <MateSoberanoLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-white tracking-wide">
                  Configuración Soberana del Comercio
                </h2>
                <span className="rounded bg-[#00FF87]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#00FF87] border border-[#00FF87]/30">
                  PASO {pasoActual} DE 5
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                NOST-IA se adapta a la medida exacta de tu negocio popular antes de entrar en operaciones.
              </p>
            </div>
          </div>

          {onCancelar && (
            <button
              onClick={onCancelar}
              className="cursor-pointer text-xs font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
            >
              Cerrar
            </button>
          )}
        </div>

        {/* Indicador de 5 Pasos */}
        <div className="grid grid-cols-5 border-b border-[#1E293B] bg-[#080B12] text-center font-mono text-xs">
          {[
            { num: 1, titulo: 'Identidad' },
            { num: 2, titulo: 'Rubro' },
            { num: 3, titulo: 'Símbolos' },
            { num: 4, titulo: 'Inventario' },
            { num: 5, titulo: 'Nacimiento' },
          ].map((paso) => {
            const activo = paso.num === pasoActual;
            const completado = paso.num < pasoActual;
            return (
              <div
                key={paso.num}
                onClick={() => {
                  if (completado) setPasoActual(paso.num);
                }}
                className={`py-3 px-1 border-b-2 transition-all ${
                  activo
                    ? 'border-[#00FF87] text-[#00FF87] bg-[#00FF87]/10 font-bold'
                    : completado
                    ? 'border-[#00D2FF] text-[#00D2FF] cursor-pointer hover:bg-slate-900'
                    : 'border-transparent text-slate-500'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{completado ? '✓' : paso.num}.</span>
                  <span className="hidden sm:inline">{paso.titulo}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 font-mono text-xs">
          {/* ===================== PASO 1: IDENTIDAD Y ESCALA ===================== */}
          {pasoActual === 1 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/10 p-4">
                <h3 className="text-sm font-bold text-[#00FF87] flex items-center gap-2 mb-1">
                  <User className="h-4 w-4" /> Paso 1: Datos del Comerciante y su Negocio
                </h3>
                <p className="text-slate-300">
                  Dinos tu nombre y el de tu local. NOST-IA grabará estos datos en tu base local offline para personalizar tickets, informes y la terminal de ventas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Nombre del Comerciante / Responsable *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Alberto Salinas / Doña Rosa"
                    value={nombreComerciante}
                    onChange={(e) => setNombreComerciante(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white text-sm focus:border-[#00FF87] focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Titular o encargado del comercio.</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Nombre del Comercio / Negocio *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Panadería San Cayetano / Kiosco El Sol"
                    value={nombreComercio}
                    onChange={(e) => setNombreComercio(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white text-sm focus:border-[#00FF87] focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Aparecerá en el encabezado de NOST-IA y en las ventas.</span>
                </div>
              </div>

              {/* Escala de la Empresa */}
              <div>
                <label className="block text-slate-300 font-bold mb-2">
                  Escala de la Empresa o Emprendimiento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ESCALAS_DISPONIBLES.map((esc) => {
                    const sel = escala === esc.tipo;
                    return (
                      <div
                        key={esc.tipo}
                        onClick={() => setEscala(esc.tipo)}
                        className={`cursor-pointer rounded-xl border p-3 transition-all flex items-start gap-3 ${
                          sel
                            ? 'border-[#00FF87] bg-[#00FF87]/15 shadow-[0_0_12px_rgba(0,255,135,0.2)]'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                        }`}
                      >
                        <div className={`mt-0.5 flex h-4 w-4 rounded-full border items-center justify-center ${sel ? 'border-[#00FF87] bg-[#00FF87]' : 'border-slate-600'}`}>
                          {sel && <Check className="h-3 w-3 text-black stroke-[3]" />}
                        </div>
                        <div>
                          <div className={`font-bold ${sel ? 'text-white' : 'text-slate-300'}`}>
                            {esc.etiqueta}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                            {esc.detalle}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Teléfono / WhatsApp de Contacto (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 11-3768-9803"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white text-xs focus:border-[#00FF87] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Dirección / Barrio / Localidad (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Av. San Martín 1420, Florencio Varela"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white text-xs focus:border-[#00FF87] focus:outline-none"
                  />
                </div>
              </div>

              {/* SECCIÓN CRÍTICA DE CIBERSEGURIDAD: CREACIÓN DE CLAVE MAESTRA */}
              <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 p-4 sm:p-5 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-[#00FF87] border border-emerald-500/40">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        Clave de Seguridad y Reinicio Protegido *
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                          REQUERIDO
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-300 font-sans mt-0.5">
                        Esta clave será solicitada para confirmar acciones críticas como el <strong>Reinicio a Cero</strong> de la base de datos y evitar pérdidas de datos accidentales.
                      </p>
                    </div>
                  </div>

                  {perfilActual?.claveSeguridadHash && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#00D2FF]">
                      <input
                        type="checkbox"
                        checked={quiereModificarClave}
                        onChange={(e) => setQuiereModificarClave(e.target.checked)}
                        className="rounded accent-[#00FF87]"
                      />
                      <span>Cambiar clave</span>
                    </label>
                  )}
                </div>

                {(!perfilActual?.claveSeguridadHash || quiereModificarClave) ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-300 font-bold block mb-1">
                          Crear Clave de Seguridad (Mínimo 4 caracteres) *
                        </label>
                        <div className="relative">
                          <input
                            type={mostrarClave ? 'text' : 'password'}
                            value={claveSeguridad}
                            onChange={(e) => setClaveSeguridad(e.target.value)}
                            placeholder="Escribe tu clave de seguridad..."
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white font-mono text-xs focus:border-[#00FF87] focus:outline-none pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarClave(!mostrarClave)}
                            className="cursor-pointer absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                            title={mostrarClave ? 'Ocultar' : 'Mostrar'}
                          >
                            {mostrarClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-300 font-bold block mb-1">
                          Confirmar Clave de Seguridad *
                        </label>
                        <input
                          type={mostrarClave ? 'text' : 'password'}
                          value={confirmarClave}
                          onChange={(e) => setConfirmarClave(e.target.value)}
                          placeholder="Reescribe exactamente la misma clave..."
                          className={`w-full rounded-xl border bg-slate-900 px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none ${
                            confirmarClave && !clavesCoinciden
                              ? 'border-rose-500 focus:border-rose-400'
                              : 'border-slate-700 focus:border-[#00FF87]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Medidor y Auditor de Fortaleza Criptográfica */}
                    {claveSeguridad && (
                      <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-bold">Nivel de Seguridad:</span>
                          <span
                            className={`font-bold uppercase ${
                              evaluacionClave.nivel === 'muy_debil'
                                ? 'text-rose-400'
                                : evaluacionClave.nivel === 'debil'
                                ? 'text-amber-400'
                                : evaluacionClave.nivel === 'media'
                                ? 'text-[#00D2FF]'
                                : 'text-[#00FF87]'
                            }`}
                          >
                            {evaluacionClave.etiqueta} ({evaluacionClave.puntaje}%)
                          </span>
                        </div>

                        {/* Barra de progreso de entropía */}
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              evaluacionClave.puntaje < 30
                                ? 'bg-rose-500'
                                : evaluacionClave.puntaje < 60
                                ? 'bg-amber-400'
                                : evaluacionClave.puntaje < 85
                                ? 'bg-[#00D2FF]'
                                : 'bg-[#00FF87]'
                            }`}
                            style={{ width: `${evaluacionClave.puntaje}%` }}
                          />
                        </div>

                        {/* Mensajes de ciberseguridad */}
                        {evaluacionClave.mensajesSeguridad.length > 0 && (
                          <div className="text-[10px] text-amber-300/90 font-sans space-y-0.5">
                            {evaluacionClave.mensajesSeguridad.map((m, idx) => (
                              <p key={idx}>• {m}</p>
                            ))}
                          </div>
                        )}

                        {confirmarClave && !clavesCoinciden && (
                          <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                            <ShieldAlert className="h-3.5 w-3.5" /> Las claves no coinciden. Por favor verifícalas.
                          </p>
                        )}
                        {confirmarClave && clavesCoinciden && evaluacionClave.esValida && (
                          <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> Claves coincidentes y blindadas. Se generará hash SHA-256 + salt local.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/40 p-3 text-emerald-300 text-xs flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#00FF87] shrink-0" />
                    <span>Tu clave de seguridad actual está activa y protegida en memoria con hash criptográfico SHA-256.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== PASO 2: RUBRO Y ADAPTACIÓN ===================== */}
          {pasoActual === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#00D2FF]/30 bg-[#00D2FF]/10 p-4">
                <h3 className="text-sm font-bold text-[#00D2FF] flex items-center gap-2 mb-1">
                  <Store className="h-4 w-4" /> Paso 2: Selecciona el Rubro de tu Negocio
                </h3>
                <p className="text-slate-300">
                  NOST-IA reconfigura sus algoritmos de costos, unidades de medida y categorías sugeridas para cada tipo de comercio. Selecciona el que mejor describa tu actividad:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                {RUBROS_DISPONIBLES.map((r) => {
                  const sel = rubroSeleccionado === r.nombre;
                  return (
                    <div
                      key={r.nombre}
                      onClick={() => setRubroSeleccionado(r.nombre)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all flex items-start gap-3 ${
                        sel
                          ? 'border-[#00FF87] bg-[#00FF87]/20 shadow-[0_0_15px_rgba(0,255,135,0.25)]'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <span className="text-2xl shrink-0 select-none">{r.icono}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <strong className={`truncate text-xs ${sel ? 'text-white font-black' : 'text-slate-200'}`}>
                            {r.nombre}
                          </strong>
                          {sel && <Check className="h-3.5 w-3.5 text-[#00FF87] shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                          {r.descripcion}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-400">
                          <span className="text-[#00D2FF]">Medida: {r.unidadDefault}</span>
                          <span>•</span>
                          <span className="text-[#00FF87]">Margen: ~{r.margenDefault}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {rubroSeleccionado && (
                <div className="rounded-lg border border-[#00FF87]/30 bg-[#00FF87]/5 p-3 flex items-center justify-between">
                  <span className="text-slate-300">
                    Rubro Activo Seleccionado: <strong className="text-white">{rubroSeleccionado}</strong>
                  </span>
                  <span className="text-[#00FF87] font-bold">
                    ✓ Perfil operativo adaptado automáticamente
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ===================== PASO 3: SÍMBOLOS E IDENTIDAD VISUAL ===================== */}
          {pasoActual === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4" /> Paso 3: Símbolos, Identidad Visual y Soberanía
                </h3>
                <p className="text-slate-300">
                  Sube el símbolo o logotipo de tu comercio. Convivirá junto al <strong>Símbolo Soberano de NOST-IA</strong> (el Mate con humo moderno, dinámico y territorial), representando la hermandad entre la tecnología popular y el trabajo territorial.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Lado A: Símbolo del Comercio (Subida) */}
                <div className="rounded-xl border border-[#1E293B] bg-[#0E1424] p-4 flex flex-col items-center text-center">
                  <div className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                    Símbolo / Logotipo de Tu Comercio
                  </div>

                  <div
                    onClick={() => fileLogoRef.current?.click()}
                    className="cursor-pointer relative h-32 w-32 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 flex flex-col items-center justify-center p-2 hover:border-[#00FF87] transition-all overflow-hidden group mb-3"
                  >
                    {logoBase64 ? (
                      <img
                        src={logoBase64}
                        alt="Logo del Comercio"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-slate-500 group-hover:text-[#00FF87] transition-colors" />
                        <span className="text-[10px] text-slate-400 mt-2">
                          Clic para subir foto o logo (JPG, PNG)
                        </span>
                      </>
                    )}
                  </div>

                  <input
                    ref={fileLogoRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileLogoRef.current?.click()}
                      icon={<Upload className="h-3.5 w-3.5" />}
                    >
                      {logoBase64 ? 'Cambiar Logo' : 'Subir Imagen'}
                    </Button>
                    {logoBase64 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLogoBase64(undefined)}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Lado B: Símbolo Soberano NOST-IA (Mate con Humo) */}
                <div className="rounded-xl border border-[#00FF87]/30 bg-gradient-to-b from-[#0E1424] to-[#0A0D16] p-4 flex flex-col items-center text-center">
                  <div className="text-xs font-bold text-[#00FF87] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    Símbolo Soberano NOST-IA
                  </div>

                  <div className="h-32 w-32 rounded-2xl bg-black/40 border border-[#00FF87]/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
                    <MateSoberanoLogo size="lg" />
                  </div>

                  <div className="text-[11px] text-slate-300 font-bold">
                    El Mate con Vapor Territorial
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Emblema de resistencia, autonomía operativa y calor de barrio.
                  </div>
                </div>
              </div>

              {/* Lema o frase de combate del negocio */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Lema, Frase o Saludo del Comercio (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Orgullo de barrio desde 1994 • Precios justos y calidad"
                  value={lemaOFrase}
                  onChange={(e) => setLemaOFrase(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white text-xs focus:border-[#00FF87] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ===================== PASO 4: BASE DE DATOS E INVENTARIO CSV ===================== */}
          {pasoActual === 4 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/10 p-4">
                <h3 className="text-sm font-bold text-[#00FF87] flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="h-4 w-4" /> Paso 4: Carga de Base de Datos Inicial de Productos
                </h3>
                <p className="text-slate-300">
                  Para que tu comercio opere de inmediato, puedes subir tu lista de precios/stock en archivo CSV o Excel, o utilizar el <strong>Catálogo Base Preconfigurado</strong> para <strong>{rubroSeleccionado}</strong>.
                </p>
              </div>

              {/* Selector de modo: Usar Catálogo Preconfigurado vs Subir CSV propio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setModoCatalogo('catalogo_base')}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3 ${
                    modoCatalogo === 'catalogo_base'
                      ? 'border-[#00FF87] bg-[#00FF87]/15 shadow-[0_0_15px_rgba(0,255,135,0.2)]'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className={`mt-0.5 flex h-4 w-4 rounded-full border items-center justify-center ${modoCatalogo === 'catalogo_base' ? 'border-[#00FF87] bg-[#00FF87]' : 'border-slate-600'}`}>
                    {modoCatalogo === 'catalogo_base' && <Check className="h-3 w-3 text-black stroke-[3]" />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-[#00FF87]" />
                      Usar Catálogo Base para {rubroSeleccionado}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Carga inmediata de artículos típicos de tu rubro con códigos de barra y costos de mercado listos para operar.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setModoCatalogo('csv');
                    if (fileCsvRef.current) fileCsvRef.current.click();
                  }}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3 ${
                    modoCatalogo === 'csv'
                      ? 'border-[#00D2FF] bg-[#00D2FF]/15 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className={`mt-0.5 flex h-4 w-4 rounded-full border items-center justify-center ${modoCatalogo === 'csv' ? 'border-[#00D2FF] bg-[#00D2FF]' : 'border-slate-600'}`}>
                    {modoCatalogo === 'csv' && <Check className="h-3 w-3 text-black stroke-[3]" />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5 text-[#00D2FF]" />
                      Subir Mi Propio Archivo CSV / Excel
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Importa todos tus productos existentes desde tus planillas previas de cálculo.
                    </div>
                  </div>
                </div>
              </div>

              {/* LLAMADO Y EXPLICACIÓN DETALLADA DEL FORMATO CSV / EXCEL */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-[#00D2FF]" />
                    <span className="font-bold text-white text-xs">
                      ¿Cómo debe ser el formato de tu archivo Excel o CSV?
                    </span>
                  </div>
                  <button
                    onClick={descargarPlantillaCsv}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#00FF87]/40 bg-[#00FF87]/15 px-3 py-1 text-xs font-bold text-[#00FF87] hover:bg-[#00FF87]/25"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar Plantilla CSV para {rubroSeleccionado}
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tu archivo CSV (o exportado desde Excel guardándolo como <em>"CSV delimitado por comas (*.csv)"</em>) debe contener una fila superior con los encabezados y luego cada renglón con tus productos:
                </p>

                {/* Tabla de Ejemplo de Columnas */}
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-[10px] font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Codigo_Barras</th>
                        <th className="p-2">Nombre_Producto *</th>
                        <th className="p-2">Categoria</th>
                        <th className="p-2">Costo_Unitario</th>
                        <th className="p-2">Precio_Venta</th>
                        <th className="p-2">Stock_Actual</th>
                        <th className="p-2">Unidad_Medida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      <tr>
                        <td className="p-2 text-slate-500">7790895000997</td>
                        <td className="p-2 font-bold text-white">Yerba Mate 1kg</td>
                        <td className="p-2">Almacén</td>
                        <td className="p-2 text-[#00FF87]">$2100</td>
                        <td className="p-2 text-[#00D2FF]">$3400</td>
                        <td className="p-2">25</td>
                        <td className="p-2">paquete</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-slate-500">7791234567890</td>
                        <td className="p-2 font-bold text-white">Harina Trigo 000 1kg</td>
                        <td className="p-2">Harinas</td>
                        <td className="p-2 text-[#00FF87]">$680</td>
                        <td className="p-2 text-[#00D2FF]">$980</td>
                        <td className="p-2">40</td>
                        <td className="p-2">kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>• Acepta delimitadores con coma (,) o punto y coma (;).</span>
                  <span>• Si no tienes código de barras para algún producto, NOST-IA le creará uno automáticamente.</span>
                </div>
              </div>

              {/* Botón de carga de CSV */}
              <input
                ref={fileCsvRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCsvUpload}
                className="hidden"
              />

              {modoCatalogo === 'csv' && (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center space-y-3">
                  <div className="flex justify-center">
                    <FileSpreadsheet className="h-10 w-10 text-[#00D2FF]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {archivoCsvNombre ? `Archivo: ${archivoCsvNombre}` : 'Selecciona o Arrastra tu archivo CSV'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {productosImportados.length > 0
                        ? `✓ Se reconocieron e importaron con éxito ${productosImportados.length} productos listos para impactar.`
                        : 'Haz clic en el botón de abajo para buscar el archivo en tu computadora.'}
                    </p>
                  </div>

                  <Button
                    variant="cyber"
                    size="sm"
                    onClick={() => fileCsvRef.current?.click()}
                    icon={<Upload className="h-4 w-4" />}
                  >
                    {productosImportados.length > 0 ? 'Cambiar Archivo CSV' : 'Examinar Archivo CSV'}
                  </Button>

                  {errorCsv && (
                    <div className="text-rose-400 text-xs mt-2 flex items-center justify-center gap-1">
                      <AlertCircle className="h-4 w-4" /> {errorCsv}
                    </div>
                  )}
                </div>
              )}

              {modoCatalogo === 'catalogo_base' && (
                <div className="rounded-xl border border-[#00FF87]/40 bg-[#00FF87]/10 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-[#00FF87] shrink-0" />
                    <div>
                      <span className="font-bold text-white text-xs">
                        Catálogo Base de {rubroSeleccionado} Listo
                      </span>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        Se cargarán los artículos esenciales de {rubroSeleccionado} con existencias y precios sugeridos. Podrás modificarlos cuando quieras.
                      </p>
                    </div>
                  </div>
                  <Badge variant="green">RECOMENDADO</Badge>
                </div>
              )}
            </div>
          )}

          {/* ===================== PASO 5: RESUMEN Y "DAR A LUZ A NOST-IA" ===================== */}
          {pasoActual === 5 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#00FF87]/50 bg-gradient-to-r from-[#00FF87]/20 via-[#00D2FF]/20 to-[#00FF87]/20 p-5 text-center">
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <MateSoberanoLogo size="xl" />
                  </div>
                </div>

                <h3 className="text-xl font-bold font-mono text-white tracking-wider">
                  ¡Todo Listo para Dar a Luz a NOST-IA!
                </h3>
                <p className="text-slate-300 text-xs max-w-lg mx-auto mt-1 leading-relaxed">
                  Los parámetros de tu comercio han sido configurados. Tu base de datos local en disco duro se encuentra armada y blindada contra cortes de internet.
                </p>
              </div>

              {/* Tarjeta Holográfica Resumen del Comercio */}
              <div className="rounded-2xl border border-[#1E293B] bg-[#0E1424] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                  <div className="flex items-center gap-3">
                    {logoBase64 ? (
                      <img
                        src={logoBase64}
                        alt={nombreComercio}
                        className="h-12 w-12 rounded-xl object-contain bg-slate-950 border border-slate-700 p-1"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center text-xl">
                        🏪
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-bold text-white font-mono">{nombreComercio}</h4>
                      <p className="text-xs text-[#00D2FF] font-mono">
                        Titular: <strong>{nombreComerciante}</strong> • {rubroSeleccionado}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="rounded bg-[#00FF87]/20 px-2.5 py-1 text-xs font-bold text-[#00FF87] border border-[#00FF87]/30">
                      OPERACIÓN OFFLINE
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Escala</div>
                    <div className="font-bold text-white text-xs capitalize mt-0.5">
                      {escala.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Rubro</div>
                    <div className="font-bold text-[#00FF87] text-xs mt-0.5">
                      {rubroSeleccionado}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Productos Iniciales</div>
                    <div className="font-bold text-[#00D2FF] text-xs mt-0.5">
                      {modoCatalogo === 'csv' && productosImportados.length > 0
                        ? `${productosImportados.length} desde CSV`
                        : `${generarCatalogoBaseParaRubro(rubroSeleccionado).length} preconfigurados`}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Soberanía de Datos</div>
                    <div className="font-bold text-amber-300 text-xs mt-0.5">
                      100% Local (Dexie)
                    </div>
                  </div>
                </div>

                {/* Resumen de Blindaje de Seguridad */}
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#00FF87]" />
                    <span className="text-white font-bold font-mono">
                      Clave Maestra de Reinicio y Seguridad:
                    </span>
                    <span className="text-emerald-300 font-mono text-[11px]">
                      Configurada y Blindada con Hash SHA-256 + Salt
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Protección Anti-Fuerza Bruta Activa
                  </span>
                </div>

                {lemaOFrase && (
                  <div className="text-center italic text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                    «{lemaOFrase}»
                  </div>
                )}
              </div>

              {/* Botón Central Épico: DAR A LUZ A NOST-IA */}
              <div className="text-center pt-2">
                <button
                  onClick={handleDarALuzNostIa}
                  className="cursor-pointer inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#00FF87] via-[#00D2FF] to-[#00FF87] px-8 py-4 text-base font-bold font-mono text-black hover:opacity-95 transition-all shadow-[0_0_35px_rgba(0,255,135,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="h-6 w-6 fill-black" />
                  <span>DAR A LUZ A NOST-IA & INICIAR OPERACIONES</span>
                </button>
                <div className="text-[10px] text-slate-500 font-mono mt-2">
                  Se inicializará el panel de ventas, inventario territorial y base de datos local.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Navegación de Pasos (Anterior / Siguiente) */}
        <div className="flex items-center justify-between border-t border-[#1E293B] bg-[#0E1424] px-6 py-3 font-mono text-xs">
          <button
            onClick={() => setPasoActual((p) => Math.max(1, p - 1))}
            disabled={pasoActual === 1}
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
              pasoActual === 1
                ? 'opacity-30 cursor-not-allowed border-slate-800 text-slate-600'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Anterior
          </button>

          <span className="text-slate-500 text-[11px]">
            Paso {pasoActual} de 5
          </span>

          {pasoActual < 5 ? (
            <Button
              variant="cyber"
              size="sm"
              onClick={() => setPasoActual((p) => Math.min(5, p + 1))}
              disabled={
                (pasoActual === 1 && !puedeAvanzarPaso1) ||
                (pasoActual === 2 && !puedeAvanzarPaso2) ||
                (pasoActual === 4 && !puedeAvanzarPaso4)
              }
              icon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Siguiente Paso
            </Button>
          ) : (
            <button
              onClick={handleDarALuzNostIa}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[#00FF87] px-4 py-1.5 font-bold text-black hover:bg-[#00FF87]/90 shadow-[0_0_15px_rgba(0,255,135,0.3)]"
            >
              <Zap className="h-3.5 w-3.5 fill-black" /> ¡Comenzar!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
