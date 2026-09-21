import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import ClientPayment from '@/models/ClientPayment';
import Booking from '@/models/Booking';
import ContentItem from '@/models/ContentItem';
import { getClientBillingSummary } from '@/lib/billingService';
import ClientDashboardView from './ClientDashboardView';

async function getClientDashboardData(clientId: string) {
  await connectDB();
  const [client, summary, nextPending, nextBooking, contentTotal, contentCompleted] = await Promise.all([
    Client.findById(clientId).select('name'),
    getClientBillingSummary(clientId),
    ClientPayment.findOne({ clientId, verificationStatus: 'PENDING_CONFIRMATION' }).sort({ createdAt: 1 }),
    Booking.findOne({ clientId, status: 'APPROVED', date: { $gte: new Date() } }).sort({ date: 1, startTime: 1 }),
    ContentItem.countDocuments({ clientId }),
    ContentItem.countDocuments({ clientId, status: 'POSTED' }),
  ]);
  return { client, summary, nextPending, nextBooking, contentTotal, contentCompleted };
}

export default async function ClientDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'CLIENT' || !session.clientId) redirect('/login');

  const { client, summary, nextPending, nextBooking, contentTotal, contentCompleted } = await getClientDashboardData(session.clientId);
  const currency = nextPending?.currency ?? 'EUR';

  const serialized = JSON.parse(JSON.stringify({
    clientName: client?.name ?? 'there',
    currency,
    outstandingMinor: summary.outstandingMinor,
    pendingConfirmationMinor: summary.pendingConfirmationMinor,
    pendingConfirmationCount: summary.pendingConfirmationCount,
    unpaidMonthsCount: summary.unpaidMonthsCount,
    paidThroughMonth: summary.paidThroughMonth,
    nextPending: nextPending
      ? { _id: nextPending._id.toString(), amountMinor: nextPending.amountMinor, currency: nextPending.currency, paymentDate: nextPending.paymentDate }
      : null,
    nextBooking: nextBooking ? { date: nextBooking.date, startTime: nextBooking.startTime, endTime: nextBooking.endTime } : null,
    contentTotal,
    contentCompleted,
  }));

  return (
    <AppLayout requiredRole="CLIENT">
      <ClientDashboardView data={serialized} />
    </AppLayout>
  );
}
