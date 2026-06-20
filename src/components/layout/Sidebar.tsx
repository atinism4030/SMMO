'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  CheckSquare,
  Calendar,
  CreditCard,
  BarChart3,
  UserCircle,
  FileText,
  Settings,
  ClipboardList,
  Star,
  LogOut,
  Camera,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ceoNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Boards', href: '/boards', icon: LayoutGrid },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Content Calendar', href: '/calendar', icon: Calendar },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Photoshooting Days', href: '/photoshoots', icon: Camera },
  { label: 'Workers', href: '/workers', icon: UserCircle },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const workerNav: NavItem[] = [
  { label: 'My Dashboard', href: '/worker/dashboard', icon: LayoutDashboard },
  { label: 'Available Tasks', href: '/worker/available-tasks', icon: Star },
  { label: 'My Tasks', href: '/worker/my-tasks', icon: ClipboardList },
  { label: 'Calendar', href: '/worker/calendar', icon: Calendar },
  { label: 'My Photoshoots', href: '/worker/photoshoots', icon: Camera },
  { label: 'Settings', href: '/worker/settings', icon: Settings },
];

interface SidebarProps {
  role: UserRole;
  userName: string;
  userEmail: string;
}

export default function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const nav = role === 'CEO' ? ceoNav : workerNav;

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/worker/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            S
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>SMMO</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Social Media Mgmt</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className={cn(
          'text-xs font-semibold px-2 py-1 rounded-full',
          role === 'CEO' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
        )}>
          {role === 'CEO' ? 'CEO / Admin' : 'Worker'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'text-indigo-300'
                  : 'hover:text-slate-200'
              )}
              style={active ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : { color: 'var(--text-secondary)' }}
            >
              <Icon size={16} className={active ? 'text-indigo-400' : ''} />
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{userName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
