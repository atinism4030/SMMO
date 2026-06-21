import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import GeneratedDocument from '@/models/GeneratedDocument';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const docs = await GeneratedDocument.find({ clientId })
    .sort({ createdAt: -1 })
    .populate('generatedBy', 'name email')
    .lean();

  return NextResponse.json({ documents: docs });
}
