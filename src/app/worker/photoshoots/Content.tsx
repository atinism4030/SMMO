'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import type { IPhotoshootSession, IClient } from '@/types';
import { Camera, MapPin, Clock, CheckSquare, ChevronRight } from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  PLANNED:     { bg: 'rgba(99,102,241,0.12)', text: '#818cf8', dot: '#818cf8' },
  IN_PROGRESS: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', dot: '#fbbf24' },
  COMPLETED:   { bg: 'rgba(16,185,129,0.12)', text: '#34d399', dot: '#34d399' },
  CANCELLED:   { bg: 'rgba(239,68,68,0.12)',  text: '#f87171', dot: '#f87171' },
};

function progressColor(pct: number) {
  if (pct >= 100) return '#34d399';
  if (pct >= 60)  return '#6366f1';
  if (pct >= 30)  return '#f59e0b';
  return '#f87171';
}

export default function WorkerPhotoshootsContent() {
  const [sessions, setSessions] = useState<IPhotoshootSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/photoshoots');
    const data = await res.json();
    setSessions(data.sessions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upcoming = sessions.filter(s => s.status === 'PLANNED' || s.status === 'IN_PROGRESS');
  const past     = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'CANCELLED');

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={28} /></div>;

  return (
    <>
      <Topbar title="My Photoshoots" subtitle="Sessions you're assigned to" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {sessions.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No photoshoots assigned"
            description="You'll see photoshoot sessions here once a CEO assigns you to one."
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <Section label="Upcoming">
                {upcoming.map(s => <SessionCard key={s._id} session={s} />)}
              </Section>
            )}
            {past.length > 0 && (
              <Section label="Past">
                {past.map(s => <SessionCard key={s._id} session={s} />)}
              </Section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{label}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SessionCard({ session }: { session: IPhotoshootSession }) {
  const client    = session.clientId as IClient;
  const total     = session.shotList.length;
  const done      = session.shotList.filter(s => s.completed).length;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
  const st        = STATUS_STYLES[session.status] ?? STATUS_STYLES.PLANNED;
  const shootDate = new Date(session.shootDate);

  return (
    <Link href={`/worker/photoshoots/${session._id}`}>
      <div className="rounded-2xl border p-4 flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.99]"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Left: status indicator */}
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: st.dot }} />

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{session.title}</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: st.bg, color: st.text }}>
              {session.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock size={10} />
              {shootDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · {session.startTime}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <MapPin size={10} />
              {session.location}
            </span>
          </div>
          {total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <CheckSquare size={10} />{done}/{total}
                </span>
                <span className="text-xs font-semibold" style={{ color: progressColor(pct) }}>{pct}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: progressColor(pct) }} />
              </div>
            </div>
          )}
        </div>

        <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
      </div>
    </Link>
  );
}
