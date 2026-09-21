'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
import { useTranslation } from '@/components/providers/LanguageProvider';
import type { TranslationKey } from '@/lib/i18n';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  CheckSquare,
  Calendar,
  CreditCard,
  Landmark,
  BarChart3,
  UserCircle,
  FileText,
  Settings,
  ClipboardList,
  Star,
  LogOut,
  CalendarCheck,
  X,
} from 'lucide-react';

interface NavItem {
  labelKey: TranslationKey;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ceoNav: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.clients', href: '/clients', icon: Users },
  { labelKey: 'nav.boards', href: '/boards', icon: LayoutGrid },
  { labelKey: 'nav.tasks', href: '/tasks', icon: CheckSquare },
  { labelKey: 'nav.bookings', href: '/bookings', icon: CalendarCheck },
  { labelKey: 'nav.payments', href: '/payments', icon: CreditCard },
  { labelKey: 'nav.finances', href: '/finance', icon: Landmark },
  { labelKey: 'nav.reports', href: '/reports', icon: BarChart3 },
  { labelKey: 'nav.workersAccounts', href: '/workers', icon: UserCircle },
  { labelKey: 'nav.portalDocuments', href: '/documents', icon: FileText },
  { labelKey: 'nav.settings', href: '/settings', icon: Settings },
];

const workerNav: NavItem[] = [
  { labelKey: 'nav.myDashboard', href: '/worker/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.availableTasks', href: '/worker/available-tasks', icon: Star },
  { labelKey: 'nav.myTasks', href: '/worker/my-tasks', icon: ClipboardList },
  { labelKey: 'nav.calendar', href: '/worker/calendar', icon: Calendar },
  { labelKey: 'nav.reports', href: '/reports', icon: BarChart3 },
  { labelKey: 'nav.settings', href: '/worker/settings', icon: Settings },
];

const clientNav: NavItem[] = [
  { labelKey: 'nav.overview', href: '/client/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.payments', href: '/client/payments', icon: CreditCard },
  { labelKey: 'nav.contentCalendar', href: '/client/content', icon: Calendar },
  { labelKey: 'nav.bookAShoot', href: '/client/booking', icon: CalendarCheck },
  { labelKey: 'nav.account', href: '/client/account', icon: Settings },
];

interface SidebarProps {
  role: UserRole;
  userName: string;
  userEmail: string;
}

export default function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const nav = role === 'CEO' ? ceoNav : role === 'WORKER' ? workerNav : clientNav;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener('smmo:openSidebar', open);
    return () => window.removeEventListener('smmo:openSidebar', open);
  }, []);

  // Close drawer on navigation
  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberately syncing UI state to route changes, not a cascading-render bug
  useEffect(() => { setIsOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/worker/dashboard' || href === '/client/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const roleLabel = role === 'CEO' ? t('nav.ceoCoFounder') : role === 'WORKER' ? t('nav.worker') : t('nav.clientRole');

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
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2" style={{ borderColor: '#1a1a1a' }}>
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
          {roleLabel}
        </span>
        <LanguageSwitcher compact />
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
              {t(item.labelKey)}
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
          {t('common.signOut')}
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
