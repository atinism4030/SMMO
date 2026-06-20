import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Report from '@/models/Report';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const report = await Report.findById(id).populate('clientId', 'name').populate('contentItemId', 'title contentType');
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  return NextResponse.json({ report });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const body = await request.json();

  const report = await Report.findByIdAndUpdate(id, body, { new: true }).populate('clientId', 'name');
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  return NextResponse.json({ report });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  await Report.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
