'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { StatCard } from '@/components/ui/Card';
import { VerificationStatusBadge, BillingPeriodStatusBadge } from '@/components/ui/Badge';
import { formatDate, formatMonthYear } from '@/lib/utils';
import { formatMoney, toMinorUnits, fromMinorUnits, PAYMENT_METHOD_LABELS } from '@/lib/billing';
import type { IClientBilling, IBillingPeriod, IClientPayment } from '@/types';
import { Settings2, Wallet, Plus, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/components/providers/LanguageProvider';

interface BillingSummary {
  totalExpectedMinor: number;
  totalVerifiedPaidMinor: number;
  outstandingMinor: number;
  pendingConfirmationMinor: number;
  pendingConfirmationCount: number;
  disputedCount: number;
  totalCreditMinor: number;
  paidThroughMonth: { year: number; month: number } | null;
  nextDuePeriod: IBillingPeriod | null;
  unpaidMonthsCount: number;
}

const emptySettingsForm = {
  monthlyFee: '', currency: 'EUR', billingStartDate: '', billingDay: '1', paymentTerms: '', billingEnabled: true, notes: '',
};

export default function PaymentsTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [billing, setBilling] = useState<IClientBilling | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [periods, setPeriods] = useState<IBillingPeriod[]>([]);
  const [clientPayments, setClientPayments] = useState<IClientPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [bRes, pRes, payRes] = await Promise.all([
      fetch(`/api/clients/${clientId}/billing`),
      fetch(`/api/clients/${clientId}/billing-periods`),
      fetch(`/api/billing/payments?clientId=${clientId}`),
    ]);
    const [bd, pd, payd] = await Promise.all([bRes.json(), pRes.json(), payRes.json()]);
    setBilling(bd.billing ?? null);
    setSummary(bd.summary ?? null);
    setPeriods(pd.periods ?? []);
    setClientPayments(payd.payments ?? []);
    setLoading(false);
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { load(); }, [load]);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState(emptySettingsForm);
  const [savingSettings, setSavingSettings] = useState(false);

  function openSettings() {
    setSettingsForm({
      monthlyFee: billing ? fromMinorUnits(billing.monthlyFeeMinor).toFixed(2) : '',
      currency: billing?.currency ?? 'EUR',
      billingStartDate: billing?.billingStartDate ? billing.billingStartDate.split('T')[0] : new Date().toISOString().split('T')[0],
      billingDay: String(billing?.billingDay ?? 1),
      paymentTerms: billing?.paymentTerms ?? '',
      billingEnabled: billing?.billingEnabled ?? true,
      notes: billing?.notes ?? '',
    });
    setShowSettings(true);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/billing`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyFeeMinor: toMinorUnits(parseFloat(settingsForm.monthlyFee) || 0),
          currency: settingsForm.currency,
          billingStartDate: settingsForm.billingStartDate,
          billingDay: parseInt(settingsForm.billingDay),
          paymentTerms: settingsForm.paymentTerms || undefined,
          billingEnabled: settingsForm.billingEnabled,
          notes: settingsForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('paymentsTab.failedToSaveBillingSettings')); return; }
      toast.success(t('paymentsTab.billingSettingsSaved'));
      setShowSettings(false);
      load();
    } finally { setSavingSettings(false); }
  }

  if (loading) return <LoadingSpinner fullPage />;

  if (!billing || !billing.billingEnabled) {
    return (
      <>
        <EmptyState
          title={t('paymentsTab.notSetUpYet')}
          description={t('paymentsTab.notSetUpYetDesc')}
          icon={Wallet}
          action={<Button onClick={openSettings}><Settings2 size={14} />{t('paymentsTab.setUpPayments')}</Button>}
        />
        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} form={settingsForm} setForm={setSettingsForm} onSave={saveSettings} saving={savingSettings} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
          <StatCard label={t('paymentsTab.monthlyFee')} value={formatMoney(billing.monthlyFeeMinor, billing.currency)} icon={Wallet} />
          <StatCard label={t('paymentsTab.outstandingBalance')} value={formatMoney(summary?.outstandingMinor ?? 0, billing.currency)} />
          <StatCard label={t('paymentsTab.pendingConfirmation')} value={formatMoney(summary?.pendingConfirmationMinor ?? 0, billing.currency)} subtitle={t('paymentsTab.paymentCount', { count: summary?.pendingConfirmationCount ?? 0 })} />
          <StatCard label={t('paymentsTab.totalVerifiedPaid')} value={formatMoney(summary?.totalVerifiedPaidMinor ?? 0, billing.currency)} />
          <StatCard label={t('paymentsTab.paidThrough')} value={summary?.paidThroughMonth ? formatMonthYear(summary.paidThroughMonth.month, summary.paidThroughMonth.year) : t('paymentsTab.notYet')} />
          <StatCard label={t('paymentsTab.unpaidMonths')} value={summary?.unpaidMonthsCount ?? 0} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={openSettings}><Settings2 size={13} />{t('paymentsTab.paymentSettings')}</Button>
        <Link href={`/payments?newPayment=${clientId}`}><Button size="sm"><Plus size={13} />{t('paymentsTab.recordPayment')}</Button></Link>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('paymentsTab.monthlyPaymentHistory')}</h3>
        {periods.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('paymentsTab.noBillingPeriodsYet')}</p>
        ) : (
          <div className="rounded-xl border overflow-hidden divide-y" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {periods.map(p => (
              <div key={p._id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatMonthYear(p.month, p.year)}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatMoney(p.verifiedPaidAmountMinor, p.currency)} / {formatMoney(p.expectedAmountMinor, p.currency)}</span>
                <BillingPeriodStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('paymentsTab.paymentHistory')}</h3>
        {clientPayments.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('paymentsTab.noPaymentsYet')}</p>
        ) : (
          <div className="rounded-xl border overflow-hidden divide-y" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {clientPayments.map(p => (
              <div key={p._id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)}</span>
                <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{formatMoney(p.amountMinor, p.currency)}</span>
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{PAYMENT_METHOD_LABELS[p.paymentMethod]}</span>
                <VerificationStatusBadge status={p.verificationStatus} />
                <Link href={`/payments`} className="text-xs" style={{ color: 'var(--text-muted)' }}><ExternalLink size={12} /></Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} form={settingsForm} setForm={setSettingsForm} onSave={saveSettings} saving={savingSettings} />
    </div>
  );
}

function SettingsModal({
  open, onClose, form, setForm, onSave, saving,
}: {
  open: boolean;
  onClose: () => void;
  form: typeof emptySettingsForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptySettingsForm>>;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const f = (field: keyof typeof emptySettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title={t('paymentsTab.paymentSettings')} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={onSave} loading={saving}>{t('paymentsTab.save')}</Button></>}>
      <form onSubmit={onSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label={t('paymentsTab.monthlyFeeRequired')} type="number" step="0.01" min="0" value={form.monthlyFee} onChange={f('monthlyFee')} required placeholder="300.00" />
          <Input label={t('paymentsTab.currency')} value={form.currency} onChange={f('currency')} placeholder="EUR" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label={t('paymentsTab.billingStartDateRequired')} type="date" value={form.billingStartDate} onChange={f('billingStartDate')} required />
          <Select label={t('paymentsTab.billingDay')} value={form.billingDay} onChange={f('billingDay')}
            options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: t('paymentsTab.dayOfMonth', { day: i + 1 }) }))} />
        </div>
        <Input label={t('paymentsTab.paymentTerms')} value={form.paymentTerms} onChange={f('paymentTerms')} placeholder={t('paymentsTab.paymentTermsPlaceholder')} />
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" className="accent-white" checked={form.billingEnabled} onChange={e => setForm(p => ({ ...p, billingEnabled: e.target.checked }))} />
          {t('paymentsTab.paymentsEnabledForClient')}
        </label>
        <Input label={t('paymentsTab.notes')} value={form.notes} onChange={f('notes')} placeholder={t('paymentsTab.notesPlaceholder')} />
      </form>
    </Modal>
  );
}
