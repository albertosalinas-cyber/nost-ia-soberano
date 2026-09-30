import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  Search,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  FileCode,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  ShieldAlert,
  Info,
} from 'lucide-react';
import type {
  RegistroAuditoriaError,
  CategoriaAuditoriaError,
  EstadoAuditoriaError,
  SeveridadAuditoria,
} from '../../types';
import {
  obtenerRegistrosAuditoria,
  guardarRegistroAuditoria,
  eliminarRegistroAuditoria,
  restaurarRegistrosAuditoriaHistoricos,
  exportarAuditoriaTextoPlano,
} from '../../engine/db';
import { audioFeedback } from '../../engine/audioFeedback';

interface AuditoriaErroresPanelProps {
  onNotificar?: (mensaje: string) => void;
}

export const AuditoriaErroresPanel: React.FC<AuditoriaErroresPanelProps> = ({
  onNotificar,
}) => {
  const [registros, setRegistros] = useState<RegistroAuditoriaError[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroSeveridad, setFiltroSeveridad] = useState<string>('todas');
  const [copiadoExitoso, setCopiadoExitoso] = useState<boolean>(false);
  const [registroDetalle, setRegistroDetalle] = useState<RegistroAuditoriaError | null>(null);
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState<boolean>(false);

  // Formulario nuevo registro manual
  const [nuevoForm, setNuevoForm] = useState<{
    titulo: string;
    categoria: CategoriaAuditoriaError;
    tipoArchivo: 'pdf' | 'jpg' | 'txt' | 'xlsx' | 'pos' | 'db' | 'otro';
    archivoAfectado: string;
    severidad: SeveridadAuditoria;
    estado: EstadoAuditoriaError;
    descripcion: string;
    causaRaiz: string;
    impacto: string;
    solucionAplicada: string;
    detallesTecnicos: string;
  }>({
    titulo: '',
    categoria: 'lectura_documento',
    tipoArchivo: 'pdf',
    archivoAfectado: '',
    severidad: 'alta',
    estado: 'observacion',
    descripcion: '',
    causaRaiz: '',
    impacto: '',
    solucionAplicada: '',
    detallesTecnicos: '',
  });

  // Cargar registros persistentes desde Dexie
  const cargarRegistros = async () => {
    setCargando(true);
    try {
      const data = await obtenerRegistrosAuditoria();
      setRegistros(data);
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarRegistros();
  }, []);

  // Filtrado de registros
  const registrosFiltrados = useMemo(() => {
    return registros.filter((reg) => {
      const q = busqueda.trim().toLowerCase();
      if (q) {
        const matchTitulo = reg.titulo.toLowerCase().includes(q);
        const matchDesc = reg.descripcion.toLowerCase().includes(q);
        const matchCausa = reg.causaRaiz.toLowerCase().includes(q);
        const matchArchivo = (reg.archivoAfectado || '').toLowerCase().includes(q);
        const matchId = reg.id.toLowerCase().includes(q);
        if (!matchTitulo && !matchDesc && !matchCausa && !matchArchivo && !matchId) {
          return false;
        }
      }

      if (filtroCategoria !== 'todos' && reg.categoria !== filtroCategoria) {
        return false;
      }

      if (filtroEstado !== 'todos' && reg.estado !== filtroEstado) {
        return false;
      }

      if (filtroSeveridad !== 'todas' && reg.severidad !== filtroSeveridad) {
        return false;
      }

      return true;
    });
  }, [registros, busqueda, filtroCategoria, filtroEstado, filtroSeveridad]);

  // Contadores y métricas ejecutivas
  const metricas = useMemo(() => {
    const total = registros.length;
    const fallosLectura = registros.filter((r) => r.categoria === 'lectura_documento' || r.categoria === 'parsing_ocr').length;
    const duplicados = registros.filter((r) => r.categoria === 'duplicado').length;
    const solucionados = registros.filter((r) => r.estado === 'solucionado').length;
    const enObservacion = registros.filter((r) => r.estado === 'observacion' || r.estado === 'advertencia').length;

    return { total, fallosLectura, duplicados, solucionados, enObservacion };
  }, [registros]);

  // Exportar reporte a archivo .txt descargable
  const handleDescargarTxt = () => {
    const textoReporte = exportarAuditoriaTextoPlano(registros);
    const blob = new Blob([textoReporte], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const ahora = new Date();
    const fechaFormat = ahora.toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_errores_trazabilidad_nost_ia_${fechaFormat}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    audioFeedback.playPosSaleSuccess();
    if (onNotificar) {
      onNotificar(`📥 Archivo de auditoría TXT exportado exitosamente (${registros.length} casos).`);
    }
  };

  // Copiar reporte al portapapeles
  const handleCopiarTxt = async () => {
    const textoReporte = exportarAuditoriaTextoPlano(registros);
    try {
      await navigator.clipboard.writeText(textoReporte);
      setCopiadoExitoso(true);
      audioFeedback.playBarcodeSuccess();
      setTimeout(() => setCopiadoExitoso(false), 2500);
      if (onNotificar) {
        onNotificar('📋 Reporte de auditoría copiado al portapapeles.');
      }
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = textoReporte;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiadoExitoso(true);
      setTimeout(() => setCopiadoExitoso(false), 2500);
    }
  };

  // Guardar nuevo registro manual
  const handleGuardarNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoForm.titulo.trim() || !nuevoForm.descripcion.trim()) return;

    const idNuevo = `err-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const nuevoRegistro: RegistroAuditoriaError = {
      id: idNuevo,
      fecha: new Date().toISOString(),
      categoria: nuevoForm.categoria,
      tipoArchivo: nuevoForm.tipoArchivo,
      archivoAfectado: nuevoForm.archivoAfectado || undefined,
      titulo: nuevoForm.titulo.trim(),
      descripcion: nuevoForm.descripcion.trim(),
      causaRaiz: nuevoForm.causaRaiz.trim() || 'Causa operativa bajo relevamiento técnico.',
      impacto: nuevoForm.impacto.trim() || 'Impacto delimitado en registro local.',
      solucionAplicada: nuevoForm.solucionAplicada.trim() || 'Pauta de control manual aplicada.',
      estado: nuevoForm.estado,
      severidad: nuevoForm.severidad,
      detallesTecnicos: nuevoForm.detallesTecnicos.trim() || undefined,
      registradoPor: 'Operador / Auditor Territorial',
    };

    await guardarRegistroAuditoria(nuevoRegistro);
    await cargarRegistros();
    setMostrarModalNuevo(false);
    setNuevoForm({
      titulo: '',
      categoria: 'lectura_documento',
      tipoArchivo: 'pdf',
      archivoAfectado: '',
      severidad: 'alta',
      estado: 'observacion',
      descripcion: '',
      causaRaiz: '',
      impacto: '',
      solucionAplicada: '',
      detallesTecnicos: '',
    });
    audioFeedback.playPosSaleSuccess();
    if (onNotificar) {
      onNotificar(`✅ Incidencia "${nuevoRegistro.titulo}" registrada en auditoría persistente.`);
    }
  };

  // Eliminar un caso puntual
  const handleEliminar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro/a que deseas eliminar este registro de la auditoría local?')) {
      await eliminarRegistroAuditoria(id);
      await cargarRegistros();
      if (registroDetalle?.id === id) {
        setRegistroDetalle(null);
      }
      if (onNotificar) {
        onNotificar('Registro eliminado de la auditoría.');
      }
    }
  };

  // Restaurar casos históricos
  const handleRestaurarHistoricos = async () => {
    if (
      window.confirm(
        '¿Deseas restaurar la lista oficial con los casos históricos documentados desde el inicio del proyecto NOST-IA?'
      )
    ) {
      await restaurarRegistrosAuditoriaHistoricos();
      await cargarRegistros();
      audioFeedback.playPosSaleSuccess();
      if (onNotificar) {
        onNotificar('Casos históricos originales restablecidos en la base de datos.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0E111A] text-[#F8FAFC] rounded-xl border border-[#1E293B] overflow-hidden">
      {/* 1. Header con Título & Acciones Primarias */}
      <div className="border-b border-[#1E293B] bg-[#12151E] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Auditoría de Errores y Trazabilidad Total
                </h3>
                <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  {registros.length} Registrados
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Historial persistente de fallos en lectura de comprobantes (PDF, JPG, TXT) y control de duplicados
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDescargarTxt}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-3.5 py-1.5 text-xs font-mono font-bold text-black shadow-lg transition-all"
              title="Descargar archivo .txt completo con todo el detalle de incidencias y blindajes"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Reporte (.txt)</span>
            </button>

            <button
              type="button"
              onClick={handleCopiarTxt}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-mono text-slate-200 transition-all"
              title="Copiar contenido de la auditoría al portapapeles"
            >
              {copiadoExitoso ? (
                <>
                  <Check className="h-4 w-4 text-[#00FF87]" />
                  <span className="text-[#00FF87]">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-400" />
                  <span>Copiar TXT</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMostrarModalNuevo(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#00FF87]/40 bg-[#00FF87]/10 hover:bg-[#00FF87]/20 px-3 py-1.5 text-xs font-mono font-bold text-[#00FF87] transition-all"
              title="Registrar manualmente una falla, anomalía o nota de auditoría"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Incidencia</span>
            </button>

            <button
              type="button"
              onClick={handleRestaurarHistoricos}
              className="cursor-pointer p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Restaurar registros históricos documentados desde el inicio del proyecto"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Franja de Indicadores Resumen (SaaS Dashboard Metric Band) */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-800/80 font-mono text-xs">
          <div className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-lg">
            <span className="text-[10px] text-slate-400 block uppercase">Total Casos</span>
            <span className="text-base font-bold text-white tabular-nums">{metricas.total}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-lg">
            <span className="text-[10px] text-cyan-400 block uppercase">Fallos Lectura</span>
            <span className="text-base font-bold text-cyan-300 tabular-nums">{metricas.fallosLectura}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-lg">
            <span className="text-[10px] text-amber-400 block uppercase">Duplicados</span>
            <span className="text-base font-bold text-amber-300 tabular-nums">{metricas.duplicados}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-lg">
            <span className="text-[10px] text-[#00FF87] block uppercase">Solucionados</span>
            <span className="text-base font-bold text-[#00FF87] tabular-nums">{metricas.solucionados}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-lg col-span-2 sm:col-span-1">
            <span className="text-[10px] text-rose-400 block uppercase">En Observación</span>
            <span className="text-base font-bold text-rose-300 tabular-nums">{metricas.enObservacion}</span>
          </div>
        </div>
      </div>

      {/* 2. Barra de Filtros y Búsqueda */}
      <div className="border-b border-[#1E293B] bg-[#141824] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por falla, causa raíz, archivo o ID..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 py-1 pl-8 pr-3 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        {/* Filtro por Categoría */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Categoría:</span>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 text-xs font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="todos">Todas las Categorías</option>
            <option value="lectura_documento">Lectura de Documentos</option>
            <option value="duplicado">Duplicados de Facturas</option>
            <option value="parsing_ocr">Parsing y Motor OCR</option>
            <option value="validacion_catalogo">Validación de Catálogo</option>
            <option value="sistema">Sistema e Infraestructura</option>
          </select>
        </div>

        {/* Filtro por Estado */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Estado:</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 text-xs font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="todos">Todos los Estados</option>
            <option value="solucionado">Solucionado / Blindado</option>
            <option value="mitigado">Mitigado</option>
            <option value="observacion">En Observación</option>
            <option value="advertencia">Advertencia</option>
          </select>
        </div>

        {/* Filtro por Severidad */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Severidad:</span>
          <select
            value={filtroSeveridad}
            onChange={(e) => setFiltroSeveridad(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 text-xs font-mono focus:border-cyan-400 focus:outline-none"
          >
            <option value="todas">Todas</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      {/* 3. Tabla Persistente de Auditoría */}
      <div className="flex-1 overflow-auto">
        {cargando ? (
          <div className="flex h-64 items-center justify-center font-mono text-xs text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin text-cyan-400 mr-2" />
            <span>Cargando registros de auditoría local...</span>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center font-mono text-xs text-slate-400">
            <Info className="h-8 w-8 text-slate-500 mb-2" />
            <p className="text-slate-300 font-bold mb-1">No se encontraron registros con los filtros actuales</p>
            <p className="text-slate-500 text-[11px] max-w-md">
              Ajusta los términos de búsqueda o pulsa el botón de restaurar para recargar la bitácora histórica inicial.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead className="sticky top-0 z-10 border-b border-[#1E293B] bg-[#0E121C] text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Fecha / ID</th>
                <th className="py-2.5 px-3">Categoría & Formato</th>
                <th className="py-2.5 px-3">Fallo / Incidencia</th>
                <th className="py-2.5 px-3 hidden md:table-cell">Causa Raíz</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {registrosFiltrados.map((reg) => {
                const fechaLegible = new Date(reg.fecha).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                });

                return (
                  <tr
                    key={reg.id}
                    onClick={() => setRegistroDetalle(reg)}
                    className="hover:bg-slate-900/70 cursor-pointer transition-colors"
                  >
                    {/* Fecha / ID */}
                    <td className="py-3 px-3 align-top whitespace-nowrap">
                      <span className="font-bold text-slate-300 block tabular-nums">{fechaLegible}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{reg.id}</span>
                    </td>

                    {/* Categoría & Formato (Zero-Pill discipline: unboxed text with separators) */}
                    <td className="py-3 px-3 align-top">
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-cyan-400 font-medium">
                          {reg.categoria === 'lectura_documento'
                            ? 'Lectura Docs'
                            : reg.categoria === 'duplicado'
                            ? 'Duplicados'
                            : reg.categoria === 'parsing_ocr'
                            ? 'Parsing OCR'
                            : reg.categoria === 'validacion_catalogo'
                            ? 'Catálogo'
                            : 'Sistema'}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 uppercase text-[10px] font-bold">
                          {reg.tipoArchivo || 'doc'}
                        </span>
                      </div>
                      {reg.archivoAfectado && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[140px] block mt-0.5" title={reg.archivoAfectado}>
                          {reg.archivoAfectado}
                        </span>
                      )}
                    </td>

                    {/* Falla / Incidencia */}
                    <td className="py-3 px-3 align-top">
                      <div className="font-bold text-slate-100 leading-snug">{reg.titulo}</div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {reg.descripcion}
                      </p>
                    </td>

                    {/* Causa Raíz */}
                    <td className="py-3 px-3 align-top hidden md:table-cell max-w-xs">
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {reg.causaRaiz}
                      </p>
                    </td>

                    {/* Estado & Severidad */}
                    <td className="py-3 px-3 align-top whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            reg.estado === 'solucionado'
                              ? 'bg-[#00FF87]'
                              : reg.estado === 'mitigado'
                              ? 'bg-cyan-400'
                              : reg.estado === 'advertencia'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span
                          className={`text-xs font-bold ${
                            reg.estado === 'solucionado'
                              ? 'text-[#00FF87]'
                              : reg.estado === 'mitigado'
                              ? 'text-cyan-300'
                              : reg.estado === 'advertencia'
                              ? 'text-amber-300'
                              : 'text-rose-400'
                          }`}
                        >
                          {reg.estado === 'solucionado'
                            ? 'Solucionado'
                            : reg.estado === 'mitigado'
                            ? 'Mitigado'
                            : reg.estado === 'advertencia'
                            ? 'Advertencia'
                            : 'En Observación'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1 uppercase">
                        Sev: {reg.severidad}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegistroDetalle(reg);
                          }}
                          className="cursor-pointer rounded px-2 py-1 bg-slate-800 text-cyan-300 hover:bg-slate-700 hover:text-cyan-200 text-[11px] font-bold transition-colors"
                        >
                          Ver Detalle
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleEliminar(reg.id, e)}
                          className="cursor-pointer p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Modal de Diagnóstico Completo y Blindaje Técnico */}
      {registroDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-xl border border-slate-700 bg-[#0E121C] text-slate-200 shadow-2xl p-5 font-mono text-xs max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                    {registroDetalle.categoria.replace('_', ' ')} · {registroDetalle.tipoArchivo?.toUpperCase() || 'DOCUMENTO'}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-[10px] text-slate-400">ID: {registroDetalle.id}</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                  {registroDetalle.titulo}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setRegistroDetalle(null)}
                className="cursor-pointer text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ficha Diagnóstica */}
            <div className="space-y-4">
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px] font-bold block mb-1">
                  1. DESCRIPCIÓN DEL FALLO OBSERVADO:
                </span>
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {registroDetalle.descripcion}
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-amber-400 text-[11px] font-bold block mb-1">
                  2. CAUSA RAÍZ DIAGNOSTICADA:
                </span>
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {registroDetalle.causaRaiz}
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-rose-400 text-[11px] font-bold block mb-1">
                  3. IMPACTO EN EL INVENTARIO / NEGOCIO:
                </span>
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {registroDetalle.impacto}
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-[#00FF87] text-[11px] font-bold block mb-1">
                  4. SOLUCIÓN TÉCNICA Y BLINDAJE APLICADO:
                </span>
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {registroDetalle.solucionAplicada}
                </p>
              </div>

              {registroDetalle.detallesTecnicos && (
                <div className="bg-black/60 p-3 rounded-lg border border-cyan-500/30">
                  <span className="text-cyan-400 text-[11px] font-bold block mb-1">
                    5. CÓDIGO / PATRÓN IMPLEMENTADO:
                  </span>
                  <code className="text-cyan-200 text-[11px] leading-relaxed block overflow-x-auto">
                    {registroDetalle.detallesTecnicos}
                  </code>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Registrado: {new Date(registroDetalle.fecha).toLocaleString('es-AR')}</span>
                <span>Auditor: {registroDetalle.registradoPor || 'Sistema NOST-IA'}</span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRegistroDetalle(null)}
                className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Registrar Incidencia Manual */}
      {mostrarModalNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <form
            onSubmit={handleGuardarNuevo}
            className="relative w-full max-w-xl rounded-xl border border-slate-700 bg-[#0E121C] text-slate-200 shadow-2xl p-5 font-mono text-xs max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Registrar Incidencia / Fallo en Auditoría</h4>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalNuevo(false)}
                className="cursor-pointer text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Título de la Incidencia / Error:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Colapso de código en descripción de filtros de aceite"
                  value={nuevoForm.titulo}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, titulo: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Categoría:</label>
                  <select
                    value={nuevoForm.categoria}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, categoria: e.target.value as any })}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="lectura_documento">Lectura de Documento</option>
                    <option value="duplicado">Duplicado de Factura</option>
                    <option value="parsing_ocr">Parsing y Motor OCR</option>
                    <option value="validacion_catalogo">Validación con Catálogo</option>
                    <option value="sistema">Sistema / Local</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Formato / Origen:</label>
                  <select
                    value={nuevoForm.tipoArchivo}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, tipoArchivo: e.target.value as any })}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="pdf">PDF (Vectorial / Escaneado)</option>
                    <option value="jpg">JPG / PNG (Imagen OCR)</option>
                    <option value="txt">TXT / CSV</option>
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="pos">Venta POS / Mostrador</option>
                    <option value="db">Base de Datos / Dexie</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Severidad:</label>
                  <select
                    value={nuevoForm.severidad}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, severidad: e.target.value as any })}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="critica">Crítica (Bloqueo o distorsión de stock)</option>
                    <option value="alta">Alta (Disfunción operativa)</option>
                    <option value="media">Media (Advertencia o retraso)</option>
                    <option value="baja">Baja (Detalle cosmético)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Estado de Resolución:</label>
                  <select
                    value={nuevoForm.estado}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, estado: e.target.value as any })}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="observacion">En Observación</option>
                    <option value="advertencia">Advertencia Activa</option>
                    <option value="mitigado">Mitigado</option>
                    <option value="solucionado">Solucionado / Blindado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Archivo o Módulo Afectado (opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: remito_0003_mayorista.pdf"
                  value={nuevoForm.archivoAfectado}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, archivoAfectado: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descripción del Fallo:</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Detalla qué sucedió al procesar el archivo o la transacción..."
                  value={nuevoForm.descripcion}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, descripcion: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Causa Raíz:</label>
                <textarea
                  rows={2}
                  placeholder="Motivo técnico del error (regex laxa, columna desfasada, duplicado, etc.)..."
                  value={nuevoForm.causaRaiz}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, causaRaiz: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Solución Técnica o Pauta de Blindaje:</label>
                <textarea
                  rows={2}
                  placeholder="Cómo se solucionó o qué regla preventiva se aplicó..."
                  value={nuevoForm.solucionAplicada}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, solucionAplicada: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMostrarModalNuevo(false)}
                className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="cursor-pointer px-4 py-2 rounded-lg bg-[#00FF87] hover:bg-[#00FF87]/90 text-black text-xs font-mono font-bold shadow-lg"
              >
                Guardar en Auditoría Persistente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
