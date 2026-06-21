import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Client from '@/models/Client';
import ActivityLog from '@/models/ActivityLog';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const client = await Client.findById(id);
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    return NextResponse.json({ client });
  } catch (err) {
    console.error('GET /api/clients/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const client = await Client.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    await ActivityLog.create({
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'Client',
      entityId: client._id,
      message: `Updated client "${client.name}"`,
    });

    return NextResponse.json({ client });
  } catch (err) {
    console.error('PUT /api/clients/[id] error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to update client';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectDB();
    const { id } = await params;
    const client = await Client.findByIdAndDelete(id);
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    await ActivityLog.create({
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Client',
      entityId: client._id,
      message: `Deleted client "${client.name}"`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/clients/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
