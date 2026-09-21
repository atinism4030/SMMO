import AppLayout from '@/components/layout/AppLayout';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import WorkerDashboardView from './WorkerDashboardView';

async function getWorkerData(userId: string) {
  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mine = { $or: [{ assignedTo: userId }, { claimedBy: userId }] };

  const [myTasks, myOverdue, dueToday, inReview, availableTasks, assignedBoardIds] = await Promise.all([
    Task.find({ ...mine, status: { $ne: 'POSTED' } })
      .populate('clientId', 'name').populate('boardId', 'title').sort({ scheduledDate: 1, deadline: 1 }).limit(8),
    Task.countDocuments({ ...mine, scheduledDate: { $lt: now }, status: { $ne: 'POSTED' } }),
    Task.countDocuments({ ...mine, scheduledDate: { $gte: startOfToday, $lt: endOfToday }, status: { $ne: 'POSTED' } }),
    Task.countDocuments({ ...mine, status: { $in: ['QUALITY_ASSURANCE', 'POST_VERIFIED'] } }),
    Task.find({ isOpenForClaim: true, claimedBy: { $exists: false }, status: { $ne: 'POSTED' } })
      .populate('clientId', 'name').sort({ priority: -1 }).limit(5),
    Task.distinct('boardId', { ...mine, boardId: { $exists: true } }),
  ]);

  return { myTasks, myOverdue, dueToday, inReview, assignedBoardsCount: assignedBoardIds.length, availableTasks };
}

export default async function WorkerDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const data = await getWorkerData(session.userId);
  const serialized = JSON.parse(JSON.stringify({ ...data, firstName: session.name.split(' ')[0] }));

  return (
    <AppLayout requiredRole="WORKER">
      <WorkerDashboardView data={serialized} />
    </AppLayout>
  );
}
