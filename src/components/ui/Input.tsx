import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export function Input({ label, error, helper, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg text-sm transition-colors',
          'border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30',
          'placeholder:text-slate-600',
          error ? 'border-red-500/50' : '',
          className
        )}
        style={{ background: 'var(--bg-elevated)', borderColor: error ? undefined : 'var(--border)', color: 'var(--text-primary)' }}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {helper && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{helper}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        {...props}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg text-sm transition-colors resize-none',
          'border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30',
          'placeholder:text-slate-600',
          error ? 'border-red-500/50' : '',
          className
        )}
        style={{ background: 'var(--bg-elevated)', borderColor: error ? undefined : 'var(--border)', color: 'var(--text-primary)' }}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <select
        id={inputId}
        {...props}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer',
          'border focus:border-indigo-500',
          error ? 'border-red-500/50' : '',
          className
        )}
        style={{ background: 'var(--bg-elevated)', borderColor: error ? undefined : 'var(--border)', color: 'var(--text-primary)' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-elevated)' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
