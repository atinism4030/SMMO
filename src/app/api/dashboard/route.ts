import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import Client from '@/models/Client';
import Task from '@/models/Task';
import Payment from '@/models/Payment';
import ContentItem from '@/models/ContentItem';
import ActivityLog from '@/models/ActivityLog';
import Report from '@/models/Report';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (session.role === 'CEO') {
    const [
      activeClients,
      monthlyPayments,
      overdueTasks,
      todayTasks,
      waitingApproval,
      scheduledThisWeek,
      recentActivity,
      tasksByStatus,
    ] = await Promise.all([
      Client.countDocuments({ status: 'ACTIVE' }),
      Payment.find({ month: currentMonth, year: currentYear }),
      Task.countDocuments({ deadline: { $lt: now }, status: { $nin: ['DONE', 'CANCELLED', 'POSTED'] } }),
      Task.countDocuments({
        deadline: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
        status: { $nin: ['DONE', 'CANCELLED'] },
      }),
      Task.countDocuments({ status: 'WAITING_APPROVAL' }),
      ContentItem.countDocuments({
        scheduledDate: {
          $gte: now,
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        status: 'SCHEDULED',
      }),
      ActivityLog.find({}).populate('userId', 'name').sort({ createdAt: -1 }).limit(10),
      Task.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = monthlyPayments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = monthlyPayments.filter((p) => p.status === 'UNPAID').length;
    const latePayments = monthlyPayments.filter((p) => p.status === 'LATE').length;

    return NextResponse.json({
      activeClients,
      totalRevenue,
      pendingPayments,
      latePayments,
      overdueTasks,
      todayTasks,
      waitingApproval,
      scheduledThisWeek,
      recentActivity,
      tasksByStatus,
    });
  }

  // Worker dashboard
  const [myTasks, myOverdue, myInProgress, availableTasks, completedThisMonth] = await Promise.all([
    Task.find({
      $or: [{ assignedTo: session.userId }, { claimedBy: session.userId }],
      status: { $nin: ['DONE', 'CANCELLED'] },
    }).populate('clientId', 'name').populate('boardId', 'title').sort({ deadline: 1 }).limit(10),
    Task.countDocuments({
      $or: [{ assignedTo: session.userId }, { claimedBy: session.userId }],
      deadline: { $lt: now },
      status: { $nin: ['DONE', 'CANCELLED'] },
    }),
    Task.countDocuments({
      $or: [{ assignedTo: session.userId }, { claimedBy: session.userId }],
      status: 'IN_PROGRESS',
    }),
    Task.find({
      isOpenForClaim: true,
      claimedBy: { $exists: false },
      status: { $nin: ['DONE', 'CANCELLED'] },
    }).populate('clientId', 'name').limit(5),
    Task.countDocuments({
      $or: [{ assignedTo: session.userId }, { claimedBy: session.userId }],
      status: { $in: ['DONE', 'POSTED'] },
      completedAt: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lt: new Date(currentYear, currentMonth, 1),
      },
    }),
  ]);

  return NextResponse.json({ myTasks, myOverdue, myInProgress, availableTasks, completedThisMonth });
}
