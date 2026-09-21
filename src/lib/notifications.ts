/**
 * Reusable notification logic — currently used by the booking workflow, but
 * deliberately not booking-specific in shape so future events (a new
 * dispute, a new worker task, etc.) can reuse getCoFounderEmails/sendEmail
 * without duplicating lookup logic. Delivery itself goes through
 * '@/lib/email', which no-ops safely until SMTP is configured.
 */
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';
import { SHOOT_TYPE_LABELS, type ShootType } from '@/lib/booking';

function formatDateLabel(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

export async function getCoFounderEmails(): Promise<string[]> {
  await connectDB();
  const ceos = await User.find({ role: 'CEO', status: 'ACTIVE' }).select('email');
  return ceos.map((u) => u.email).filter(Boolean);
}

export async function getClientPortalEmail(clientId: string): Promise<string | null> {
  await connectDB();
  const account = await User.findOne({ clientId, role: 'CLIENT', status: 'ACTIVE' }).select('email');
  return account?.email ?? null;
}

interface BookingLike {
  date: Date | string;
  startTime: string;
  endTime: string;
  shootType: ShootType;
  notes?: string;
}

/** Notifies both Co-Founders the moment a client submits a booking request. */
export async function notifyBookingRequested(booking: BookingLike, clientName: string): Promise<void> {
  const emails = await getCoFounderEmails();
  if (emails.length === 0) return;

  const subject = `New booking request — ${clientName}`;
  const text = [
    `${clientName} requested a shoot booking.`,
    '',
    `Date: ${formatDateLabel(booking.date)}`,
    `Time: ${booking.startTime}–${booking.endTime}`,
    `Type: ${SHOOT_TYPE_LABELS[booking.shootType]}`,
    booking.notes ? `Notes: ${booking.notes}` : '',
    '',
    'Review it in SMMO under Bookings.',
  ].filter(Boolean).join('\n');

  await Promise.all(emails.map((email) => sendEmail(email, subject, text)));
}

export type BookingDecision = 'APPROVED' | 'REJECTED' | 'SUGGESTED';

/** Notifies the client the moment Altin or Ethnik acts on their booking request. */
export async function notifyBookingDecision(
  booking: BookingLike,
  clientId: string,
  decision: BookingDecision,
  extra?: { rejectionReason?: string; suggestedDate?: Date | string; suggestedStartTime?: string; suggestedEndTime?: string }
): Promise<void> {
  const email = await getClientPortalEmail(clientId);
  if (!email) return;

  let subject: string;
  let text: string;

  if (decision === 'APPROVED') {
    subject = 'Your booking request was approved';
    text = `Great news — your booking request for ${formatDateLabel(booking.date)}, ${booking.startTime}–${booking.endTime} has been approved.`;
  } else if (decision === 'REJECTED') {
    subject = 'Your booking request could not be approved';
    text = [
      `Your booking request for ${formatDateLabel(booking.date)}, ${booking.startTime}–${booking.endTime} could not be approved.`,
      extra?.rejectionReason ? `Reason: ${extra.rejectionReason}` : '',
      'Feel free to request a different time.',
    ].filter(Boolean).join('\n');
  } else {
    subject = 'Horizonte suggested a different time for your booking';
    text = [
      `Your requested time (${formatDateLabel(booking.date)}, ${booking.startTime}–${booking.endTime}) isn't available.`,
      extra?.suggestedDate
        ? `Suggested instead: ${formatDateLabel(extra.suggestedDate)}, ${extra.suggestedStartTime}–${extra.suggestedEndTime}`
        : '',
      'Log in to SMMO to accept or decline the suggestion.',
    ].filter(Boolean).join('\n');
  }

  await sendEmail(email, subject, text);
}
