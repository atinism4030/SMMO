import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import PhotoshootSession from '@/models/PhotoshootSession';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  await connectDB();
  const body = await request.json();

  if (!body.title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  const ps = await PhotoshootSession.findById(id);
  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const maxOrder = ps.shotList.reduce((max, s) => Math.max(max, s.order), -1);
  ps.shotList.push({
    _id: new mongoose.Types.ObjectId(),
    title: body.title,
    description: body.description,
    category: body.category ?? 'Other',
    required: body.required ?? false,
    completed: false,
    notes: body.notes,
    sampleImageUrl: body.sampleImageUrl,
    priority: body.priority ?? 'MEDIUM',
    order: body.order ?? maxOrder + 1,
  } as Parameters<typeof ps.shotList.push>[0]);

  await ps.save();
  return NextResponse.json({ session: ps }, { status: 201 });
}
