'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import type { IPhotoshootSession, IClient, IUser, IShotItem } from '@/types';
import { CATEGORY_COLORS } from '@/lib/shotTemplates';
import { ArrowLeft, MapPin, Clock, RefreshCw, Phone, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PLANNED:     { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
  IN_PROGRESS: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
  COMPLETED:   { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  CANCELLED:   { bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
};

function progressColor(pct: number) {
  if (pct >= 100) return '#34d399';
  if (pct >= 60)  return '#6366f1';
  if (pct >= 30)  return '#f59e0b';
  return '#f87171';
}

export default function WorkerPhotoshootDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ps, setPs] = useState<IPhotoshootSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/photoshoots/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setPs(data.session);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10s while IN_PROGRESS
  useEffect(() => {
    if (ps?.status === 'IN_PROGRESS') {
      pollRef.current = setInterval(() => load(true), 10_000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [ps?.status, load]);

  async function manualRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
    toast.success('Refreshed');
  }

  async function toggleShot(shotId: string) {
    setToggling(shotId);
    const res = await fetch(`/api/photoshoots/${id}/shots/${shotId}/toggle`, { method: 'PATCH' });
    if (res.ok) {
      const d = await res.json();
      setPs(d.session);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? 'Failed to update');
    }
    setToggling(null);
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!ps) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p style={{ color: 'var(--text-muted)' }}>Session not found or you are not assigned.</p>
      <Link href="/worker/photoshoots"><Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button></Link>
    </div>
  );

  const client    = ps.clientId as IClient;
  const total     = ps.shotList.length;
  const done      = ps.shotList.filter(s => s.completed).length;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
  const st        = STATUS_STYLES[ps.status] ?? STATUS_STYLES.PLANNED;
  const shootDate = new Date(ps.shootDate);

  const sortedShots = [...ps.shotList].sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.order - b.order;
  });
  const pendingShots   = sortedShots.filter(s => !s.completed);
  const completedShots = sortedShots.filter(s => s.completed);

  return (
    <>
      <Topbar
        title={ps.title}
        subtitle={client?.name}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={manualRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}
              title="Refresh"
            >
              {refreshing ? <LoadingSpinner size={14} /> : <RefreshCw size={14} />}
            </button>
            <Link href="/worker/photoshoots">
              <Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button>
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* ── Session info card ── */}
        <div className="p-4 sm:p-6 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          {/* Status + auto-refresh indicator */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold px-3 py-1.5 rounded-full" style={{ background: st.bg, color: st.text }}>
              {ps.status.replace('_', ' ')}
            </span>
            {ps.status === 'IN_PROGRESS' && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#fbbf24' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Live — auto-refreshes every 10s
              </span>
            )}
          </div>

          {/* Progress */}
          {total > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare size={14} style={{ color: progressColor(pct) }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {done} / {total} shots completed
                  </span>
                </div>
                <span className="text-lg font-black" style={{ color: progressColor(pct) }}>{pct}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: progressColor(pct) }}
                />
              </div>
            </div>
          )}

          {/* Date/time/location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              {shootDate.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              &nbsp;·&nbsp;{ps.startTime}{ps.endTime ? `–${ps.endTime}` : ''}
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
              {ps.location}{ps.address ? ` — ${ps.address}` : ''}
            </div>
            {ps.clientContactName && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                {ps.clientContactName}{ps.clientContactPhone ? ` · ${ps.clientContactPhone}` : ''}
              </div>
            )}
          </div>

          {/* Equipment */}
          {ps.equipmentNeeded.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Equipment to bring:</p>
              <div className="flex flex-wrap gap-2">
                {ps.equipmentNeeded.map(e => (
                  <span key={e} className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {ps.notes && (
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Notes</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{ps.notes}</p>
            </div>
          )}
        </div>

        {/* ── Shot checklist ── */}
        <div className="p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Shot Checklist
          </h2>

          {total === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No shots in the list for this session.</p>
          ) : (
            <>
              {/* Pending */}
              {pendingShots.length > 0 && (
                <div className="space-y-2">
                  {pendingShots.map(shot => (
                    <WorkerShotRow
                      key={shot._id}
                      shot={shot}
                      onToggle={() => toggleShot(shot._id)}
                      toggling={toggling === shot._id}
                    />
                  ))}
                </div>
              )}

              {/* Divider */}
              {completedShots.length > 0 && pendingShots.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Completed ({completedShots.length})</p>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>
              )}

              {/* Completed */}
              {completedShots.length > 0 && (
                <div className="space-y-2 opacity-70">
                  {completedShots.map(shot => (
                    <WorkerShotRow
                      key={shot._id}
                      shot={shot}
                      onToggle={() => toggleShot(shot._id)}
                      toggling={toggling === shot._id}
                    />
                  ))}
                </div>
              )}

              {pct === 100 && (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-bold" style={{ color: '#34d399' }}>All shots completed!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function WorkerShotRow({ shot, onToggle, toggling }: {
  shot: IShotItem;
  onToggle: () => void;
  toggling: boolean;
}) {
  const catColor    = CATEGORY_COLORS[shot.category] ?? '#6b7280';
  const completedBy = shot.completedBy as IUser | undefined;

  return (
    <button
      onClick={onToggle}
      disabled={toggling}
      className="w-full text-left rounded-2xl border p-4 flex items-start gap-4 transition-all active:scale-[0.98]"
      style={{
        background: shot.completed ? 'rgba(16,185,129,0.06)' : 'var(--bg-card)',
        borderColor: shot.completed ? 'rgba(16,185,129,0.3)' : 'var(--border)',
      }}
    >
      {/* Big checkbox */}
      <div
        className="w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all"
        style={shot.completed
          ? { background: '#10b981', borderColor: '#10b981' }
          : { background: 'transparent', borderColor: 'var(--border)' }
        }
      >
        {toggling
          ? <LoadingSpinner size={14} />
          : shot.completed
            ? <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4.5 4.5 8-9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : null
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className={`font-semibold text-sm ${shot.completed ? 'line-through' : ''}`}
            style={{ color: shot.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}
          >
            {shot.title}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${catColor}20`, color: catColor }}>
            {shot.category}
          </span>
          {shot.required && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>★ Required</span>
          )}
        </div>
        {shot.description && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{shot.description}</p>
        )}
        {shot.completed && completedBy && (
          <p className="text-xs mt-1" style={{ color: '#34d399' }}>
            ✓ {completedBy.name}
            {shot.completedAt && ` · ${new Date(shot.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        )}
      </div>
    </button>
  );
}
