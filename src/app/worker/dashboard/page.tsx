import AppLayout from '@/components/layout/AppLayout';
import Topbar from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/Card';
import { TaskStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { formatDate, isOverdue } from '@/lib/utils';
import Task from '@/models/Task';
import { AlertCircle, CheckSquare, Clock, Star } from 'lucide-react';
import Link from 'next/link';
import type { ITask, IClient } from '@/types';

async function getWorkerData(userId: string) {
  await connectDB();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [myTasks, myOverdue, myInProgress, availableTasks, completedThisMonth] = await Promise.all([
    Task.find({ $or: [{ assignedTo: userId }, { claimedBy: userId }], status: { $ne: 'POSTED' } })
      .populate('clientId', 'name').populate('boardId', 'title').sort({ scheduledDate: 1, deadline: 1 }).limit(8),
    Task.countDocuments({ $or: [{ assignedTo: userId }, { claimedBy: userId }], scheduledDate: { $lt: now }, status: { $ne: 'POSTED' } }),
    Task.countDocuments({ $or: [{ assignedTo: userId }, { claimedBy: userId }], status: 'CONTENT_PREPARATION' }),
    Task.find({ isOpenForClaim: true, claimedBy: { $exists: false }, status: { $ne: 'POSTED' } })
      .populate('clientId', 'name').sort({ priority: -1 }).limit(5),
    Task.countDocuments({ $or: [{ assignedTo: userId }, { claimedBy: userId }], status: 'POSTED', postedDate: { $gte: new Date(year, month - 1, 1) } }),
  ]);

  return { myTasks, myOverdue, myInProgress, availableTasks, completedThisMonth };
}

export default async function WorkerDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const data = await getWorkerData(session.userId);

  return (
    <AppLayout requiredRole="WORKER">
      <Topbar title={`Welcome, ${session.name.split(' ')[0]}`} subtitle="Here's what's on your plate today" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Tasks" value={(data.myTasks as unknown[]).length} icon={CheckSquare} iconColor="text-zinc-400" />
          <StatCard label="In Progress" value={data.myInProgress} icon={Clock} iconColor="text-zinc-400" />
          <StatCard label="Overdue" value={data.myOverdue} icon={AlertCircle} iconColor="text-zinc-400" />
          <StatCard label="Completed This Month" value={data.completedThisMonth} icon={Star} iconColor="text-zinc-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Tasks */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Tasks</h3>
              <Link href="/worker/my-tasks" className="text-xs text-zinc-500 hover:text-white">View all</Link>
            </div>
            {(data.myTasks as unknown[]).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active tasks. Check available tasks!</p>
            ) : (
              <div className="space-y-2">
                {(data.myTasks as unknown as ITask[]).map(task => {
                  const client = task.clientId as IClient;
                  const overdue = isOverdue(task.scheduledDate ?? task.deadline) && task.status !== 'POSTED';
                  return (
                    <Link key={task._id} href={`/worker/tasks/${task._id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-900 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name}</p>
                      </div>
                      <TaskStatusBadge status={task.status} />
                      {(task.scheduledDate ?? task.deadline) && <span className={`text-xs ${overdue ? 'text-red-400' : ''}`} style={!overdue ? { color: 'var(--text-muted)' } : undefined}>{formatDate(task.scheduledDate ?? task.deadline)}</span>}
                      {overdue && <AlertCircle size={12} className="text-red-400" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Tasks */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Available to Claim</h3>
              <Link href="/worker/available-tasks" className="text-xs text-zinc-500 hover:text-white">View all</Link>
            </div>
            {(data.availableTasks as unknown[]).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No available tasks right now.</p>
            ) : (
              <div className="space-y-2">
                {(data.availableTasks as unknown as ITask[]).map(task => {
                  const client = task.clientId as IClient;
                  return (
                    <Link key={task._id} href={`/worker/tasks/${task._id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-900 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name}</p>
                      </div>
                      <PriorityBadge priority={task.priority} />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">Claim</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
