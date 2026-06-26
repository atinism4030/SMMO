import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import GeneratedDocument from '@/models/GeneratedDocument';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const clientId = request.nextUrl.searchParams.get('clientId');
  const docType = request.nextUrl.searchParams.get('type'); // 'offer' | 'agreement' | null

  const filter: Record<string, unknown> = {};
  if (clientId) filter.clientId = clientId;
  if (docType) filter.documentType = docType;

  // Non-CEO users can only see docs for their own client context (clientId must be provided)
  if (session.role !== 'CEO' && !clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const docs = await GeneratedDocument.find(filter)
    .sort({ createdAt: -1 })
    .populate('clientId', 'name')
    .populate('generatedBy', 'name email')
    .lean();

  return NextResponse.json({ documents: docs });
}
