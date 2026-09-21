import AppLayout from '@/components/layout/AppLayout';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { getAgencyBillingSummary } from '@/lib/billingService';
import { getFinanceDashboardSummary } from '@/lib/financeService';
import Client from '@/models/Client';
import Board from '@/models/Board';
import Task from '@/models/Task';
import Booking from '@/models/Booking';
import BillingPeriod from '@/models/BillingPeriod';
import DashboardView from './DashboardView';

async function getDashboardData() {
  await connectDB();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7Days = new Date(now.getTime() + 7 * 86_400_000);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [
    activeClientsCount,
    billingSummary,
    financeSummary,
    openTasksCount,
    inReviewCount,
    todayTasks,
    upcomingDeadlines,
    upcomingBookings,
    pendingBookingsCount,
    activeClients,
    boardsThisMonth,
    overduePeriods,
  ] = await Promise.all([
    Client.countDocuments({ status: 'ACTIVE' }),
    getAgencyBillingSummary(),
    getFinanceDashboardSummary({ from: startOfMonth, to: now }),
    Task.countDocuments({ status: { $ne: 'POSTED' } }),
    Task.countDocuments({ status: { $in: ['QUALITY_ASSURANCE', 'POST_VERIFIED'] } }),
    Task.find({
      scheduledDate: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) },
      status: { $ne: 'POSTED' },
    }).populate('clientId', 'name').limit(6),
    Task.find({ deadline: { $gte: now, $lte: in7Days }, status: { $ne: 'POSTED' } }).populate('clientId', 'name').sort({ deadline: 1 }).limit(6),
    Booking.find({ status: 'APPROVED', date: { $gte: now, $lte: in7Days } }).populate('clientId', 'name').sort({ date: 1, startTime: 1 }).limit(6),
    Booking.countDocuments({ status: 'PENDING' }),
    Client.find({ status: 'ACTIVE' }, 'name'),
    Board.find({ month: currentMonth, year: currentYear }, 'clientId'),
    BillingPeriod.find({
      status: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
      $or: [{ year: { $lt: currentYear } }, { year: currentYear, month: { $lt: currentMonth } }],
    }).populate('clientId', 'name'),
  ]);

  const clientIdsWithBoard = new Set(boardsThisMonth.map((b) => b.clientId.toString()));
  const clientsWithoutBoard = activeClients.filter((c) => !clientIdsWithBoard.has(c._id.toString()));

  const overdueClientMap = new Map<string, string>();
  for (const p of overduePeriods) {
    const client = p.clientId as unknown as { _id: { toString(): string }; name: string };
    if (client?._id) overdueClientMap.set(client._id.toString(), client.name);
  }

  return {
    activeClientsCount,
    billingSummary,
    financeSummary,
    openTasksCount,
    inReviewCount,
    todayTasks,
    upcomingDeadlines,
    upcomingBookings,
    pendingBookingsCount,
    clientsWithoutBoard: clientsWithoutBoard.map((c) => ({ _id: c._id.toString(), name: c.name })),
    overdueClients: Array.from(overdueClientMap.entries()).map(([id, name]) => ({ id, name })),
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  const data = await getDashboardData();

  // Server → Client Component props must be plain, serializable data — this
  // strips Mongoose documents/ObjectIds/Dates down to JSON, the same
  // conversion NextResponse.json() does for API routes.
  const serialized = JSON.parse(JSON.stringify({ ...data, firstName: session?.name?.split(' ')[0] ?? '' }));

  return (
    <AppLayout requiredRole="CEO">
      <DashboardView data={serialized} />
    </AppLayout>
  );
}
