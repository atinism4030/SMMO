import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getWalletsWithBalances, createWallet, FinanceError } from '@/lib/financeService';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const wallets = await getWalletsWithBalances();
  return NextResponse.json({ wallets });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, type, ownerUserId } = await request.json();
  if (!['PERSONAL', 'COMPANY', 'SAVINGS'].includes(type)) {
    return NextResponse.json({ error: 'type must be PERSONAL, COMPANY, or SAVINGS' }, { status: 400 });
  }

  try {
    const wallet = await createWallet(name, type, ownerUserId);
    return NextResponse.json({ wallet }, { status: 201 });
  } catch (err) {
    const status = err instanceof FinanceError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to create wallet';
    return NextResponse.json({ error: message }, { status });
  }
}
