import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'cyber';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantStyles = {
    primary:
      'bg-[#00FF87] text-black font-bold hover:bg-[#00e077] border border-[#00FF87] shadow-[0_0_12px_rgba(0,255,135,0.25)]',
    secondary:
      'bg-[#1E293B]/80 text-[#F8FAFC] hover:bg-[#334155] border border-[#334155] hover:border-slate-500',
    danger:
      'bg-[#FF2E93]/20 text-[#FF2E93] hover:bg-[#FF2E93]/30 border border-[#FF2E93]/50 shadow-[0_0_10px_rgba(255,46,147,0.2)]',
    ghost: 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent',
    cyber:
      'bg-[#12151E] text-[#00D2FF] border border-[#00D2FF]/50 hover:bg-[#00D2FF]/10 shadow-[0_0_12px_rgba(0,210,255,0.2)]',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
};
