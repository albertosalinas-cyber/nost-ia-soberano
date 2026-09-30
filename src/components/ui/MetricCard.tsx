import React from 'react';

interface MetricCardProps {
  titulo: string;
  valor: string | number;
  subtexto?: string;
  icono?: React.ReactNode;
  variante?: 'verde' | 'crimson' | 'azul' | 'neutro';
  alerta?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  titulo,
  valor,
  subtexto,
  icono,
  variante = 'neutro',
  alerta = false,
}) => {
  const accentColors = {
    verde: 'text-[#00FF87] border-[#00FF87]/20 bg-[#00FF87]/5',
    crimson: 'text-[#FF2E93] border-[#FF2E93]/30 bg-[#FF2E93]/5',
    azul: 'text-[#00D2FF] border-[#00D2FF]/20 bg-[#00D2FF]/5',
    neutro: 'text-slate-300 border-[#1E293B] bg-[#12151E]',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 backdrop-blur-md transition-all ${accentColors[variante]} ${
        alerta ? 'ring-1 ring-[#FF2E93]/60' : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400">
        <span>{titulo}</span>
        {icono && <span className="opacity-80">{icono}</span>}
      </div>

      <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#F8FAFC]">
        {valor}
      </div>

      {subtexto && (
        <div className="mt-1 text-xs text-slate-400">
          {subtexto}
        </div>
      )}

      {alerta && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2E93] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2E93]" />
        </span>
      )}
    </div>
  );
};
