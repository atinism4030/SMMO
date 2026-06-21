'use client';

import { Bell, Menu } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  alerts?: number;
}

export default function Topbar({ title, subtitle, actions, alerts = 0 }: TopbarProps) {
  function openSidebar() {
    window.dispatchEvent(new CustomEvent('smmo:openSidebar'));
  }

  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4"
      style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="sm:hidden p-1.5 rounded-lg flex-shrink-0"
          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
          onClick={openSidebar}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          {subtitle && <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
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
