import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from './Sidebar';
import type { UserRole } from '@/types';

interface AppLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export default async function AppLayout({ children, requiredRole }: AppLayoutProps) {
  const session = await getSession();

  if (!session) redirect('/login');
  if (requiredRole && session.role !== requiredRole) {
    if (session.role === 'CEO') redirect('/dashboard');
    else redirect('/worker/dashboard');
  }

  return (
    <div className="flex h-full min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={session.role} userName={session.name} userEmail={session.email} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
