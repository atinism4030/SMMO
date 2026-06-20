import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import PhotoshootSession from '@/models/PhotoshootSession';
import mongoose from 'mongoose';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shotId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, shotId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(shotId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  await connectDB();
  const ps = await PhotoshootSession.findById(id);
  if (!ps) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (session.role === 'WORKER') {
    const isAssigned = ps.assignedWorkers.some(
      (w) => w.toString() === session.userId
    );
    if (!isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const shot = ps.shotList.find((s) => s._id.toString() === shotId);
  if (!shot) return NextResponse.json({ error: 'Shot not found' }, { status: 404 });

  const nowCompleted = !shot.completed;

  const update: Record<string, unknown> = {
    'shotList.$.completed': nowCompleted,
  };
  if (nowCompleted) {
    update['shotList.$.completedBy'] = session.userId;
    update['shotList.$.completedAt'] = new Date();
  } else {
    update['shotList.$.completedBy'] = null;
    update['shotList.$.completedAt'] = null;
  }

  const updated = await PhotoshootSession.findOneAndUpdate(
    { _id: id, 'shotList._id': shotId },
    { $set: update },
    { new: true }
  )
    .populate('clientId', 'name businessType')
    .populate('assignedWorkers', 'name email avatarUrl')
    .populate('shotList.completedBy', 'name');

  return NextResponse.json({ session: updated });
}
