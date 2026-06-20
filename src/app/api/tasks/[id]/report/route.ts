import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Task from '@/models/Task';
import { calcEngagementRate } from '@/lib/reporting';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Only CEOs can save report metrics' }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;

  const task = await Task.findById(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (task.status !== 'POSTED') {
    return NextResponse.json({ error: 'Task must be in POSTED status to save metrics' }, { status: 400 });
  }

  const body = await request.json();
  const {
    views, reach, likes, comments, shares, saves,
    profileVisits, linkClicks,
    storyReplies, storyTapsForward, storyTapsBack, storyExits,
    notes, screenshotUrl,
  } = body;

  // Auto-calculate engagement rate for POST/REEL
  let engagementRate: number | null = null;
  if (task.contentType !== 'STORY') {
    engagementRate = calcEngagementRate({ likes, comments, shares, saves, reach });
  }

  const update: Record<string, unknown> = {
    'reporting.reportStatus': 'COMPLETED',
    'reporting.reportCompletedAt': new Date(),
    'reporting.metrics.views': views,
    'reporting.metrics.reach': reach,
    'reporting.metrics.likes': likes,
    'reporting.metrics.comments': comments,
    'reporting.metrics.shares': shares,
    'reporting.metrics.saves': saves,
    'reporting.metrics.profileVisits': profileVisits,
    'reporting.metrics.linkClicks': linkClicks,
    'reporting.metrics.storyReplies': storyReplies,
    'reporting.metrics.storyTapsForward': storyTapsForward,
    'reporting.metrics.storyTapsBack': storyTapsBack,
    'reporting.metrics.storyExits': storyExits,
    'reporting.metrics.notes': notes,
    'reporting.metrics.screenshotUrl': screenshotUrl,
  };

  if (engagementRate !== null) {
    update['reporting.metrics.engagementRate'] = engagementRate;
  }

  // Remove undefined values so we don't wipe existing fields with undefined
  for (const key of Object.keys(update)) {
    if (update[key] === undefined) delete update[key];
  }

  const updated = await Task.findByIdAndUpdate(id, update, { new: true })
    .populate('assignedTo', 'name email')
    .populate('claimedBy', 'name email')
    .populate('clientId', 'name')
    .populate('boardId', 'title month year')
    .populate('createdBy', 'name')
    .populate('comments.userId', 'name role');

  return NextResponse.json({ task: updated });
}
