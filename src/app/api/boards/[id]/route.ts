import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Board from '@/models/Board';
import Task from '@/models/Task';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const board = await Board.findById(id).populate('clientId', 'name status');
  if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  const tasks = await Task.find({ boardId: id })
    .populate('assignedTo', 'name email')
    .populate('claimedBy', 'name email')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  return NextResponse.json({ board, tasks });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const body = await request.json();

  const board = await Board.findByIdAndUpdate(id, body, { new: true });
  if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  return NextResponse.json({ board });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const board = await Board.findByIdAndDelete(id);
  if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
