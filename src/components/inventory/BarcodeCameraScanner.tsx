import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Volume2, RefreshCw, Zap, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { audioFeedback } from '../../engine/audioFeedback';
import type { Producto } from '../../types';

interface BarcodeScannerProps {
  productos: Producto[];
  onBarcodeDetected: (codigo: string, accion: 'stock_add' | 'pos_sale' | 'view') => void;
  onClose?: () => void;
}

export const BarcodeCameraScanner: React.FC<BarcodeScannerProps> = ({
  productos,
  onBarcodeDetected,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<any>(null);

  const [activo, setActivo] = useState<boolean>(true);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [ultimoCodigo, setUltimoCodigo] = useState<string | null>(null);
  const [ultimoProductoDetectado, setUltimoProductoDetectado] = useState<Producto | null>(null);
  const [modoAccion, setModoAccion] = useState<'stock_add' | 'pos_sale' | 'view'>('pos_sale');
  const [cantidadPaso, setCantidadPaso] = useState<number>(1);
  const [manualInput, setManualInput] = useState<string>('');
  const [flashVerde, setFlashVerde] = useState<boolean>(false);
  const [scannerMotor, setScannerMotor] = useState<'BarcodeDetector Nativo' | 'ZXing Web' | 'Simulador Táctico'>('BarcodeDetector Nativo');

  // Detener cámara de forma segura y liberar recursos
  const detenerCamara = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch {
        // ignore
      }
      zxingReaderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const triggerDetection = useCallback(
    (code: string) => {
      const limpio = code.trim();
      if (!limpio) return;

      audioFeedback.playBarcodeSuccess();
      setUltimoCodigo(limpio);
      setFlashVerde(true);
      setTimeout(() => setFlashVerde(false), 400);

      const prod = productos.find((p) => p.codigoBarras === limpio);
      setUltimoProductoDetectado(prod || null);

      onBarcodeDetected(limpio, modoAccion);
    },
    [productos, modoAccion, onBarcodeDetected]
  );

  // Iniciar cámara con BarcodeDetector o ZXing
  const iniciarCamara = useCallback(async () => {
    setErrorCamara(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de cámara no está disponible en este entorno.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // 1. Intentar con BarcodeDetector nativo
      if ('BarcodeDetector' in window) {
        setScannerMotor('BarcodeDetector Nativo');
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        const detector = new BarcodeDetectorClass({
          formats: ['ean_13', 'ean_8', 'qr_code', 'code_128', 'upc_a', 'upc_e'],
        });

        let scanning = false;
        scanIntervalRef.current = window.setInterval(async () => {
          if (scanning || !videoRef.current || videoRef.current.readyState < 2) return;
          scanning = true;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const valor = barcodes[0].rawValue;
              if (valor && valor !== ultimoCodigo) {
                triggerDetection(valor);
              }
            }
          } catch {
            // Error puntual de detección de fotograma
          } finally {
            scanning = false;
          }
        }, 150);
      } else {
        // 2. Fallback con ZXing
        setScannerMotor('ZXing Web');
        try {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const codeReader = new BrowserMultiFormatReader();
          zxingReaderRef.current = codeReader;

          if (videoRef.current) {
            codeReader.decodeFromVideoElement(videoRef.current, (result, err) => {
              if (result) {
                const text = result.getText();
                if (text && text !== ultimoCodigo) {
                  triggerDetection(text);
                }
              }
            });
          }
        } catch (zxingErr) {
          console.warn('ZXing fallback info:', zxingErr);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al acceder a la cámara';
      setErrorCamara(msg);
      setScannerMotor('Simulador Táctico');
    }
  }, [triggerDetection, ultimoCodigo]);

  useEffect(() => {
    if (activo) {
      iniciarCamara();
    } else {
      detenerCamara();
    }

    return () => {
      detenerCamara();
    };
  }, [activo, iniciarCamara, detenerCamara]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#1E293B] bg-[#0E111A] p-4 text-[#F8FAFC] shadow-2xl">
      {/* Header del Escáner */}
      <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30">
            <Camera className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold tracking-wide text-white uppercase">
              Escáner Óptico de Códigos EAN-13 / QR
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Motor: <span className="text-[#00D2FF]">{scannerMotor}</span> • 100% Offline
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => audioFeedback.playBarcodeSuccess()}
            title="Probar sonido acústico"
          >
            <Volume2 className="h-4 w-4 text-slate-400 hover:text-[#00FF87]" />
          </Button>

          <Button
            variant={activo ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setActivo(!activo)}
          >
            {activo ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {activo ? 'Pausar' : 'Activar'}
          </Button>

          {onClose && (
            <button
              onClick={() => {
                detenerCamara();
                onClose();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Selector de Acción al Escanear */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#141824] p-2 border border-[#1E293B]">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-slate-400 mr-1">Modo:</span>
          <button
            onClick={() => setModoAccion('pos_sale')}
            className={`cursor-pointer rounded px-2.5 py-1 text-xs font-mono transition-all ${
              modoAccion === 'pos_sale'
                ? 'bg-[#00FF87] text-black font-bold shadow-[0_0_8px_rgba(0,255,135,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Venta POS
          </button>
          <button
            onClick={() => setModoAccion('stock_add')}
            className={`cursor-pointer rounded px-2.5 py-1 text-xs font-mono transition-all ${
              modoAccion === 'stock_add'
                ? 'bg-[#00D2FF] text-black font-bold shadow-[0_0_8px_rgba(0,210,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            + Sumar Stock
          </button>
          <button
            onClick={() => setModoAccion('view')}
            className={`cursor-pointer rounded px-2.5 py-1 text-xs font-mono transition-all ${
              modoAccion === 'view'
                ? 'bg-amber-400 text-black font-bold shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ficha Producto
          </button>
        </div>

        {modoAccion === 'stock_add' && (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400">Cantidad por escaneo:</span>
            <input
              type="number"
              min="1"
              max="500"
              value={cantidadPaso}
              onChange={(e) => setCantidadPaso(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-center text-white"
            />
          </div>
        )}
      </div>

      {/* Visor de Cámara y Láser Neón */}
      <div className="relative mx-auto w-full max-w-lg aspect-video overflow-hidden rounded-xl border-2 border-[#1E293B] bg-black">
        {activo ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* Marco de Enfoque Neón Cyber-Territorial */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div
                className={`relative h-44 w-64 rounded-lg border-2 transition-all duration-150 ${
                  flashVerde
                    ? 'border-[#00FF87] bg-[#00FF87]/20 shadow-[0_0_30px_#00FF87]'
                    : 'border-[#00FF87]/60 shadow-[0_0_15px_rgba(0,255,135,0.15)]'
                }`}
              >
                {/* Esquinas HUD */}
                <div className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-[#00FF87]" />
                <div className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-[#00FF87]" />
                <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-[#00FF87]" />
                <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-[#00FF87]" />

                {/* Línea láser de barrido animada */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#FF2E93] to-transparent shadow-[0_0_10px_#FF2E93] animate-laser" />
              </div>
            </div>

            {/* Flash visual de lectura */}
            {flashVerde && (
              <div className="pointer-events-none absolute inset-0 bg-[#00FF87]/25 transition-opacity duration-150" />
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#12151E] p-6 text-center text-slate-400">
            <CameraOff className="h-10 w-10 text-slate-600" />
            <p className="text-sm font-mono">Cámara en reposo para ahorro de recursos.</p>
            <Button size="sm" variant="primary" onClick={() => setActivo(true)}>
              Reactivar Cámara
            </Button>
          </div>
        )}

        {errorCamara && (
          <div className="absolute inset-x-2 bottom-2 rounded-lg border border-amber-500/40 bg-black/80 p-2 text-xs text-amber-300 backdrop-blur-md">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Aviso de Acceso a Cámara:</span>
            </div>
            <p className="mt-0.5 text-slate-300">
              {errorCamara.includes('Permission') || errorCamara.includes('denied')
                ? 'Permiso de cámara bloqueado o en entorno sin cámara física. Podés usar el simulador táctil abajo o tipear el código.'
                : errorCamara}
            </p>
          </div>
        )}
      </div>

      {/* Feedback del Último Código Detectado */}
      {ultimoCodigo && (
        <div className="flex items-center justify-between rounded-lg border border-[#00FF87]/30 bg-[#00FF87]/10 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#00FF87]" />
            <div>
              <div className="font-mono text-xs text-[#00FF87] uppercase tracking-wider">
                Código Detectado: <span className="font-bold">{ultimoCodigo}</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {ultimoProductoDetectado ? ultimoProductoDetectado.nombre : 'Producto no registrado en catálogo'}
              </div>
            </div>
          </div>
          {ultimoProductoDetectado && (
            <div className="text-right font-mono">
              <div className="text-xs text-slate-400">Stock Actual</div>
              <div className="text-sm font-bold text-[#00FF87]">
                {ultimoProductoDetectado.stockActual} {ultimoProductoDetectado.unidadMedida}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disparador Táctico Rápido (Prueba sin cámara o con pistola USB estándar) */}
      <div className="flex flex-col gap-2 rounded-lg border border-[#1E293B] bg-[#141824] p-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Ingreso Manual o Lector de Barra USB:</span>
          <span>Presioná Enter para impactar</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualInput.trim()) {
              triggerDetection(manualInput.trim());
              setManualInput('');
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Ej: 7790895000997 o escanear con pistola..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm text-white placeholder-slate-500 focus:border-[#00FF87] focus:outline-none"
          />
          <Button type="submit" variant="primary" size="sm">
            Escanear
          </Button>
        </form>

        {/* Acceso Rápido a Códigos del Catálogo Local */}
        <div className="mt-1">
          <span className="text-[11px] font-mono text-slate-400">Atajos de productos cargados:</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {productos.slice(0, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => triggerDetection(p.codigoBarras)}
                className="cursor-pointer rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] font-mono text-slate-300 hover:border-[#00FF87] hover:text-[#00FF87]"
              >
                {p.nombre.slice(0, 16)}... ({p.codigoBarras.slice(-4)})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
