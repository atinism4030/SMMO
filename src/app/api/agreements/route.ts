import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Agreement from '@/models/Agreement';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get('clientId');

  const query: Record<string, unknown> = {};
  if (clientId) query.clientId = clientId;

  const agreements = await Agreement.find(query)
    .populate('clientId', 'name')
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });

  return NextResponse.json({ agreements });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = await request.json();

  if (!body.clientId || !body.title) {
    return NextResponse.json({ error: 'clientId and title are required' }, { status: 400 });
  }

  const agreement = await Agreement.create({ ...body, uploadedBy: session.userId });
  return NextResponse.json({ agreement }, { status: 201 });
}
