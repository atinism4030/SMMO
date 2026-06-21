'use client';

import { useState, useEffect } from 'react';
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
  X,
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener('smmo:openSidebar', open);
    return () => window.removeEventListener('smmo:openSidebar', open);
  }, []);

  // Close drawer on navigation
  useEffect(() => { setIsOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/worker/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const inner = (
    <aside
      className="w-64 flex flex-col h-full"
      style={{ background: '#000000', borderRight: '1px solid #1a1a1a' }}
    >
      {/* Logo + mobile close */}
      <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold text-sm">
            S
          </div>
          <div>
            <p className="font-bold text-sm text-white">SMMO</p>
            <p className="text-xs text-zinc-600">Social Media Mgmt</p>
          </div>
        </div>
        <button
          className="sm:hidden p-1 rounded-lg text-zinc-600 hover:text-white"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3 border-b" style={{ borderColor: '#1a1a1a' }}>
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
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
                  ? 'bg-white text-black'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
              )}
            >
              <Icon size={15} />
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t p-4" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate text-white">{userName}</p>
            <p className="text-xs truncate text-zinc-600">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 sm:hidden transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {inner}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden sm:flex w-64 flex-shrink-0 sticky top-0 h-screen">
        {inner}
      </div>
    </>
  );
}
