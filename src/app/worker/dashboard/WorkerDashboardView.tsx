'use client';

import Topbar from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/Card';
import { TaskStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { useTranslation } from '@/components/providers/LanguageProvider';
import { formatDate, isOverdue } from '@/lib/utils';
import { AlertCircle, CheckSquare, Clock, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import type { ITask, IClient } from '@/types';

export interface WorkerDashboardData {
  firstName: string;
  myTasks: ITask[];
  myOverdue: number;
  dueToday: number;
  inReview: number;
  assignedBoardsCount: number;
  availableTasks: ITask[];
}

export default function WorkerDashboardView({ data }: { data: WorkerDashboardData }) {
  const { t } = useTranslation();

  return (
    <>
      <Topbar title={t('workerDashboard.welcome', { name: data.firstName })} subtitle={t('workerDashboard.subtitle')} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={t('workerDashboard.myTasks')} value={data.myTasks.length} icon={CheckSquare} />
          <StatCard label={t('workerDashboard.dueToday')} value={data.dueToday} icon={Clock} />
          <StatCard label={t('workerDashboard.overdue')} value={data.myOverdue} icon={AlertCircle} />
          <StatCard label={t('workerDashboard.inReview')} value={data.inReview} icon={LayoutGrid} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Tasks */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('workerDashboard.myTasks')}</h3>
              <Link href="/worker/my-tasks" className="text-xs text-zinc-500 hover:text-white">{t('common.viewAll')}</Link>
            </div>
            {data.myTasks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('workerDashboard.noActiveTasks')}</p>
            ) : (
              <div className="space-y-2">
                {data.myTasks.map((task) => {
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
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('workerDashboard.availableToClaim')}</h3>
              <Link href="/worker/available-tasks" className="text-xs text-zinc-500 hover:text-white">{t('common.viewAll')}</Link>
            </div>
            {data.availableTasks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('workerDashboard.noAvailableTasks')}</p>
            ) : (
              <div className="space-y-2">
                {data.availableTasks.map((task) => {
                  const client = task.clientId as IClient;
                  return (
                    <Link key={task._id} href={`/worker/tasks/${task._id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-900 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name}</p>
                      </div>
                      <PriorityBadge priority={task.priority} />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">{t('workerDashboard.claim')}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
