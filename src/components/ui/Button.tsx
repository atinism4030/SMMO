import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variants: Record<string, string> = {
  primary:   'bg-white text-black hover:bg-zinc-200 border border-transparent',
  secondary: 'bg-transparent border border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white',
  ghost:     'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900',
  danger:    'bg-transparent border border-zinc-700 text-red-400 hover:bg-red-500/10 hover:border-red-700',
  success:   'bg-transparent border border-zinc-700 text-zinc-200 hover:bg-zinc-800',
};

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-sm rounded-lg',
};

export default function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
