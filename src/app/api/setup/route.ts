import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  await connectDB();
  const count = await User.countDocuments({ role: 'CEO' });
  return NextResponse.json({ hasAdmin: count > 0 });
}

export async function POST(request: NextRequest) {
  await connectDB();

  const existing = await User.countDocuments({ role: 'CEO' });
  if (existing > 0) {
    return NextResponse.json(
      { error: 'Setup already completed. An admin account already exists.' },
      { status: 403 }
    );
  }

  const { name, email, password, phone } = await request.json();

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
  if (emailTaken) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'CEO',
    phone: phone?.trim() || undefined,
    status: 'ACTIVE',
  });

  return NextResponse.json(
    { message: 'Admin account created successfully. You can now log in.' },
    { status: 201 }
  );
}
