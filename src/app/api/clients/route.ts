import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Client from '@/models/Client';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (search) query.name = { $regex: search, $options: 'i' };

  const clients = await Client.find(query).sort({ createdAt: -1 });
  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
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
}
