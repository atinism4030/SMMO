import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Client from '@/models/Client';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const isDemo = searchParams.get('isDemo');
    const limit = searchParams.get('limit');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (isDemo === 'true') query.isDemo = true;
    if (isDemo === 'false') query.isDemo = { $ne: true };

    let q = Client.find(query).sort({ createdAt: -1 });
    if (limit) q = q.limit(Number(limit));
    const clients = await q;
    return NextResponse.json({ clients });
  } catch (err) {
    console.error('GET /api/clients error:', err);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectDB();
    const body = await request.json();

    if (!body.name) return NextResponse.json({ error: 'Client name is required' }, { status: 400 });

    const client = await Client.create(body);

    await ActivityLog.create({
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Client',
      entityId: client._id,
      message: `Created client "${client.name}"`,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    console.error('POST /api/clients error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to create client';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
