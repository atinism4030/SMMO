import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import LoginContent from './Content';

function dashboardFor(role: string): string {
  if (role === 'CEO') return '/dashboard';
  if (role === 'CLIENT') return '/client/dashboard';
  return '/worker/dashboard';
}

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(dashboardFor(session.role));
  }

  await connectDB();
  const ceoCount = await User.countDocuments({ role: 'CEO' });
  if (ceoCount === 0) {
    redirect('/setup');
  }

  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
