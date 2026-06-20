'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { PriorityBadge, PlatformBadge } from '@/components/ui/Badge';

import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { ContentTypeBadge } from '@/components/ui/Badge';
import type { ITask, IClient } from '@/types';
import { Star, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AvailableTasksContent() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tasks?openForClaim=true').then(r => r.json()).then(d => { setTasks(d.tasks ?? []); setLoading(false); });
  }, []);

  async function claimTask(taskId: string) {
    setClaiming(taskId);
    const res = await fetch(`/api/tasks/${taskId}/claim`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) { setTasks(prev => prev.filter(t => t._id !== taskId)); toast.success('Task claimed! Check My Tasks.'); }
    else toast.error(data.error);
    setClaiming(null);
  }

  return (
    <>
      <Topbar title="Available Tasks" subtitle="Tasks you can claim and work on" />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? <LoadingSpinner fullPage /> : tasks.length === 0 ? (
          <EmptyState title="No available tasks" description="All tasks are assigned or there's nothing to claim right now. Check back later." icon={Star} />
        ) : (
          <div className="space-y-3">
            {tasks.map(task => {
              const client = task.clientId as IClient;
              return (
                <div key={task._id} className="rounded-xl border p-4 hover:border-yellow-500/30 transition-all" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{task.title}</h3>
                        <ContentTypeBadge type={task.contentType} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>{client?.name}</span>
                        {task.scheduledDate && <><span>·</span><span>Scheduled {formatDate(task.scheduledDate)}</span></>}
                      </div>
                      {task.description && <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>}
                      {(task.platforms ?? []).length > 0 && (
                        <div className="flex gap-1 mt-2">{task.platforms!.map(p => <PlatformBadge key={p} platform={p} />)}</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="success" onClick={() => claimTask(task._id)} loading={claiming === task._id}><CheckCircle size={13} />Claim</Button>
                      <Link href={`/worker/tasks/${task._id}`}><Button size="sm" variant="secondary">View</Button></Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
