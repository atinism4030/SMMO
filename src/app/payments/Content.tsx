'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { StatCard } from '@/components/ui/Card';
import { VerificationStatusBadge } from '@/components/ui/Badge';
import { formatDate, formatMonthYear } from '@/lib/utils';
import { formatMoney, toMinorUnits, fromMinorUnits, PAYMENT_METHOD_LABELS, DISPUTE_REASON_LABELS } from '@/lib/billing';
import type { IClientPayment, IClient, IBillingPeriod, IWallet, PaymentVerificationStatus, PaymentMethod } from '@/types';
import {
  Plus, Wallet, ShieldCheck, Clock, AlertCircle, Users2, MessageCircleWarning,
  Link2, Ban, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/components/providers/LanguageProvider';
import SmmTrackerView from './SmmTrackerView';

interface AgencySummary {
  monthlyExpectedRevenueMinor: number;
  verifiedThisMonthMinor: number;
  pendingConfirmationMinor: number;
  pendingConfirmationCount: number;
  outstandingBalanceMinor: number;
  overdueClientCount: number;
  disputedCount: number;
}

type StatusFilter = '' | PaymentVerificationStatus;

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const emptyForm = {
  clientId: '', amount: '', currency: 'EUR', paymentDate: todayISO(),
  paymentMethod: 'BANK' as PaymentMethod, reference: '', notes: '', destinationWalletId: '',
};

interface AllocationRow {
  billingPeriodId: string;
  label: string;
  amount: string;
}

export default function PaymentsContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'all' | 'smm'>('all');
  const [summary, setSummary] = useState<AgencySummary | null>(null);
  const [payments, setPayments] = useState<IClientPayment[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [wallets, setWallets] = useState<IWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [thisMonthOnly, setThisMonthOnly] = useState(false);
  const [search, setSearch] = useState('');

  const now = new Date();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (thisMonthOnly) {
      params.set('month', String(now.getMonth() + 1));
      params.set('year', String(now.getFullYear()));
    }
    const [sRes, pRes, cRes, wRes] = await Promise.all([
      fetch('/api/billing/summary'),
      fetch(`/api/billing/payments?${params}`),
      fetch('/api/clients'),
      fetch('/api/finance/wallets'),
    ]);
    const [sd, pd, cd, wd] = await Promise.all([sRes.json(), pRes.json(), cRes.json(), wRes.json()]);
    setSummary(sd.summary ?? null);
    setPayments(pd.payments ?? []);
    setClients(cd.clients ?? []);
    setWallets(wd.wallets ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, thisMonthOnly]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredPayments = payments.filter(p => {
    if (!search) return true;
    const client = p.clientId as IClient;
    return client?.name?.toLowerCase().includes(search.toLowerCase());
  });

  // ─── New Payment ──────────────────────────────────────────────────────────
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [periods, setPeriods] = useState<IBillingPeriod[]>([]);
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [savingPayment, setSavingPayment] = useState(false);
  const [createdPayment, setCreatedPayment] = useState<IClientPayment | null>(null);

  function periodLabel(p: { year: number; month: number }) {
    return formatMonthYear(p.month, p.year);
  }

  const loadPeriods = useCallback(async (clientId: string) => {
    if (!clientId) { setPeriods([]); return; }
    const res = await fetch(`/api/clients/${clientId}/billing-periods`);
    const data = await res.json();
    setPeriods(data.periods ?? []);
  }, []);

  async function recomputeSuggestion(clientId: string, amount: string) {
    const amt = parseFloat(amount);
    if (!clientId || !amt || amt <= 0) { setRows([]); return; }
    const res = await fetch('/api/billing/allocation-preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, amount: amt }),
    });
    const data = await res.json();
    if (!res.ok) return;
    const periodsRes = await fetch(`/api/clients/${clientId}/billing-periods`);
    const periodsData = await periodsRes.json();
    const periodMap = new Map<string, IBillingPeriod>((periodsData.periods ?? []).map((p: IBillingPeriod) => [p._id, p]));
    setPeriods(periodsData.periods ?? []);
    setRows(
      (data.allocations ?? []).map((a: { billingPeriodId: string; amountMinor: number }) => {
        const period = periodMap.get(a.billingPeriodId);
        return {
          billingPeriodId: a.billingPeriodId,
          label: period ? periodLabel(period) : t('paymentsAdmin.unknownPeriod'),
          amount: fromMinorUnits(a.amountMinor).toFixed(2),
        };
      })
    );
  }

  function updateRowAmount(billingPeriodId: string, amount: string) {
    setRows(prev => prev.map(r => (r.billingPeriodId === billingPeriodId ? { ...r, amount } : r)));
  }

  const allocatedTotal = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const paymentAmount = parseFloat(form.amount) || 0;
  const creditRemaining = Math.max(paymentAmount - allocatedTotal, 0);

  function openNewPayment(prefillClientId?: string) {
    setForm({ ...emptyForm, clientId: prefillClientId ?? '' });
    setRows([]);
    setPeriods([]);
    setCreatedPayment(null);
    setShowNewPayment(true);
    if (prefillClientId) loadPeriods(prefillClientId);
  }

  // Deep link from a client's Payments tab ("Record Payment" → /payments?newPayment=<clientId>).
  useEffect(() => {
    const prefill = searchParams.get('newPayment');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate deep-link hydration, not a cascading-render bug
    if (prefill) openNewPayment(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) { toast.error(t('paymentsAdmin.selectClientError')); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error(t('paymentsAdmin.enterValidAmount')); return; }
    setSavingPayment(true);
    try {
      const res = await fetch('/api/billing/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          allocations: rows.filter(r => parseFloat(r.amount) > 0).map(r => ({ billingPeriodId: r.billingPeriodId, amount: parseFloat(r.amount) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('paymentsAdmin.failedToRecordPayment')); return; }
      toast.success(t('paymentsAdmin.paymentRecordedWaiting'));
      setCreatedPayment(data.payment);
      fetchAll();
    } finally { setSavingPayment(false); }
  }

  function copyLink(paymentId: string) {
    const url = `${window.location.origin}/client/payments/${paymentId}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success(t('paymentsAdmin.verificationLinkCopied')),
      () => toast.error(t('paymentsAdmin.couldNotCopyLink'))
    );
  }

  // ─── Detail / Edit / Cancel / Resolve ─────────────────────────────────────
  const [viewPayment, setViewPayment] = useState<IClientPayment | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', currency: '', paymentDate: '', paymentMethod: 'BANK' as PaymentMethod, reference: '', notes: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<IClientPayment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<IClientPayment | null>(null);
  const [resolveAction, setResolveAction] = useState<'RESENT' | 'DISMISSED' | 'CANCELLED'>('RESENT');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  async function openView(p: IClientPayment) {
    // Re-fetch the single payment: the list endpoint doesn't populate
    // allocations.billingPeriodId, so period labels wouldn't resolve.
    const res = await fetch(`/api/billing/payments/${p._id}`);
    const data = await res.json();
    const payment: IClientPayment = data.payment ?? p;
    setViewPayment(payment);
    setEditForm({
      amount: fromMinorUnits(payment.amountMinor).toFixed(2),
      currency: payment.currency,
      paymentDate: payment.paymentDate.split('T')[0],
      paymentMethod: payment.paymentMethod,
      reference: payment.reference ?? '',
      notes: payment.notes ?? '',
    });
  }

  async function handleSaveEdit() {
    if (!viewPayment) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/billing/payments/${viewPayment._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('paymentsAdmin.failedToUpdatePayment')); return; }
      toast.success(t('paymentsAdmin.paymentUpdated'));
      setViewPayment(null);
      fetchAll();
    } finally { setSavingEdit(false); }
  }

  async function handleCancelPayment() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/billing/payments/${cancelTarget._id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('paymentsAdmin.failedToCancelPayment')); return; }
      toast.success(t('paymentsAdmin.paymentCancelled'));
      setCancelTarget(null);
      setViewPayment(null);
      fetchAll();
    } finally { setCancelling(false); }
  }

  async function handleResolveDispute() {
    if (!resolveTarget) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/billing/payments/${resolveTarget._id}/resolve-dispute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: resolveAction, note: resolveNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('paymentsAdmin.failedToResolveDispute')); return; }
      toast.success(t('paymentsAdmin.disputeResolved'));
      setResolveTarget(null);
      setResolveNote('');
      setViewPayment(null);
      fetchAll();
    } finally { setResolving(false); }
  }

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <Topbar
        title={t('payments.title')}
        subtitle={t('payments.subtitleAdmin')}
        actions={<Button onClick={() => openNewPayment()}><Plus size={14} />{t('paymentsAdmin.newPayment')}</Button>}
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label={t('paymentsAdmin.statMonthlyExpected')} value={formatMoney(summary?.monthlyExpectedRevenueMinor ?? 0)} icon={Wallet} />
          <StatCard label={t('paymentsAdmin.statVerifiedThisMonth')} value={formatMoney(summary?.verifiedThisMonthMinor ?? 0)} icon={ShieldCheck} />
          <StatCard label={t('paymentsAdmin.statPendingConfirmations')} value={formatMoney(summary?.pendingConfirmationMinor ?? 0)} icon={Clock} subtitle={t('paymentsAdmin.paymentCount', { count: summary?.pendingConfirmationCount ?? 0, plural: summary?.pendingConfirmationCount === 1 ? '' : 's' })} />
          <StatCard label={t('paymentsAdmin.statOutstandingBalance')} value={formatMoney(summary?.outstandingBalanceMinor ?? 0)} icon={AlertCircle} />
          <StatCard label={t('paymentsAdmin.statOverdueClients')} value={summary?.overdueClientCount ?? 0} icon={Users2} />
          <StatCard label={t('paymentsAdmin.statDisputedPayments')} value={summary?.disputedCount ?? 0} icon={MessageCircleWarning} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder={t('paymentsAdmin.searchByClient')}
              className="pl-8 pr-3 py-2 rounded-lg text-sm border w-56"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="">{t('paymentsAdmin.allStatuses')}</option>
            <option value="PENDING_CONFIRMATION">{t('payments.pendingConfirmation')}</option>
            <option value="VERIFIED">{t('payments.verified')}</option>
            <option value="DISPUTED">{t('payments.disputed')}</option>
            <option value="CANCELLED">{t('payments.cancelled')}</option>
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <input type="checkbox" className="accent-white" checked={thisMonthOnly} onChange={e => setThisMonthOnly(e.target.checked)} />
            {t('paymentsAdmin.thisMonthOnly')}
          </label>
        </div>

        {loading ? <LoadingSpinner fullPage /> : filteredPayments.length === 0 ? (
          <EmptyState title={t('paymentsAdmin.noPaymentsYet')} icon={Wallet}
            description={t('paymentsAdmin.noPaymentsYetDesc')}
            action={<Button onClick={() => openNewPayment()}><Plus size={14} />{t('paymentsAdmin.newPayment')}</Button>} />
        ) : (
          <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {[t('paymentsAdmin.colClient'), t('paymentsAdmin.colAmount'), t('paymentsAdmin.colPaymentDate'), t('paymentsAdmin.colMethod'), t('paymentsAdmin.colPeriods'), t('paymentsAdmin.colStatus'), t('paymentsAdmin.colCreatedBy'), ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filteredPayments.map(p => {
                  const client = p.clientId as IClient;
                  const createdBy = p.createdBy as { name?: string } | string;
                  return (
                    <tr key={p._id} className="hover:bg-zinc-900 transition-colors cursor-pointer" onClick={() => openView(p)}>
                      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{client?.name}</td>
                      <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{formatMoney(p.amountMinor, p.currency)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{PAYMENT_METHOD_LABELS[p.paymentMethod]}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.monthCount', { count: p.allocations.length, plural: p.allocations.length === 1 ? '' : 's' })}</td>
                      <td className="px-4 py-3"><VerificationStatusBadge status={p.verificationStatus} /></td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{typeof createdBy === 'string' ? '—' : createdBy?.name ?? '—'}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => copyLink(p._id)} title={t('paymentsAdmin.copyVerificationLink')} className="p-1.5 rounded" style={{ color: 'var(--text-muted)' }}><Link2 size={13} /></button>
                          {p.verificationStatus === 'DISPUTED' && (
                            <button onClick={() => { setResolveTarget(p); setResolveAction('RESENT'); }} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">{t('paymentsAdmin.resolve')}</button>
                          )}
                          {p.verificationStatus !== 'CANCELLED' && (
                            <button onClick={() => setCancelTarget(p)} title={t('paymentsAdmin.cancelPayment')} className="p-1.5 rounded text-red-400 hover:text-red-300"><Ban size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── New Payment Modal ─────────────────────────────────────────── */}
      <Modal open={showNewPayment} onClose={() => setShowNewPayment(false)} title={createdPayment ? t('paymentsAdmin.paymentRecorded') : t('paymentsAdmin.newPaymentTitle')} size="lg"
        footer={createdPayment ? (
          <div className="flex items-center justify-between w-full flex-wrap gap-3">
            <Button variant="secondary" onClick={() => copyLink(createdPayment._id)}><Link2 size={13} />{t('paymentsAdmin.copyVerificationLink')}</Button>
            <Button onClick={() => setShowNewPayment(false)}>{t('paymentsAdmin.done')}</Button>
          </div>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setShowNewPayment(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreatePayment} loading={savingPayment}>{t('paymentsAdmin.save')}</Button>
          </>
        )}>
        {createdPayment ? (
          <div className="space-y-3 text-center py-4">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
              <ShieldCheck size={22} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('paymentsAdmin.paymentRecordedSuccess')}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.waitingForConfirmation')}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoney(createdPayment.amountMinor, createdPayment.currency)}</p>
          </div>
        ) : (
          <form onSubmit={handleCreatePayment} className="space-y-4">
            <Select label={t('paymentsAdmin.clientRequired')} value={form.clientId}
              onChange={e => { setForm(p => ({ ...p, clientId: e.target.value })); recomputeSuggestion(e.target.value, form.amount); }}
              options={[{ value: '', label: t('paymentsAdmin.selectClient') }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label={t('paymentsAdmin.amountRequired')} type="number" step="0.01" min="0.01" value={form.amount}
                onChange={f('amount')} onBlur={() => recomputeSuggestion(form.clientId, form.amount)} required placeholder="300.00" />
              <Input label={t('paymentsAdmin.currency')} value={form.currency} onChange={f('currency')} placeholder="EUR" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label={t('paymentsAdmin.paymentDateRequired')} type="date" value={form.paymentDate} onChange={f('paymentDate')} required />
              <Select label={t('paymentsAdmin.paymentMethod')} value={form.paymentMethod} onChange={f('paymentMethod')}
                options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))} />
            </div>
            <Select label={t('paymentsAdmin.destinationWallet')} value={form.destinationWalletId} onChange={f('destinationWalletId')}
              options={[{ value: '', label: t('paymentsAdmin.companyBankDefault') }, ...wallets.map(w => ({ value: w._id, label: w.name }))]} />
            <Input label={t('paymentsAdmin.reference')} value={form.reference} onChange={f('reference')} placeholder={t('paymentsAdmin.referencePlaceholder')} />
            <Textarea label={t('paymentsAdmin.notes')} value={form.notes} onChange={f('notes')} rows={2} />

            {form.clientId && (
              <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.suggestedAllocation')}</p>
                {periods.length === 0 && rows.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.enterAmountForSuggestion')}</p>
                ) : rows.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.noOutstandingMonths')}</p>
                ) : (
                  <div className="space-y-2">
                    {rows.map(r => (
                      <div key={r.billingPeriodId} className="flex items-center justify-between gap-3">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                        <input type="number" step="0.01" min="0" value={r.amount} onChange={e => updateRowAmount(r.billingPeriodId, e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          className="w-28 px-2 py-1 rounded text-sm text-right border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.totalAllocated')}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatMoney(toMinorUnits(allocatedTotal), form.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.remainingCredit')}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatMoney(toMinorUnits(creditRemaining), form.currency)}</span>
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* ─── Payment Detail Modal ──────────────────────────────────────── */}
      <Modal open={!!viewPayment} onClose={() => setViewPayment(null)} title={t('paymentsAdmin.paymentDetails')} size="lg"
        footer={viewPayment && viewPayment.verificationStatus !== 'CANCELLED' ? (
          <>
            <Button variant="danger" onClick={() => { setCancelTarget(viewPayment); }}><Ban size={13} />{t('paymentsAdmin.cancelPayment')}</Button>
            <Button onClick={handleSaveEdit} loading={savingEdit}>{t('paymentsAdmin.saveChanges')}</Button>
          </>
        ) : undefined}>
        {viewPayment && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(viewPayment.clientId as IClient)?.name}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoney(viewPayment.amountMinor, viewPayment.currency)}</p>
              </div>
              <VerificationStatusBadge status={viewPayment.verificationStatus} />
            </div>

            {viewPayment.verificationStatus === 'DISPUTED' && (
              <div className="rounded-lg border p-3 space-y-1" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}>
                <p className="text-xs font-semibold text-red-400">{t('paymentsAdmin.disputeLabel', { reason: DISPUTE_REASON_LABELS[viewPayment.disputeReason ?? 'OTHER'] })}</p>
                {viewPayment.disputeMessage && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{viewPayment.disputeMessage}</p>}
                <button onClick={() => { setResolveTarget(viewPayment); setResolveAction('RESENT'); }} className="text-xs font-medium text-white underline mt-1">{t('paymentsAdmin.resolveDisputeArrow')}</button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label={t('paymentsAdmin.amountRequired').replace(' *', '')} type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} disabled={viewPayment.verificationStatus === 'CANCELLED'} />
              <Input label={t('paymentsAdmin.currency')} value={editForm.currency} onChange={e => setEditForm(p => ({ ...p, currency: e.target.value }))} disabled={viewPayment.verificationStatus === 'CANCELLED'} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label={t('paymentsAdmin.paymentDateRequired').replace(' *', '')} type="date" value={editForm.paymentDate} onChange={e => setEditForm(p => ({ ...p, paymentDate: e.target.value }))} disabled={viewPayment.verificationStatus === 'CANCELLED'} />
              <Select label={t('paymentsAdmin.paymentMethod')} value={editForm.paymentMethod} onChange={e => setEditForm(p => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))}
                options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))} disabled={viewPayment.verificationStatus === 'CANCELLED'} />
            </div>
            <Input label={t('paymentsAdmin.reference')} value={editForm.reference} onChange={e => setEditForm(p => ({ ...p, reference: e.target.value }))} disabled={viewPayment.verificationStatus === 'CANCELLED'} />
            <Textarea label={t('paymentsAdmin.notes')} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} disabled={viewPayment.verificationStatus === 'CANCELLED'} />

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.allocation')}</p>
              <div className="space-y-1.5">
                {viewPayment.allocations.map((a, i) => {
                  const period = a.billingPeriodId as IBillingPeriod;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>{typeof period === 'object' ? formatMonthYear(period.month, period.year) : t('paymentsAdmin.billingPeriodFallback')}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{formatMoney(a.amountMinor, viewPayment.currency)}</span>
                    </div>
                  );
                })}
                {viewPayment.creditAmountMinor > 0 && (
                  <div className="flex items-center justify-between text-sm pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.unallocatedCredit')}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatMoney(viewPayment.creditAmountMinor, viewPayment.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <p>{t('paymentsAdmin.createdByLine', { name: typeof viewPayment.createdBy === 'object' ? (viewPayment.createdBy as { name: string }).name : '—', date: formatDate(viewPayment.createdAt) })}</p>
              {viewPayment.verifiedAt && <p>{t('paymentsAdmin.verifiedLine', { date: formatDate(viewPayment.verifiedAt) })}</p>}
            </div>

            {viewPayment.editHistory && viewPayment.editHistory.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{t('paymentsAdmin.editHistory')}</p>
                <div className="space-y-1">
                  {viewPayment.editHistory.map((h, i) => (
                    <p key={i} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('paymentsAdmin.editHistoryLine', { date: formatDate(h.editedAt), fields: Object.keys(h.changes).join(', ') })}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ─── Resolve Dispute Modal ─────────────────────────────────────── */}
      <Modal open={!!resolveTarget} onClose={() => setResolveTarget(null)} title={t('paymentsAdmin.resolveDispute')} size="md"
        footer={<><Button variant="secondary" onClick={() => setResolveTarget(null)}>{t('common.cancel')}</Button><Button onClick={handleResolveDispute} loading={resolving}>{t('paymentsAdmin.resolve')}</Button></>}>
        {resolveTarget && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{DISPUTE_REASON_LABELS[resolveTarget.disputeReason ?? 'OTHER']}</p>
              {resolveTarget.disputeMessage && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{resolveTarget.disputeMessage}</p>}
            </div>
            <div className="space-y-2">
              {[
                { value: 'RESENT', label: t('paymentsAdmin.resendForConfirmation'), desc: t('paymentsAdmin.resendForConfirmationDesc') },
                { value: 'DISMISSED', label: t('paymentsAdmin.markAsVerified'), desc: t('paymentsAdmin.markAsVerifiedDesc') },
                { value: 'CANCELLED', label: t('paymentsAdmin.cancelThisPayment'), desc: t('paymentsAdmin.cancelThisPaymentDesc') },
              ].map(opt => (
                <label key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer" style={{ borderColor: resolveAction === opt.value ? 'var(--text-primary)' : 'var(--border)' }}>
                  <input type="radio" className="accent-white mt-0.5" checked={resolveAction === opt.value} onChange={() => setResolveAction(opt.value as typeof resolveAction)} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <Textarea label={t('paymentsAdmin.internalNoteOptional')} value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={2} />
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancelPayment} loading={cancelling}
        title={t('paymentsAdmin.cancelPayment')} confirmLabel={t('paymentsAdmin.cancelPayment')}
        message={cancelTarget?.verificationStatus === 'VERIFIED'
          ? t('paymentsAdmin.cancelPaymentConfirmVerified')
          : t('paymentsAdmin.cancelPaymentConfirm')} />
    </>
  );
}
