import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Client from '@/models/Client';
import { validateBoardImport } from '@/lib/boardImport';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { clientId, json } = await request.json();
  if (!clientId) return NextResponse.json({ error: 'clientId is required' }, { status: 400 });

  await connectDB();
  const client = await Client.findById(clientId).select('name');
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const result = validateBoardImport(json, client.name);
  return NextResponse.json(result);
}
