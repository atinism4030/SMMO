import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import FinanceTransaction from '@/models/FinanceTransaction';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const transaction = await FinanceTransaction.findById(id)
    .populate('clientId', 'name')
    .populate('walletId', 'name type')
    .populate('fromWalletId', 'name type')
    .populate('toWalletId', 'name type')
    .populate('createdBy', 'name')
    .populate('voidedBy', 'name');
  if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

  return NextResponse.json({ transaction });
}
