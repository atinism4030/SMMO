import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import User from '@/models/User';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 });
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { name, email, password, role, phone } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, password are required' }, { status: 400 });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role: role ?? 'WORKER', phone });

  return NextResponse.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
}
