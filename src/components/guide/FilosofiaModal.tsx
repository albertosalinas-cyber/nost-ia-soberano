import React, { useState } from 'react';
import {
  X,
  Globe2,
  ShieldCheck,
  Heart,
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface FilosofiaModalProps {
  onClose: () => void;
}

export const FilosofiaModal: React.FC<FilosofiaModalProps> = ({ onClose }) => {
  const [copiadoWebText, setCopiadoWebText] = useState<boolean>(false);
  const [copiadoMapa, setCopiadoMapa] = useState<boolean>(false);

  const MAPA_CONCEPTUAL_TEXT = `========================================================================================================
                                     🏛️ ECOSISTEMA NOST-IA
                        Nodo Operativo Soberano Territorial con I.A.
========================================================================================================

                                  [ COMERCIANTE / ALMACENERO ]
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
             [ ENTRADA DE DATOS ]                           [ DIÁLOGO DE ASESORÍA ]
            (Mostrador y Compras)                           (Compañero Soberano IA)
                        │                                             │
      ┌─────────────────┼─────────────────┐                           │
      ▼                 ▼                 ▼                           ▼
[ Lector Código ] [ Facturas/Remitos ] [ Inventario ]        [ Preguntas Estratégicas ]
 (Pistola/Cámara)  (PDF/Excel/Fotos)    (Altas y SKU)         * "¿Ayer no vendí nada?"
                        │                                     * "¿Cuál es mi capital?"
                        ▼                                     * "¿Qué combo armamos?"
            [ VETO MATRIX 5 ETAPAS ]                                  │
         (Distingue Harina 000 vs 0000,                               │
            50kg vs 1kg, 5L vs 1L)                                    │
                        │                                             │
                        ▼                                             │
      ================================================================┴=======================
                                     ⚙️ NÚCLEO OPERATIVO LOCAL
      ========================================================================================
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
    [ PERSISTENCIA SOBERANA ]                                      [ MOTOR DE INTELIGENCIA ]
         (IndexedDB / Dexie)                                       (Arquitectura Dual-Brain)
               │                                                               │
     ┌─────────┴─────────┐                                        ┌────────────┴────────────┐
     ▼                   ▼                                        ▼                         ▼
[ Inventario & ]   [ Ventas & ]                           [ OLLAMA LOCAL ]          [ MOTOR EXPERTO ]
[ Precios Costo]   [ Tickets  ]                          (Qwen 2.5 Coder 1.5B)      (Offline Heurístico)
     │                   │                                  100% en la PC             Matemático 100%
     └─────────┬─────────┘                                 Sin suscripción          Cero alucinaciones
               ▼                                                  │                         │
      [ BACKUP EN PENDRIVE ]                                      └────────────┬────────────┘
     (Soberanía del Archivo)                                                   ▼
                                                                  [ RESPUESTA CÁLIDA Y PRECISA ]
                                                                     * Combos con margen real
                                                                     * Costos fijos absorbidos
                                                                     * Capital en góndola exacto
========================================================================================================`;

  const TEXTO_WEB_COPY = `TÍTULO PRINCIPAL:
La Inteligencia Artificial que defiende al almacén de barrio.
Sin internet. Sin corporaciones. Sin suscripciones. 100% Soberana.

BAJADA EXPLICATIVA:
"Concebido por el Profesor Alberto Salinas, NOST-IA transforma tu computadora en un centro de comando comercial: calcula tu capital en mercadería, te avisa antes de que te quedes sin stock, lee tus facturas de distribuidor automáticamente y te ayuda con combos y promociones para activar la venta cuando el mostrador viene tranquilo. El poder de la tecnología más avanzada, en tus propias manos."`;

  const copiarTexto = (txt: string, tipo: 'web' | 'mapa') => {
    navigator.clipboard.writeText(txt);
    if (tipo === 'web') {
      setCopiadoWebText(true);
      setTimeout(() => setCopiadoWebText(false), 2500);
    } else {
      setCopiadoMapa(true);
      setTimeout(() => setCopiadoMapa(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 rounded-2xl border border-[#00FF87]/40 bg-[#0B0E17] p-6 sm:p-8 text-white shadow-[0_0_50px_rgba(0,255,135,0.2)] max-h-[90vh] overflow-y-auto font-mono">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 cursor-pointer rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-400 hover:text-white transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/10 text-[#00FF87] shrink-0">
            <ShieldCheck className="h-6 w-6 text-[#00FF87]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-wide text-white">
              # NOST-IA: STACK TECNOLÓGICO, MAPA CONCEPTUAL Y FILOSOFÍA SOBERANA
            </h2>
            <p className="text-xs text-[#00FF87] mt-1">
              <strong>Creador e Ideólogo:</strong> Profesor en Bibliotecología e Informática <strong>ALBERTO SALINAS MENDIETA</strong> • Inteligencia Artificial al servicio del Territorio.
            </p>
          </div>
        </div>

        {/* Contenido en Secciones */}
        <div className="space-y-6 text-xs leading-relaxed text-slate-300">
          {/* SECCIÓN 1: FILOSOFÍA Y LOS 4 PILARES */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
              <span className="text-base">🏛️</span>
              <span>1. LA FILOSOFÍA DE NOST-IA: ¿QUÉ ES Y POR QUÉ NACE?</span>
            </div>

            <div className="space-y-2 text-slate-300">
              <h4 className="font-bold text-[#00FF87] text-xs uppercase">La Misión Popular</h4>
              <p>
                En un mundo donde la tecnología comercial está secuestrada por corporaciones que exigen suscripciones en dólares, cobran comisiones por cada cobro y se apropian de la información privada del comerciante, <strong>NOST-IA</strong> nace como un acto de <strong>resistencia y soberanía económica comunitaria</strong>.
              </p>
              <p>
                Concebido desde la mirada de la <strong>Bibliotecología</strong> —la ciencia de organizar, democratizar y poner el conocimiento al alcance de toda la sociedad sin barreras ni privilegios—, el Profesor <strong>Alberto Salinas Mendieta</strong> diseña NOST-IA para poner la tecnología más avanzada del planeta (Inteligencia Artificial generativa y analítica de datos) al servicio del barrio, la cooperativa popular y la pequeña pyme de la cuadra.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-[#00D2FF] text-xs uppercase">Los 4 Pilares Inquebrantables</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <strong className="text-[#00FF87] block mb-1">1. Soberanía Territorial Absoluta (Offline-First):</strong>
                  <span className="text-slate-400 text-[11px]">
                    Funciona al 100% sin conexión a internet. Los datos de compras, ventas y clientes no van a servidores de corporaciones extranjeras; viven en el disco físico del comerciante.
                  </span>
                </div>

                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <strong className="text-[#00D2FF] block mb-1">2. Cero Cuotas, Cero Suscripciones:</strong>
                  <span className="text-slate-400 text-[11px]">
                    100% libre y gratuito. Es una herramienta de trabajo, no un negocio de alquiler. NO ES OBLIGATORIO PAGAR NINGUNA CUOTA, si el/la comerciante desea descargarlo, tomarse un tiempo para entender su funcionamiento, lo puede hacer y lograrlo sin problemas.
                  </span>
                </div>

                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <strong className="text-rose-400 block mb-1">3. Tecnología de Punta para el Pueblo (Inspiración China):</strong>
                  <span className="text-slate-400 text-[11px]">
                    La máxima tecnología no debe ser un lujo para las grandes cadenas, sino un derecho accesible para el comerciante popular. Se acopla a modelos abiertos ultralivianos y eficientes como <strong>Qwen (Alibaba)</strong> que corren en computadoras modestas.
                  </span>
                </div>

                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <strong className="text-amber-400 block mb-1">4. Respeto a la Realidad Mercantil Argentina y Regional:</strong>
                  <span className="text-slate-400 text-[11px]">
                    Reconoce que la Harina 000 no es igual a la Harina 0000, que un bulto de 50kg no es un paquete de 1kg, y que el alquiler y las tarifas de luz deben ser absorbidos con precisión en cada venta para no quebrar.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: STACK TECNOLÓGICO REAL */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
              <span className="text-base">💻</span>
              <span>2. STACK TECNOLÓGICO REAL (Listado Técnico)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
              {/* Frontend */}
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <span className="font-bold text-[#00D2FF] block text-xs">Capa Frontend & Interfaz de Usuario</span>
                <ul className="space-y-1 text-slate-300">
                  <li>• <strong>React 19:</strong> Interfaces reactivas de altísima velocidad y componentes modulares.</li>
                  <li>• <strong>TypeScript 5.8:</strong> Tipado estático estricto para cero errores contables de caja.</li>
                  <li>• <strong>Tailwind CSS v4:</strong> Estilos atómicos optimizados para pantallas táctiles y monitores.</li>
                  <li>• <strong>Lucide React:</strong> Iconografía vectorial sobria y estandarizada.</li>
                  <li>• <strong>Recharts & Framer Motion:</strong> Flujos de stock, rotación y microinteracciones fluidas.</li>
                </ul>
              </div>

              {/* Persistencia */}
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <span className="font-bold text-[#00FF87] block text-xs">Capa Persistencia & Base Soberana</span>
                <ul className="space-y-1 text-slate-300">
                  <li>• <strong>Dexie.js (IndexedDB Engine):</strong> Base de datos relacional/documental embebida en el navegador con transacciones ACID locales y almacenamiento ilimitado.</li>
                  <li>• <strong>Motor de Resguardo JSON:</strong> Exportación e importación determinista de copias de seguridad portables en un clic (`backup_nost_ia.json`).</li>
                </ul>
              </div>

              {/* Inferencia Local */}
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <span className="font-bold text-amber-300 block text-xs">Capa de Inferencia & Procesamiento Local</span>
                <ul className="space-y-1 text-slate-300">
                  <li>• <strong>Ollama Client:</strong> Conector HTTP local estandarizado (`localhost:11434/v1`).</li>
                  <li>• <strong>Modelos LLM Integrados:</strong> Optimizado para <strong>Qwen 2.5 Coder 1.5B</strong> (Alibaba) corriendo 100% offline en tu computadora sin suscripciones.</li>
                  <li>• <strong>Motor Cognitivo Heurístico Determinista (`localCopilot.ts`):</strong> Respuestas matemáticas inmediatas (0 ms), combos y quiebres sin placa de video.</li>
                  <li>• <strong>Veto Matrix (5 Etapas):</strong> Impide colisiones entre presentaciones, marcas o tipos de mercadería.</li>
                </ul>
              </div>

              {/* Ingesta VDU */}
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <span className="font-bold text-purple-300 block text-xs">Ingesta VDU & Peritaje de Documentos</span>
                <ul className="space-y-1 text-slate-300">
                  <li>• <strong>SheetJS (`xlsx`):</strong> Lectura de planillas Excel ejecutada 100% en local con blindaje contra ReDoS.</li>
                  <li>• <strong>PDF.js (`pdfjs-dist`):</strong> Extractor local de texto vectorial para facturas y remitos digitales.</li>
                  <li>• <strong>ZXing Browser WASM:</strong> Decodificación instantánea de códigos de barras (EAN-13, QR AFIP).</li>
                  <li>• <strong>Layout Espacial 2D (docTR / Docling):</strong> Arquitectura de referencia VDU para segmentación geométrica 2D por bounding boxes sin confusión de renglones.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: MAPA CONCEPTUAL DEL ECOSISTEMA NOST-IA */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="text-base">🗺️</span>
                <span>3. MAPA CONCEPTUAL DEL ECOSISTEMA NOST-IA</span>
              </div>
              <button
                onClick={() => copiarTexto(MAPA_CONCEPTUAL_TEXT, 'mapa')}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {copiadoMapa ? <Check className="h-3.5 w-3.5 text-[#00FF87]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiadoMapa ? 'Copiado' : 'Copiar Mapa ASCII'}</span>
              </button>
            </div>

            <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-[10px] sm:text-[11px] leading-snug text-[#00FF87] border border-slate-800 select-all">
              {MAPA_CONCEPTUAL_TEXT}
            </pre>
          </div>

          {/* SECCIÓN 4: TEXTO DE IMPACTO PARA LA PÁGINA WEB */}
          <div className="rounded-xl border border-[#00FF87]/30 bg-[#00FF87]/10 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#00FF87]/20 pb-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#00FF87]">
                <span className="text-base">📢</span>
                <span>4. TEXTO DE IMPACTO PARA LA PÁGINA WEB (Landing Page Copy)</span>
              </div>
              <button
                onClick={() => copiarTexto(TEXTO_WEB_COPY, 'web')}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#00FF87]/40 bg-[#00FF87]/20 px-3 py-1 text-[11px] text-[#00FF87] hover:bg-[#00FF87]/30 transition-colors"
              >
                {copiadoWebText ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiadoWebText ? 'Copiado' : 'Copiar Copy Web'}</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Título Principal:</span>
                <blockquote className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-white font-bold text-sm">
                  «La Inteligencia Artificial que defiende al almacén de barrio.<br />
                  <span className="text-[#00FF87]">Sin internet. Sin corporaciones. Sin suscripciones. 100% Soberana.</span>»
                </blockquote>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Bajada Explicativa:</span>
                <p className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-slate-200 text-xs italic leading-relaxed">
                  "Concebido por el Profesor Alberto Salinas, NOST-IA transforma tu computadora en un centro de comando comercial: calcula tu capital en mercadería, te avisa antes de que te quedes sin stock, lee tus facturas de distribuidor automáticamente y te ayuda con combos y promociones para activar la venta cuando el mostrador viene tranquilo. El poder de la tecnología más avanzada, en tus propias manos."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="h-4 w-4 text-[#00FF87]" />
            <span>Desarrollo Federal Comunitario • Prof. Alberto Salinas</span>
          </div>

          <Button variant="primary" size="sm" onClick={onClose}>
            Entendido y Acompaño
          </Button>
        </div>
      </div>
    </div>
  );
};
