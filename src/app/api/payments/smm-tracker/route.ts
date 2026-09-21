import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSmmTrackerOverview } from '@/lib/billingService';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const overview = await getSmmTrackerOverview();
  return NextResponse.json(overview);
}
