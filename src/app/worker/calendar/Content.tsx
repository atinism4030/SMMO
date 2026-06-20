'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { TaskStatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import type { ITask, IClient } from '@/types';
import { Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function WorkerCalendarContent() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tasks?myTasks=true').then(r => r.json()).then(d => {
      const t = (d.tasks ?? []).filter((task: ITask) => (task.scheduledDate ?? task.deadline) && task.status !== 'POSTED');
      t.sort((a: ITask, b: ITask) => new Date((a.scheduledDate ?? a.deadline)!).getTime() - new Date((b.scheduledDate ?? b.deadline)!).getTime());
      setTasks(t);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const upcoming = tasks.filter(t => (t.scheduledDate ?? t.deadline) && new Date((t.scheduledDate ?? t.deadline)!) >= now);
  const overdue = tasks.filter(t => (t.scheduledDate ?? t.deadline) && new Date((t.scheduledDate ?? t.deadline)!) < now);

  return (
    <>
      <Topbar title="My Calendar" subtitle="Upcoming deadlines" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? <LoadingSpinner fullPage /> : tasks.length === 0 ? (
          <EmptyState title="No upcoming deadlines" description="You have no active tasks with deadlines" icon={Calendar} />
        ) : (
          <>
            {overdue.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-400"><AlertCircle size={15} />Overdue ({overdue.length})</h3>
                <div className="space-y-2">
                  {overdue.map(task => {
                    const client = task.clientId as IClient;
                    return (
                      <Link key={task._id} href={`/worker/tasks/${task._id}`} className="flex items-center gap-4 p-3 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all" style={{ background: 'rgba(239,68,68,0.05)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                          <p className="text-xs text-red-400">{client?.name} · Was due {formatDate(task.scheduledDate ?? task.deadline)}</p>
                        </div>
                        <TaskStatusBadge status={task.status} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Upcoming ({upcoming.length})</h3>
                <div className="space-y-2">
                  {upcoming.map(task => {
                    const client = task.clientId as IClient;
                    const date = task.scheduledDate ?? task.deadline;
                    const daysLeft = date ? Math.ceil((new Date(date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    return (
                      <Link key={task._id} href={`/worker/tasks/${task._id}`} className="flex items-center gap-4 p-3 rounded-lg border hover:border-indigo-500/30 transition-all" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: daysLeft <= 1 ? 'rgba(239,68,68,0.15)' : daysLeft <= 3 ? 'rgba(245,158,11,0.15)' : 'var(--bg-elevated)' }}>
                          <span className={`text-sm font-bold ${daysLeft <= 1 ? 'text-red-400' : daysLeft <= 3 ? 'text-yellow-400' : 'text-indigo-400'}`}>{daysLeft}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>days</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name} · {formatDate(date)}</p>
                        </div>
                        <TaskStatusBadge status={task.status} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
