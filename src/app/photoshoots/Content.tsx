'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IPhotoshootSession, IClient, IUser } from '@/types';
import { Camera, Plus, MapPin, Clock, Users, CheckSquare, ChevronRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: 'ALL',         label: 'All' },
  { value: 'PLANNED',     label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED',   label: 'Completed' },
  { value: 'CANCELLED',   label: 'Cancelled' },
] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  PLANNED:     { bg: 'rgba(255,255,255,0.04)', text: 'var(--text-secondary)', dot: 'var(--text-secondary)' },
  IN_PROGRESS: { bg: 'rgba(255,255,255,0.06)', text: '#d4d4d8', dot: '#d4d4d8' },
  COMPLETED:   { bg: 'rgba(255,255,255,0.04)', text: '#a1a1aa', dot: '#a1a1aa' },
  CANCELLED:   { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', dot: '#f87171' },
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW:    '#52525b',
  MEDIUM: '#71717a',
  HIGH:   '#a1a1aa',
  URGENT: '#ef4444',
};

function statusLabel(s: string) {
  return s.replace('_', ' ');
}

function progressColor(pct: number) {
  if (pct >= 100) return '#34d399';
  if (pct >= 60) return '#ffffff';
  if (pct >= 30) return '#f59e0b';
  return '#f87171';
}

export default function PhotoshootsContent() {
  const router = useRouter();
  const [sessions, setSessions] = useState<IPhotoshootSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetch$ = useCallback(async (status: string) => {
    setLoading(true);
    const qs = status !== 'ALL' ? `?status=${status}` : '';
    const res = await fetch(`/api/photoshoots${qs}`);
    const data = await res.json();
    setSessions(data.sessions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch$(statusFilter); }, [fetch$, statusFilter]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/photoshoots/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Photoshoot deleted');
      setSessions(prev => prev.filter(s => s._id !== id));
    } else {
      toast.error('Failed to delete');
    }
    setDeleting(null);
  }

  const upcoming = sessions.filter(s => s.status === 'PLANNED' || s.status === 'IN_PROGRESS');
  const past     = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'CANCELLED');

  return (
    <>
      <Topbar
        title="Photoshooting Days"
        subtitle="Plan and manage all client photoshoot sessions"
        actions={
          <Link href="/photoshoots/new">
            <Button size="sm"><Plus size={13} />New Session</Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={sessions.length} />
          <StatCard label="Planned" value={sessions.filter(s => s.status === 'PLANNED').length} accent="indigo" />
          <StatCard label="In Progress" value={sessions.filter(s => s.status === 'IN_PROGRESS').length} accent="amber" />
          <StatCard label="Completed" value={sessions.filter(s => s.status === 'COMPLETED').length} accent="green" />
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
              style={statusFilter === tab.value
                ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
                : { color: 'var(--text-muted)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size={28} /></div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No photoshoots yet"
            description="Create your first photoshoot session to get started."
            action={<Link href="/photoshoots/new"><Button size="sm"><Plus size={13} />New Session</Button></Link>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sessions.map(session => {
              const client = session.clientId as IClient;
              const total = session.shotList.length;
              const done  = session.shotList.filter(s => s.completed).length;
              const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
              const st    = STATUS_STYLES[session.status] ?? STATUS_STYLES.PLANNED;
              const shootDate = new Date(session.shootDate);
              const workers = session.assignedWorkers as IUser[];

              return (
                <div
                  key={session._id}
                  className="rounded-2xl border overflow-hidden group transition-all hover:shadow-lg"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  {/* Header band */}
                  <div className="px-4 py-3 flex items-start justify-between gap-2"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="min-w-0">
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                        {client?.name ?? 'Unknown client'}
                      </p>
                      <h3 className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                        {session.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.text }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: st.dot }} />
                        {statusLabel(session.status)}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-4 py-3 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={11} />
                      <span>{shootDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {session.startTime}{session.endTime ? `–${session.endTime}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <MapPin size={11} />
                      <span className="truncate">{session.location}</span>
                    </div>
                    {workers.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Users size={11} />
                        <span>{workers.length} worker{workers.length !== 1 ? 's' : ''} assigned</span>
                        <div className="flex -space-x-1 ml-1">
                          {workers.slice(0, 3).map(w => (
                            <div key={String(w._id ?? w)} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border border-[var(--bg-card)]"
                              style={{ background: '#222222', color: '#ffffff' }}>
                              {(w.name ?? '?').charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {workers.length > 3 && <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border border-[var(--bg-card)]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>+{workers.length - 3}</div>}
                        </div>
                      </div>
                    )}
                    {total > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <CheckSquare size={10} />{done}/{total} shots
                          </span>
                          <span className="text-xs font-semibold" style={{ color: progressColor(pct) }}>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: progressColor(pct) }} />
                        </div>
                      </div>
                    )}
                    {total === 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No shots in list yet</p>
                    )}
                  </div>

                  {/* Priority + actions */}
                  <div className="px-4 py-2.5 flex items-center justify-between border-t" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs font-semibold" style={{ color: PRIORITY_STYLES[session.priority] ?? '#6b7280' }}>
                      ● {session.priority}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(session._id, session.title); }}
                        disabled={deleting === session._id}
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#f87171' }}
                        title="Delete session"
                      >
                        {deleting === session._id ? <LoadingSpinner size={12} /> : <Trash2 size={12} />}
                      </button>
                      <button
                        onClick={() => router.push(`/photoshoots/${session._id}`)}
                        className="flex items-center gap-1 text-xs font-semibold transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Open <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && sessions.length > 0 && upcoming.length > 0 && past.length > 0 && statusFilter === 'ALL' && (
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            {upcoming.length} upcoming · {past.length} past sessions
          </p>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'indigo' | 'amber' | 'green' }) {
  const color = accent === 'indigo' ? 'var(--text-secondary)' : accent === 'amber' ? '#fbbf24' : accent === 'green' ? '#34d399' : 'var(--text-primary)';
  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}
