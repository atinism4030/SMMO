'use client';

import { useState, useEffect, use } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { ArrowLeft, Calendar, CheckCircle2, AlertTriangle, Eye, Layers } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IClient, IBoard, ITask } from '@/types';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface MonthSummary {
  month: number;
  year: number;
  key: string; // "YYYY-MM"
  boardCount: number;
  totalPosted: number;
  completedInsights: number;
  missingInsights: number;
  totalViews: number;
}

export default function ClientMonthsContent({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [client, setClient] = useState<IClient | null>(null);
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [clientRes, boardsRes, tasksRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/boards?clientId=${clientId}`),
        fetch(`/api/tasks?clientId=${clientId}`),
      ]);
      const [cd, bd, td] = await Promise.all([clientRes.json(), boardsRes.json(), tasksRes.json()]);
      setClient(cd.client ?? null);

      const boards: IBoard[] = bd.boards ?? [];
      const tasks: ITask[] = td.tasks ?? [];

      // Group boards by month/year
      const monthMap: Record<string, MonthSummary> = {};
      for (const b of boards) {
        const key = `${b.year}-${String(b.month).padStart(2, '0')}`;
        if (!monthMap[key]) {
          monthMap[key] = { month: b.month, year: b.year, key, boardCount: 0, totalPosted: 0, completedInsights: 0, missingInsights: 0, totalViews: 0 };
        }
        monthMap[key].boardCount++;
      }

      // Build board-to-month lookup
      const boardMonth: Record<string, string> = {};
      for (const b of boards) {
        boardMonth[String(b._id)] = `${b.year}-${String(b.month).padStart(2, '0')}`;
      }

      // Aggregate tasks into months
      for (const t of tasks) {
        if (t.status !== 'POSTED') continue;
        const bid = typeof t.boardId === 'string' ? t.boardId : (t.boardId as IBoard)?._id;
        const key = boardMonth[String(bid)];
        if (!key || !monthMap[key]) continue;
        monthMap[key].totalPosted++;
        if (t.reporting?.reportStatus === 'COMPLETED') {
          monthMap[key].completedInsights++;
          monthMap[key].totalViews += t.reporting?.metrics?.views ?? 0;
        } else {
          monthMap[key].missingInsights++;
        }
      }

      const sorted = Object.values(monthMap).sort((a, b) =>
        b.year !== a.year ? b.year - a.year : b.month - a.month
      );
      setMonths(sorted);
      setLoading(false);
    }
    load();
  }, [clientId]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <>
      <Topbar
        title={client?.name ?? 'Client Reports'}
        subtitle="Select a month to view boards and generate PDF reports"
        actions={
          <Link href="/reports">
            <Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button>
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {months.length === 0 ? (
          <EmptyState
            title="No boards yet"
            description="Create boards for this client to start generating reports"
            icon={Layers}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {months.map(m => (
              <MonthCard
                key={m.key}
                summary={m}
                onClick={() => router.push(`/reports/${clientId}/${m.key}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function MonthCard({ summary: s, onClick }: { summary: MonthSummary; onClick: () => void }) {
  const progress = s.totalPosted > 0 ? Math.round((s.completedInsights / s.totalPosted) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl border p-5 transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Month icon + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <Calendar size={17} className="text-white" />
        </div>
        <div>
          <p className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {MONTH_NAMES[s.month - 1]}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.year}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Boards</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.boardCount}</p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Published</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.totalPosted}</p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle2 size={10} className="text-emerald-400" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Insights</p>
          </div>
          <p className="text-sm font-bold text-emerald-400">{s.completedInsights}</p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle size={10} className={s.missingInsights > 0 ? 'text-orange-400' : 'text-slate-400'} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Missing</p>
          </div>
          <p className={`text-sm font-bold ${s.missingInsights > 0 ? 'text-orange-400' : ''}`}
            style={{ color: s.missingInsights === 0 ? 'var(--text-primary)' : undefined }}>
            {s.missingInsights}
          </p>
        </div>
      </div>

      {/* Total views */}
      {s.totalViews > 0 && (
        <div className="flex items-center gap-2 mb-3 px-2.5 py-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
          <Eye size={12} className="text-indigo-400" />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {s.totalViews.toLocaleString('en-US')} total views
          </span>
        </div>
      )}

      {/* Progress bar */}
      {s.totalPosted > 0 && (
        <>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Insight completion</span>
            <span className="text-xs font-bold" style={{ color: progress === 100 ? '#10b981' : 'var(--text-primary)' }}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div className="h-1.5 rounded-full" style={{
              width: `${progress}%`,
              background: progress === 100
                ? 'linear-gradient(90deg,#10b981,#34d399)'
                : 'linear-gradient(90deg,#6366f1,#8b5cf6)',
            }} />
          </div>
        </>
      )}
    </button>
  );
}
