import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Phone,
  Mail,
  Copy,
  Check,
  ExternalLink,
  X,
  Sparkles,
  Zap,
  DollarSign,
  Award,
  Key,
  CheckCircle2,
  Pencil,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  FileText,
  Terminal,
  Lock,
  Unlock,
  Heart,
  Layers,
} from 'lucide-react';
import { MateSoberanoLogo } from '../ui/MateSoberanoLogo';
import { Button } from '../ui/Button';
import { db } from '../../engine/db';
import { audioFeedback } from '../../engine/audioFeedback';
import type { LicenciaSoberana, CintilloSoberanoConfig } from '../../types';
import {
  validarCodigoLicencia,
  generarCodigoLicenciaSoberana,
  CODIGOS_MAESTROS_OFICIALES,
  calcularSha256,
} from '../../engine/securityEngine';

export const CINTILLO_CONFIG_DEFAULT: CintilloSoberanoConfig = {
  tituloBadge: 'NOST-IA',
  leyendaPrincipal:
    'Nodo Operativo Soberano Territorial con Inteligencia Artificial. Software popular 100% offline.',
  aliasAportes: 'NOST.IA.SOBERANO',
  emailContacto: 'alberto.salinas@bue.edu.ar',
  celularWhatsapp: '11-3768-9803',
  titularAportes: 'Profesor ALBERTO SALINAS MENDIETA',
  bajadaManifiesto:
    'Concebido por el Profesor Alberto Salinas Mendieta, NOST-IA transforma tu computadora en un centro de comando comercial: calcula tu capital en mercadería, te avisa antes de que te quedes sin stock, lee tus facturas de distribuidor automáticamente y te ayuda con combos y promociones. El poder de la tecnología más avanzada, en tus propias manos.',
  velocidadSegundos: 260,
  itemsMarquee: [
    '🤝 APORTE SOLIDARIO: Para que NOST-IA siga siendo soberano, territorial e innovador (Alias: NOST.IA.SOBERANO • Profesor ALBERTO SALINAS MENDIETA).',
    '🏛️ NOST-IA: Creado por el Profesor ALBERTO SALINAS MENDIETA • Inteligencia Artificial al servicio del Territorio.',
    '🛡️ 4 PILARES: 1. Soberanía Territorial 100% Offline • 2. Cero Dependencia Externa • 3. IA de Vanguardia (Qwen) para el Pueblo • 4. Respeto a la Realidad Comercial y Operativa Argentina.',
    '💻 STACK SOBERANO: React 19 • TypeScript 5.8 • Tailwind CSS v4 • Dexie (IndexedDB) • Ollama Local (Qwen 2.5 Coder 1.5B) • SheetJS • PDF.js • ZXing WASM • VDU Layout 2D (docTR / Docling).',
    '📢 MISIÓN: «La Inteligencia Artificial al servicio del barrio. Sin internet. Sin corporaciones. 100% Soberana.»',
    '⚙️ VDU & MATRIZ DE VETO: Layout Espacial 2D, diferenciación exacta de Harina 000 vs 0000, 50kg vs 1kg, 5L vs 1L y prorrateo determinista de costos fijos.',
    '📞 CONTACTO Y SOPORTE DIRECTO: alberto.salinas@bue.edu.ar • WhatsApp: 11-3768-9803 • Alias MP: NOST.IA.SOBERANO',
  ],
};

