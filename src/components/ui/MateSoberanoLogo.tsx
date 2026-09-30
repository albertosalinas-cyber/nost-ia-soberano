import React from 'react';

interface MateSoberanoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

export const MateSoberanoLogo: React.FC<MateSoberanoLogoProps> = ({
  className = '',
  size = 'md',
  showLabel = false,
}) => {
  const sizePixels = {
    sm: 32,
    md: 48,
    lg: 72,
    xl: 96,
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: sizePixels, height: sizePixels }}
      >
        {/* Resplandor territorial de fondo */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#00FF87]/20 via-[#00D2FF]/20 to-transparent blur-md pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(0,255,135,0.4)]"
        >
          <defs>
            {/* Gradientes Futuristas Populares */}
            <linearGradient id="mateCalabaza" x1="20" y1="40" x2="80" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="40%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#050B14" />
            </linearGradient>

            <linearGradient id="virolaNeon" x1="20" y1="36" x2="80" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00FF87" />
              <stop offset="50%" stopColor="#00D2FF" />
              <stop offset="100%" stopColor="#00FF87" />
            </linearGradient>

            <linearGradient id="bombillaMetal" x1="50" y1="10" x2="75" y2="55" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#00D2FF" />
            </linearGradient>

            <linearGradient id="humoGradiente" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00FF87" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#00D2FF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00D2FF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ONDAS DINÁMICAS DE HUMO Y VAPOR POPULAR (Animadas por CSS/SVG) */}
          <g className="opacity-90">
            {/* Línea 1 de vapor */}
            <path
              d="M38 32 C34 24, 44 18, 40 10 C38 6, 42 2, 44 0"
              stroke="url(#humoGradiente)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-pulse"
              style={{ animationDuration: '2.5s' }}
            />
            {/* Línea 2 de vapor central */}
            <path
              d="M48 30 C53 22, 43 15, 50 8 C53 4, 49 1, 52 0"
              stroke="url(#humoGradiente)"
              strokeWidth="3"
              strokeLinecap="round"
              className="animate-pulse"
              style={{ animationDuration: '3s', animationDelay: '0.4s' }}
            />
            {/* Línea 3 de vapor derecha */}
            <path
              d="M58 33 C63 25, 55 19, 61 11 C64 7, 60 2, 63 0"
              stroke="url(#humoGradiente)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-pulse"
              style={{ animationDuration: '2.2s', animationDelay: '0.8s' }}
            />
          </g>

          {/* BOMBILLA SOBERANA DE ACERO CON RESPLANDOR */}
          {/* Caño inclinado de la bombilla */}
          <line
            x1="68"
            y1="12"
            x2="45"
            y2="52"
            stroke="url(#bombillaMetal)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Pico de la bombilla dorado/cyan */}
          <path
            d="M66 14 L73 8"
            stroke="#00FF87"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle cx="73" cy="8" r="2.5" fill="#00FF87" />

          {/* CUERPO DEL MATE (Calabaza criolla estilizada y territorial) */}
          <path
            d="M24 40 C20 62, 30 88, 50 90 C70 88, 80 62, 76 40 Z"
            fill="url(#mateCalabaza)"
            stroke="#1E293B"
            strokeWidth="2"
          />

          {/* TRAZADOS DE CIRCUITOS / LÍNEAS DE SOBERANÍA TECNOLÓGICA */}
          <path
            d="M32 50 Q50 62 68 50"
            stroke="#00D2FF"
            strokeWidth="1"
            strokeOpacity="0.4"
            fill="none"
          />
          <path
            d="M30 68 Q50 82 70 68"
            stroke="#00FF87"
            strokeWidth="1.2"
            strokeOpacity="0.5"
            fill="none"
          />
          <circle cx="50" cy="74" r="2" fill="#00FF87" />

          {/* INSCRIPCIÓN GRABADA DEL NOMBRE EN EL CUERPO DEL ESCUDO */}
          <text
            x="50"
            y="60"
            textAnchor="middle"
            fill="#00FF87"
            fontSize="7"
            fontWeight="900"
            fontFamily="monospace"
            letterSpacing="0.5"
            opacity="0.95"
            className="select-none"
          >
            NOST-IA
          </text>

          {/* VIROLA DEL MATE (Anillo superior en gradiente Neón) */}
          <ellipse
            cx="50"
            cy="40"
            rx="26"
            ry="6"
            fill="#0F172A"
            stroke="url(#virolaNeon)"
            strokeWidth="2.5"
          />

          {/* YERBA MATE ORGÁNICA SUPERIOR */}
          <ellipse
            cx="50"
            cy="40"
            rx="21"
            ry="4.5"
            fill="#064E3B"
          />
          <circle cx="44" cy="39" r="1.5" fill="#10B981" />
          <circle cx="54" cy="41" r="1.2" fill="#34D399" />
          <circle cx="49" cy="40" r="1" fill="#059669" />

          {/* BASE DE APOYO DEL MATE (Tres pies o base territorial) */}
          <ellipse
            cx="50"
            cy="90"
            rx="16"
            ry="3.5"
            fill="#000000"
            fillOpacity="0.6"
          />
        </svg>
      </div>

      {showLabel && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-mono text-base font-black tracking-widest text-white">
              NOST-IA
            </span>
            <span className="rounded bg-[#00FF87]/20 px-1 py-0.2 font-mono text-[9px] font-bold text-[#00FF87] border border-[#00FF87]/30">
              SOBERANO
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 tracking-wider">
            Nodo Operativo Territorial
          </span>
        </div>
      )}
    </div>
  );
};
