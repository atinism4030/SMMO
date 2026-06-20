import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import ContentItem from '@/models/ContentItem';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get('clientId');
  const boardId = searchParams.get('boardId');
  const status = searchParams.get('status');
  const platform = searchParams.get('platform');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  const query: Record<string, unknown> = {};
  if (clientId) query.clientId = clientId;
  if (boardId) query.boardId = boardId;
  if (status) query.status = status;
  if (platform) query.platforms = platform;

  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    query.scheduledDate = { $gte: start, $lte: end };
  }

  const items = await ContentItem.find(query)
    .populate('clientId', 'name')
    .populate('boardId', 'title')
    .sort({ scheduledDate: 1, createdAt: -1 });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await request.json();

  if (!body.clientId || !body.title) {
    return NextResponse.json({ error: 'clientId and title are required' }, { status: 400 });
  }

  const item = await ContentItem.create({ ...body, createdBy: session.userId });

  await ActivityLog.create({
    userId: session.userId,
    action: 'CREATE',
    entityType: 'ContentItem',
    entityId: item._id,
    message: `Created content item "${item.title}"`,
  });

  return NextResponse.json({ item }, { status: 201 });
}
