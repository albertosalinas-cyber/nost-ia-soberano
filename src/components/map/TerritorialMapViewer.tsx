import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Compass,
  Layers,
  MapPin,
  Download,
  Filter,
  Navigation,
  Eye,
  Sliders,
  Phone,
  Building,
  CheckCircle,
  Radio,
  Maximize2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge, RubroBadge } from '../ui/Badge';
import { GlassCard } from '../ui/GlassCard';
import type { PuntoTerritorial, RubroTerritorial } from '../../types';
import { ejecutarConsultaTerritorial, calcularDistanciaKm } from '../../engine/analytics';
import { audioFeedback } from '../../engine/audioFeedback';

interface TerritorialMapViewerProps {
  puntos: PuntoTerritorial[];
  onSelectPuntoParaPos?: (punto: PuntoTerritorial) => void;
}

export const TerritorialMapViewer: React.FC<TerritorialMapViewerProps> = ({
  puntos,
  onSelectPuntoParaPos,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Estados de control
  const [rubroFiltro, setRubroFiltro] = useState<string>('Todos');
  const [radioKm, setRadioKm] = useState<number>(15);
  const [busqueda, setBusqueda] = useState<string>('');
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<PuntoTerritorial | null>(puntos[0] || null);
  const [centroId, setCentroId] = useState<string>(puntos[0]?.id || '');
  const [vista3D, setVista3D] = useState<boolean>(true);
  const [modoCalor, setModoCalor] = useState<boolean>(true);
  const [anguloRotacion, setAnguloRotacion] = useState<number>(0);
  const [zoomNivel, setZoomNivel] = useState<number>(1);

  // Centro de coordenadas para el buffer radial
  const centroActual = useMemo(() => {
    const pt = puntos.find((p) => p.id === centroId);
    if (pt) return { lat: pt.lat, lng: pt.lng };
    return { lat: -34.6712, lng: -58.5621 }; // Buenos Aires centro promedio
  }, [puntos, centroId]);

  // Consulta analítica instantánea
  const analitica = useMemo(() => {
    return ejecutarConsultaTerritorial(puntos, {
      rubro: rubroFiltro,
      radioKm,
      centroCoord: centroActual,
      busquedaTexto: busqueda,
    });
  }, [puntos, rubroFiltro, radioKm, centroActual, busqueda]);

  // Exportar datos territoriales filtrados a CSV
  const exportarCsvTerritorial = () => {
    const encabezados = 'id,nombre,rubro,barrio,direccion,telefono,volumen_mensual,estado_comercial,distancia_km\n';
    const filas = analitica.puntosFiltrados
      .map(
        (p) =>
          `"${p.id}","${p.nombre}","${p.rubro}","${p.barrio}","${p.direccion}","${p.telefono}",${p.volumenMensual},"${p.estadoComercial}",${p.distanciaKm || 0}`
      )
      .join('\n');

    const blob = new Blob([encabezados + filas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `territorio_nost_ia_${rubroFiltro.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    audioFeedback.playBarcodeSuccess();
  };

  // Exportar a GeoJSON estándar
  const exportarGeoJsonTerritorial = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: analitica.puntosFiltrados.map((p) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat],
        },
        properties: {
          id: p.id,
          nombre: p.nombre,
          rubro: p.rubro,
          barrio: p.barrio,
          direccion: p.direccion,
          volumenMensual: p.volumenMensual,
          estadoComercial: p.estadoComercial,
          distanciaKm: p.distanciaKm,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `territorio_geojson_${Date.now()}.geojson`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    audioFeedback.playBarcodeSuccess();
  };

  // Renderizado del Mapa WebGL / HUD Canvas con aceleración por GPU
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Limpieza de buffer
    ctx.fillStyle = '#090A0F';
    ctx.fillRect(0, 0, width, height);

    // Rejilla Cyberpunk / HUD
    ctx.strokeStyle = '#141824';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Coordenadas bounding box automáticas
    const minLat = -35.1;
    const maxLat = -34.4;
    const minLng = -58.9;
    const maxLng = -57.8;

    const coordToScreen = (lat: number, lng: number) => {
      // Normalización 0 a 1
      let normX = (lng - minLng) / (maxLng - minLng);
      let normY = 1 - (lat - minLat) / (maxLat - minLat);

      let px = normX * (width - 160) + 80;
      let py = normY * (height - 160) + 80;

      // Transformación 3D isométrica si está activa
      if (vista3D) {
        const cx = width / 2;
        const cy = height / 2;
        const dx = px - cx;
        const dy = py - cy;
        // Inclinación y rotación sutil
        const rot = (anguloRotacion * Math.PI) / 180;
        const rx = dx * Math.cos(rot) - dy * Math.sin(rot);
        const ry = (dx * Math.sin(rot) + dy * Math.cos(rot)) * 0.75;
        px = cx + rx * zoomNivel;
        py = cy + ry * zoomNivel + 30;
      }

      return { x: px, y: py };
    };

    // Centro radial y anillo de buffer
    const centerScreen = coordToScreen(centroActual.lat, centroActual.lng);

    // Radio en píxeles aproximado
    const radioPixels = Math.min(width, height) * (radioKm / 45) * zoomNivel;

    // Dibujar buffer radial neón
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, radioPixels, 0, Math.PI * 2);
    ctx.strokeStyle = '#00FF87';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 255, 135, 0.04)';
    ctx.fill();
    ctx.restore();

    // Radar scan beam
    ctx.save();
    const radarAngle = ((Date.now() / 40) % 360) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(centerScreen.x, centerScreen.y);
    ctx.arc(centerScreen.x, centerScreen.y, radioPixels, radarAngle - 0.25, radarAngle);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 255, 135, 0.15)';
    ctx.fill();
    ctx.restore();

    // Dibujar capas de calor difusas si está activo
    if (modoCalor) {
      analitica.puntosFiltrados.forEach((p) => {
        const pos = coordToScreen(p.lat, p.lng);
        const radius = Math.min(60, (p.volumenMensual / 150) * zoomNivel);
        const grad = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, radius);
        grad.addColorStop(0, 'rgba(0, 210, 255, 0.25)');
        grad.addColorStop(0.5, 'rgba(0, 255, 135, 0.1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Dibujar redes territoriales / enlaces entre puntos
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < analitica.puntosFiltrados.length; i++) {
      for (let j = i + 1; j < analitica.puntosFiltrados.length; j++) {
        const p1 = analitica.puntosFiltrados[i];
        const p2 = analitica.puntosFiltrados[j];
        const d = calcularDistanciaKm(p1.lat, p1.lng, p2.lat, p2.lng);
        if (d < 12) {
          const pt1 = coordToScreen(p1.lat, p1.lng);
          const pt2 = coordToScreen(p2.lat, p2.lng);
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }
      }
    }

    // Dibujar Columnas 3D y Nodos Territoriales
    analitica.puntosFiltrados.forEach((p) => {
      const pos = coordToScreen(p.lat, p.lng);
      const esSeleccionado = puntoSeleccionado?.id === p.id;
      const esCentro = p.id === centroId;

      // Altura 3D proporcional al volumen mensual
      const columnHeight = vista3D ? Math.max(15, Math.min(80, (p.volumenMensual / 150) * zoomNivel)) : 0;

      // Color según rubro
      let baseColor = '#00D2FF';
      if (p.rubro === 'Cooperativa') baseColor = '#00FF87';
      if (p.rubro === 'Granja' || p.rubro === 'Cultivo') baseColor = '#FBBF24';
      if (p.rubro === 'Taller' || p.rubro === 'Acopio') baseColor = '#FF2E93';

      if (vista3D && columnHeight > 0) {
        // Columna 3D
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = esSeleccionado ? 3 : 1.5;
        ctx.fillStyle = esSeleccionado ? `${baseColor}99` : `${baseColor}33`;

        // Base y tope
        ctx.beginPath();
        ctx.moveTo(pos.x - 4, pos.y);
        ctx.lineTo(pos.x - 4, pos.y - columnHeight);
        ctx.lineTo(pos.x + 4, pos.y - columnHeight);
        ctx.lineTo(pos.x + 4, pos.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cima de la columna
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - columnHeight, esSeleccionado ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        // Marcador 2D
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, esSeleccionado ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = esSeleccionado ? 2 : 1;
        ctx.stroke();
      }

      // Marcador especial si es el centro del buffer
      if (esCentro) {
        ctx.strokeStyle = '#00FF87';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Etiqueta de texto si está seleccionado o cerca
      if (esSeleccionado || analitica.puntosFiltrados.length <= 8) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(p.nombre, pos.x + 8, pos.y - columnHeight - 4);
      }
    });
  }, [
    analitica,
    centroActual,
    centroId,
    puntoSeleccionado,
    radioKm,
    vista3D,
    modoCalor,
    anguloRotacion,
    zoomNivel,
  ]);

  // Animación del radar HUD continuo
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    animFrameRef.current = animId;

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [renderCanvas]);

  // Manejador de resize de canvas
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = Math.max(480, containerRef.current.clientHeight);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Click en el mapa para seleccionar punto más cercano
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Buscar punto más cercano
    let cercano: PuntoTerritorial | null = null;
    let menorDist = 30; // umbral de 30px

    const minLat = -35.1;
    const maxLat = -34.4;
    const minLng = -58.9;
    const maxLng = -57.8;

    analitica.puntosFiltrados.forEach((p) => {
      let normX = (p.lng - minLng) / (maxLng - minLng);
      let normY = 1 - (p.lat - minLat) / (maxLat - minLat);
      let px = normX * (canvas.width - 160) + 80;
      let py = normY * (canvas.height - 160) + 80;

      if (vista3D) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const dx = px - cx;
        const dy = py - cy;
        const rot = (anguloRotacion * Math.PI) / 180;
        const rx = dx * Math.cos(rot) - dy * Math.sin(rot);
        const ry = (dx * Math.sin(rot) + dy * Math.cos(rot)) * 0.75;
        px = cx + rx * zoomNivel;
        py = cy + ry * zoomNivel + 30;
      }

      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist < menorDist) {
        menorDist = dist;
        cercano = p;
      }
    });

    if (cercano) {
      setPuntoSeleccionado(cercano);
      audioFeedback.playBarcodeSuccess();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Filtros Analíticos DuckDB-Wasm Style */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1E293B] bg-[#0E111A] p-4 text-[#F8FAFC]">
        {/* Selector de Rubro */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#00FF87]" />
          <span className="text-xs font-mono text-slate-400">Rubro:</span>
          <div className="flex flex-wrap gap-1">
            {['Todos', 'Almacén', 'Cooperativa', 'Granja', 'Taller', 'Cultivo', 'Acopio'].map(
              (r) => (
                <button
                  key={r}
                  onClick={() => setRubroFiltro(r)}
                  className={`cursor-pointer rounded px-2 py-1 text-xs font-mono transition-all ${
                    rubroFiltro === r
                      ? 'bg-[#00FF87] text-black font-bold shadow-[0_0_8px_rgba(0,255,135,0.4)]'
                      : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              )
            )}
          </div>
        </div>

        {/* Radio Buffer Slider */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <Radio className="h-4 w-4 text-[#00D2FF]" />
          <span className="text-slate-400">Radio de Cobertura:</span>
          <input
            type="range"
            min="3"
            max="35"
            step="1"
            value={radioKm}
            onChange={(e) => setRadioKm(parseInt(e.target.value))}
            className="w-24 accent-[#00FF87] cursor-pointer"
          />
          <span className="font-bold text-[#00FF87] w-12">{radioKm} km</span>
        </div>

        {/* Controles de Vista y Exportación */}
        <div className="flex items-center gap-2">
          <Button
            variant={vista3D ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setVista3D(!vista3D)}
          >
            {vista3D ? 'Vista 3D Activa' : 'Vista 2D'}
          </Button>

          <Button
            variant={modoCalor ? 'cyber' : 'secondary'}
            size="sm"
            onClick={() => setModoCalor(!modoCalor)}
          >
            Mapa de Calor
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={exportarCsvTerritorial}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            Exportar CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={exportarGeoJsonTerritorial}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            GeoJSON
          </Button>
        </div>
      </div>

      {/* Contenedor Principal: Canvas 3D + HUD Lateral Flotante */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Canvas de Mapa 3D WebGL / HUD */}
        <div
          ref={containerRef}
          className="relative lg:col-span-8 min-h-[520px] rounded-xl border border-[#1E293B] bg-[#090A0F] overflow-hidden shadow-2xl"
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="h-full w-full cursor-crosshair block"
          />

          {/* Overlay de Telemetría HUD (esquina superior izquierda) */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1 rounded-lg border border-[#1E293B] bg-[#0E111A]/85 p-2.5 font-mono text-[11px] text-slate-300 backdrop-blur-md">
            <div className="flex items-center gap-2 text-[#00FF87] font-bold">
              <span className="h-2 w-2 rounded-full bg-[#00FF87] animate-pulse" />
              SISTEMA TERRITORIAL GEO-3D
            </div>
            <div>
              Puntos Activos: <span className="text-white font-bold">{analitica.puntosFiltrados.length}</span> / {puntos.length}
            </div>
            <div>
              Radio Buffer: <span className="text-[#00D2FF] font-bold">{radioKm} km</span>
            </div>
            <div>
              Volumen Red: <span className="text-white font-bold">${analitica.volumenTotalMensual.toLocaleString('es-AR')} k</span>
            </div>
          </div>

          {/* Controles de Cámara (zoom y rotación) */}
          <div className="absolute right-3 top-3 flex flex-col gap-1.5 rounded-lg border border-[#1E293B] bg-[#0E111A]/80 p-1.5 backdrop-blur-md">
            <button
              onClick={() => setZoomNivel((z) => Math.min(2.0, z + 0.15))}
              className="cursor-pointer rounded bg-slate-800 p-1 text-xs text-white hover:bg-slate-700"
              title="Acercar Zoom"
            >
              +
            </button>
            <button
              onClick={() => setZoomNivel((z) => Math.max(0.6, z - 0.15))}
              className="cursor-pointer rounded bg-slate-800 p-1 text-xs text-white hover:bg-slate-700"
              title="Alejar Zoom"
            >
              -
            </button>
            <button
              onClick={() => setAnguloRotacion((a) => (a + 15) % 360)}
              className="cursor-pointer rounded bg-slate-800 p-1 text-xs text-white hover:bg-slate-700"
              title="Rotar Plano 3D"
            >
              ↻
            </button>
          </div>

          {/* Leyenda de Rubros Inferior */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1E293B] bg-[#0E111A]/90 p-2 font-mono text-[11px] backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[#00D2FF]">
                <span className="h-2 w-2 rounded-full bg-[#00D2FF]" /> Almacén
              </span>
              <span className="flex items-center gap-1 text-[#00FF87]">
                <span className="h-2 w-2 rounded-full bg-[#00FF87]" /> Cooperativa
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Granja/Cultivo
              </span>
              <span className="flex items-center gap-1 text-[#FF2E93]">
                <span className="h-2 w-2 rounded-full bg-[#FF2E93]" /> Taller/Acopio
              </span>
            </div>
            <span className="text-slate-400">Haz clic sobre cualquier punto para inspeccionarlo</span>
          </div>
        </div>

        {/* Panel Lateral HUD de Información y Detalle de Punto Territorial */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {puntoSeleccionado ? (
            <GlassCard variant="hud" className="flex flex-col gap-4 font-mono text-xs">
              <div className="flex items-start justify-between border-b border-[#1E293B] pb-3">
                <div>
                  <RubroBadge rubro={puntoSeleccionado.rubro} />
                  <h3 className="mt-1 text-base font-bold text-white">
                    {puntoSeleccionado.nombre}
                  </h3>
                  <p className="text-slate-400 text-[11px]">{puntoSeleccionado.subtitulo}</p>
                </div>
                <Badge variant={puntoSeleccionado.estadoComercial === 'activo' ? 'green' : 'yellow'}>
                  {puntoSeleccionado.estadoComercial}
                </Badge>
              </div>

              {/* Métricas del Nodo */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[#1E293B] bg-[#141824] p-2">
                  <span className="text-[10px] text-slate-400">Volumen Comercial:</span>
                  <div className="text-sm font-bold text-[#00FF87]">
                    ${puntoSeleccionado.volumenMensual.toLocaleString('es-AR')} k / mes
                  </div>
                </div>

                <div className="rounded-lg border border-[#1E293B] bg-[#141824] p-2">
                  <span className="text-[10px] text-slate-400">Distancia al Hub:</span>
                  <div className="text-sm font-bold text-[#00D2FF]">
                    {calcularDistanciaKm(
                      centroActual.lat,
                      centroActual.lng,
                      puntoSeleccionado.lat,
                      puntoSeleccionado.lng
                    )}{' '}
                    km
                  </div>
                </div>
              </div>

              {/* Datos de Contacto y Ubicación */}
              <div className="space-y-2 rounded-lg border border-[#1E293B] bg-[#12151E] p-3 text-slate-300">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#00FF87] shrink-0" />
                  <span>
                    {puntoSeleccionado.direccion}, {puntoSeleccionado.barrio}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#00D2FF] shrink-0" />
                  <span>{puntoSeleccionado.telefono} ({puntoSeleccionado.contacto})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-slate-400">
                    Coords: {puntoSeleccionado.lat.toFixed(4)}, {puntoSeleccionado.lng.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Notas Estratégicas */}
              <div className="rounded-lg border border-slate-800 bg-[#090A0F] p-3 text-slate-300">
                <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                  Diagnóstico y Notas Territoriales:
                </span>
                <p className="text-[11px] leading-relaxed">{puntoSeleccionado.notas}</p>
              </div>

              {/* Botón para fijar como centro de buffer */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="cyber"
                  size="sm"
                  onClick={() => {
                    setCentroId(puntoSeleccionado.id);
                    audioFeedback.playBarcodeSuccess();
                  }}
                  icon={<Radio className="h-4 w-4" />}
                >
                  Fijar como Centro del Radio ({radioKm}km)
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="rounded-xl border border-[#1E293B] bg-[#0E111A] p-6 text-center text-slate-500 font-mono text-xs">
              Selecciona un punto en el mapa para ver la ficha territorial detallada.
            </div>
          )}

          {/* Lista de Puntos Filtrados en el Buffer */}
          <div className="flex flex-col gap-2 rounded-xl border border-[#1E293B] bg-[#0E111A] p-3 font-mono text-xs max-h-56 overflow-y-auto">
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
              Nodos dentro del Radio ({analitica.puntosFiltrados.length})
            </span>
            {analitica.puntosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPuntoSeleccionado(p);
                  audioFeedback.playBarcodeSuccess();
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded p-2 text-left transition-all ${
                  puntoSeleccionado?.id === p.id
                    ? 'border border-[#00FF87]/50 bg-[#00FF87]/10 text-white'
                    : 'bg-[#12151E] text-slate-300 hover:bg-[#1E293B]'
                }`}
              >
                <div>
                  <div className="font-semibold">{p.nombre}</div>
                  <div className="text-[10px] text-slate-400">{p.barrio}</div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#00FF87]">{p.distanciaKm} km</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
