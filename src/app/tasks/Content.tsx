'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, isOverdue } from '@/lib/utils';
import type { ITask, IClient, IUser } from '@/types';
import { CheckSquare, AlertCircle, Search, Clock, FileText } from 'lucide-react';
import Link from 'next/link';

const STATUS_META = [
  { value: 'CONTENT_PREPARATION', label: 'In Preparation', short: 'Prep' },
  { value: 'QUALITY_ASSURANCE',   label: 'Quality Assurance', short: 'QA' },
  { value: 'POST_VERIFIED',       label: 'Post Verified', short: 'Verified' },
  { value: 'READY_TO_POST',       label: 'Ready to Post', short: 'Ready' },
  { value: 'POSTED',              label: 'Posted', short: 'Posted' },
  { value: 'NEEDS_FIX',           label: 'Needs Fix', short: 'Fix' },
];

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  CONTENT_PREPARATION: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' },
  QUALITY_ASSURANCE:   { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' },
  POST_VERIFIED:       { bg: 'rgba(255,255,255,0.08)', color: '#d4d4d8' },
  READY_TO_POST:       { bg: 'rgba(255,255,255,0.10)', color: '#ffffff' },
  POSTED:              { bg: 'rgba(255,255,255,0.14)', color: '#ffffff' },
  NEEDS_FIX:           { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
};

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

  const counts: Record<string, number> = {};
  STATUS_META.forEach(s => { counts[s.value] = tasks.filter(t => t.status === s.value).length; });

  return (
    <>
      <Topbar title="Tasks" subtitle={`${filtered.length} card${filtered.length !== 1 ? 's' : ''}`} />
      <div className="flex-1 overflow-y-auto">

        {/* Status overview — desktop */}
        <div className="hidden sm:block px-6 pt-6">
          <div className="grid grid-cols-7 gap-3">
            <button
              onClick={() => setStatusFilter('')}
              className="rounded-xl border p-4 text-left transition-all"
              style={{
                background: statusFilter === '' ? '#ffffff' : 'var(--bg-card)',
                borderColor: statusFilter === '' ? '#ffffff' : 'var(--border)',
              }}>
              <p className="text-2xl font-bold" style={{ color: statusFilter === '' ? '#000000' : 'var(--text-primary)' }}>{tasks.length}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: statusFilter === '' ? '#555555' : 'var(--text-muted)' }}>All</p>
            </button>
            {STATUS_META.map(s => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(prev => prev === s.value ? '' : s.value)}
                className="rounded-xl border p-4 text-left transition-all"
                style={{
                  background: statusFilter === s.value ? '#ffffff' : 'var(--bg-card)',
                  borderColor: statusFilter === s.value ? '#ffffff' : 'var(--border)',
                }}>
                <p className="text-2xl font-bold" style={{ color: statusFilter === s.value ? '#000000' : 'var(--text-primary)' }}>
                  {counts[s.value] ?? 0}
                </p>
                <p className="text-xs mt-1 font-medium" style={{ color: statusFilter === s.value ? '#555555' : 'var(--text-muted)' }}>
                  {s.short}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Status tabs — mobile */}
        <div className="sm:hidden px-4 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[{ value: '', short: 'All', count: tasks.length }, ...STATUS_META.map(s => ({ ...s, count: counts[s.value] ?? 0 }))].map(s => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(prev => prev === s.value ? '' : s.value)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border"
                style={{
                  background: statusFilter === s.value ? '#ffffff' : 'var(--bg-card)',
                  borderColor: statusFilter === s.value ? '#ffffff' : 'var(--border)',
                  color: statusFilter === s.value ? '#000000' : 'var(--text-secondary)',
                }}>
                {s.short} ({s.count})
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-6 py-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <option value="" style={{ background: 'var(--bg-card)' }}>All Clients</option>
            {clients.map(c => <option key={c._id} value={c._id} style={{ background: 'var(--bg-card)' }}>{c.name}</option>)}
          </select>
        </div>

        {/* Task cards */}
        <div className="px-4 sm:px-6 pb-6">
          {loading ? (
            <LoadingSpinner fullPage />
          ) : filtered.length === 0 ? (
            <EmptyState title="No tasks found" icon={CheckSquare} description="Adjust your filters or create tasks from a board" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(task => {
                const client = task.clientId as IClient;
                const worker = task.assignedTo as IUser | undefined;
                const overdue = isOverdue(task.scheduledDate ?? task.deadline) && task.status !== 'POSTED';
                const checklist = task.checklist ?? [];
                const doneCount = checklist.filter(c => c.done).length;
                const badge = STATUS_BADGE[task.status] ?? STATUS_BADGE.CONTENT_PREPARATION;

                return (
                  <Link key={task._id} href={`/tasks/${task._id}`}>
                    <div
                      className="rounded-xl border p-4 hover:border-zinc-600 transition-all cursor-pointer h-full"
                      style={{
                        background: 'var(--bg-card)',
                        borderColor: overdue ? 'rgba(239,68,68,0.4)' : 'var(--border)',
                      }}>

                      {/* Status + overdue */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                          {task.status.replace(/_/g, ' ')}
                        </span>
                        {overdue && (
                          <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                            <AlertCircle size={11} />Overdue
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>{task.title}</p>

                      {/* Client + content type */}
                      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                        {client?.name}{task.contentType ? ` · ${task.contentType}` : ''}
                      </p>

                      {/* Platforms */}
                      {(task.platforms ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(task.platforms ?? []).slice(0, 3).map(p => (
                            <span key={p} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{p}</span>
                          ))}
                          {(task.platforms ?? []).length > 3 && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>+{(task.platforms ?? []).length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Checklist */}
                      {checklist.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Checklist</span>
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{doneCount}/{checklist.length}</span>
                          </div>
                          <div className="h-1 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                            <div className="h-1 rounded-full bg-zinc-400 transition-all"
                              style={{ width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Report indicator */}
                      {task.status === 'POSTED' && task.reporting && (
                        <div className="mb-3">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: task.reporting.reportStatus === 'COMPLETED' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                              color: task.reporting.reportStatus === 'COMPLETED' ? '#d4d4d8' : 'var(--text-muted)',
                            }}>
                            <FileText size={9} className="inline mr-1" />
                            Report: {task.reporting.reportStatus === 'COMPLETED' ? 'Done' : 'Pending'}
                          </span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-subtle, var(--border))' }}>
                        {worker && typeof worker === 'object' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: '#222222', color: '#ffffff' }}>
                              {(worker as IUser).name?.charAt(0)}
                            </div>
                            <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--text-muted)' }}>{(worker as IUser).name}</span>
                          </div>
                        ) : task.isOpenForClaim ? (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Open for claim</span>
                        ) : (
                          <span />
                        )}
                        {(task.scheduledDate ?? task.deadline) && (
                          <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}
                            style={!overdue ? { color: 'var(--text-muted)' } : undefined}>
                            <Clock size={10} />
                            {formatDate(task.scheduledDate ?? task.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
