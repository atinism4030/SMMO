'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTranslation } from '@/components/providers/LanguageProvider';
import {
  ArrowLeft, FileDown, Lock, Unlock, ExternalLink, Layers,
  CheckCircle2, XCircle, Camera,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { IClient, IMonthlyReport, IMonthlyReportMetrics, IUser } from '@/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const METRIC_FIELDS: { key: keyof IMonthlyReportMetrics; labelKey: string }[] = [
  { key: 'followersStart', labelKey: 'reports.followersStart' },
  { key: 'followersEnd', labelKey: 'reports.followersEnd' },
  { key: 'totalReach', labelKey: 'reports.totalReach' },
  { key: 'totalViews', labelKey: 'reports.totalViews' },
  { key: 'profileVisits', labelKey: 'reports.profileVisits' },
  { key: 'engagementRatePct', labelKey: 'reports.engagementRate' },
  { key: 'facebookReach', labelKey: 'reports.facebookReach' },
  { key: 'tiktokViews', labelKey: 'reports.tiktokViews' },
];

type NarrativeField = 'summary' | 'highlights' | 'bestPerformingContent' | 'observations' | 'recommendations' | 'nextMonthPlan';

const NARRATIVE_FIELDS: { key: NarrativeField; labelKey: string; placeholderKey: string }[] = [
  { key: 'summary', labelKey: 'reports.monthlySummary', placeholderKey: 'reports.monthlySummaryPlaceholder' },
  { key: 'highlights', labelKey: 'reports.highlights', placeholderKey: 'reports.highlightsPlaceholder' },
  { key: 'bestPerformingContent', labelKey: 'reports.bestPerforming', placeholderKey: 'reports.bestPerformingPlaceholder' },
  { key: 'observations', labelKey: 'reports.observations', placeholderKey: 'reports.observationsPlaceholder' },
  { key: 'recommendations', labelKey: 'reports.recommendations', placeholderKey: 'reports.recommendationsPlaceholder' },
  { key: 'nextMonthPlan', labelKey: 'reports.nextMonthPlan', placeholderKey: 'reports.nextMonthPlanPlaceholder' },
];

