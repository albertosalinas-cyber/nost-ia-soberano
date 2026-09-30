import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'neon-green' | 'neon-crimson' | 'neon-blue' | 'hud';
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'border-[#1E293B] bg-[#12151E]/90 hover:border-[#334155]',
    'neon-green': 'border-[#00FF87]/30 bg-[#12151E]/95 shadow-[0_0_15px_rgba(0,255,135,0.08)]',
    'neon-crimson': 'border-[#FF2E93]/40 bg-[#12151E]/95 shadow-[0_0_15px_rgba(255,46,147,0.08)]',
    'neon-blue': 'border-[#00D2FF]/30 bg-[#12151E]/95 shadow-[0_0_15px_rgba(0,210,255,0.08)]',
    hud: 'border-[#1E293B] bg-[#0D1017]/95 shadow-2xl backdrop-blur-md',
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 backdrop-blur-md ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
