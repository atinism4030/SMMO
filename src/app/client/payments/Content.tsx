'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { StatCard } from '@/components/ui/Card';
import { VerificationStatusBadge, BillingPeriodStatusBadge } from '@/components/ui/Badge';
import { formatDate, formatMonthYear } from '@/lib/utils';
import { formatMoney, PAYMENT_METHOD_LABELS } from '@/lib/billing';
import type { IBillingPeriod, IClientPayment } from '@/types';
import { Wallet, CalendarClock, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/components/providers/LanguageProvider';

interface BillingSummary {
  totalVerifiedPaidMinor: number;
  outstandingMinor: number;
  paidThroughMonth: { year: number; month: number } | null;
  unpaidMonthsCount: number;
}

export default function ClientPaymentsContent() {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState<string | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [periods, setPeriods] = useState<IBillingPeriod[]>([]);
  const [payments, setPayments] = useState<IClientPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const meRes = await fetch('/api/auth/me');
    const me = await meRes.json();
    const id = typeof me.user?.clientId === 'object' ? me.user.clientId?._id : me.user?.clientId;
    setClientId(id ?? null);

    const [bRes, pRes, payRes] = await Promise.all([
      id ? fetch(`/api/clients/${id}/billing`) : Promise.resolve(null),
      id ? fetch(`/api/clients/${id}/billing-periods`) : Promise.resolve(null),
      fetch('/api/billing/payments'),
    ]);
    const [bd, pd, payd] = await Promise.all([bRes?.json(), pRes?.json(), payRes.json()]);
    setSummary(bd?.summary ?? null);
    setPeriods(pd?.periods ?? []);
    setPayments(payd.payments ?? []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { load(); }, [load]);

  const pendingPayments = payments.filter((p) => p.verificationStatus === 'PENDING_CONFIRMATION');

  if (loading) return <><Topbar title={t('payments.title')} subtitle={t('payments.subtitleClient')} /><LoadingSpinner fullPage /></>;

  const notSetUp = !clientId || (!summary && periods.length === 0 && payments.length === 0);

  return (
    <>
      <Topbar title={t('payments.title')} subtitle={t('payments.subtitleClient')} />
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {notSetUp ? (
          <EmptyState title={t('payments.noBillingInfoYet')} description={t('payments.noBillingInfoYetDesc')} icon={Wallet} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label={t('payments.outstandingShort')} value={formatMoney(summary?.outstandingMinor ?? 0)} icon={Wallet} />
              <StatCard label={t('payments.paidThrough')} value={summary?.paidThroughMonth ? formatMonthYear(summary.paidThroughMonth.month, summary.paidThroughMonth.year) : t('payments.notYet')} icon={CalendarClock} />
              <StatCard label={t('payments.unpaidMonths')} value={summary?.unpaidMonthsCount ?? 0} />
            </div>

            {pendingPayments.length > 0 && (
              <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)' }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-amber-400" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {pendingPayments.length === 1 ? t('payments.needsReview') : t('payments.needsReviewPlural', { count: pendingPayments.length })}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('payments.paymentRecordedOn', { amount: formatMoney(pendingPayments[0].amountMinor, pendingPayments[0].currency), date: formatDate(pendingPayments[0].paymentDate) })}</p>
                    </div>
                  </div>
                  <Link href={`/client/payments/${pendingPayments[0]._id}`}><Button size="sm">{t('payments.review')}<ArrowRight size={13} /></Button></Link>
                </div>
              </div>
            )}

            {periods.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('payments.monthlyHistory')}</h3>
                <div className="rounded-xl border overflow-hidden divide-y" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  {periods.map((p) => {
                    const due = Math.max(p.expectedAmountMinor - p.verifiedPaidAmountMinor, 0);
                    return (
                      <div key={p._id} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatMonthYear(p.month, p.year)}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {due > 0 ? `${t('payments.amountDue')}: ${formatMoney(due, p.currency)}` : t('payments.fullyPaid')}
                        </span>
                        <BillingPeriodStatusBadge status={p.status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{t('payments.paymentHistory')}</h3>
              {payments.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('payments.noPaymentsRecordedYet')}</p>
              ) : (
                <div className="rounded-xl border overflow-hidden divide-y" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  {payments.map((p) => {
                    const actionable = p.verificationStatus === 'PENDING_CONFIRMATION' || p.verificationStatus === 'DISPUTED';
                    return (
                      <Link key={p._id} href={`/client/payments/${p._id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-900 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {actionable ? formatMoney(p.amountMinor, p.currency) : t('payments.paymentRecordedNoAmount')}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)} · {PAYMENT_METHOD_LABELS[p.paymentMethod]}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <VerificationStatusBadge status={p.verificationStatus} />
                          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
