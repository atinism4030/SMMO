'use client';

import Topbar from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/Card';
import { useTranslation } from '@/components/providers/LanguageProvider';
import { formatDate } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import {
  Users, Wallet, ShieldCheck, AlertCircle, TrendingDown, Scale, CalendarCheck,
  Clock, CheckSquare, Eye, PiggyBank, ArrowRight, CalendarClock,
} from 'lucide-react';
import Link from 'next/link';
import type { ITask, IClient, IBooking, IWallet } from '@/types';

export interface DashboardViewData {
  firstName: string;
  activeClientsCount: number;
  billingSummary: {
    monthlyExpectedRevenueMinor: number;
    verifiedThisMonthMinor: number;
    outstandingBalanceMinor: number;
    pendingConfirmationCount: number;
  };
  financeSummary: { totalExpenseMinor: number; netMinor: number; wallets: IWallet[] };
  openTasksCount: number;
  inReviewCount: number;
  todayTasks: ITask[];
  upcomingDeadlines: ITask[];
  upcomingBookings: IBooking[];
  pendingBookingsCount: number;
  clientsWithoutBoard: { _id: string; name: string }[];
  overdueClients: { id: string; name: string }[];
}

export default function DashboardView({ data }: { data: DashboardViewData }) {
  const { t } = useTranslation();
  const wallets = data.financeSummary.wallets;

  return (
    <>
      <Topbar title={t('dashboard.welcome', { name: data.firstName })} subtitle={t('dashboard.subtitle')} />
      <div className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* Overview */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{t('dashboard.overview')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('dashboard.activeClients')} value={data.activeClientsCount} icon={Users} />
            <StatCard label={t('dashboard.expectedThisMonth')} value={formatMoney(data.billingSummary.monthlyExpectedRevenueMinor)} icon={Wallet} />
            <StatCard label={t('dashboard.verifiedThisMonth')} value={formatMoney(data.billingSummary.verifiedThisMonthMinor)} icon={ShieldCheck} />
            <StatCard label={t('dashboard.outstanding')} value={formatMoney(data.billingSummary.outstandingBalanceMinor)} icon={AlertCircle} />
            <StatCard label={t('dashboard.expensesThisMonth')} value={formatMoney(data.financeSummary.totalExpenseMinor)} icon={TrendingDown} />
            <StatCard label={t('dashboard.netThisMonth')} value={formatMoney(data.financeSummary.netMinor)} icon={Scale} />
            <StatCard label={t('dashboard.openTasks')} value={data.openTasksCount} icon={CheckSquare} />
            <StatCard label={t('dashboard.inReview')} value={data.inReviewCount} icon={Eye} />
            <StatCard label={t('dashboard.pendingBookings')} value={data.pendingBookingsCount} icon={CalendarClock} />
            <StatCard label={t('dashboard.pendingConfirmations')} value={data.billingSummary.pendingConfirmationCount} icon={Clock} />
          </div>
        </section>

        {/* Financial snapshot */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('dashboard.financialSnapshot')}</h2>
            <Link href="/finance" className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>{t('nav.finances')} <ArrowRight size={11} /></Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {wallets.map((w) => (
              <div key={w._id.toString()} className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{w.name}</p>
                  {w.type === 'SAVINGS' ? <PiggyBank size={13} style={{ color: 'var(--text-muted)' }} /> : <Wallet size={13} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoney(w.balanceMinor)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Today & upcoming */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('dashboard.todaysTasks')}</h3>
              <Link href="/tasks" className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('common.viewAll')}</Link>
            </div>
            {data.todayTasks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('dashboard.nothingDueToday')}</p>
            ) : (
              <div className="space-y-2">
                {data.todayTasks.map((t2) => (
                  <Link key={t2._id} href={`/tasks/${t2._id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{t2.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(t2.clientId as IClient)?.name}</p>
                    </div>
                    <CheckSquare size={13} style={{ color: 'var(--text-muted)' }} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming deadlines */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('dashboard.upcomingDeadlines')}</h3>
              <Link href="/tasks" className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('common.viewAll')}</Link>
            </div>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('dashboard.noDeadlines')}</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingDeadlines.map((t2) => (
                  <Link key={t2._id} href={`/tasks/${t2._id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{t2.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(t2.clientId as IClient)?.name}</p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatDate(t2.deadline)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming bookings */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('dashboard.upcomingBookings')}</h3>
              <Link href="/bookings" className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('common.viewAll')}</Link>
            </div>
            {data.upcomingBookings.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('dashboard.noUpcomingBookings')}</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingBookings.map((b) => (
                  <div key={b._id} className="flex items-center gap-3 p-2 rounded-lg">
                    <CalendarCheck size={14} style={{ color: 'var(--text-muted)' }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{(b.clientId as IClient)?.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(b.date)} · {b.startTime}–{b.endTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client attention */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('dashboard.needsAttention')}</h3>
            <div className="space-y-3">
              {data.overdueClients.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><AlertCircle size={12} />{t('dashboard.overduePayment')}</p>
                  {data.overdueClients.slice(0, 3).map((c) => (
                    <Link key={c.id} href={`/clients/${c.id}`} className="block text-xs py-1 truncate hover:underline" style={{ color: 'var(--text-muted)' }}>{c.name}</Link>
                  ))}
                </div>
              )}
              {data.clientsWithoutBoard.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><Eye size={12} />{t('dashboard.noBoardThisMonth')}</p>
                  {data.clientsWithoutBoard.slice(0, 3).map((c) => (
                    <Link key={c._id} href={`/clients/${c._id}`} className="block text-xs py-1 truncate hover:underline" style={{ color: 'var(--text-muted)' }}>{c.name}</Link>
                  ))}
                </div>
              )}
              {data.overdueClients.length === 0 && data.clientsWithoutBoard.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('dashboard.nothingNeedsAttention')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
