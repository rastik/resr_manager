import React from 'react';

interface BadgeProps {
  variant?: 'occupied' | 'vacant' | 'maintenance' | 'active' | 'expired' | 'draft' | 'warning' | 'neutral' | 'success' | 'hotel';
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

const slovakStatusLabels: Record<string, string> = {
  occupied: 'Prenajatý',
  vacant: 'Voľný',
  maintenance: 'V údržbe',
  active: 'Aktívna',
  expired: 'Neaktívna',
  draft: 'Koncept',
  warning: 'Upozornenie',
  neutral: 'Všeobecné',
  success: 'V poriadku',
  hotel: 'Hotel',
};

const badgeStyles: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  occupied: {
    bg: 'bg-emerald-600 text-white',
    text: 'text-white',
    dot: 'bg-emerald-200',
    border: 'border-emerald-500/80 shadow-xs',
  },
  active: {
    bg: 'bg-emerald-600 text-white',
    text: 'text-white',
    dot: 'bg-emerald-200',
    border: 'border-emerald-500/80 shadow-xs',
  },
  success: {
    bg: 'bg-emerald-600 text-white',
    text: 'text-white',
    dot: 'bg-emerald-200',
    border: 'border-emerald-500/80 shadow-xs',
  },
  hotel: {
    bg: 'bg-amber-500 text-white',
    text: 'text-white',
    dot: 'bg-amber-200',
    border: 'border-amber-400/80 shadow-xs',
  },
  vacant: {
    bg: 'bg-rose-600 text-white',
    text: 'text-white',
    dot: 'bg-rose-200',
    border: 'border-rose-500/80 shadow-xs',
  },
  warning: {
    bg: 'bg-amber-500 text-white',
    text: 'text-white',
    dot: 'bg-amber-100',
    border: 'border-amber-400/80 shadow-xs',
  },
  maintenance: {
    bg: 'bg-rose-600 text-white',
    text: 'text-white',
    dot: 'bg-rose-200',
    border: 'border-rose-500/80 shadow-xs',
  },
  expired: {
    bg: 'bg-slate-500 text-white',
    text: 'text-white',
    dot: 'bg-slate-300',
    border: 'border-slate-400/80 shadow-xs',
  },
  draft: {
    bg: 'bg-sky-600 text-white',
    text: 'text-white',
    dot: 'bg-sky-200',
    border: 'border-sky-500/80 shadow-xs',
  },
  neutral: {
    bg: 'bg-slate-700 text-white',
    text: 'text-white',
    dot: 'bg-slate-300',
    border: 'border-slate-600/80 shadow-xs',
  },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '', size = 'sm' }) => {
  const content = children || slovakStatusLabels[variant] || variant;
  const style = badgeStyles[variant] || badgeStyles.neutral;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[11px] gap-1.5'
    : 'px-2.5 py-1 text-xs gap-2';

  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight rounded-md border select-none ${style.bg} ${style.border} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span>{content}</span>
    </span>
  );
};
