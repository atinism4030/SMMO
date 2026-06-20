import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import '@/models/index';
import PhotoshootSession from '@/models/PhotoshootSession';
import mongoose from 'mongoose';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  await connectDB();
  const ps = await PhotoshootSession.findById(id)
    .populate('clientId', 'name businessType')
    .populate('assignedWorkers', 'name email avatarUrl')
    .populate('createdBy', 'name')
    .populate('shotList.completedBy', 'name');

  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (session.role === 'WORKER') {
    const isAssigned = ps.assignedWorkers.some(
      (w: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId }) =>
        (w instanceof mongoose.Types.ObjectId ? w : w._id).toString() === session.userId
    );
    if (!isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ session: ps });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  await connectDB();
  const body = await request.json();

  // Prevent overwriting shotList via this route — use /shots sub-route
  delete body.shotList;
  delete body.createdBy;

  const ps = await PhotoshootSession.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true })
    .populate('clientId', 'name businessType')
    .populate('assignedWorkers', 'name email avatarUrl')
    .populate('createdBy', 'name')
    .populate('shotList.completedBy', 'name');

  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ session: ps });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  await connectDB();
  const ps = await PhotoshootSession.findByIdAndDelete(id);
  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
