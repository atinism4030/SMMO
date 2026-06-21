'use client';

import { useState, useEffect, use } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft, FileDown, CheckCircle2, AlertTriangle, Eye,
  Heart, MessageCircle, Share2, Bookmark, ExternalLink, Globe, X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IClient, IBoard, ITask, IPostedLink } from '@/types';
import type { PDFTask } from '@/lib/generateBoardPDF';
import type { PdfLang } from '@/lib/pdfTranslations';
import { LANG_LABELS } from '@/lib/pdfTranslations';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmt(n?: number | null): string {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString('en-US');
}

function fmtPct(n?: number | null): string {
  if (n === undefined || n === null) return '—';
  return `${Number(n).toFixed(2)}%`;
}

export default function BoardReportContent({
  params,
}: {
  params: Promise<{ clientId: string; monthYear: string; boardId: string }>;
}) {
  const { clientId, monthYear, boardId } = use(params);
  const [client, setClient] = useState<IClient | null>(null);
  const [board, setBoard] = useState<IBoard | null>(null);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState<PdfLang>('en');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const [clientRes, boardRes, tasksRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/boards/${boardId}`),
        fetch(`/api/tasks?boardId=${boardId}`),
      ]);
      const [cd, bd, td] = await Promise.all([clientRes.json(), boardRes.json(), tasksRes.json()]);
      setClient(cd.client ?? null);
      setBoard(bd.board ?? null);
      setTasks(td.tasks ?? []);
      setLoading(false);
    }
    load();
  }, [clientId, boardId]);

  const posted = tasks.filter(t => t.status === 'POSTED');
  const withMetrics = posted.filter(t =>
    t.reporting?.metrics && (
      t.reporting.metrics.views !== undefined ||
      t.reporting.metrics.reach !== undefined ||
      t.reporting.metrics.likes !== undefined
    )
  );
  const missing = posted.filter(t => !withMetrics.includes(t));

  const totalViews = withMetrics.reduce((s, t) => s + (t.reporting?.metrics?.views ?? 0), 0);
  const monthLabel = board ? `${MONTH_NAMES[board.month - 1]} ${board.year}` : '';

  const sortedPosted = [...posted].sort((a, b) =>
    (a.postedDate ? new Date(a.postedDate).getTime() : 0) -
    (b.postedDate ? new Date(b.postedDate).getTime() : 0)
  );

  async function handleGeneratePDF(lang: PdfLang) {
    if (!client || !board) return;
    setShowLangModal(false);
    setPdfLoading(true);
    try {
      const { generateBoardPDF } = await import('@/lib/generateBoardPDF');
      const pdfTasks: PDFTask[] = tasks.map(t => ({
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
        postedLinks: t.postedLinks,
        primaryPostUrl: t.primaryPostUrl,
      }));
      await generateBoardPDF(
        { name: client.name },
        { title: board.title, month: board.month, year: board.year },
        pdfTasks,
        lang
      );
    } catch (err) {
      console.error('PDF generation failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`PDF report could not be generated.\n\n${message}`);
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <>
      <Topbar
        title={board?.title ?? 'Board Report'}
        subtitle={`${client?.name ?? ''} — ${monthLabel}`}
        actions={
          <div className="flex gap-2">
            <Link href={`/reports/${clientId}/${monthYear}`}>
              <Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button>
            </Link>
            <Button onClick={() => setShowLangModal(true)} disabled={pdfLoading} size="sm">
              {pdfLoading ? <LoadingSpinner size={13} /> : <FileDown size={13} />}
              {pdfLoading ? 'Generating…' : 'Generate PDF'}
            </Button>
          </div>
        }
      />

      {/* Language selector modal */}
      {showLangModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl border w-full max-w-sm p-6 space-y-5"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Generate PDF Report</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Choose the report language</p>
              </div>
              <button onClick={() => setShowLangModal(false)} className="opacity-50 hover:opacity-100">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="space-y-2">
              {(Object.entries(LANG_LABELS) as [PdfLang, string][]).map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => setSelectedLang(code)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left"
                  style={selectedLang === code
                    ? { background: 'rgba(255,255,255,0.1)', borderColor: '#ffffff', color: '#ffffff' }
                    : { background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                  }
                >
                  <span className="text-sm font-medium">{label}</span>
                  {selectedLang === code && <CheckCircle2 size={15} className="text-zinc-400" />}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" onClick={() => setShowLangModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={() => handleGeneratePDF(selectedLang)} className="flex-1">
                <FileDown size={13} />Generate PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Published" value={posted.length} sub="content pieces" />
          <SummaryCard label="Total Views" value={fmt(totalViews)} sub="from reported content" accent="indigo" />
          <SummaryCard label="Insights" value={withMetrics.length} sub={`of ${posted.length} complete`} accent="green" />
          <SummaryCard label="Missing" value={missing.length} sub="need data entry" accent={missing.length > 0 ? 'orange' : undefined} />
        </div>

        {/* Published content performance table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Published Content Performance</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {posted.length === 0 ? 'No published content in this board' : `${posted.length} published content piece${posted.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {posted.length === 0 ? (
            <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No published content found for this board.</p>
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)' }}>
                      {['Title','Type','Platform','Posted Date','Views','Reach','Likes','Comments','Shares','Saves','Eng. Rate','Post Link','Notes'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold whitespace-nowrap"
                          style={{ color: 'var(--text-muted)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPosted.map((task, idx) => {
                      const m = task.reporting?.metrics;
                      const hm = !!m && (m.views !== undefined || m.reach !== undefined || m.likes !== undefined);
                      const links = task.postedLinks ?? [];
                      return (
                        <tr
                          key={String(task._id)}
                          className="border-t"
                          style={{
                            borderColor: 'var(--border)',
                            background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-elevated)',
                          }}
                        >
                          <td className="px-3 py-2.5 font-medium max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                            <span className="block truncate">{task.title}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {task.contentType ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {(task.platforms ?? []).join(', ') || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {task.postedDate
                              ? new Date(task.postedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <MetricCell value={hm ? m?.views : undefined} icon={Eye} />
                          <MetricCell value={hm ? m?.reach : undefined} />
                          <MetricCell value={hm ? m?.likes : undefined} icon={Heart} />
                          <MetricCell value={hm ? m?.comments : undefined} icon={MessageCircle} />
                          <MetricCell value={hm ? m?.shares : undefined} icon={Share2} />
                          <MetricCell value={hm ? m?.saves : undefined} icon={Bookmark} />
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap font-semibold"
                            style={{ color: hm && m?.engagementRate !== undefined ? '#6366f1' : 'var(--text-muted)' }}>
                            {hm ? fmtPct(m?.engagementRate) : '—'}
                          </td>
                          {/* Post links cell */}
                          <td className="px-3 py-2.5">
                            {links.length === 0 ? (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {links.map((lnk: IPostedLink) => (
                                  <a
                                    key={lnk._id}
                                    href={lnk.url}
                                    target="_blank"
                                    rel="noopener"
                                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors hover:opacity-80"
                                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                                  >
                                    <Globe size={9} />
                                    {lnk.platform}
                                    <ExternalLink size={8} />
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs max-w-[120px]" style={{ color: 'var(--text-muted)' }}>
                            <span className="block truncate">{hm ? (m?.notes || '—') : '—'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Missing insights section */}
        {missing.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-zinc-400" />
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Missing Insights ({missing.length})
              </h2>
            </div>
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    {['Content Title','Type','Posted Date','Report Due','Action'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {missing.map((task, idx) => (
                    <tr key={String(task._id)} className="border-t"
                      style={{ borderColor: 'var(--border)', background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-elevated)' }}>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{task.title}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{task.contentType ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {task.postedDate
                          ? new Date(task.postedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {task.reporting?.reportDueAt
                          ? new Date(task.reporting.reportDueAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => router.push(`/tasks/${task._id}`)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                        >
                          <ExternalLink size={11} />
                          Add Insights
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* All complete state */}
        {missing.length === 0 && posted.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CheckCircle2 size={16} className="text-zinc-400 shrink-0" />
            <p className="text-sm text-zinc-300 font-medium">
              All published content has complete performance insights for this board.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub: string; accent?: 'indigo' | 'green' | 'orange';
}) {
  const color = accent === 'indigo' ? '#6366f1'
    : accent === 'green' ? '#10b981'
    : accent === 'orange' ? '#f97316'
    : 'var(--text-primary)';

  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-black mb-1" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

function MetricCell({ value, icon: Icon }: { value?: number | null; icon?: React.ElementType }) {
  const display = value !== undefined && value !== null ? value.toLocaleString('en-US') : '—';
  return (
    <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: value !== undefined && value !== null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
      {Icon && value !== undefined && value !== null ? (
        <span className="flex items-center gap-1">
          <Icon size={10} className="text-slate-400" />
          {display}
        </span>
      ) : display}
    </td>
  );
}
