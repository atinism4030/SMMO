import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import FinanceTransaction from '@/models/FinanceTransaction';
import { createIncome, createExpense, createTransfer, FinanceError } from '@/lib/financeService';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/finance';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { searchParams } = request.nextUrl;

  const query: Record<string, unknown> = {};
  const type = searchParams.get('type');
  if (type) query.type = type;
  const status = searchParams.get('status');
  query.status = status || 'ACTIVE';
  const category = searchParams.get('category');
  if (category) query.category = category;
  const clientId = searchParams.get('clientId');
  if (clientId) query.clientId = clientId;
  const walletId = searchParams.get('walletId');
  if (walletId) query.$or = [{ walletId }, { fromWalletId: walletId }, { toWalletId: walletId }];
  const currency = searchParams.get('currency');
  if (currency) query.originalCurrency = currency;

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (from || to) {
    const dateQuery: Record<string, Date> = {};
    if (from) dateQuery.$gte = new Date(from);
    if (to) dateQuery.$lte = new Date(to);
    query.transactionDate = dateQuery;
  }

  const search = searchParams.get('search');
  if (search) {
    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      { $or: [{ description: { $regex: search, $options: 'i' } }, { reference: { $regex: search, $options: 'i' } }] },
    ];
  }

  const transactions = await FinanceTransaction.find(query)
    .populate('clientId', 'name')
    .populate('walletId', 'name type')
    .populate('fromWalletId', 'name type')
    .populate('toWalletId', 'name type')
    .populate('createdBy', 'name')
    .sort({ transactionDate: -1, createdAt: -1 })
    .limit(500);

  return NextResponse.json({ transactions, categories: { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES } });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { type } = body;

  try {
    if (type === 'INCOME') {
      if (!body.category || !body.amount || !body.walletId || !body.transactionDate) {
        return NextResponse.json({ error: 'category, amount, walletId, and transactionDate are required' }, { status: 400 });
      }
      const txn = await createIncome({
        category: body.category,
        description: body.description,
        clientId: body.clientId || undefined,
        reference: body.reference,
        notes: body.notes,
        amount: Number(body.amount),
        currency: body.currency || 'EUR',
        exchangeRateOverride: body.exchangeRate ? Number(body.exchangeRate) : undefined,
        walletId: body.walletId,
        transactionDate: body.transactionDate,
        createdBy: session.userId,
      });
      return NextResponse.json({ transaction: txn }, { status: 201 });
    }

    if (type === 'EXPENSE') {
      if (!body.category || !body.amount || !body.walletId || !body.transactionDate) {
        return NextResponse.json({ error: 'category, amount, walletId, and transactionDate are required' }, { status: 400 });
      }
      const txn = await createExpense({
        category: body.category,
        description: body.description,
        reference: body.reference,
        notes: body.notes,
        amount: Number(body.amount),
        currency: body.currency || 'EUR',
        exchangeRateOverride: body.exchangeRate ? Number(body.exchangeRate) : undefined,
        walletId: body.walletId,
        transactionDate: body.transactionDate,
        createdBy: session.userId,
      });
      return NextResponse.json({ transaction: txn }, { status: 201 });
    }

    if (type === 'TRANSFER') {
      if (!body.fromWalletId || !body.toWalletId || !body.amount || !body.transactionDate) {
        return NextResponse.json({ error: 'fromWalletId, toWalletId, amount, and transactionDate are required' }, { status: 400 });
      }
      const txn = await createTransfer({
        fromWalletId: body.fromWalletId,
        toWalletId: body.toWalletId,
        description: body.description,
        amount: Number(body.amount),
        currency: body.currency || 'EUR',
        exchangeRateOverride: body.exchangeRate ? Number(body.exchangeRate) : undefined,
        transactionDate: body.transactionDate,
        createdBy: session.userId,
      });
      return NextResponse.json({ transaction: txn }, { status: 201 });
    }

    return NextResponse.json({ error: 'type must be INCOME, EXPENSE, or TRANSFER' }, { status: 400 });
  } catch (err) {
    const status = err instanceof FinanceError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to record transaction';
    return NextResponse.json({ error: message }, { status });
  }
}
