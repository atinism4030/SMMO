import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import User from '@/models/User';
import Client from '@/models/Client';
import ActivityLog from '@/models/ActivityLog';

// Client portal accounts are managed exclusively by the CEO from the client's
// admin page — never self-service, and never exposed to WORKER users.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const account = await User.findOne({ clientId: id, role: 'CLIENT' }).select('-passwordHash');
  return NextResponse.json({ account: account ?? null });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const client = await Client.findById(id);
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const existing = await User.findOne({ clientId: id, role: 'CLIENT' });
  if (existing) return NextResponse.json({ error: 'This client already has a portal account' }, { status: 409 });

  const { name, email, password } = await request.json();
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const emailTaken = await User.findOne({ email: email.toLowerCase().trim() });
  if (emailTaken) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const account = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'CLIENT',
    clientId: client._id,
    status: 'ACTIVE',
  });

  await ActivityLog.create({
    userId: session.userId,
    action: 'CREATE',
    entityType: 'ClientPortalAccess',
    entityId: account._id,
    message: `Created client portal access for "${client.name}" (${account.email})`,
  });

  return NextResponse.json(
    { account: { _id: account._id, name: account.name, email: account.email, role: account.role, status: account.status } },
    { status: 201 }
  );
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const { status } = await request.json();
  if (status !== 'ACTIVE' && status !== 'INACTIVE') {
    return NextResponse.json({ error: 'status must be ACTIVE or INACTIVE' }, { status: 400 });
  }

  const account = await User.findOneAndUpdate({ clientId: id, role: 'CLIENT' }, { status }, { new: true }).select('-passwordHash');
  if (!account) return NextResponse.json({ error: 'No portal account found for this client' }, { status: 404 });

  await ActivityLog.create({
    userId: session.userId,
    action: 'UPDATE',
    entityType: 'ClientPortalAccess',
    entityId: account._id,
    message: `${status === 'ACTIVE' ? 'Reactivated' : 'Deactivated'} client portal access (${account.email})`,
  });

  return NextResponse.json({ account });
}
