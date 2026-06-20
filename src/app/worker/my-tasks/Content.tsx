'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { TaskStatusBadge, PriorityBadge, PlatformBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, isOverdue } from '@/lib/utils';
import type { ITask, IClient } from '@/types';
import { ClipboardList, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function MyTasksContent() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/tasks?myTasks=true').then(r => r.json()).then(d => { setTasks(d.tasks ?? []); setLoading(false); });
  }, []);

  const filtered = tasks.filter(t => !filter || t.status === filter);

  return (
    <>
      <Topbar title="My Tasks" subtitle={`${filtered.length} task${filtered.length !== 1 ? 's' : ''}`} />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex gap-2 flex-wrap">
          {['', 'CONTENT_PREPARATION', 'QUALITY_ASSURANCE', 'POST_VERIFIED', 'READY_TO_POST', 'POSTED', 'NEEDS_FIX'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
              style={{ background: filter === s ? 'rgba(99,102,241,0.2)' : 'var(--bg-card)', borderColor: filter === s ? '#6366f1' : 'var(--border)', color: filter === s ? '#a5b4fc' : 'var(--text-secondary)' }}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner fullPage /> : filtered.length === 0 ? (
          <EmptyState title="No tasks" description="No tasks match your filter, or you haven't claimed any tasks yet." icon={ClipboardList} />
        ) : (
          <div className="space-y-2">
            {filtered.map(task => {
              const client = task.clientId as IClient;
              const overdue = isOverdue(task.scheduledDate ?? task.deadline) && task.status !== 'POSTED';
              return (
                <Link key={task._id} href={`/worker/tasks/${task._id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border hover:border-indigo-500/30 transition-all"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {overdue && <AlertCircle size={12} className="text-red-400 flex-shrink-0" />}
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name}</p>
                    <div className="flex gap-1 mt-1">{task.platforms?.slice(0, 3).map(p => <PlatformBadge key={p} platform={p} />)}</div>
                  </div>
                  <TaskStatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  {task.deadline && <span className={`text-xs ${overdue ? 'text-red-400' : ''}`} style={!overdue ? { color: 'var(--text-muted)' } : undefined}>{formatDate(task.deadline)}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
