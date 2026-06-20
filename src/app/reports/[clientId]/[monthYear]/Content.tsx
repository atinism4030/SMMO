'use client';

import { useState, useEffect, use } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { ArrowLeft, Layers, CheckCircle2, AlertTriangle, Eye, FileDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IClient, IBoard, ITask } from '@/types';
import type { PDFTask } from '@/lib/generateBoardPDF';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface BoardSummary extends IBoard {
  totalPosted: number;
  completedInsights: number;
  missingInsights: number;
  totalViews: number;
  tasks: ITask[];
}

export default function MonthBoardsContent({ params }: { params: Promise<{ clientId: string; monthYear: string }> }) {
  const { clientId, monthYear } = use(params);
  const [year, month] = monthYear.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const [client, setClient] = useState<IClient | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
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

      const allBoards: IBoard[] = bd.boards ?? [];
      const allTasks: ITask[] = td.tasks ?? [];

      const monthBoards = allBoards.filter(b => b.month === month && b.year === year);
      const boardIds = new Set(monthBoards.map(b => String(b._id)));

      const tasksByBoard: Record<string, ITask[]> = {};
      for (const t of allTasks) {
        const bid = typeof t.boardId === 'string' ? t.boardId : (t.boardId as IBoard)?._id;
        const bidStr = String(bid);
        if (!boardIds.has(bidStr)) continue;
        if (!tasksByBoard[bidStr]) tasksByBoard[bidStr] = [];
        tasksByBoard[bidStr].push(t);
      }

      const summaries: BoardSummary[] = monthBoards.map(b => {
        const bTasks = tasksByBoard[String(b._id)] ?? [];
        const posted = bTasks.filter(t => t.status === 'POSTED');
        const completed = posted.filter(t => t.reporting?.reportStatus === 'COMPLETED');
        const views = completed.reduce((s, t) => s + (t.reporting?.metrics?.views ?? 0), 0);
        return {
          ...b,
          totalPosted: posted.length,
          completedInsights: completed.length,
          missingInsights: posted.length - completed.length,
          totalViews: views,
          tasks: bTasks,
        };
      });

      setBoards(summaries);
      setLoading(false);
    }
    load();
  }, [clientId, month, year]);

  async function handleGeneratePDF(board: BoardSummary) {
    if (!client) return;
    setPdfLoading(String(board._id));
    try {
      const { generateBoardPDF } = await import('@/lib/generateBoardPDF');
      const pdfTasks: PDFTask[] = board.tasks.map(t => ({
        _id: String(t._id),
        title: t.title,
        contentType: t.contentType,
        platforms: t.platforms as string[] | undefined,
        postedDate: t.postedDate ?? null,
        status: t.status,
        reporting: t.reporting
          ? {
              reportStatus: t.reporting.reportStatus,
              reportDueAt: t.reporting.reportDueAt ?? null,
              metrics: t.reporting.metrics,
            }
          : undefined,
      }));
      await generateBoardPDF(
        { name: client.name },
        { title: board.title, month: board.month, year: board.year },
        pdfTasks
      );
    } finally {
      setPdfLoading(null);
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <>
      <Topbar
        title={monthLabel}
        subtitle={`${client?.name ?? ''} — Select a board to view performance or generate PDF`}
        actions={
          <Link href={`/reports/${clientId}`}>
            <Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button>
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {boards.length === 0 ? (
          <EmptyState
            title="No boards this month"
            description="No boards were created for this month"
            icon={Layers}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map(board => (
              <BoardCard
                key={String(board._id)}
                board={board}
                pdfLoading={pdfLoading === String(board._id)}
                onOpen={() => router.push(`/reports/${clientId}/${monthYear}/${board._id}`)}
                onPDF={() => handleGeneratePDF(board)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function BoardCard({
  board, pdfLoading, onOpen, onPDF,
}: {
  board: BoardSummary;
  pdfLoading: boolean;
  onOpen: () => void;
  onPDF: () => void;
}) {
  const progress = board.totalPosted > 0
    ? Math.round((board.completedInsights / board.totalPosted) * 100)
    : 0;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Board title */}
      <p className="text-base font-bold mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
        {board.title}
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        {MONTH_NAMES[board.month - 1]} {board.year}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{board.totalPosted}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Published</p>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-sm font-bold text-emerald-400">{board.completedInsights}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Insights</p>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
          <p className={`text-sm font-bold ${board.missingInsights > 0 ? 'text-orange-400' : ''}`}
            style={{ color: board.missingInsights === 0 ? 'var(--text-primary)' : undefined }}>
            {board.missingInsights}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Missing</p>
        </div>
      </div>

      {board.totalViews > 0 && (
        <div className="flex items-center gap-2 mb-3 px-2.5 py-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
          <Eye size={11} className="text-indigo-400" />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {board.totalViews.toLocaleString('en-US')} total views
          </span>
        </div>
      )}

      {/* Missing warning */}
      {board.missingInsights > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-orange-400">
          <AlertTriangle size={11} />
          <span>{board.missingInsights} content piece{board.missingInsights !== 1 ? 's' : ''} missing insights</span>
        </div>
      )}

      {/* Progress bar */}
      {board.totalPosted > 0 && (
        <>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Insight completion</span>
            <span className="text-xs font-bold"
              style={{ color: progress === 100 ? '#10b981' : 'var(--text-primary)' }}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'var(--bg-elevated)' }}>
            <div className="h-1.5 rounded-full" style={{
              width: `${progress}%`,
              background: progress === 100
                ? 'linear-gradient(90deg,#10b981,#34d399)'
                : 'linear-gradient(90deg,#6366f1,#8b5cf6)',
            }} />
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onOpen}>
          <ExternalLink size={12} />
          Open Report
        </Button>
        <Button size="sm" className="flex-1" onClick={onPDF} disabled={pdfLoading}>
          {pdfLoading ? <LoadingSpinner size={12} /> : <FileDown size={12} />}
          {pdfLoading ? 'Generating…' : 'PDF Report'}
        </Button>
      </div>
    </div>
  );
}
