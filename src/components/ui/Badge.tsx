import React from 'react';
import type { EstadoAlertaStock, RubroTerritorial } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'crimson' | 'blue' | 'yellow' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'sm',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  const variantStyles = {
    green: 'border-[#00FF87]/40 bg-[#00FF87]/10 text-[#00FF87]',
    crimson: 'border-[#FF2E93]/40 bg-[#FF2E93]/10 text-[#FF2E93]',
    blue: 'border-[#00D2FF]/40 bg-[#00D2FF]/10 text-[#00D2FF]',
    yellow: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    slate: 'border-slate-700 bg-slate-800/80 text-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono uppercase tracking-wider whitespace-nowrap ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const EstadoStockBadge: React.FC<{ estado: EstadoAlertaStock; dias?: number }> = ({
  estado,
  dias,
}) => {
  switch (estado) {
    case 'critico':
      return (
        <Badge variant="crimson">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF2E93] animate-ping" />
          Quiebre {dias !== undefined ? `(${dias}d)` : ''}
        </Badge>
      );
    case 'medio':
      return (
        <Badge variant="yellow">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Medio {dias !== undefined ? `(${dias}d)` : ''}
        </Badge>
      );
    case 'sobrestock':
      return (
        <Badge variant="blue">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00D2FF]" />
          Sobrestock
        </Badge>
      );
    case 'optimo':
    default:
      return (
        <Badge variant="green">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00FF87]" />
          Óptimo
        </Badge>
      );
  }
};

export const RubroBadge: React.FC<{ rubro: RubroTerritorial | string }> = ({ rubro }) => {
  let variant: 'green' | 'crimson' | 'blue' | 'yellow' | 'slate' = 'slate';
  if (rubro === 'Almacén') variant = 'blue';
  if (rubro === 'Cooperativa') variant = 'green';
  if (rubro === 'Granja' || rubro === 'Cultivo') variant = 'yellow';
  if (rubro === 'Acopio' || rubro === 'Taller') variant = 'crimson';

  return <Badge variant={variant}>{rubro}</Badge>;
};
