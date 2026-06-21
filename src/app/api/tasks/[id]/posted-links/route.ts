import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Task from '@/models/Task';

const VALID_PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Website', 'Other'];

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    await connectDB();
    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const isCEO = session.role === 'CEO';
    const userId = session.userId;

    // Permission check
    const isAssigned = task.assignedTo?.toString() === userId;
    const isClaimed = task.claimedBy?.toString() === userId;
    if (!isCEO && !isAssigned && !isClaimed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { action, platform, url, linkId } = body;

    if (action === 'add') {
      if (!platform || !VALID_PLATFORMS.includes(platform)) {
        return NextResponse.json({ error: 'Please select a valid platform.' }, { status: 400 });
      }
      if (!url || !isValidUrl(url)) {
        return NextResponse.json({ error: 'Please enter a valid published post URL.' }, { status: 400 });
      }

      const newLink = {
        _id: new mongoose.Types.ObjectId(),
        platform,
        url,
        addedBy: new mongoose.Types.ObjectId(userId),
        addedAt: new Date(),
      };

      task.postedLinks = task.postedLinks ?? [];
      task.postedLinks.push(newLink);

      if (!task.primaryPostUrl) {
        task.primaryPostUrl = url;
      }

      await task.save();
      const updated = await Task.findById(id).populate('assignedTo claimedBy createdBy', 'name email role');
      return NextResponse.json({ task: updated });
    }

    if (action === 'edit') {
      if (!linkId || !mongoose.isValidObjectId(linkId)) {
        return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 });
      }
      if (!platform || !VALID_PLATFORMS.includes(platform)) {
        return NextResponse.json({ error: 'Please select a valid platform.' }, { status: 400 });
      }
      if (!url || !isValidUrl(url)) {
        return NextResponse.json({ error: 'Please enter a valid published post URL.' }, { status: 400 });
      }

      const links = task.postedLinks ?? [];
      const idx = links.findIndex((l) => l._id.toString() === linkId);
      if (idx === -1) return NextResponse.json({ error: 'Link not found' }, { status: 404 });

      // Workers can only edit their own links
      if (!isCEO && links[idx].addedBy.toString() !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      links[idx].platform = platform;
      links[idx].url = url;
      task.postedLinks = links;

      // Update primaryPostUrl if this was the primary link
      if (task.primaryPostUrl === links[idx].url || links.length === 1) {
        task.primaryPostUrl = url;
      }

      await task.save();
      const updated = await Task.findById(id).populate('assignedTo claimedBy createdBy', 'name email role');
      return NextResponse.json({ task: updated });
    }

    if (action === 'delete') {
      if (!linkId || !mongoose.isValidObjectId(linkId)) {
        return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 });
      }

      const links = task.postedLinks ?? [];
      const idx = links.findIndex((l) => l._id.toString() === linkId);
      if (idx === -1) return NextResponse.json({ error: 'Link not found' }, { status: 404 });

      // Workers can only delete links they added
      if (!isCEO && links[idx].addedBy.toString() !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const removedUrl = links[idx].url;
      task.postedLinks = links.filter((_, i) => i !== idx);

      // If removed link was the primary, reset to first remaining link
      if (task.primaryPostUrl === removedUrl) {
        task.primaryPostUrl = task.postedLinks[0]?.url ?? undefined;
      }

      await task.save();
      const updated = await Task.findById(id).populate('assignedTo claimedBy createdBy', 'name email role');
      return NextResponse.json({ task: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('posted-links error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
