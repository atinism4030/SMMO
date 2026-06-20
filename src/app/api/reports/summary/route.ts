import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Client from '@/models/Client';
import Task from '@/models/Task';
import Board from '@/models/Board';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const [clients, taskAgg, boardAgg] = await Promise.all([
    Client.find({}).sort({ name: 1 }).lean(),
    Task.aggregate([
      {
        $group: {
          _id: '$clientId',
          totalPosted: { $sum: { $cond: [{ $eq: ['$status', 'POSTED'] }, 1, 0] } },
          completedInsights: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'POSTED'] },
                    { $eq: ['$reporting.reportStatus', 'COMPLETED'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Board.aggregate([
      { $group: { _id: '$clientId', count: { $sum: 1 } } },
    ]),
  ]);

  const taskMap: Record<string, { totalPosted: number; completedInsights: number }> = {};
  for (const row of taskAgg) {
    taskMap[String(row._id)] = {
      totalPosted: row.totalPosted,
      completedInsights: row.completedInsights,
    };
  }

  const boardMap: Record<string, number> = {};
  for (const row of boardAgg) {
    boardMap[String(row._id)] = row.count;
  }

  const summary = clients.map((c) => {
    const t = taskMap[String(c._id)] ?? { totalPosted: 0, completedInsights: 0 };
    const missingInsights = t.totalPosted - t.completedInsights;
    const progress = t.totalPosted > 0 ? Math.round((t.completedInsights / t.totalPosted) * 100) : 0;
    return {
      _id: c._id,
      name: c.name,
      status: c.status,
      businessType: c.businessType,
      totalBoards: boardMap[String(c._id)] ?? 0,
      totalPosted: t.totalPosted,
      completedInsights: t.completedInsights,
      missingInsights,
      progress,
    };
  });

  return NextResponse.json({ summary });
}
