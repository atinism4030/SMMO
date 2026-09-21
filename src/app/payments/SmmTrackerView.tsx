'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { StatCard } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { BillingPeriodStatusBadge } from '@/components/ui/Badge';
import { useTranslation } from '@/components/providers/LanguageProvider';
import { formatMoney, toMinorUnits, fromMinorUnits } from '@/lib/billing';
import { formatMonthYear } from '@/lib/utils';
import { ChevronDown, ChevronUp, Check, Wallet, Users2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SmmPeriod {
  _id: string;
  year: number;
  month: number;
  expectedAmountMinor: number;
  verifiedPaidAmountMinor: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID';
  singlePaymentId?: string;
}
interface SmmClient {
  clientId: string;
  clientName: string;
  currency: string;
  monthlyFeeMinor: number;
  periods: SmmPeriod[];
  unpaidMonthsCount: number;
}
interface Overview {
  clients: SmmClient[];
  totalCollectedMinor: number;
  totalExpectedMinor: number;
}

export default function SmmTrackerView() {
  const { t } = useTranslation();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/payments/smm-tracker');
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { load(); }, [load]);

  const [markTarget, setMarkTarget] = useState<{ clientId: string; period: SmmPeriod; currency: string } | null>(null);
  const [markAmount, setMarkAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [undoTarget, setUndoTarget] = useState<{ paymentId: string; period: SmmPeriod } | null>(null);
  const [undoing, setUndoing] = useState(false);

  function toggle(clientId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function openMark(client: SmmClient, period: SmmPeriod) {
    const due = Math.max(period.expectedAmountMinor - period.verifiedPaidAmountMinor, 0);
    setMarkAmount(fromMinorUnits(due || period.expectedAmountMinor).toFixed(2));
    setMarkTarget({ clientId: client.clientId, period, currency: client.currency });
  }

  async function confirmMark() {
    if (!markTarget) return;
    const amountMinor = toMinorUnits(parseFloat(markAmount) || 0);
    if (amountMinor <= 0) { toast.error(t('smmTracker.failedToMarkPaid')); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/payments/smm-tracker/periods/${markTarget.period._id}/mark-paid`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: markTarget.clientId, amountMinor }),
      });
      const resData = await res.json();
      if (!res.ok) { toast.error(resData.error ?? t('smmTracker.failedToMarkPaid')); return; }
      toast.success(t('smmTracker.markedPaid'));
      setMarkTarget(null);
      load();
    } finally { setSaving(false); }
  }

  async function confirmUndo() {
    if (!undoTarget) return;
    setUndoing(true);
    try {
      const res = await fetch(`/api/payments/smm-tracker/payments/${undoTarget.paymentId}/unmark`, { method: 'POST' });
      const resData = await res.json();
      if (!res.ok) { toast.error(resData.error ?? t('smmTracker.failedToUndo')); return; }
      toast.success(t('smmTracker.undone'));
      setUndoTarget(null);
      load();
    } finally { setUndoing(false); }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label={t('smmTracker.totalCollected')} value={formatMoney(data?.totalCollectedMinor ?? 0)} icon={Wallet} />
        <StatCard label={t('smmTracker.totalExpected')} value={formatMoney(data?.totalExpectedMinor ?? 0)} />
      </div>

      {!data || data.clients.length === 0 ? (
        <EmptyState title={t('smmTracker.noClients')} description={t('smmTracker.noClientsDesc')} icon={Users2} />
      ) : (
        <div className="space-y-3">
          {data.clients.map((client) => {
            const isOpen = expanded.has(client.clientId);
            return (
              <div key={client.clientId} className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <button onClick={() => toggle(client.clientId)} className="w-full flex items-center justify-between px-4 py-3.5 text-left flex-wrap gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{client.clientName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {t('smmTracker.monthlyFee')}: {formatMoney(client.monthlyFeeMinor, client.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: client.unpaidMonthsCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                      color: client.unpaidMonthsCount > 0 ? '#f87171' : '#4ade80',
                    }}>
                      {client.unpaidMonthsCount > 0
                        ? t('smmTracker.unpaidMonths', { count: client.unpaidMonthsCount, plural: client.unpaidMonthsCount === 1 ? '' : 's' })
                        : t('smmTracker.allPaidUp')}
                    </span>
                    {isOpen ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
                    {client.periods.map((period) => (
                      <div key={period._id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatMonthYear(period.month, period.year)}</span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <BillingPeriodStatusBadge status={period.status} />
                          {period.status === 'UNPAID' || period.status === 'PARTIALLY_PAID' ? (
                            <button onClick={() => openMark(client, period)} title={t('smmTracker.markPaid')}
                              className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors hover:border-zinc-500"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                              <Check size={14} />
                            </button>
                          ) : period.singlePaymentId ? (
                            <button onClick={() => setUndoTarget({ paymentId: period.singlePaymentId!, period })} title={t('smmTracker.undo')}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                              style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                              <Check size={14} />
                            </button>
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!markTarget} onClose={() => setMarkTarget(null)}
        title={markTarget ? t('smmTracker.markPaidTitle', { month: formatMonthYear(markTarget.period.month, markTarget.period.year) }) : ''} size="sm"
        footer={<><Button variant="secondary" onClick={() => setMarkTarget(null)}>{t('common.cancel')}</Button><Button onClick={confirmMark} loading={saving}>{t('smmTracker.confirm')}</Button></>}>
        {markTarget && (
          <Input label={`${t('smmTracker.amount')} (${markTarget.currency})`} type="number" step="0.01" min="0.01"
            value={markAmount} onChange={(e) => setMarkAmount(e.target.value)} autoFocus />
        )}
      </Modal>

      <Modal open={!!undoTarget} onClose={() => setUndoTarget(null)} title={t('smmTracker.undoMarkTitle')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setUndoTarget(null)}>{t('common.cancel')}</Button><Button variant="danger" onClick={confirmUndo} loading={undoing}>{t('smmTracker.undo')}</Button></>}>
        {undoTarget && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('smmTracker.undoMarkDesc', { month: formatMonthYear(undoTarget.period.month, undoTarget.period.year) })}</p>}
      </Modal>
    </div>
  );
}