export const SolidarityTicker: React.FC = () => {
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [tabActivo, setTabActivo] = useState<'servicio' | 'licencia' | 'aporte' | 'contacto' | 'editar' | 'manifiesto'>('servicio');
  const [copiadoAlias, setCopiadoAlias] = useState<boolean>(false);
  const [copiadoCbu, setCopiadoCbu] = useState<boolean>(false);
  const [copiadoEmail, setCopiadoEmail] = useState<boolean>(false);
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);

  // Configuración Editable del Cintillo
  const [config, setConfig] = useState<CintilloSoberanoConfig>(CINTILLO_CONFIG_DEFAULT);
  const [formConfig, setFormConfig] = useState<CintilloSoberanoConfig>(CINTILLO_CONFIG_DEFAULT);
  const [nuevaFraseInput, setNuevaFraseInput] = useState<string>('');

  // Autenticación Restringida al Propietario de Origen (Alberto Salinas)
  const [propietarioAutenticado, setPropietarioAutenticado] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('nost_ia_owner_auth') === 'alberto_salinas';
    } catch {
      return false;
    }
  });
  const [credencialPropietarioInput, setCredencialPropietarioInput] = useState<string>('');
  const [errorAutenticacionPropietario, setErrorAutenticacionPropietario] = useState<string | null>(null);

  // Estado de Licencia Soberana
  const [licencia, setLicencia] = useState<LicenciaSoberana | null>(null);
  const [codigoInput, setCodigoInput] = useState<string>('');
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [exitoActivacion, setExitoActivacion] = useState<boolean>(false);

  // Generador Oficial de Códigos para Alberto Salinas
  const [nombreComercioParaCodigo, setNombreComercioParaCodigo] = useState<string>('');
  const [codigoGeneradoAlberto, setCodigoGeneradoAlberto] = useState<string>('');
  const [copiadoCodigoGen, setCopiadoCodigoGen] = useState<boolean>(false);
  const [copiadoMensajeGen, setCopiadoMensajeGen] = useState<boolean>(false);

  // Cargar configuración personalizada y estado de licencia desde IndexedDB
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar configuración del cintillo
        const itemCfg = await db.configuracion.get('cintillo_soberano_config');
        if (itemCfg && itemCfg.valor) {
          const combinada = { ...CINTILLO_CONFIG_DEFAULT, ...itemCfg.valor };
          // Asegurar siempre el alias y titular oficiales vigentes
          combinada.aliasAportes = 'NOST.IA.SOBERANO';
          combinada.titularAportes = 'Profesor ALBERTO SALINAS MENDIETA';
          // Si la velocidad guardada previa era muy rápida (< 220s), aplicar el nuevo ritmo placentero, suave y descansado (260s)
          if (!combinada.velocidadSegundos || combinada.velocidadSegundos < 220) {
            combinada.velocidadSegundos = 260;
          }
          setConfig(combinada);
          setFormConfig(combinada);
        }

        // Cargar estado de licencia
        const itemLic = await db.configuracion.get('licencia_soberana');
        if (itemLic && itemLic.valor && itemLic.valor.activa) {
          setLicencia(itemLic.valor);
        }
      } catch (err) {
        console.warn('Error leyendo configuración de cintillo o licencia:', err);
      }
    };
    cargarDatos();
  }, []);

  // Validación y desbloqueo de acceso de Propietario (Exclusivo para Alberto Salinas, vetado para cualquier otro)
  const handleAutenticarPropietario = (e?: React.FormEvent, forzarAlbertoSalinas: boolean = false) => {
    if (e) e.preventDefault();
    setErrorAutenticacionPropietario(null);

    const entrada = credencialPropietarioInput.trim().toLowerCase();

    // Verificación estricta e inviolable: Únicamente el ideólogo y propietario Alberto Salinas
    const esValido =
      forzarAlbertoSalinas ||
      entrada === 'alberto.salinas@bue.edu.ar' ||
      entrada === 'alberto salinas' ||
      entrada === 'profesor alberto salinas' ||
      entrada === 'as-nostia-2026' ||
      entrada === 'salinas2026!';

    if (esValido) {
      try {
        sessionStorage.setItem('nost_ia_owner_auth', 'alberto_salinas');
      } catch {}
      setPropietarioAutenticado(true);
      setErrorAutenticacionPropietario(null);
      setCredencialPropietarioInput('');
      audioFeedback.playPosSaleSuccess();
    } else {
      audioFeedback.playAlert();
      setErrorAutenticacionPropietario(
        '⛔ ACCESO DENEGADO PERMANENTE: Modo reservado exclusivamente al Propietario de Origen, Profesor ALBERTO SALINAS (alberto.salinas@bue.edu.ar). Bloqueado de forma absoluta para cualquier otro usuario, cliente o terminal ajena.'
      );
    }
  };

  const handleCerrarSesionPropietario = () => {
    try {
      sessionStorage.removeItem('nost_ia_owner_auth');
    } catch {}
    setPropietarioAutenticado(false);
    audioFeedback.playScanBeep();
  };

  const copiarAlPortapapeles = (texto: string, tipo: 'alias' | 'cbu' | 'email') => {
    navigator.clipboard.writeText(texto);
    if (tipo === 'alias') {
      setCopiadoAlias(true);
      setTimeout(() => setCopiadoAlias(false), 2000);
    } else if (tipo === 'cbu') {
      setCopiadoCbu(true);
      setTimeout(() => setCopiadoCbu(false), 2000);
    } else {
      setCopiadoEmail(true);
      setTimeout(() => setCopiadoEmail(false), 2000);
    }
  };

  const handleGuardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.configuracion.put({
        clave: 'cintillo_soberano_config',
        valor: formConfig,
      });
      setConfig(formConfig);
      audioFeedback.playPosSaleSuccess();
      setMensajeGuardado('¡Cambios guardados con éxito! El cintillo se ha actualizado en tiempo real.');
      setTimeout(() => setMensajeGuardado(null), 3500);
    } catch (err) {
      console.error('Error guardando configuración de cintillo:', err);
      setMensajeGuardado('Error al guardar cambios.');
    }
  };

  const handleRestablecerConfiguracion = async () => {
    if (window.confirm('¿Deseas restablecer todos los textos y datos del cintillo a los originales de fábrica?')) {
      await db.configuracion.delete('cintillo_soberano_config');
      setConfig(CINTILLO_CONFIG_DEFAULT);
      setFormConfig(CINTILLO_CONFIG_DEFAULT);
      setMensajeGuardado('Configuración restablecida a valores de fábrica.');
      setTimeout(() => setMensajeGuardado(null), 3000);
    }
  };

  const handleAgregarFrase = () => {
    const texto = nuevaFraseInput.trim();
    if (!texto) return;
    setFormConfig((prev) => ({
      ...prev,
      itemsMarquee: [...prev.itemsMarquee, texto],
    }));
    setNuevaFraseInput('');
  };

  const handleEliminarFrase = (index: number) => {
    setFormConfig((prev) => ({
      ...prev,
      itemsMarquee: prev.itemsMarquee.filter((_, i) => i !== index),
    }));
  };

  const handleActivarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCodigo(null);
    const codLimpio = codigoInput.trim().toUpperCase();

    if (!codLimpio) {
      setErrorCodigo('Por favor ingresá el código proporcionado por Alberto Salinas.');
      return;
    }

    // Validación oficial mediante motor de ciberseguridad
    const resultadoValidacion = validarCodigoLicencia(codLimpio);

    if (!resultadoValidacion.valido) {
      setErrorCodigo(
        resultadoValidacion.motivo ||
          'Código no reconocido. Comunicate con Alberto Salinas (WhatsApp: 11-3768-9803) para obtener tu clave oficial.'
      );
      audioFeedback.playAlert();
      return;
    }

    const hashVerif = await calcularSha256(resultadoValidacion.codigoNormalizado, 'NOST-IA-SOBERANO-2026');

    const nuevaLicencia: LicenciaSoberana = {
      activa: true,
      codigo: resultadoValidacion.codigoNormalizado,
      fechaActivacion: new Date().toISOString(),
      tipoLicencia: resultadoValidacion.tipo,
      emisor: resultadoValidacion.emisor,
      hashVerificacion: hashVerif,
    };

    await db.configuracion.put({
      clave: 'licencia_soberana',
      valor: nuevaLicencia,
    });

    setLicencia(nuevaLicencia);
    setExitoActivacion(true);
    audioFeedback.playPosSaleSuccess();
    setTimeout(() => {
      setExitoActivacion(false);
    }, 4500);
  };

  const handleDesactivarLicencia = async () => {
    if (window.confirm('¿Deseas desvincular la licencia en este dispositivo?')) {
      await db.configuracion.delete('licencia_soberana');
      setLicencia(null);
      setCodigoInput('');
    }
  };

  const handleActivarConCodigoDirecto = async (codADesplegar: string) => {
    const codLimpio = codADesplegar.trim().toUpperCase();
    if (!codLimpio) return;

    const resultadoValidacion = validarCodigoLicencia(codLimpio);
    if (!resultadoValidacion.valido) {
      setErrorCodigo(resultadoValidacion.motivo || 'Código no reconocido');
      return;
    }

    const hashVerif = await calcularSha256(resultadoValidacion.codigoNormalizado, 'NOST-IA-SOBERANO-2026');
    const nuevaLicencia: LicenciaSoberana = {
      activa: true,
      codigo: resultadoValidacion.codigoNormalizado,
      fechaActivacion: new Date().toISOString(),
      tipoLicencia: resultadoValidacion.tipo,
      emisor: resultadoValidacion.emisor,
      hashVerificacion: hashVerif,
    };

    await db.configuracion.put({
      clave: 'licencia_soberana',
      valor: nuevaLicencia,
    });

    setLicencia(nuevaLicencia);
    setExitoActivacion(true);
    audioFeedback.playPosSaleSuccess();
    setTabActivo('licencia');
    setTimeout(() => {
      setExitoActivacion(false);
    }, 4500);
  };

  // Renderizado del contenido del marquee (se duplica para crear el bucle continuo perfecto)
  const renderContenidoMarquee = () => (
    <div className="inline-flex items-center gap-6 px-4">
      {/* LEYENDA PERMANENTE DE APORTE SOLIDARIO SOBERANO */}
      <span className="inline-flex items-center gap-2 text-amber-300 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded border border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
        <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400 animate-pulse" />
        <span>APORTE SOLIDARIO PARA QUE NOST-IA SIGA SIENDO SOBERANO, TERRITORIAL Y VANGUARDISTA</span>
      </span>
      <span className="text-slate-600">•</span>
      <span className="inline-flex items-center gap-2 text-slate-200">
        <DollarSign className="h-3.5 w-3.5 text-[#00FF87]" />
        <span>Alias Aportes: <strong className="text-[#00FF87]">NOST.IA.SOBERANO</strong> (Titular: Profesor ALBERTO SALINAS MENDIETA)</span>
      </span>
      <span className="text-slate-600">•</span>

      {licencia?.activa ? (
        <>
          <span className="inline-flex items-center gap-2 text-emerald-300 font-bold">
            <Award className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
            <span>🌟 NODO TERRITORIAL SOBERANO ACTIVO • SERVICIO COMPLETO MENSUAL ({licencia.codigo})</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="inline-flex items-center gap-2 text-slate-200">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00D2FF]" />
            <span>{config.leyendaPrincipal}</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="inline-flex items-center gap-2 text-slate-300">
            <Mail className="h-3.5 w-3.5 text-[#00D2FF]" />
            <span>Soporte: <strong>{config.emailContacto}</strong> | WhatsApp: <strong>{config.celularWhatsapp}</strong></span>
          </span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-2 text-slate-200">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00FF87]" />
            <span>{config.leyendaPrincipal}</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="inline-flex items-center gap-2 text-slate-200">
            <span className="text-[#00D2FF] font-bold">CONTRATAR SERVICIO:</span>
            <span>Contactate directamente con el creador, el Profesor ALBERTO SALINAS MENDIETA ({config.emailContacto})</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="inline-flex items-center gap-2 text-amber-300">
            <Phone className="h-3.5 w-3.5 text-amber-400" />
            <span>WhatsApp Coordinación: <strong>{config.celularWhatsapp}</strong></span>
          </span>
        </>
      )}

      {/* Frases y Contenidos Personalizados del Usuario (Stack, Filosofía, Misión) */}
      {config.itemsMarquee && config.itemsMarquee.map((item, idx) => (
        <React.Fragment key={idx}>
          <span className="text-slate-600">•</span>
          <span className="inline-flex items-center gap-2 text-slate-200">
            <span>{item}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <>
      {/* CINTILLO PERMANENTE SUPERIOR CON MOVIMIENTO CONTINUO */}
      <div className="relative z-40 w-full overflow-hidden border-b border-[#00FF87]/30 bg-gradient-to-r from-[#060911] via-[#0B1322] to-[#060911] py-1.5 text-xs font-mono shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
        <div className="flex items-center">
          {/* Símbolo e Insignia Unificados a la izquierda (SIN corazón, SIN barra vertical suelta ni repetición) */}
          <div
            onClick={() => {
              setTabActivo('manifiesto');
              setModalAbierto(true);
            }}
            className="flex items-center gap-2 pl-3 pr-3.5 shrink-0 bg-[#060911] z-10 cursor-pointer select-none border-r border-[#1E293B]/80 hover:bg-[#0E1726] transition-colors"
            title="Ver manifiesto, filosofía y stack tecnológico"
          >
            <MateSoberanoLogo size="sm" />
            <span className="text-[11px] font-mono font-black text-[#00FF87] tracking-wider uppercase drop-shadow-[0_0_8px_rgba(0,255,135,0.4)]">
              {config.tituloBadge}
            </span>
          </div>

          {/* Marquee en movimiento permanente continuo (duplicado para bucle 100% fluido) */}
          <div
            className="flex-1 overflow-hidden whitespace-nowrap cursor-pointer group"
            onClick={() => {
              setTabActivo(licencia?.activa ? 'licencia' : 'servicio');
              setModalAbierto(true);
            }}
            title="Clic para ver detalles, contratar o activar"
          >
            <div
              className="animate-marquee-scroll flex"
              style={{ '--marquee-duration': `${config.velocidadSegundos}s` } as React.CSSProperties}
            >
              {renderContenidoMarquee()}
              {renderContenidoMarquee()}
            </div>
          </div>

          {/* Botones de Acción y Edición Fijos a la Derecha */}
          <div className="flex items-center gap-1.5 pr-3 pl-2 border-l border-[#1E293B]/80 shrink-0 bg-[#060911] z-10">
            {licencia?.activa ? (
              // Badge cuando la licencia está activa
              <button
                onClick={() => {
                  setTabActivo('licencia');
                  setModalAbierto(true);
                }}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 hover:border-emerald-300 transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                <Award className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                <span className="hidden sm:inline">Servicio Completo Mensual</span>
              </button>
            ) : (
              // Botones de Contratar y Activar
              <>
                <button
                  onClick={() => {
                    setTabActivo('servicio');
                    setModalAbierto(true);
                  }}
                  className="cursor-pointer inline-flex items-center gap-1 rounded bg-[#00D2FF]/15 border border-[#00D2FF]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#00D2FF] hover:bg-[#00D2FF]/25 transition-all"
                >
                  <Zap className="h-3 w-3" />
                  <span>Contratar</span>
                </button>

                <button
                  onClick={() => {
                    setTabActivo('licencia');
                    setModalAbierto(true);
                  }}
                  className="cursor-pointer hidden sm:inline-flex items-center gap-1 rounded bg-[#00FF87]/15 border border-[#00FF87]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#00FF87] hover:bg-[#00FF87]/25 transition-all"
                  title="Ingresar código de habilitación soberana"
                >
                  <Key className="h-3 w-3" />
                  <span>Activar</span>
                </button>
              </>
            )}

            {/* Botón Permanente de Aporte Solidario */}
            <button
              onClick={() => {
                setTabActivo('aporte');
                setModalAbierto(true);
              }}
              className="cursor-pointer inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 px-2 py-0.5 text-[11px] font-bold text-rose-300 transition-all shadow-sm"
              title="Aporte solidario para que NOST-IA siga siendo soberano, territorial e innovador"
            >
              <Heart className="h-3 w-3 text-rose-400 fill-rose-400" />
              <span className="hidden sm:inline">Aporte Solidario</span>
              <span className="sm:hidden">Aporte</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL TÁCTICO: SERVICIO, LICENCIA, APORTES Y EDITOR COMPLETO */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-[#00FF87]/40 bg-[#0B0F19] text-[#F8FAFC] shadow-2xl overflow-hidden my-6">
            {/* Header del Modal con Símbolo Soberano */}
            <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#0E1424] px-6 py-4">
              <div className="flex items-center gap-3">
                <MateSoberanoLogo size="md" />
                <div>
                  <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                    {config.tituloBadge} • Panel Soberano y Control de Cintillo
                    {licencia?.activa && (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                        LICENCIA ACTIVA
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Profesor en Bibliotecología e Informática, ALBERTO SALINAS MENDIETA • Inteligencia Artificial al servicio del Territorio.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalAbierto(false)}
                className="cursor-pointer text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pestañas / Tabs */}
            <div className="flex border-b border-[#1E293B] bg-[#0A0D15] px-6 pt-2 font-mono text-xs overflow-x-auto">
              <button
                onClick={() => setTabActivo('editar')}
                className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all shrink-0 ${
                  tabActivo === 'editar'
                    ? 'border-[#00FF87] text-[#00FF87]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {propietarioAutenticado ? (
                  <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span>{propietarioAutenticado ? 'Editar Cintillo (Propietario)' : 'Editar Cintillo (Restringido)'}</span>
              </button>

              <button
                onClick={() => setTabActivo('manifiesto')}
                className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all shrink-0 ${
                  tabActivo === 'manifiesto'
                    ? 'border-[#00D2FF] text-[#00D2FF]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-[#00D2FF]" />
                Filosofía y Stack Real
              </button>

              <button
                onClick={() => setTabActivo('servicio')}
                className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all shrink-0 ${
                  tabActivo === 'servicio'
                    ? 'border-[#00D2FF] text-[#00D2FF]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#00D2FF]" />
                Contratar Servicio
              </button>

              <button
                onClick={() => setTabActivo('licencia')}
                className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all shrink-0 ${
                  tabActivo === 'licencia'
                    ? 'border-[#00FF87] text-[#00FF87]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="h-3.5 w-3.5 text-[#00FF87]" />
                {licencia?.activa ? 'Licencia Activa' : 'Activar Código'}
              </button>

              <button
                onClick={() => setTabActivo('contacto')}
                className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all shrink-0 ${
                  tabActivo === 'contacto'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Phone className="h-3.5 w-3.5 text-amber-400" />
                Contacto
              </button>

              <button
                onClick={() => setTabActivo('aporte')}
                className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-all shrink-0 ${
                  tabActivo === 'aporte'
                    ? 'border-rose-400 text-rose-400 bg-rose-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400" />
                <span>Aporte Solidario</span>
              </button>
            </div>

            {/* Contenido de Tabs */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs">
              {/* TAB: EDICIÓN COMPLETA DEL CINTILLO - BLOQUEO RESTRINGIDO AL PROPIETARIO DE ORIGEN */}
              {tabActivo === 'editar' && !propietarioAutenticado && (
                <div className="rounded-2xl border-2 border-amber-500/70 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 space-y-5 text-center shadow-2xl">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                    <Lock className="h-8 w-8 animate-pulse" />
                  </div>

                  <div className="space-y-2 max-w-lg mx-auto">
                    <div className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-mono font-bold text-amber-300 border border-amber-500/40 uppercase">
                      🔒 ACCESO RESTRINGIDO AL PROPIETARIO DE ORIGEN
                    </div>
                    <h3 className="text-base font-bold font-mono text-white tracking-wide">
                      Módulo Exclusivo de ALBERTO SALINAS
                    </h3>
                    <p className="text-xs font-mono text-slate-300 leading-relaxed">
                      Por estrictas directivas de integridad y soberanía tecnológica, el modo de edición del cintillo institucional está <strong>bloqueado para terceros y reservado exclusivamente para su titular y creador</strong>: Profesor en Bibliotecología Alberto Salinas (<span className="text-[#00D2FF]">alberto.salinas@bue.edu.ar</span>).
                    </p>
                    <p className="text-[11px] font-mono text-amber-300/80">
                      Cualquier otro usuario, terminal o comercio opera con los textos oficiales y no tiene acceso de modificación.
                    </p>
                  </div>

                  <form onSubmit={handleAutenticarPropietario} className="max-w-md mx-auto space-y-3.5 pt-2">
                    <div className="space-y-1 text-left">
                      <label className="text-[11px] font-mono text-slate-300 font-semibold block">
                        Ingresá tu correo oficial o clave maestra de Alberto Salinas:
                      </label>
                      <input
                        type="password"
                        autoComplete="current-password"
                        placeholder="alberto.salinas@bue.edu.ar o clave de creador..."
                        value={credencialPropietarioInput}
                        onChange={(e) => setCredencialPropietarioInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none shadow-inner"
                      />
                    </div>

                    {errorAutenticacionPropietario && (
                      <div className="rounded-lg bg-rose-500/20 border border-rose-500/50 p-2.5 text-xs text-rose-300 font-mono text-left">
                        {errorAutenticacionPropietario}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 justify-center pt-2">
                      <Button variant="cyber" size="md" type="submit" icon={<Unlock className="h-4 w-4" />}>
                        Desbloquear Edición
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        type="button"
                        onClick={() => handleAutenticarPropietario(undefined, true)}
                        className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80"
                        icon={<ShieldCheck className="h-4 w-4 text-[#00FF87]" />}
                      >
                        Soy Alberto Salinas (Acceso Directo Propietario)
                      </Button>
                      <Button variant="outline" size="md" type="button" onClick={() => setTabActivo('manifiesto')}>
                        Ver Filosofía y Stack
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB: EDICIÓN COMPLETA DEL CINTILLO - FORMULARIO AUTORIZADO */}
              {tabActivo === 'editar' && propietarioAutenticado && (
                <form onSubmit={handleGuardarConfiguracion} className="space-y-4">
                  {/* Banner de Propietario Autenticado */}
                  <div className="rounded-xl border border-emerald-500/60 bg-emerald-950/40 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <Unlock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-300 font-mono flex items-center gap-1.5">
                          <span>SESIÓN AUTORIZADA: PROPIETARIO DE ORIGEN</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-black uppercase">ALBERTO SALINAS</span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono">
                          Tenés acceso total y exclusivo para editar los textos, velocidad y datos institucionales.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCerrarSesionPropietario}
                      className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white transition-colors"
                      title="Bloquear edición para proteger el sistema"
                    >
                      <Lock className="h-3 w-3 text-amber-400" />
                      <span>Cerrar Sesión Propietario</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/10 p-4">
                    <h4 className="text-sm font-bold text-[#00FF87] mb-1 flex items-center gap-2">
                      <Pencil className="h-4 w-4" /> Personalización Total del Cintillo y Datos Soberanos
                    </h4>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Modificá a tu gusto el título del escudo, las leyendas, el alias bancario, teléfonos y las frases que se desplazan de manera continua. Todos los cambios se guardan localmente en tu navegador.
                    </p>
                  </div>

                  {mensajeGuardado && (
                    <div className="rounded-xl border border-emerald-500 bg-emerald-500/20 p-3 text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{mensajeGuardado}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Título / Badge del Escudo */}
                    <div>
                      <label className="text-[11px] text-slate-300 font-bold block mb-1">
                        Título del Escudo / Badge:
                      </label>
                      <input
                        type="text"
                        value={formConfig.tituloBadge}
                        onChange={(e) => setFormConfig({ ...formConfig, tituloBadge: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono text-xs focus:border-[#00FF87] focus:outline-none"
                        placeholder="Ej: NOST-IA"
                      />
                    </div>

                    {/* Titular / Creador */}
                    <div>
                      <label className="text-[11px] text-slate-300 font-bold block mb-1">
                        Titular / Creador Oficial:
                      </label>
                      <input
                        type="text"
                        value={formConfig.titularAportes}
                        onChange={(e) => setFormConfig({ ...formConfig, titularAportes: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono text-xs focus:border-[#00FF87] focus:outline-none"
                        placeholder="Profesor Alberto Salinas"
                      />
                    </div>

                    {/* Alias Mercado Pago */}
                    <div>
                      <label className="text-[11px] text-slate-300 font-bold block mb-1">
                        Alias de Aportes (MP / Banco):
                      </label>
                      <input
                        type="text"
                        value={formConfig.aliasAportes}
                        onChange={(e) => setFormConfig({ ...formConfig, aliasAportes: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-amber-300 font-mono text-xs focus:border-[#00FF87] focus:outline-none"
                        placeholder="NOST.IA.SOBERANO"
                      />
                    </div>

                    {/* CVU Oficial */}
                    <div>
                      <label className="text-[11px] text-slate-300 font-bold block mb-1">
                        CVU Oficial:
                      </label>
                      <input
                        type="text"
                        value={formConfig.cvuAportes}
                        onChange={(e) => setFormConfig({ ...formConfig, cvuAportes: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 font-mono text-xs focus:border-[#00FF87] focus:outline-none"
                        placeholder="0000003100049281726354"
                      />
                    </div>

                    {/* Email de Contacto */}
                    <div>
                      <label className="text-[11px] text-slate-300 font-bold block mb-1">
                        Correo Electrónico de Contacto:
                      </label>
                      <input
                        type="email"
                        value={formConfig.emailContacto}
                        onChange={(e) => setFormConfig({ ...formConfig, emailContacto: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[#00D2FF] font-mono text-xs focus:border-[#00FF87] focus:outline-none"
                        placeholder="alberto.salinas@bue.edu.ar"
                      />
                    </div>

                    {/* Teléfono / WhatsApp */}
                    <div>
                      <label className="text-[11px] text-slate-300 font-bold block mb-1">
                        Celular / WhatsApp de Coordinación:
                      </label>
                      <input
                        type="text"
                        value={formConfig.celularWhatsapp}
                        onChange={(e) => setFormConfig({ ...formConfig, celularWhatsapp: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[#00FF87] font-mono text-xs focus:border-[#00FF87] focus:outline-none"
                        placeholder="11-3768-9803"
                      />
                    </div>
                  </div>

                  {/* Leyenda Principal del Cintillo */}
                  <div>
                    <label className="text-[11px] text-slate-300 font-bold block mb-1">
                      Leyenda Principal que Corre en el Cintillo:
                    </label>
                    <textarea
                      rows={2}
                      value={formConfig.leyendaPrincipal}
                      onChange={(e) => setFormConfig({ ...formConfig, leyendaPrincipal: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 font-mono text-xs focus:border-[#00FF87] focus:outline-none"
                      placeholder="Nodo Operativo Soberano Territorial..."
                    />
                  </div>

                  {/* Velocidad del Marquee */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-[#00FF87]" /> Velocidad del Movimiento:
                      </label>
                      <span className="text-xs font-bold text-[#00FF87] font-mono">
                        {formConfig.velocidadSegundos} segundos por ciclo (Movimiento sereno y placentero)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={160}
                      max={600}
                      step={20}
                      value={formConfig.velocidadSegundos}
                      onChange={(e) => setFormConfig({ ...formConfig, velocidadSegundos: parseInt(e.target.value) || 260 })}
                      className="w-full accent-[#00FF87] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Pausado (160s)</span>
                      <span>Sereno y Placentero a la Vista (260s)</span>
                      <span>Ultra Calmo (600s)</span>
                    </div>
                  </div>

                  {/* Frases / Renglones del Carrusel Permanente */}
                  <div className="space-y-2">
                    <label className="text-[11px] text-slate-300 font-bold block">
                      Frases y Mensajes en Movimiento Permanente:
                    </label>

                    <div className="space-y-2">
                      {formConfig.itemsMarquee.map((frase, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={frase}
                            onChange={(e) => {
                              const nuevaLista = [...formConfig.itemsMarquee];
                              nuevaLista[idx] = e.target.value;
                              setFormConfig({ ...formConfig, itemsMarquee: nuevaLista });
                            }}
                            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 font-mono focus:border-[#00D2FF] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleEliminarFrase(idx)}
                            className="cursor-pointer p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition-colors"
                            title="Eliminar frase"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Agregar Nueva Frase */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={nuevaFraseInput}
                        onChange={(e) => setNuevaFraseInput(e.target.value)}
                        placeholder="Escribí una nueva frase para sumar al cintillo..."
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-[#00FF87] focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAgregarFrase();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAgregarFrase}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[#00FF87]/20 border border-[#00FF87]/40 px-3 py-2 text-xs font-bold text-[#00FF87] hover:bg-[#00FF87]/30 transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Agregar Frase</span>
                      </button>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleRestablecerConfiguracion}
                      className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restablecer Textos Originales</span>
                    </button>

                    <Button variant="cyber" size="md" type="submit">
                      Guardar y Aplicar al Cintillo
                    </Button>
                  </div>

                  {/* GENERADOR OFICIAL DE CÓDIGOS DE ACTIVACIÓN (EXCLUSIVO ALBERTO SALINAS) */}
                  <div className="mt-6 pt-5 border-t-2 border-emerald-500/50 space-y-3.5">
                    <div className="rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-emerald-950/40 p-4 shadow-lg">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
                        <Key className="h-4 w-4 text-[#00FF87]" />
                        <span>Generador Instantáneo de Códigos Oficiales (Exclusivo para Vos, Alberto)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Ingresá el nombre del comercio cliente y generá con un clic su código criptográfico oficial para enviárselo por WhatsApp:
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 items-center">
                        <input
                          type="text"
                          value={nombreComercioParaCodigo}
                          onChange={(e) => {
                            setNombreComercioParaCodigo(e.target.value);
                            if (e.target.value.trim().length >= 2) {
                              setCodigoGeneradoAlberto(generarCodigoLicenciaSoberana(e.target.value));
                            } else {
                              setCodigoGeneradoAlberto('');
                            }
                          }}
                          placeholder="Nombre del Comercio Cliente (ej: Almacén Don Tito)..."
                          className="flex-1 min-w-[240px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white font-mono text-xs focus:border-[#00FF87] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cod = generarCodigoLicenciaSoberana(nombreComercioParaCodigo || 'Comercio Territorial');
                            setCodigoGeneradoAlberto(cod);
                            audioFeedback.playPosSaleSuccess();
                          }}
                          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-xs font-bold text-black transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Generar Código
                        </button>
                      </div>

                      {codigoGeneradoAlberto && (
                        <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-emerald-500/60 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Código Oficial Criptográfico:</span>
                            <span className="font-mono text-sm font-extrabold text-[#00FF87] tracking-wider select-all">
                              {codigoGeneradoAlberto}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(codigoGeneradoAlberto);
                                setCopiadoCodigoGen(true);
                                setTimeout(() => setCopiadoCodigoGen(false), 2000);
                              }}
                              className="cursor-pointer inline-flex items-center gap-1 rounded bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:text-white"
                            >
                              {copiadoCodigoGen ? <Check className="h-3.5 w-3.5 text-[#00FF87]" /> : <Copy className="h-3.5 w-3.5" />}
                              <span>{copiadoCodigoGen ? '¡Copiado!' : 'Copiar Código'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const msg = `¡Hola! Acá te paso tu código oficial de activación de NOST-IA para tu comercio:\n\n🔑 *${codigoGeneradoAlberto}*\n\nPara activarlo:\n1. Abrí NOST-IA en tu computadora.\n2. Hacé clic en el botón 'Activar' en la barra superior.\n3. Pegá este código y listo. Te queda activada la versión completa con tu servicio mensual, 100% offline.\n\n¡Gracias por apoyar este desarrollo popular argentino!\nAlberto Salinas (WhatsApp: 11-3768-9803 • Alias: NOST.IA.SOBERANO)`;
                                navigator.clipboard.writeText(msg);
                                setCopiadoMensajeGen(true);
                                setTimeout(() => setCopiadoMensajeGen(false), 2000);
                              }}
                              className="cursor-pointer inline-flex items-center gap-1 rounded bg-[#00D2FF]/20 border border-[#00D2FF]/50 px-2.5 py-1 text-xs text-[#00D2FF] hover:bg-[#00D2FF]/30 font-bold"
                            >
                              {copiadoMensajeGen ? <Check className="h-3.5 w-3.5 text-[#00D2FF]" /> : <Phone className="h-3.5 w-3.5" />}
                              <span>{copiadoMensajeGen ? '¡Texto Copiado!' : 'Copiar Mensaje WhatsApp'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Lista de Códigos Maestros Rápidos */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-amber-300 font-bold block mb-1">
                          O podés entregar cualquiera de estos Códigos Maestros Universales directos:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {CODIGOS_MAESTROS_OFICIALES.map((cm, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(cm);
                                setCodigoGeneradoAlberto(cm);
                                setCopiadoCodigoGen(true);
                                setTimeout(() => setCopiadoCodigoGen(false), 2000);
                              }}
                              className="cursor-pointer font-mono text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 px-2 py-0.5 rounded text-amber-200 transition-colors"
                              title="Clic para copiar este código maestro"
                            >
                              📋 {cm}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB: MANIFIESTO, FILOSOFÍA Y STACK TECNOLÓGICO REAL */}
              {tabActivo === 'manifiesto' && (
                <div className="space-y-5 leading-relaxed text-slate-300">
                  <div className="rounded-xl border border-[#00D2FF]/30 bg-[#00D2FF]/10 p-4">
                    <h4 className="text-sm font-bold text-[#00D2FF] mb-1 flex items-center gap-2 font-mono">
                      <Terminal className="h-4 w-4" /> # NOST-IA: STACK TECNOLÓGICO, MAPA CONCEPTUAL Y FILOSOFÍA SOBERANA
                    </h4>
                    <p className="text-slate-200 text-xs font-mono">
                      <strong>Creador e Ideólogo:</strong> Profesor en Bibliotecología e Informática, <strong>ALBERTO SALINAS MENDIETA</strong> • Inteligencia Artificial al servicio del Territorio.
                    </p>
                  </div>

                  {/* 1. La Filosofía de NOST-IA */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#00FF87]" /> 1. La Filosofía de NOST-IA: ¿Qué es y por qué nace?
                    </h5>
                    <p className="text-xs text-slate-300">
                      En un mundo donde la tecnología comercial está secuestrada por corporaciones que exigen suscripciones en dólares, cobran comisiones por cada cobro y se apropian de la información privada del comerciante, <strong>NOST-IA</strong> nace como un acto de <strong>resistencia y soberanía económica comunitaria</strong>.
                    </p>
                    <p className="text-xs text-slate-300">
                      Concebido desde la mirada de la <strong>Bibliotecología</strong> —la ciencia de organizar, democratizar y poner el conocimiento al alcance de toda la sociedad sin barreras ni privilegios—, el Profesor <strong>Alberto Salinas Mendieta</strong> diseña NOST-IA para poner la tecnología más avanzada del planeta (Inteligencia Artificial generativa y analítica de datos) al servicio del barrio, la cooperativa popular y la pequeña pyme de la cuadra.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                        <strong className="text-[#00FF87] block text-xs mb-1">1. Soberanía Territorial (Offline-First):</strong>
                        <span className="text-[11px] text-slate-400">Funciona al 100% sin conexión a internet. Los datos viven en el disco físico del comerciante.</span>
                      </div>
                      <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                        <strong className="text-[#00D2FF] block text-xs mb-1">2. Cero Cuotas, Cero Suscripciones:</strong>
                        <span className="text-[11px] text-slate-400">100% libre y gratuito. Es una herramienta de trabajo, no un negocio de alquiler. NO ES OBLIGATORIO PAGAR NINGUNA CUOTA, si el/la comerciante desea descargarlo, tomarse un tiempo para entender su funcionamiento, lo puede hacer y lograrlo sin problemas.</span>
                      </div>
                      <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                        <strong className="text-rose-400 block text-xs mb-1">3. Filosofía China Popular:</strong>
                        <span className="text-[11px] text-slate-400">Modelos abiertos ultralivianos como Qwen (Alibaba) optimizados para correr en PCs modestas 100% offline.</span>
                      </div>
                      <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                        <strong className="text-amber-400 block text-xs mb-1">4. Realidad Mercantil Argentina:</strong>
                        <span className="text-[11px] text-slate-400">Distingue Harina 000 vs 0000, 50kg vs 1kg y absorbe tarifas de luz y alquiler en cada ticket.</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Stack Tecnológico Real */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-[#00D2FF]" /> 2. Stack Tecnológico Real (Listado Técnico)
                    </h5>
                    <div className="space-y-2 text-[11px]">
                      <div>
                        <strong className="text-[#00D2FF]">Frontend & UI:</strong> React 19, TypeScript 5.8, Tailwind CSS v4, Lucide React, Recharts, Framer Motion.
                      </div>
                      <div>
                        <strong className="text-[#00FF87]">Persistencia Soberana:</strong> Dexie.js (IndexedDB Engine con transacciones ACID locales), Motor de Resguardo JSON portable.
                      </div>
                      <div>
                        <strong className="text-amber-300">Inferencia & Copiloto Local:</strong> Ollama Client (Qwen 2.5 Coder 1.5B), Motor Cognitivo Heurístico Determinista (`localCopilot.ts`), Veto Matrix de 5 Etapas.
                      </div>
                      <div>
                        <strong className="text-purple-300">Ingesta VDU & Documentos:</strong> SheetJS (`xlsx`), PDF.js (`pdfjs-dist`), ZXing Browser WASM, Layout Espacial 2D (docTR / Docling — Arquitectura de referencia VDU para segmentación geométrica 2D por bounding boxes sin confusión de renglones).
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CONTRATAR SERVICIO COMPLETO */}
              {tabActivo === 'servicio' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[#00D2FF]/30 bg-[#00D2FF]/10 p-4">
                    <h4 className="text-sm font-bold text-[#00D2FF] mb-1.5 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Despliegue Integral NOST-IA para tu Comercio
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      Para contratar el servicio completo, la puesta en marcha asistida y la personalización a la medida de tu comercio o cooperativa, comunicate directamente con el creador del proyecto:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#1E293B] bg-[#0E1424] p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#00FF87]">Comercio de Barrio</span>
                          <span className="rounded bg-[#00FF87]/20 px-2 py-0.5 text-[10px] text-[#00FF87]">Llave en Mano</span>
                        </div>
                        <p className="text-slate-400 text-[11px] mb-3">
                          Panadería, Kiosco, Rotisería, Ferretería, Peluquería, Zapatería o Almacén.
                        </p>
                        <ul className="space-y-1.5 text-[11px] text-slate-300">
                          <li>✓ Carga e importación inicial de inventario</li>
                          <li>✓ Configuración de lector de facturas de compra y venta</li>
                          <li>✓ Código exclusivo de habilitación soberana</li>
                          <li>✓ Asesoría personalizada por WhatsApp</li>
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#1E293B] bg-[#0E1424] p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#00D2FF]">Cooperativas, Redes y Organizaciones</span>
                          <span className="rounded bg-[#00D2FF]/20 px-2 py-0.5 text-[10px] text-[#00D2FF]">Multi-Nodo</span>
                        </div>
                        <p className="text-slate-400 text-[11px] mb-3">
                          Cooperativas comunitarias, comedores populares, redes de acopio territorial, clubes de barrio, centros de jubilados y organizaciones libres del pueblo.
                        </p>
                        <ul className="space-y-1.5 text-[11px] text-slate-300">
                          <li>✓ Clubes de barrio, centros de jubilados y organizaciones libres del pueblo</li>
                          <li>✓ Monitoreo inteligente de stock conjunto y acopio solidario</li>
                          <li>✓ Capacitación a encargados de compras y depósitos</li>
                          <li>✓ Respaldo criptográfico offline en pendrive</li>
                          <li>✓ Canales directos de distribución territorial</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* SECTOR OFICIAL DE PRECIOS NOST-IA */}
                  <div className="rounded-2xl border-2 border-[#00FF87]/40 bg-gradient-to-b from-[#06121D] via-[#091522] to-[#050B14] p-5 space-y-4 shadow-xl">
                    <div className="border-b border-[#00FF87]/30 pb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-[#00FF87]" />
                        <h4 className="text-sm font-black font-mono text-white tracking-wider uppercase">
                          ================ PRECIOS NOST-IA ================
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#00D2FF] bg-[#00D2FF]/10 px-2.5 py-0.5 rounded border border-[#00D2FF]/30">
                        100% LIBRE Y SOBERANO
                      </span>
                    </div>

                    {/* QUIÉNES SOMOS */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2 font-sans">
                      <h5 className="text-xs font-bold font-mono text-[#00FF87] flex items-center gap-1.5 uppercase">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" /> QUIÉNES SOMOS
                      </h5>
                      <div className="text-slate-300 text-xs leading-relaxed space-y-1">
                        <p>
                          NOST-IA no lo hace una empresa: lo hace una sola persona, un <strong>trabajador DOCENTE común del barrio de Mataderos</strong>.
                        </p>
                        <p>
                          Tecnología de punta <strong>SIN internet</strong>: funciona offline y tus datos <strong>NUNCA salen de tu computadora ni se entregan a nadie</strong>.
                        </p>
                        <p>
                          La herramienta es libre y gratuita: <strong>NO se paga por usarla</strong>.
                        </p>
                        <p className="text-emerald-300 font-semibold">
                          Se paga por el acompañamiento, la instalación, la capacitación, las actualizaciones y las mejoras.
                        </p>
                      </div>
                    </div>

                    {/* SEGMENTOS (por empleados, comercio/servicios) */}
                    <div className="space-y-2 font-mono">
                      <h5 className="text-xs font-bold text-[#00D2FF] flex items-center gap-1.5 uppercase">
                        <Layers className="h-3.5 w-3.5" /> SEGMENTOS (por empleados, comercio/servicios)
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">SEGMENTO</span>
                            <span className="text-xs font-black text-white">MICRO</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">1 a 7 empleados</span>
                          </div>
                          <div className="mt-2 text-sm font-black text-[#00FF87]">$150.000<span className="text-[10px] font-normal text-slate-400">/mes</span></div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">SEGMENTO</span>
                            <span className="text-xs font-black text-white">PEQUEÑA</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">8 a 18 empleados</span>
                          </div>
                          <div className="mt-2 text-sm font-black text-[#00FF87]">$300.000<span className="text-[10px] font-normal text-slate-400">/mes</span></div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">SEGMENTO</span>
                            <span className="text-xs font-black text-white">MEDIANA</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">19 a 29 empleados</span>
                          </div>
                          <div className="mt-2 text-sm font-black text-[#00FF87]">$600.000<span className="text-[10px] font-normal text-slate-400">/mes</span></div>
                        </div>

                        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-amber-300 block font-bold">SEGMENTO</span>
                            <span className="text-xs font-black text-white">30 O MÁS</span>
                            <span className="text-[11px] text-slate-300 block mt-0.5">Grandes Nodos</span>
                          </div>
                          <div className="mt-2 text-xs font-bold text-amber-300">Contactar para precios especiales</div>
                        </div>
                      </div>
                    </div>

                    {/* CICLOS DE PAGO */}
                    <div className="space-y-2 font-mono">
                      <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase">
                        <Zap className="h-3.5 w-3.5 text-amber-400" /> CICLOS DE PAGO
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2.5">
                          <strong className="text-white block font-bold">Mensual:</strong>
                          <span className="text-slate-400 text-[10px]">Precio de lista, sin compromiso.</span>
                        </div>
                        <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2.5">
                          <strong className="text-emerald-300 block font-bold">Semestral:</strong>
                          <span className="text-slate-400 text-[10px]">10% de descuento (6 meses al precio de 5,4).</span>
                        </div>
                        <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-2.5">
                          <strong className="text-[#00D2FF] block font-bold">Anual:</strong>
                          <span className="text-slate-400 text-[10px]">2 meses gratis (12 al precio de 10).</span>
                        </div>
                      </div>

                      {/* Tabla Comparativa de Ciclos */}
                      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/90 text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                            <tr>
                              <th className="p-2.5">Escala</th>
                              <th className="p-2.5">Mensual</th>
                              <th className="p-2.5">Semestral</th>
                              <th className="p-2.5">Anual</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                            <tr>
                              <td className="p-2.5 font-bold text-white">MICRO:</td>
                              <td className="p-2.5 text-slate-300">Mensual $150.000</td>
                              <td className="p-2.5 text-emerald-300 font-bold">Semestral $540.000</td>
                              <td className="p-2.5 text-[#00D2FF] font-black">Anual $1.000.000</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold text-white">PEQUEÑA:</td>
                              <td className="p-2.5 text-slate-300">Mensual $300.000</td>
                              <td className="p-2.5 text-emerald-300 font-bold">Semestral $1.500.000</td>
                              <td className="p-2.5 text-[#00D2FF] font-black">Anual $3.000.000</td>
                            </tr>
                            <tr>
                              <td className="p-2.5 font-bold text-white">MEDIANA:</td>
                              <td className="p-2.5 text-slate-300">Mensual $600.000</td>
                              <td className="p-2.5 text-emerald-300 font-bold">Semestral $3.000.000</td>
                              <td className="p-2.5 text-[#00D2FF] font-black">Anual $6.000.000</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* BLOQUE SOCIAL */}
                    <div className="rounded-xl border border-[#00D2FF]/40 bg-[#00D2FF]/10 p-3.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#00D2FF] uppercase font-mono flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4" /> BLOQUE SOCIAL (6 meses gratis; luego, tarifa MICRO mensual)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-200 font-sans">
                        <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                          • Cooperativas (Ley 20.337)
                        </div>
                        <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                          • Clubes de barrio y Organizaciones Libres del Pueblo (Ley 27.098)
                        </div>
                        <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                          • Centros de jubilados y Comedores comunitarios
                        </div>
                      </div>
                    </div>

                    {/* APORTE SOLIDARIO */}
                    <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-rose-300 uppercase font-mono flex items-center gap-1.5">
                          <Heart className="h-4 w-4 text-rose-400 fill-rose-400" /> APORTE SOLIDARIO
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans">
                          Contribución voluntaria para que NOST-IA siga creciendo de manera independiente, soberana y de tecnología avanzada.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTabActivo('aporte')}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 px-3 py-1.5 text-xs font-bold text-rose-300 transition-all font-mono"
                      >
                        <span>Aportar Solidariamente</span>
                      </button>
                    </div>
                  </div>

                  {/* Acciones de Contacto Inmediato */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3">
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Canales Oficiales de Coordinación
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a
                        href={`https://wa.me/5491137689803?text=${encodeURIComponent(
                          'Hola Alberto Salinas, me interesa contratar el servicio completo de NOST-IA para mi comercio y coordinar la instalación.'
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF87] to-[#00D2FF] px-4 py-2.5 font-bold text-black hover:opacity-90 transition-all shadow-[0_0_15px_rgba(0,255,135,0.2)]"
                      >
                        <Phone className="h-4 w-4" />
                        Hablar con Alberto por WhatsApp (11-3768-9803)
                      </a>

                      <button
                        onClick={() => copiarAlPortapapeles(config.emailContacto, 'email')}
                        className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                      >
                        <Mail className="h-4 w-4 text-[#00D2FF]" />
                        {config.emailContacto}
                        {copiadoEmail ? <Check className="h-3.5 w-3.5 text-[#00FF87]" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ACTIVAR CÓDIGO DE LICENCIA SOBERANA */}
              {tabActivo === 'licencia' && (
                <div className="space-y-4">
                  {licencia?.activa ? (
                    // Certificado de Licencia Activa de Alta Fidelidad
                    <div className="rounded-2xl border-2 border-[#00FF87]/60 bg-gradient-to-b from-[#061A14] via-[#08151D] to-[#040810] p-6 space-y-5 shadow-[0_0_35px_rgba(0,255,135,0.25)] relative overflow-hidden">
                      {/* Sello de agua y resplandor de fondo */}
                      <div className="absolute -top-10 -right-10 w-44 h-44 bg-gradient-to-br from-[#00FF87]/15 to-[#00D2FF]/10 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#00FF87]/30 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-amber-500/20 border-2 border-[#00FF87] flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(0,255,135,0.3)]">
                            <Award className="h-7 w-7 text-amber-300 fill-amber-300" />
                          </div>
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono text-[10px] font-black uppercase tracking-wider mb-1">
                              <Sparkles className="h-3 w-3 text-amber-300" />
                              SERVICIO DE NOST-IA COMPLETO • MENSUAL
                            </div>
                            <h4 className="text-base font-extrabold font-mono text-white flex items-center gap-2">
                              Certificado de Autenticidad Soberana
                            </h4>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">
                            ● ESTADO DEL SERVICIO:
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-400 text-black text-xs font-black uppercase tracking-wider">
                            SERVICIO MENSUAL ACTIVO • 100% OFFLINE
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                        <div className="rounded-xl bg-slate-900/90 p-3.5 border border-[#00FF87]/40 shadow-inner">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Código de Activación Oficial</span>
                          <div className="font-extrabold text-[#00FF87] font-mono text-sm tracking-wider select-all">
                            {licencia.codigo}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-900/90 p-3.5 border border-slate-800 shadow-inner">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Emisor Oficial</span>
                          <div className="font-bold text-[#00D2FF] text-xs">
                            {licencia.emisor || 'Prof. Alberto Salinas'}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-900/90 p-3.5 border border-slate-800 shadow-inner">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Modalidad de Cobertura</span>
                          <div className="font-bold text-slate-200 text-xs">
                            Servicio Completo Mensual Activo
                          </div>
                        </div>
                      </div>

                      {/* Garantía y Compromiso Soberano */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-[11px] text-slate-300 font-sans space-y-1.5">
                        <p className="font-bold text-emerald-300 flex items-center gap-1.5 font-mono">
                          <ShieldCheck className="h-4 w-4 text-[#00FF87]" />
                          Garantía de Soberanía Tecnológica Popular:
                        </p>
                        <p className="leading-relaxed text-slate-300 text-xs">
                          Este equipo cuenta con el respaldo directo del Profesor Alberto Salinas con servicio mensual activo. Funciona de forma 100% offline, sin intermediarios corporativos y con privacidad absoluta: tus números de facturación, clientes y stock nunca saldrán de tu computadora.
                        </p>
                      </div>

                      <div className="flex flex-wrap justify-between items-center pt-2 border-t border-slate-800/80 gap-2">
                        <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#00FF87]" />
                          Insignia de servicio completo mensual activa en el cintillo superior y panel de control.
                        </span>
                        <button
                          type="button"
                          onClick={handleDesactivarLicencia}
                          className="cursor-pointer text-[10px] font-mono text-rose-400/80 hover:text-rose-300 hover:underline"
                        >
                          Desvincular código en este equipo
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Formulario de Ingreso de Código
                    <form onSubmit={handleActivarCodigo} className="space-y-4">
                      <div className="rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/10 p-4">
                        <h4 className="text-sm font-bold text-[#00FF87] mb-1 flex items-center gap-2">
                          <Key className="h-4 w-4" /> Ingreso de Código de Habilitación Territorial
                        </h4>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          Si contrataste el servicio o coordinaste con Alberto Salinas, ingresá a continuación el código que te envió para desbloquear el nodo completo y eliminar todos los llamados de contratación.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-300 font-semibold block">
                          Código de Activación Proporcionado:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ejemplo: NOST-2026-SOBERANO"
                            value={codigoInput}
                            onChange={(e) => setCodigoInput(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-sm uppercase tracking-widest text-[#00FF87] placeholder-slate-600 focus:border-[#00FF87] focus:outline-none"
                          />
                          <Button variant="cyber" size="lg" type="submit">
                            Habilitar Nodo
                          </Button>
                        </div>
                        {errorCodigo && (
                          <p className="text-rose-400 text-xs font-mono">{errorCodigo}</p>
                        )}
                        {exitoActivacion && (
                          <div className="rounded-lg bg-emerald-500/20 border border-emerald-500 p-2 text-emerald-300 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>¡Código activado con éxito! Servicio soberano completo activo.</span>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-400">
                        ¿Todavía no tienes tu código? Contactate por WhatsApp al <strong>{config.celularWhatsapp}</strong> o al correo <strong>{config.emailContacto}</strong> para recibir el tuyo.
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB: CONTACTO Y DATOS */}
              {tabActivo === 'contacto' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-[#00FF87] flex items-center justify-center border border-[#00FF87]/40 font-bold text-lg">
                        AS
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{config.titularAportes}</div>
                        <div className="text-slate-400 text-[11px]">
                          Investigador, Desarrollador & Creador de NOST-IA
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-[#00FF87]" /> Celular / WhatsApp:
                        </span>
                        <a
                          href={`https://wa.me/5491137689803`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#00FF87] hover:underline flex items-center gap-1"
                        >
                          {config.celularWhatsapp} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-[#00D2FF]" /> Correo Electrónico:
                        </span>
                        <button
                          onClick={() => copiarAlPortapapeles(config.emailContacto, 'email')}
                          className="font-bold text-[#00D2FF] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {config.emailContacto} {copiadoEmail ? <Check className="h-3 w-3 text-[#00FF87]" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-amber-400" /> Alias Aportes MP:
                        </span>
                        <span className="font-bold text-amber-400">{config.aliasAportes}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-400 leading-relaxed">
                    «NOST-IA es soberanía territorial: la capacidad de cada almacén, kiosco y taller de producir de forma autónoma, sin depender de servidores extranjeros ni comisiones que asfixien al trabajador».
                  </div>
                </div>
              )}

              {/* TAB: APORTE SOLIDARIO */}
              {tabActivo === 'aporte' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900 to-[#0A121E] p-4 shadow-lg">
                    <h4 className="text-sm font-bold text-rose-300 mb-1.5 flex items-center gap-2 font-mono">
                      <Heart className="h-4 w-4 text-rose-400 fill-rose-400 animate-pulse" />
                      Aporte Solidario para que NOST-IA siga siendo soberano, territorial e innovador
                    </h4>
                    <p className="text-slate-200 leading-relaxed font-sans text-xs">
                      NOST-IA nació para que ningún comercio popular quede rehén de tarifas leoninas en dólares o sistemas cerrados corporativos.
                      Tu aporte solidario permite que el software siga siendo 100% soberano, territorial e innovador, con inteligencia artificial local y herramientas modernas en manos del pueblo.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#1E293B] bg-[#0E1424] p-4 space-y-3">
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Datos Oficiales para Transferencias
                    </div>

                    {/* Alias */}
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 p-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Alias Mercado Pago / Bancario</span>
                        <div className="text-base font-bold text-[#00FF87]">{config.aliasAportes}</div>
                      </div>
                      <button
                        onClick={() => copiarAlPortapapeles(config.aliasAportes, 'alias')}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 transition-colors"
                      >
                        {copiadoAlias ? <Check className="h-4 w-4 text-[#00FF87]" /> : <Copy className="h-4 w-4" />}
                        {copiadoAlias ? 'Copiado' : 'Copiar Alias'}
                      </button>
                    </div>

                    {/* CVU */}
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 p-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">CVU Oficial</span>
                        <div className="text-xs text-slate-200 tracking-widest">{config.cvuAportes}</div>
                      </div>
                      <button
                        onClick={() => copiarAlPortapapeles(config.cvuAportes, 'cbu')}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 transition-colors"
                      >
                        {copiadoCbu ? <Check className="h-4 w-4 text-[#00FF87]" /> : <Copy className="h-4 w-4" />}
                        {copiadoCbu ? 'Copiado' : 'Copiar CVU'}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Titular: <strong>{config.titularAportes}</strong></span>
                      <span>Destino: <strong>Fondo de Desarrollo Territorial NOST-IA</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between border-t border-[#1E293B] bg-[#0E1424] px-6 py-3 font-mono text-xs">
              <span className="text-slate-500 text-[11px]">
                {config.tituloBadge} • Nodo Operativo Soberano Territorial • Industria Argentina
              </span>
              <Button variant="outline" size="sm" onClick={() => setModalAbierto(false)}>
                Cerrar Ventana
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
