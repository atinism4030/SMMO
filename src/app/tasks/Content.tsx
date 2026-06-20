'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import { TaskStatusBadge, PriorityBadge, PlatformBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, isOverdue, TASK_TYPES } from '@/lib/utils';
import type { ITask, IClient, IUser } from '@/types';
import { CheckSquare, AlertCircle, Search } from 'lucide-react';
import Link from 'next/link';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'TO_DO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_APPROVAL', label: 'Waiting Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'DONE', label: 'Done' },
];

export default function TasksContent() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [clients, setClients] = useState<IClient[]>([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (clientFilter) params.set('clientId', clientFilter);
    const [taskRes, clientRes] = await Promise.all([
      fetch(`/api/tasks?${params}`),
      fetch('/api/clients?status=ACTIVE'),
    ]);
    const [td, cd] = await Promise.all([taskRes.json(), clientRes.json()]);
    setTasks(td.tasks ?? []);
    setClients(cd.clients ?? []);
    setLoading(false);
  }, [statusFilter, clientFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Topbar title="All Tasks" subtitle={`${filtered.length} task${filtered.length !== 1 ? 's' : ''}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            {STATUSES.map(s => <option key={s.value} value={s.value} style={{ background: 'var(--bg-card)' }}>{s.label}</option>)}
          </select>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c._id} value={c._id} style={{ background: 'var(--bg-card)' }}>{c.name}</option>)}
          </select>
        </div>

        {loading ? <LoadingSpinner fullPage /> : filtered.length === 0 ? (
          <EmptyState title="No tasks found" icon={CheckSquare} description="Adjust your filters or create tasks from a board" />
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Task', 'Client', 'Type', 'Status', 'Priority', 'Assigned', 'Deadline', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filtered.map(task => {
                  const client = task.clientId as IClient;
                  const worker = task.assignedTo as IUser | undefined;
                  const overdue = isOverdue(task.deadline) && !['DONE', 'POSTED', 'CANCELLED'].includes(task.status);
                  const type = TASK_TYPES.find(t => t.value === task.taskType)?.label ?? task.taskType;
                  return (
                    <tr key={task._id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {overdue && <AlertCircle size={12} className="text-red-400 flex-shrink-0" />}
                          <Link href={`/tasks/${task._id}`} className="text-sm font-medium hover:text-indigo-300 transition-colors truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                            {task.title}
                          </Link>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {task.platforms?.slice(0, 2).map(p => <PlatformBadge key={p} platform={p} />)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{client?.name}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{type}</td>
                      <td className="px-4 py-3"><TaskStatusBadge status={task.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                      <td className="px-4 py-3">
                        {worker ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>{worker.name?.charAt(0)}</div>
                            <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }}>{worker.name}</span>
                          </div>
                        ) : task.isOpenForClaim ? (
                          <span className="text-xs text-yellow-400">Open</span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.deadline ? (
                          <span className={`text-xs ${overdue ? 'text-red-400' : ''}`} style={!overdue ? { color: 'var(--text-muted)' } : undefined}>{formatDate(task.deadline)}</span>
                        ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/tasks/${task._id}`} className="text-xs text-indigo-400 hover:text-indigo-300">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
