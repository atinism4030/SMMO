import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Client from '@/models/Client';
import { updateClientBillingSettings, getClientBillingSummary, BillingError } from '@/lib/billingService';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  // A CLIENT user may only ever look at their own billing — never another client's.
  if (session.role === 'CLIENT' && session.clientId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (session.role === 'WORKER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const client = await Client.findById(id).select('name billing');
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const summary = await getClientBillingSummary(id);
    return NextResponse.json({ billing: client.billing ?? null, summary });
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to load billing info';
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  try {
    const client = await updateClientBillingSettings(
      id,
      {
        monthlyFeeMinor: body.monthlyFeeMinor,
        currency: body.currency,
        billingStartDate: body.billingStartDate,
        billingDay: body.billingDay,
        paymentTerms: body.paymentTerms,
        billingEnabled: body.billingEnabled,
        notes: body.notes,
      },
      session.userId
    );
    return NextResponse.json({ billing: client.billing });
  } catch (err) {
    const status = err instanceof BillingError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to update billing settings';
    return NextResponse.json({ error: message }, { status });
  }
}
