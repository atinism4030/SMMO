import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const roleFilter = searchParams.get('role');

  const query: Record<string, string> = {};
  if (roleFilter) query.role = roleFilter;

  const users = await User.find(query).select('-passwordHash').sort({ createdAt: -1 });
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();

  const { name, email, password, phone, status } = await request.json();

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

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'WORKER',
    phone: phone?.trim() || undefined,
    status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  });

  return NextResponse.json(
    { user: { id: user._id, name: user.name, email: user.email, role: user.role } },
    { status: 201 }
  );
}
