import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import PhotoshootSession from '@/models/PhotoshootSession';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shotId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, shotId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(shotId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  await connectDB();
  const body = await request.json();

  // Build $set with positional operator
  const update: Record<string, unknown> = {};
  const allowedFields = ['title', 'description', 'category', 'required', 'notes', 'sampleImageUrl', 'priority', 'order'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[`shotList.$.${field}`] = body[field];
  }

  const ps = await PhotoshootSession.findOneAndUpdate(
    { _id: id, 'shotList._id': shotId },
    { $set: update },
    { new: true }
  )
    .populate('clientId', 'name')
    .populate('assignedWorkers', 'name email')
    .populate('shotList.completedBy', 'name');

  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ session: ps });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shotId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, shotId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(shotId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  await connectDB();
  const ps = await PhotoshootSession.findByIdAndUpdate(
    id,
    { $pull: { shotList: { _id: new mongoose.Types.ObjectId(shotId) } } },
    { new: true }
  );

  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ session: ps });
}
