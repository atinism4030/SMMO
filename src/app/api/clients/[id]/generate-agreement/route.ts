import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Client from '@/models/Client';
import GeneratedDocument from '@/models/GeneratedDocument';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const client = await Client.findById(id);
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const body = await request.json();
  const { documentData, language, title, updateStatus } = body;

  const doc = await GeneratedDocument.create({
    clientId: id,
    documentType: 'agreement',
    language: language ?? 'en',
    title: title ?? `Agreement — ${client.name}`,
    generatedBy: session.userId,
    documentData: documentData ?? {},
  });

  if (updateStatus) {
    await Client.findByIdAndUpdate(id, { status: 'ACTIVE' });
  }

  return NextResponse.json({ document: doc }, { status: 201 });
}