export default function MonthlyReportContent({ params }: { params: Promise<{ clientId: string; monthYear: string }> }) {
  const { clientId, monthYear } = use(params);
  const [year, month] = monthYear.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const { t } = useTranslation();

  const [client, setClient] = useState<IClient | null>(null);
  const [me, setMe] = useState<IUser | null>(null);
  const [report, setReport] = useState<IMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [metrics, setMetrics] = useState<IMonthlyReportMetrics>({});
  const [narrative, setNarrative] = useState<Record<NarrativeField, string>>({
    summary: '', highlights: '', bestPerformingContent: '', observations: '', recommendations: '', nextMonthPlan: '',
  });
  const [language, setLanguage] = useState<'en' | 'sq'>('en');

  const applyReport = useCallback((r: IMonthlyReport) => {
    setReport(r);
    setMetrics(r.metrics ?? {});
    setNarrative({
      summary: r.summary ?? '',
      highlights: r.highlights ?? '',
      bestPerformingContent: r.bestPerformingContent ?? '',
      observations: r.observations ?? '',
      recommendations: r.recommendations ?? '',
      nextMonthPlan: r.nextMonthPlan ?? '',
    });
    setLanguage(r.language ?? 'en');
  }, []);

  useEffect(() => {
    async function load() {
      const [clientRes, meRes, reportRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch('/api/auth/me'),
        fetch(`/api/reports/monthly?clientId=${clientId}&month=${month}&year=${year}`),
      ]);
      const [cd, md, rd] = await Promise.all([clientRes.json(), meRes.json(), reportRes.json()]);
      setClient(cd.client ?? null);
      setMe(md.user ?? null);
      if (reportRes.ok && rd.report) {
        applyReport(rd.report);
      } else {
        toast.error(rd.error ?? 'Failed to load report');
      }
      setLoading(false);
    }
    load();
  }, [clientId, month, year, applyReport]);

  const canEdit = report ? (me?.role === 'CEO' || report.status === 'DRAFT') : false;

  const save = useCallback(async () => {
    if (!report) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/monthly/${report._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, metrics, ...narrative }),
      });
      const data = await res.json();
      if (res.ok) {
        applyReport(data.report);
        toast.success(t('reports.saved'));
      } else {
        toast.error(data.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  }, [report, language, metrics, narrative, t, applyReport]);

  async function handleFinalize() {
    if (!report || !confirm(t('reports.confirmFinalize'))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/monthly/${report._id}/finalize`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { applyReport(data.report); toast.success(t('reports.finalizeReport')); }
      else toast.error(data.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen() {
    if (!report || !confirm(t('reports.confirmReopen'))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/monthly/${report._id}/unfinalize`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { applyReport(data.report); toast.success(t('reports.reopenForEdits')); }
      else toast.error(data.error);
    } finally {
      setBusy(false);
    }
  }

  async function handlePDF() {
    if (!report || !client) return;
    setPdfLoading(true);
    try {
      const { generateMonthlyReportPDF } = await import('@/lib/monthlyReportPDF');
      await generateMonthlyReportPDF({
        clientName: client.name,
        month, year,
        language,
        stats: report.stats,
        metrics,
        summary: narrative.summary || undefined,
        highlights: narrative.highlights || undefined,
        bestPerformingContent: narrative.bestPerformingContent || undefined,
        observations: narrative.observations || undefined,
        recommendations: narrative.recommendations || undefined,
        nextMonthPlan: narrative.nextMonthPlan || undefined,
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`PDF report could not be generated.\n\n${message}`);
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;

  const stats = report?.stats;
  const isFinalized = report?.status === 'FINALIZED';

  return (
    <>
      <Topbar
        title={monthLabel}
        subtitle={client?.name ?? ''}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/reports/${clientId}`}>
              <Button variant="secondary" size="sm"><ArrowLeft size={13} />{t('common.back')}</Button>
            </Link>
            <Button size="sm" onClick={handlePDF} disabled={pdfLoading || !report}>
              {pdfLoading ? <LoadingSpinner size={12} /> : <FileDown size={12} />}
              {pdfLoading ? t('reports.generating') : t('reports.downloadPdf')}
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between rounded-2xl border p-4"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            {isFinalized
              ? <Lock size={15} className="text-zinc-400" />
              : <Unlock size={15} className="text-zinc-400" />}
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isFinalized ? t('reports.finalized') : t('reports.draft')}
            </span>
            {!isFinalized && me?.role === 'WORKER' && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>— {t('reports.workerDraftNotice')}</span>
            )}
          </div>
          {me?.role === 'CEO' && (
            isFinalized ? (
              <Button variant="secondary" size="sm" onClick={handleReopen} disabled={busy}>{t('reports.reopenForEdits')}</Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleFinalize} disabled={busy}>{t('reports.finalizeReport')}</Button>
            )
          )}
        </div>

        {stats && (
          <Section title={t('reports.contentDelivered')} icon={Layers}>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t('reports.autoGatheredNotice')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatBox label={t('reports.totalPlanned')} value={stats.totalPlanned} />
              <StatBox label={t('reports.totalPosted')} value={stats.totalPosted} icon={CheckCircle2} />
              <StatBox label={t('reports.notCompleted')} value={stats.totalNotCompleted} icon={XCircle} />
              <StatBox label={t('reports.completedShoots')} value={stats.completedShoots} icon={Camera} />
            </div>
            {Object.keys(stats.byType).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <span key={type} className="text-xs px-2.5 py-1 rounded-full border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    {type}: {count}
                  </span>
                ))}
              </div>
            )}
            {stats.postedLinks.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('reports.postedContent')}</p>
                <div className="space-y-1.5">
                  {stats.postedLinks.map((l) => (
                    <a key={l.taskId} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs hover:underline"
                      style={{ color: 'var(--text-secondary)' }}>
                      <ExternalLink size={11} className="shrink-0" />
                      <span className="truncate">{l.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        <Section title={t('reports.performanceMetrics')}>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t('reports.performanceMetricsHint')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {METRIC_FIELDS.map(({ key, labelKey }) => (
              <Input
                key={key}
                label={t(labelKey as never)}
                type="number"
                disabled={!canEdit}
                value={metrics[key] ?? ''}
                onChange={(e) => setMetrics((m) => ({ ...m, [key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
              />
            ))}
          </div>
        </Section>

        <Section title="">
          <Select
            label={t('reports.reportLanguage')}
            disabled={!canEdit}
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'sq')}
            options={[{ value: 'en', label: 'English' }, { value: 'sq', label: 'Shqip' }]}
            className="max-w-xs"
          />
        </Section>

        {NARRATIVE_FIELDS.map(({ key, labelKey, placeholderKey }) => (
          <Section key={key} title={t(labelKey as never)}>
            <Textarea
              rows={4}
              disabled={!canEdit}
              placeholder={t(placeholderKey as never)}
              value={narrative[key]}
              onChange={(e) => setNarrative((n) => ({ ...n, [key]: e.target.value }))}
            />
          </Section>
        ))}

        {canEdit && (
          <div className="flex justify-end pb-6">
            <Button onClick={save} disabled={saving}>
              {saving ? <LoadingSpinner size={13} /> : null}
              {saving ? t('reports.saving') : t('reports.saveDraft')}
            </Button>
          </div>
        )}
        {isFinalized && me?.role !== 'CEO' && (
          <p className="text-xs text-center pb-6" style={{ color: 'var(--text-muted)' }}>{t('reports.finalizedNotice')}</p>
        )}
      </div>
    </>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon size={15} className="text-zinc-400" />}
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function StatBox({ label, value, icon: Icon }: { label: string; value: number; icon?: React.ElementType }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={11} className="text-zinc-400" />}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}
