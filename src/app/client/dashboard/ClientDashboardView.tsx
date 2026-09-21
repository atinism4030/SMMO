'use client';

import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { StatCard } from '@/components/ui/Card';
import { useTranslation } from '@/components/providers/LanguageProvider';
import { formatMoney } from '@/lib/billing';
import { formatDate, formatMonthYear } from '@/lib/utils';
import { Wallet, Clock, CalendarCheck, ArrowRight, CalendarDays, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export interface ClientDashboardData {
  clientName: string;
  currency: string;
  outstandingMinor: number;
  pendingConfirmationMinor: number;
  pendingConfirmationCount: number;
  unpaidMonthsCount: number;
  paidThroughMonth: { year: number; month: number } | null;
  nextPending: { _id: string; amountMinor: number; currency: string; paymentDate: string } | null;
  nextBooking: { date: string; startTime: string; endTime: string } | null;
  contentTotal: number;
  contentCompleted: number;
}

export default function ClientDashboardView({ data }: { data: ClientDashboardData }) {
  const { t } = useTranslation();

  return (
    <>
      <Topbar title={t('clientPortal.welcome', { name: data.clientName })} subtitle={t('clientPortal.dashboardSubtitle')} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={t('payments.outstandingBalance')} value={formatMoney(data.outstandingMinor, data.currency)} icon={Wallet} />
          <StatCard
            label={t('clientPortal.pendingConfirmation')}
            value={formatMoney(data.pendingConfirmationMinor, data.currency)}
            icon={Clock}
            subtitle={data.pendingConfirmationCount > 0 ? t('clientPortal.awaitingReview', { count: data.pendingConfirmationCount }) : undefined}
          />
          <StatCard label={t('payments.unpaidMonths')} value={data.unpaidMonthsCount} icon={AlertCircle} />
          <StatCard label={t('payments.paidThrough')} value={data.paidThroughMonth ? formatMonthYear(data.paidThroughMonth.month, data.paidThroughMonth.year) : t('payments.notYet')} icon={CalendarCheck} />
        </div>

        {data.nextPending && (
          <div className="rounded-xl border p-5 flex items-center justify-between gap-4 flex-wrap" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('payments.needsReview')}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {t('clientPortal.paymentRecordedOn', { amount: formatMoney(data.nextPending.amountMinor, data.nextPending.currency), date: formatDate(data.nextPending.paymentDate) })}
              </p>
            </div>
            <Link href={`/client/payments/${data.nextPending._id}`}>
              <Button>{t('payments.review')}<ArrowRight size={14} /></Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/client/content" className="rounded-xl border p-5 transition-colors hover:border-zinc-600" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={14} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('nav.contentCalendar')}</p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {data.contentTotal > 0 ? t('clientPortal.contentItemsPlanned', { total: data.contentTotal, completed: data.contentCompleted }) : t('clientPortal.nothingScheduledYet')}
            </p>
          </Link>
          <Link href="/client/booking" className="rounded-xl border p-5 transition-colors hover:border-zinc-600" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck size={14} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('clientPortal.nextShoot')}</p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {data.nextBooking ? t('clientPortal.upcomingShoot', { date: formatDate(data.nextBooking.date), start: data.nextBooking.startTime, end: data.nextBooking.endTime }) : t('clientPortal.noUpcomingShoot')}
            </p>
          </Link>
        </div>
      </div>
    </>
  );
}
