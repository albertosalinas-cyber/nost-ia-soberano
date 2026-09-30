import React, { useState } from 'react';
import {
  BookOpen,
  Camera,
  FileText,
  DollarSign,
  MapPin,
  Bot,
  HardDrive,
  Download,
  Upload,
  CheckCircle2,
  X,
  Smartphone,
  Laptop,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { exportarBackupSoberano, importarBackupSoberano } from '../../engine/db';
import { audioFeedback } from '../../engine/audioFeedback';

interface ManualSoberanoModalProps {
  onClose: () => void;
  onBackupRestored?: () => void;
}

export const ManualSoberanoModal: React.FC<ManualSoberanoModalProps> = ({
  onClose,
  onBackupRestored,
}) => {
  const [pasoActivo, setPasoActivo] = useState<number>(1);
  const [mensajeBackup, setMensajeBackup] = useState<string | null>(null);

  const handleDescargarBackup = async () => {
    try {
      const json = await exportarBackupSoberano();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nost_ia_copia_seguridad_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      audioFeedback.playBarcodeSuccess();
      setMensajeBackup('✅ Copia de seguridad guardada en tu carpeta de Descargas.');
    } catch {
      setMensajeBackup('❌ Error al exportar la copia.');
    }
  };

  const handleRestaurarBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      const ok = await importarBackupSoberano(content);
      if (ok) {
        audioFeedback.playPosSaleSuccess();
        setMensajeBackup('✅ Datos restaurados con éxito.');
        if (onBackupRestored) onBackupRestored();
      } else {
        setMensajeBackup('❌ El archivo seleccionado no es válido.');
      }
    };
    reader.readAsText(file);
  };

  const pasos = [
    {
      id: 1,
      titulo: '1. ¿Qué es NOST-IA y cómo abrirlo en tu computadora o celular?',
      icono: <Laptop className="h-5 w-5 text-[#00FF87]" />,
      contenido: (
        <div className="space-y-3">
          <p className="text-slate-300">
            **NOST-IA** (*Nodo Operativo Soberano Territorial con Inteligencia Artificial*) es un sistema pensado para vos que tenés un almacén, despensa, cooperativa o taller.
            **No necesita internet para funcionar**: todos tus datos, precios y mercadería quedan guardados en tu propia computadora o teléfono, nunca en servidores de afuera ni pagás suscripción.
          </p>
          <div className="rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/10 p-3 space-y-1">
            <h4 className="font-bold text-white text-sm">📲 Cómo tenerlo como una App en tu pantalla:</h4>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>En la computadora: abrí Google Chrome o Edge y hacé clic en los tres puntitos arriba a la derecha → <strong>"Instalar NOST-IA"</strong>.</li>
              <li>En el celular: abrí la página, tocá los tres puntitos y seleccioná <strong>"Agregar a la pantalla principal"</strong>.</li>
              <li>Listo: ahora podés abrirlo como un programa normal aunque se corte internet.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      titulo: '2. Cómo usar la cámara como pistola de códigos de barra',
      icono: <Camera className="h-5 w-5 text-[#00D2FF]" />,
      contenido: (
        <div className="space-y-3">
          <p className="text-slate-300">
            No necesitás comprar una pistola lectora cara (aunque si tenés una USB, también anda automáticamente al enchufarla).
          </p>
          <div className="rounded-xl border border-[#1E293B] bg-[#141824] p-3 space-y-2">
            <h4 className="font-bold text-[#00D2FF] text-sm">Pasos sencillos:</h4>
            <ol className="list-decimal list-inside text-slate-300 space-y-1.5">
              <li>En la pantalla de arriba, tocá el botón verde <strong>"Escáner de Cámara"</strong>.</li>
              <li>El navegador te va a pedir <strong>"Permitir acceso a la cámara"</strong>. Tocá que sí (Permitir).</li>
              <li>Acercá cualquier producto con código de barra al marco cuadrado en la pantalla.</li>
              <li>Cuando lo detecta, suena un <em>"Bip"</em> y una luz verde te avisa que ya lo sumó al carrito o al stock.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      titulo: '3. Cómo subir una factura y que cargue el inventario sola',
      icono: <FileText className="h-5 w-5 text-amber-400" />,
      contenido: (
        <div className="space-y-3">
          <p className="text-slate-300">
            Cuando te llega la mercadería del mayorista con una factura en papel o PDF:
          </p>
          <div className="rounded-xl border border-[#1E293B] bg-[#141824] p-3 space-y-2">
            <ol className="list-decimal list-inside text-slate-300 space-y-1.5">
              <li>Sacale una foto con el celular a la factura o guardá el archivo PDF/TXT en tu compu.</li>
              <li>Hacé clic en el botón <strong>"Cargar Factura"</strong> en la sección Inventario.</li>
              <li>Arrastrá la foto o el archivo.</li>
              <li>El sistema lee las cantidades y precios unitarios renglón por renglón.</li>
              <li>Revisás los números y tocás <strong>"Impactar en Stock"</strong>: listo, ya tenés las unidades sumadas en tu inventario sin tener que escribir nada a mano.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      titulo: '4. Cómo calcular precios justos sumando tus gastos (luz, alquiler, sueldo)',
      icono: <DollarSign className="h-5 w-5 text-[#00FF87]" />,
      contenido: (
        <div className="space-y-3">
          <p className="text-slate-300">
            Muchos negocios quiebran porque venden al 30% arriba del costo pero se olvidan de que la boleta de la luz, el alquiler y los impuestos también tienen que pagarse con cada paquete de yerba o fideos vendido.
          </p>
          <div className="rounded-xl border border-[#1E293B] bg-[#141824] p-3 space-y-2">
            <h4 className="font-bold text-white text-sm">El Prorrateo Soberano NOST-IA:</h4>
            <p className="text-slate-300">
              Tocá <strong>"Estrategia de Costos & Precios"</strong>. Ahí ponés cuánto pagás de luz, alquiler, agua, gas y sueldos por mes.
              NOST-IA divide ese número entre la cantidad de paquetes o productos que vendés al mes y te dice exactamente cuánto sumarle a cada artículo para que no pierdas plata nunca.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      titulo: '5. Cómo usar el Mapa 3D para comprarle a cooperativas cercanas',
      icono: <MapPin className="h-5 w-5 text-[#00D2FF]" />,
      contenido: (
        <div className="space-y-3">
          <p className="text-slate-300">
            En la solapa <strong>"Mapa Territorial 3D"</strong> vas a ver los almacenes, cooperativas textiles, granjas agroecológicas y puntos de acopio de tu zona.
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1">
            <li>Podés mover la barra de distancia (por ejemplo, 10 km) para ver quién te queda cerca.</li>
            <li>Al hacer clic en cualquier punto, ves el teléfono, la dirección y a qué se dedica.</li>
            <li>Esto te permite coordinar compras comunitarias para conseguir mejores precios directos de fábrica o de la quinta.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 6,
      titulo: '6. Cómo usar el Compañero/a IA Soberano/a (Qwen 2.5 y Motor Local)',
      icono: <Bot className="h-5 w-5 text-[#FF2E93]" />,
      contenido: (
        <div className="space-y-3">
          <p className="text-slate-300">
            En la solapa <strong>"Compañero/a IA Soberano/a"</strong> tenés un asistente al que podés escribirle como si fuera una persona de confianza:
          </p>
          <div className="rounded-xl border border-[#1E293B] bg-[#141824] p-3 space-y-2">
            <p className="text-slate-300">
              Podés preguntarle cosas en lenguaje de todos los días:
            </p>
            <ul className="list-disc list-inside text-[#00FF87] font-mono text-xs space-y-1">
              <li>"¿Qué productos se me van a terminar esta semana?"</li>
              <li>"¿Cuánto tengo que cobrar el kilo de harina si la luz aumentó a $80.000?"</li>
              <li>"¿Qué cosas tengo juntando polvo en el depósito para armar una oferta?"</li>
              <li>"¿A cuánto vendo la yerba y cuánto le estoy ganando?"</li>
            </ul>
            <div className="rounded-lg border border-[#00FF87]/30 bg-[#00FF87]/10 p-2.5 mt-2">
              <h5 className="font-bold text-white text-xs mb-1">⚡ Inteligencia Artificial Popular para PCs Humildes:</h5>
              <p className="text-[11px] text-slate-300">
                NOST-IA está optimizado para <strong>Qwen 2.5 Coder 1.5B</strong> a través de Ollama local y su motor determinista instantáneo. No manda tus datos a ninguna empresa en el extranjero y funciona 100% offline.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      titulo: '7. Cómo guardar una Copia de Seguridad de tus datos (Tu Negocio Seguro)',
      icono: <HardDrive className="h-5 w-5 text-[#00FF87]" />,
      contenido: (
        <div className="space-y-3">
          <p className="text-slate-300">
            Nadie puede borrarte tus datos ni cobrarte una suscripción mensual. Vos sos el dueño absoluto de tu información.
            Te recomendamos guardar una copia de seguridad una vez por semana en un pendrive o mandártela por mail:
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleDescargarBackup}
              icon={<Download className="h-4 w-4" />}
            >
              Descargar Copia de Seguridad Ahora
            </Button>

            <label className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all px-4 py-2 text-sm bg-[#1E293B] text-white border border-[#334155] hover:border-slate-500 cursor-pointer">
              <Upload className="h-4 w-4 text-[#00D2FF]" />
              <span>Restaurar Copia desde Archivo</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestaurarBackup}
                className="hidden"
              />
            </label>
          </div>

          {mensajeBackup && (
            <div className="rounded-lg border border-[#00FF87]/50 bg-[#00FF87]/15 p-2.5 text-xs font-mono text-[#00FF87]">
              {mensajeBackup}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 8,
      titulo: '8. Cómo tener NOST-IA ejecutable en tu PC con 2 clics (Paso a Paso)',
      icono: <Laptop className="h-5 w-5 text-[#00D2FF]" />,
      contenido: (
        <div className="space-y-3">
          <p className="text-slate-300">
            Diseñamos NOST-IA para que **cualquier persona sin saber nada de computación** lo use hoy mismo en su computadora humilde de mostrador:
          </p>

          <div className="rounded-xl border border-[#00D2FF]/40 bg-[#00D2FF]/10 p-3.5 space-y-2">
            <h4 className="font-bold text-white text-sm">Método 1 (El más fácil - Sin instalar nada):</h4>
            <ol className="list-decimal list-inside text-slate-300 text-xs space-y-1.5 leading-relaxed">
              <li>Abrís este enlace en el navegador de tu computadora (Chrome, Edge o Brave).</li>
              <li>Hacés clic en el ícono de la pantallita con flecha que aparece al final de la barra de direcciones arriba: <strong>"Instalar NOST-IA"</strong>.</li>
              <li>¡Listo! Se crea un ícono en tu escritorio de Windows/Linux como cualquier programa (Word, Excel) y funciona <strong>100% offline</strong> sin internet.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-[#00FF87]/40 bg-[#00FF87]/10 p-3.5 space-y-2">
            <h4 className="font-bold text-white text-sm">Método 2 (Lanzador Automático de 1 Clic con Verificación):</h4>
            <p className="text-slate-300 text-xs">
              Para los que descargan la carpeta comprimida del proyecto, incluimos los archivos <code>iniciar-nost-ia.bat</code> (para Windows) y <code>iniciar-nost-ia.sh</code> (para Linux).
            </p>
            <ul className="list-disc list-inside text-slate-300 text-xs space-y-1">
              <li><strong>Si estás en Windows:</strong> Hacé doble clic en el archivo que dice <strong>"Archivo por lotes de Windows"</strong> (que termina en <code>.bat</code>).</li>
              <li><strong>Si estás en Linux:</strong> Hacé doble clic o ejecutá el que dice <strong>"Shell script"</strong> (que termina en <code>.sh</code>).</li>
              <li><strong>Instalación Total Automática:</strong> El instalador verifica e instala automáticamente <strong>Node.js</strong>, descarga e inicia <strong>Ollama</strong>, habilita la conexión local sin bloqueos y descarga el modelo liviano de IA (Ternary / Qwen 2.5) para que el comerciante no tenga que tipear ningún comando.</li>
              <li>Abre la ventana de NOST-IA directamente en pantalla completa para atender en el mostrador.</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-[#1E293B] bg-[#0E111A] p-6 text-[#F8FAFC] shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono uppercase tracking-wide text-white flex items-center gap-2">
                Manual de Uso Inicial para Comerciantes y Productores
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Explicado paso a paso, en lenguaje cotidiano y sin palabras raras de computación.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="cursor-pointer text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Selector de Pasos en Barra Horizontal */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-[#1E293B] pb-3">
          {pasos.map((p) => (
            <button
              key={p.id}
              onClick={() => setPasoActivo(p.id)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 font-mono text-xs transition-all flex items-center gap-1.5 ${
                pasoActivo === p.id
                  ? 'bg-[#00FF87] text-black font-bold shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                  : 'bg-[#141824] text-slate-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              <span>{p.id}.</span>
              <span>{p.titulo.split('.')[1] || p.titulo}</span>
            </button>
          ))}
        </div>

        {/* Contenido del Paso Activo */}
        <div className="mt-6 rounded-xl border border-[#1E293B] bg-[#12151E] p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-[#1E293B] pb-3">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              {pasos[pasoActivo - 1].icono}
            </div>
            <h3 className="text-base font-bold text-white font-mono">
              {pasos[pasoActivo - 1].titulo}
            </h3>
          </div>

          <div className="text-sm leading-relaxed font-sans">
            {pasos[pasoActivo - 1].contenido}
          </div>
        </div>

        {/* Navegación Anterior / Siguiente */}
        <div className="mt-6 flex items-center justify-between border-t border-[#1E293B] pt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={pasoActivo === 1}
            onClick={() => setPasoActivo((p) => Math.max(1, p - 1))}
          >
            ← Paso Anterior
          </Button>

          <span className="font-mono text-xs text-slate-400">
            Paso {pasoActivo} de {pasos.length}
          </span>

          {pasoActivo < pasos.length ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPasoActivo((p) => Math.min(pasos.length, p + 1))}
            >
              Siguiente Paso →
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onClose}>
              ¡Comenzar a Usar NOST-IA!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
