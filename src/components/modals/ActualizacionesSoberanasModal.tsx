import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Lock,
  Download,
  CheckCircle2,
  AlertCircle,
  Phone,
  ArrowRight,
  RefreshCw,
  HardDrive,
  Cpu,
  Key,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { audioFeedback } from '../../engine/audioFeedback';
import { verificarClaveSegura, validarCodigoLicencia } from '../../engine/securityEngine';
import type { LicenciaSoberana, PerfilComercio } from '../../types';

interface VersionManifest {
  version: string;
  nombre: string;
  fecha: string;
  autor: string;
  lema: string;
  cambios: string[];
  mejorasSeguridad: string[];
  urlInfo?: string;
}

interface ActualizacionesSoberanasModalProps {
  onCerrar: () => void;
  licencia: LicenciaSoberana | null;
  perfilComercio: PerfilComercio | null;
}

export const ActualizacionesSoberanasModal: React.FC<ActualizacionesSoberanasModalProps> = ({
  onCerrar,
  licencia,
  perfilComercio,
}) => {
  const [versionManifest, setVersionManifest] = useState<VersionManifest | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [claveGestionInput, setClaveGestionInput] = useState<string>('');
  const [claveSalinasInput, setClaveSalinasInput] = useState<string>(licencia?.codigoActivo || '');
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [dobleClaveValida, setDobleClaveValida] = useState<boolean>(false);
  const [descargaIniciada, setDescargaIniciada] = useState<boolean>(false);

  useEffect(() => {
    const consultarVersion = async () => {
      try {
        const resp = await fetch('/version.json');
        if (resp.ok) {
          const data = await resp.json();
          setVersionManifest(data);
        } else {
          // Fallback manifest
          setVersionManifest({
            version: '1.2.0',
            nombre: 'NOST-IA - Actualización Soberana Territorial',
            fecha: '2026-09-29',
            autor: 'Profesor en Bibliotecología e Informática ALBERTO SALINAS MENDIETA',
            lema: 'Inteligencia Artificial al servicio del Territorio',
            cambios: [
              'Motor VDU 2D optimizado para remitos y tickets fiscales AFIP de distribución argentina.',
              'Persistencia blindada con resguardo automático al cierre del día comercial.',
              'Doble verificación criptográfica para actualización de nodos con servicio activo.',
              'Matriz de veto de 5 etapas para evitar unificación de bultos pesados y unidades menores.',
            ],
            mejorasSeguridad: [
              'Validación timing-safe en comprobación de doble clave de actualización.',
              'Aislamiento estricto de base de datos local (Dexie/IndexedDB) sin telemetría.',
              'Protección de base de datos: nunca se sobrescriben tablas existentes durante actualizaciones.',
            ],
          });
        }
      } catch {
        // Fallback offline
        setVersionManifest({
          version: '1.2.0',
          nombre: 'NOST-IA - Actualización Soberana Territorial',
          fecha: '2026-09-29',
          autor: 'Profesor en Bibliotecología e Informática ALBERTO SALINAS MENDIETA',
          lema: 'Inteligencia Artificial al servicio del Territorio',
          cambios: [
            'Motor VDU 2D optimizado para remitos y tickets fiscales AFIP.',
            'Cierre de día comercial y resguardo portátil en un clic.',
            'Matriz de veto de 5 etapas sin confusión de productos.',
          ],
          mejorasSeguridad: [
            'Protección estricta de base de datos local.',
            'Cero telemetría ni fugas de datos.',
          ],
        });
      } finally {
        setCargando(false);
      }
    };
    consultarVersion();
  }, []);

  const handleValidarDobleClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    // 1. Validar Clave de Gestión Local del Comercio
    if (perfilComercio?.claveSeguridadHash && perfilComercio?.claveSeguridadSalt) {
      const okGestion = await verificarClaveSegura(
        claveGestionInput,
        perfilComercio.claveSeguridadHash,
        perfilComercio.claveSeguridadSalt
      );
      if (!okGestion) {
        setErrorValidacion('❌ Clave de Seguridad de Gestión incorrecta.');
        audioFeedback.playErrorAlert();
        return;
      }
    }

    // 2. Validar Clave Oficial de Alberto Salinas (Servicio Activo)
    const resSalinas = validarCodigoLicencia(claveSalinasInput, perfilComercio?.nombreComercio);
    if (!resSalinas.valido) {
      setErrorValidacion(`❌ Clave Oficial de Alberto Salinas no válida: ${resSalinas.motivo}`);
      audioFeedback.playErrorAlert();
      return;
    }

    setDobleClaveValida(true);
    audioFeedback.playPosSaleSuccess();
  };

  const handleDescargarActualizacion = () => {
    setDescargaIniciada(true);
    audioFeedback.playPosSaleSuccess();
    // Generar archivo manifiesto de actualización descargable
    const blob = new Blob(
      [
        JSON.stringify(
          {
            paquete: 'NOST-IA-UPDATE-v1.2.0',
            fecha: new Date().toISOString(),
            autorizadoPor: 'Profesor en Bibliotecología e Informática ALBERTO SALINAS MENDIETA',
            comercio: perfilComercio?.nombreComercio || 'Comercio Territorial',
            preservarBaseDatos: true,
            instrucciones:
              'Ejecuta la actualización normalmente. Tu base de datos Dexie/IndexedDB existente no será alterada.',
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nost_ia_update_v${versionManifest?.version || '1.2.0'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border-2 border-cyan-500/50 bg-[#0A101D] p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-[#00D2FF] border border-cyan-500/40 shadow-[0_0_15px_rgba(0,210,255,0.2)]">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-mono text-white">
                  Sistema de Actualizaciones Soberanas
                </h3>
                <Badge variant="cyan">v{versionManifest?.version || '1.2.0'}</Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Protocolo Respetuoso Offline • Cero Telemetría • Base de Datos Inmutable
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="cursor-pointer text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Información de Versión */}
        {cargando ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            Consultando estado de actualización...
          </div>
        ) : (
          <div className="space-y-4 font-mono text-xs">
            {/* Tarjeta de Novedades */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Novedades de la Versión {versionManifest?.version}:
                </span>
                <span className="text-[10px] text-slate-400">{versionManifest?.fecha}</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 font-sans text-xs">
                {versionManifest?.cambios.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#00FF87] shrink-0 font-mono">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Garantía de Preservación de Base de Datos */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-[#00FF87] font-bold">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Garantía de Preservación de Datos:</span>
              </div>
              <p className="text-slate-300 font-sans text-xs leading-relaxed">
                Toda actualización de NOST-IA <strong>respeta y conserva intacta tu base de datos de productos, ventas y costos (`comercio.db`)</strong>. Ninguna tabla es sobrescrita ni eliminada.
              </p>
            </div>

            {/* Condicional según estado de contratación */}
            {licencia?.activa ? (
              // Usuario con Servicio Activo: Doble Clave para descargar actualización
              <div className="rounded-xl border-2 border-emerald-500/60 bg-[#0D1826] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#00FF87]" />
                    Validación de Doble Clave Soberana para Actualización
                  </span>
                  <Badge variant="success">SERVICIO CONTRATADO</Badge>
                </div>

                {!dobleClaveValida ? (
                  <form onSubmit={handleValidarDobleClave} className="space-y-3">
                    <p className="text-slate-300 font-sans text-xs">
                      Para aplicar la actualización y parches de seguridad, ingresá tu <strong>Clave de Seguridad de Gestión</strong> y tu <strong>Clave Oficial de Alberto Salinas</strong>:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 block font-bold">
                          1. Clave de Seguridad Local (Onboarding):
                        </label>
                        <input
                          type="password"
                          value={claveGestionInput}
                          onChange={(e) => setClaveGestionInput(e.target.value)}
                          placeholder="Tu clave de gestión..."
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono text-xs focus:border-[#00FF87] focus:outline-none"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-300 block font-bold">
                          2. Clave Oficial de Alberto Salinas:
                        </label>
                        <input
                          type="text"
                          value={claveSalinasInput}
                          onChange={(e) => setClaveSalinasInput(e.target.value)}
                          placeholder="Ej: NOST-2026-SOBERANO..."
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[#00FF87] font-mono text-xs uppercase focus:border-[#00FF87] focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    {errorValidacion && (
                      <div className="rounded-lg bg-rose-500/20 border border-rose-500 p-2 text-rose-300 text-xs">
                        {errorValidacion}
                      </div>
                    )}

                    <Button variant="cyber" size="md" type="submit" className="w-full justify-center gap-2">
                      <Key className="h-4 w-4" />
                      <span>Verificar Doble Clave y Desbloquear Actualización</span>
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-emerald-500/20 border border-emerald-500 p-3 text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <span>Doble Clave verificada con éxito. Actualización autorizada para tu nodo.</span>
                    </div>

                    <Button
                      variant="cyber"
                      size="lg"
                      onClick={handleDescargarActualizacion}
                      className="w-full justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>{descargaIniciada ? '¡Paquete Descargado!' : 'Descargar Paquete de Actualización Soberana'}</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Usuario en Versión Libre: Aviso de contratación para soporte y mejoras
              <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#00D2FF] font-bold">
                  <Info className="h-4 w-4" />
                  <span>¿Cómo obtener las actualizaciones y soporte técnico?</span>
                </div>
                <p className="text-slate-300 font-sans text-xs leading-relaxed">
                  La herramienta es libre y gratuita para su uso básico territorial. Las <strong>actualizaciones continuas, capacitación, soporte de ciberseguridad y adaptación a nuevos formatos de facturas</strong> forman parte del servicio de acompañamiento profesional del Profesor Alberto Salinas Mendieta.
                </p>
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-300">
                    Coordiná tu servicio de actualización por WhatsApp: <strong className="text-white">11-3768-9803</strong>
                  </div>
                  <a
                    href="https://wa.me/5491137689803?text=Hola%20Profesor%20Alberto%20Salinas,%20deseo%20contratar%20el%20servicio%20completo%20de%20actualizaciones%20de%20NOST-IA"
                    target="_blank"
                    rel="noreferrer"
                    className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black transition-colors shrink-0"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Contactar</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <Button variant="outline" size="sm" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
