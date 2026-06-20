'use client';

import { Bell } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  alerts?: number;
}

export default function Topbar({ title, subtitle, actions, alerts = 0 }: TopbarProps) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
      style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
    >
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {alerts > 0 && (
          <div className="relative">
            <button className="p-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
              <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {alerts > 9 ? '9+' : alerts}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
