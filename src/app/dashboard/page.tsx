import AppLayout from '@/components/layout/AppLayout';
import Topbar from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/Card';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { formatCurrency, formatDate, getTaskStatusColor, getTaskStatusLabel } from '@/lib/utils';
import Client from '@/models/Client';
import Task from '@/models/Task';
import Payment from '@/models/Payment';
import ContentItem from '@/models/ContentItem';
import ActivityLog from '@/models/ActivityLog';
import {
  Users, DollarSign, AlertCircle, Clock, CheckCircle,
  Calendar, BarChart3, TrendingUp, Plus
} from 'lucide-react';
import Link from 'next/link';
import type { TaskStatus } from '@/types';

async function getDashboardData() {
  await connectDB();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [activeClients, monthlyPayments, overdueTasks, todayTasks, needsFixCount, scheduledThisWeek, recentActivity, tasksByStatus] = await Promise.all([
    Client.countDocuments({ status: 'ACTIVE' }),
    Payment.find({ month, year }),
    Task.find({ scheduledDate: { $lt: now }, status: { $ne: 'POSTED' } }).populate('clientId', 'name').sort({ scheduledDate: 1 }).limit(5),
    Task.find({
      scheduledDate: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) },
      status: { $ne: 'POSTED' },
    }).populate('clientId', 'name').limit(5),
    Task.countDocuments({ status: 'NEEDS_FIX' }),
    ContentItem.countDocuments({ scheduledDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }, status: 'SCHEDULED' }),
    ActivityLog.find({}).populate('userId', 'name').sort({ createdAt: -1 }).limit(8),
    Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const totalRevenue = monthlyPayments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const pendingPayments = monthlyPayments.filter(p => p.status === 'UNPAID').length;
  const latePayments = monthlyPayments.filter(p => p.status === 'LATE').length;

  return { activeClients, totalRevenue, pendingPayments, latePayments, overdueTasks, todayTasks, needsFixCount, scheduledThisWeek, recentActivity, tasksByStatus };
}

export default async function DashboardPage() {
  await getSession();
  const data = await getDashboardData();

  const statusMap = Object.fromEntries(data.tasksByStatus.map((s: { _id: string; count: number }) => [s._id, s.count]));

  const quickActions = [
    { label: 'Add Client', href: '/clients', icon: Users, color: 'text-zinc-400' },
    { label: 'Create Board', href: '/boards', icon: Calendar, color: 'text-zinc-400' },
    { label: 'Create Task', href: '/tasks', icon: CheckCircle, color: 'text-zinc-400' },
    { label: 'Add Payment', href: '/payments', icon: DollarSign, color: 'text-zinc-400' },
    { label: 'Add Report', href: '/reports', icon: BarChart3, color: 'text-zinc-400' },
  ];

  return (
    <AppLayout requiredRole="CEO">
      <Topbar title="Dashboard" subtitle="Overview of your agency" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Clients" value={data.activeClients} icon={Users} iconColor="text-zinc-400" />
          <StatCard label="Monthly Revenue" value={formatCurrency(data.totalRevenue)} icon={DollarSign} iconColor="text-zinc-400" />
          <StatCard label="Pending Payments" value={data.pendingPayments} icon={Clock} iconColor="text-zinc-400" subtitle={`${data.latePayments} late`} />
          <StatCard label="Needs Fix" value={data.needsFixCount} icon={AlertCircle} iconColor="text-zinc-400" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Due Today" value={(data.todayTasks as unknown[]).length} icon={Calendar} iconColor="text-zinc-400" />
          <StatCard label="Overdue Tasks" value={(data.overdueTasks as unknown[]).length} icon={AlertCircle} iconColor="text-zinc-400" />
          <StatCard label="Scheduled This Week" value={data.scheduledThisWeek} icon={TrendingUp} iconColor="text-zinc-400" />
          <StatCard label="Total Open Tasks" value={Object.values(statusMap).reduce((a: number, b) => a + (b as number), 0)} icon={CheckCircle} iconColor="text-zinc-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Status Overview */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Tasks by Status</h3>
            <div className="space-y-2.5">
              {(['CONTENT_PREPARATION', 'QUALITY_ASSURANCE', 'POST_VERIFIED', 'READY_TO_POST', 'POSTED', 'NEEDS_FIX'] as TaskStatus[]).map((status) => {
                const count = statusMap[status] ?? 0;
                const total = Object.values(statusMap).reduce((a: number, b) => a + (b as number), 0) || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{getTaskStatusLabel(status)}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                      <div className={`h-1.5 rounded-full transition-all ${getTaskStatusColor(status).split(' ')[0].replace('bg-', 'bg-').replace('/20', '/60')}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Overdue Tasks</h3>
              <Link href="/tasks?filter=overdue" className="text-xs text-zinc-500 hover:text-white">View all</Link>
            </div>
            {(data.overdueTasks as unknown[]).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No overdue tasks!</p>
            ) : (
              <div className="space-y-2">
                {(data.overdueTasks as unknown as Array<{ _id: string; title: string; deadline?: Date; clientId?: { name: string } }>).slice(0, 4).map((task) => (
                  <Link key={task._id} href={`/tasks/${task._id}`} className="block p-2.5 rounded-lg hover:bg-zinc-900 transition-colors">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(task.clientId as { name: string } | undefined)?.name}</span>
                      <span className="text-xs text-red-400">{formatDate(task.deadline)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-zinc-900"
                  >
                    <div className="p-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                      <Icon size={14} className={action.color} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{action.label}</span>
                    <Plus size={12} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
          {(data.recentActivity as unknown[]).length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent activity.</p>
          ) : (
            <div className="space-y-0">
              {(data.recentActivity as unknown as Array<{ _id: string; message: string; createdAt: Date; userId?: { name: string } }>).map((log, i) => (
                <div key={log._id} className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: '#222222', color: 'white' }}>
                    {(log.userId as { name: string } | undefined)?.name?.charAt(0) ?? 'S'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{(log.userId as { name: string } | undefined)?.name ?? 'System'}</span>{' '}
                      {log.message}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
