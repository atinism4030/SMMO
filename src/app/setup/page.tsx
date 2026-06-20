import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import SetupContent from './Content';

export default async function SetupPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === 'CEO' ? '/dashboard' : '/worker/dashboard');
  }

  await connectDB();
  const ceoCount = await User.countDocuments({ role: 'CEO' });
  if (ceoCount > 0) {
    redirect('/login');
  }

  return <SetupContent />;
}
