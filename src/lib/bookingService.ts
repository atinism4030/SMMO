/**
 * DB-backed booking orchestration. Pure calculations (overlap detection,
 * privacy masking) live in '@/lib/booking'; this module is the only place
 * that writes Booking documents, so conflict-checking and privacy are
 * enforced in exactly one place.
 */
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Booking, { type IBookingDoc } from '@/models/Booking';
import Client from '@/models/Client';
import ActivityLog from '@/models/ActivityLog';
import {
  normalizeDateOnly, isValidTimeString, hasConflict, toMaskedView,
  type ShootType, type BookingStatus, type MaskedBookingView,
} from '@/lib/booking';
import { notifyBookingRequested, notifyBookingDecision } from '@/lib/notifications';

export class BookingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = 'BookingError';
  }
}

async function log(userId: string, action: string, entityId: mongoose.Types.ObjectId | string, message: string) {
  await ActivityLog.create({ userId, action, entityType: 'Booking', entityId, message });
}

function validateWindow(date: unknown, startTime: string, endTime: string) {
  if (!date) throw new BookingError('Date is required');
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) throw new BookingError('Start and end time must be in HH:MM format');
  if (startTime >= endTime) throw new BookingError('End time must be after start time');
}

/**
 * Atomically checks for an overlapping APPROVED booking on the same day and
 * throws if one exists. Runs inside a transaction so two near-simultaneous
 * approvals of conflicting requests can't both succeed — the loser's
 * transaction sees the winner's write (or fails to commit against it) and
 * reports a conflict instead of double-booking Horizonte.
 */
async function assertNoConflict(
  date: Date,
  startTime: string,
  endTime: string,
  excludeBookingId: mongoose.Types.ObjectId | undefined,
  session: mongoose.ClientSession
) {
  const query: Record<string, unknown> = { date, status: 'APPROVED' };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const sameDayApproved = await Booking.find(query).session(session);
  if (hasConflict({ startTime, endTime }, sameDayApproved)) {
    throw new BookingError('This time conflicts with an already-approved booking', 409);
  }
}

// ─── Requests ───────────────────────────────────────────────────────────────

export interface CreateBookingRequestInput {
  clientId: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  shootType: ShootType;
  notes?: string;
  requestedBy: string;
}

export async function createBookingRequest(input: CreateBookingRequestInput): Promise<IBookingDoc> {
  await connectDB();
  const date = normalizeDateOnly(input.date);
  validateWindow(date, input.startTime, input.endTime);
  const client = await Client.findById(input.clientId);
  if (!client) throw new BookingError('Client not found', 404);

  const booking = await Booking.create({
    clientId: client._id,
    date,
    startTime: input.startTime,
    endTime: input.endTime,
    shootType: input.shootType || 'PHOTO_SHOOT',
    notes: input.notes?.trim() || undefined,
    status: 'PENDING',
    requestedBy: input.requestedBy,
  });

  await log(input.requestedBy, 'REQUEST', booking._id, `${client.name} requested a booking for ${input.startTime}-${input.endTime}`);
  await notifyBookingRequested(
    { date: booking.date, startTime: booking.startTime, endTime: booking.endTime, shootType: booking.shootType, notes: booking.notes },
    client.name
  );

  return booking;
}

/** CEO booking a slot directly on a client's behalf — goes straight to APPROVED (still conflict-checked). */
export async function createDirectBooking(input: CreateBookingRequestInput): Promise<IBookingDoc> {
  await connectDB();
  const date = normalizeDateOnly(input.date);
  validateWindow(date, input.startTime, input.endTime);
  const client = await Client.findById(input.clientId);
  if (!client) throw new BookingError('Client not found', 404);

  const mongoSession = await mongoose.startSession();
  try {
    let booking: IBookingDoc | undefined;
    await mongoSession.withTransaction(async () => {
      await assertNoConflict(date, input.startTime, input.endTime, undefined, mongoSession);
      const created = await Booking.create(
        [{
          clientId: client._id, date, startTime: input.startTime, endTime: input.endTime,
          shootType: input.shootType || 'PHOTO_SHOOT', notes: input.notes?.trim() || undefined,
          status: 'APPROVED', requestedBy: input.requestedBy, reviewedBy: input.requestedBy, reviewedAt: new Date(),
        }],
        { session: mongoSession }
      );
      booking = created[0];
    });
    if (!booking) throw new BookingError('Failed to create booking');
    await log(input.requestedBy, 'CREATE', booking._id, `Booked ${client.name} directly for ${input.startTime}-${input.endTime}`);
    return booking;
  } finally {
    await mongoSession.endSession();
  }
}

async function loadOr404(bookingId: string): Promise<IBookingDoc> {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new BookingError('Booking not found', 404);
  return booking;
}

export function assertBookingOwnership(booking: IBookingDoc, requiredClientId?: string) {
  if (requiredClientId && booking.clientId.toString() !== requiredClientId) {
    throw new BookingError('Forbidden', 403);
  }
}

// ─── CEO review actions ─────────────────────────────────────────────────────

export async function approveBooking(bookingId: string, ceoUserId: string): Promise<IBookingDoc> {
  await connectDB();
  const existing = await loadOr404(bookingId);
  if (existing.status !== 'PENDING' && existing.status !== 'SUGGESTED') {
    throw new BookingError('Only pending requests can be approved', 409);
  }

  const mongoSession = await mongoose.startSession();
  let booking: IBookingDoc | undefined;
  try {
    await mongoSession.withTransaction(async () => {
      const fresh = await Booking.findById(bookingId).session(mongoSession);
      if (!fresh || (fresh.status !== 'PENDING' && fresh.status !== 'SUGGESTED')) {
        throw new BookingError('Only pending requests can be approved', 409);
      }
      await assertNoConflict(fresh.date, fresh.startTime, fresh.endTime, fresh._id, mongoSession);
      fresh.status = 'APPROVED';
      fresh.reviewedBy = new mongoose.Types.ObjectId(ceoUserId);
      fresh.reviewedAt = new Date();
      await fresh.save({ session: mongoSession });
      booking = fresh;
    });
  } finally {
    await mongoSession.endSession();
  }
  if (!booking) throw new BookingError('Failed to approve booking');

  await log(ceoUserId, 'APPROVE', booking._id, `Approved booking for ${booking.startTime}-${booking.endTime}`);
  await notifyBookingDecision(
    { date: booking.date, startTime: booking.startTime, endTime: booking.endTime, shootType: booking.shootType },
    booking.clientId.toString(),
    'APPROVED'
  );
  return booking;
}

export async function rejectBooking(bookingId: string, ceoUserId: string, reason?: string): Promise<IBookingDoc> {
  await connectDB();
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: { $in: ['PENDING', 'SUGGESTED'] } },
    { $set: { status: 'REJECTED', reviewedBy: ceoUserId, reviewedAt: new Date(), rejectionReason: reason?.trim() || undefined } },
    { new: true }
  );
  if (!booking) throw new BookingError('Only pending requests can be rejected', 409);

  await log(ceoUserId, 'REJECT', booking._id, `Rejected booking request${reason ? `: ${reason}` : ''}`);
  await notifyBookingDecision(
    { date: booking.date, startTime: booking.startTime, endTime: booking.endTime, shootType: booking.shootType },
    booking.clientId.toString(),
    'REJECTED',
    { rejectionReason: reason }
  );
  return booking;
}

export async function suggestAlternative(
  bookingId: string,
  ceoUserId: string,
  alt: { date: string | Date; startTime: string; endTime: string }
): Promise<IBookingDoc> {
  await connectDB();
  const date = normalizeDateOnly(alt.date);
  validateWindow(date, alt.startTime, alt.endTime);

  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: { $in: ['PENDING', 'SUGGESTED'] } },
    {
      $set: {
        status: 'SUGGESTED',
        reviewedBy: ceoUserId,
        reviewedAt: new Date(),
        suggestedDate: date,
        suggestedStartTime: alt.startTime,
        suggestedEndTime: alt.endTime,
      },
    },
    { new: true }
  );
  if (!booking) throw new BookingError('Only pending requests can receive a suggestion', 409);

  await log(ceoUserId, 'SUGGEST', booking._id, `Suggested ${alt.startTime}-${alt.endTime} instead`);
  await notifyBookingDecision(
    { date: booking.date, startTime: booking.startTime, endTime: booking.endTime, shootType: booking.shootType },
    booking.clientId.toString(),
    'SUGGESTED',
    { suggestedDate: date, suggestedStartTime: alt.startTime, suggestedEndTime: alt.endTime }
  );
  return booking;
}

// ─── Client response actions ────────────────────────────────────────────────

export async function respondToSuggestion(
  bookingId: string,
  clientUserId: string,
  requiredClientId: string,
  action: 'ACCEPT' | 'DECLINE'
): Promise<IBookingDoc> {
  await connectDB();
  const existing = await loadOr404(bookingId);
  assertBookingOwnership(existing, requiredClientId);
  if (existing.status !== 'SUGGESTED') throw new BookingError('This booking has no pending suggestion', 409);

  if (action === 'DECLINE') {
    existing.status = 'CANCELLED';
    await existing.save();
    await log(clientUserId, 'DECLINE_SUGGESTION', existing._id, 'Client declined the suggested time');
    return existing;
  }

  // ACCEPT: move the suggested window into the primary window and re-run the
  // same atomic conflict check used by approveBooking — the slot could have
  // been taken by someone else since the suggestion was made.
  if (!existing.suggestedDate || !existing.suggestedStartTime || !existing.suggestedEndTime) {
    throw new BookingError('No suggested time to accept');
  }

  const mongoSession = await mongoose.startSession();
  let booking: IBookingDoc | undefined;
  try {
    await mongoSession.withTransaction(async () => {
      const fresh = await Booking.findById(bookingId).session(mongoSession);
      if (!fresh || fresh.status !== 'SUGGESTED') throw new BookingError('This booking has no pending suggestion', 409);
      await assertNoConflict(fresh.suggestedDate!, fresh.suggestedStartTime!, fresh.suggestedEndTime!, fresh._id, mongoSession);
      fresh.date = fresh.suggestedDate!;
      fresh.startTime = fresh.suggestedStartTime!;
      fresh.endTime = fresh.suggestedEndTime!;
      fresh.status = 'APPROVED';
      fresh.suggestedDate = undefined;
      fresh.suggestedStartTime = undefined;
      fresh.suggestedEndTime = undefined;
      await fresh.save({ session: mongoSession });
      booking = fresh;
    });
  } finally {
    await mongoSession.endSession();
  }
  if (!booking) throw new BookingError('Failed to accept the suggested time');

  await log(clientUserId, 'ACCEPT_SUGGESTION', booking._id, 'Client accepted the suggested time');
  return booking;
}

export async function cancelBooking(bookingId: string, actorUserId: string, requiredClientId?: string): Promise<IBookingDoc> {
  await connectDB();
  const existing = await loadOr404(bookingId);
  assertBookingOwnership(existing, requiredClientId);
  if (existing.status === 'CANCELLED' || existing.status === 'REJECTED') {
    throw new BookingError('This booking is already closed', 409);
  }

  existing.status = 'CANCELLED';
  await existing.save();

  await log(actorUserId, 'CANCEL', existing._id, 'Booking cancelled');
  return existing;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export interface Viewer {
  role: 'CEO' | 'WORKER' | 'CLIENT';
  clientId?: string;
}

/** The admin/client "my bookings" list — always scoped to the caller for CLIENT. */
export async function listBookings(viewer: Viewer, filters: { status?: string; clientId?: string; from?: Date; to?: Date }) {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (viewer.role === 'CLIENT') {
    if (!viewer.clientId) return [];
    query.clientId = viewer.clientId;
  } else if (filters.clientId) {
    query.clientId = filters.clientId;
  }
  if (filters.status) query.status = filters.status;
  if (filters.from || filters.to) {
    const dateQuery: Record<string, Date> = {};
    if (filters.from) dateQuery.$gte = filters.from;
    if (filters.to) dateQuery.$lte = filters.to;
    query.date = dateQuery;
  }
  return Booking.find(query).populate('clientId', 'name').sort({ date: 1, startTime: 1 });
}

export type AvailabilityEntry =
  | ({ _id: string; clientId: string; clientName: string; shootType: ShootType; notes?: string; status: Exclude<BookingStatus, 'CANCELLED'> } & { date: string; startTime: string; endTime: string })
  | MaskedBookingView;

/**
 * The shared calendar feed. CEO sees every non-cancelled booking in full.
 * A CLIENT sees their own bookings in full (any status) plus every OTHER
 * client's APPROVED booking masked down to {date, startTime, endTime, BUSY}
 * — never a name, shoot type, or note. Rejected/cancelled/pending/suggested
 * bookings belonging to other clients are omitted entirely, since only a
 * confirmed booking actually occupies the calendar.
 */
export async function getAvailability(viewer: Viewer, range: { from: Date; to: Date }): Promise<AvailabilityEntry[]> {
  await connectDB();
  const dateQuery = { $gte: range.from, $lte: range.to };

  if (viewer.role !== 'CLIENT') {
    const bookings = await Booking.find({ date: dateQuery, status: { $ne: 'CANCELLED' } })
      .populate('clientId', 'name')
      .sort({ date: 1, startTime: 1 });
    return bookings.map((b) => ({
      _id: b._id.toString(),
      clientId: b.clientId._id ? b.clientId._id.toString() : b.clientId.toString(),
      clientName: (b.clientId as unknown as { name?: string })?.name ?? 'Unknown',
      date: b.date.toISOString(),
      startTime: b.startTime,
      endTime: b.endTime,
      shootType: b.shootType,
      notes: b.notes,
      status: b.status as Exclude<BookingStatus, 'CANCELLED'>,
    }));
  }

  if (!viewer.clientId) return [];

  const [own, othersApproved] = await Promise.all([
    Booking.find({ clientId: viewer.clientId, date: dateQuery, status: { $ne: 'CANCELLED' } }).sort({ date: 1, startTime: 1 }),
    Booking.find({ clientId: { $ne: viewer.clientId }, date: dateQuery, status: 'APPROVED' }),
  ]);

  const ownView: AvailabilityEntry[] = own.map((b) => ({
    _id: b._id.toString(),
    clientId: b.clientId.toString(),
    clientName: 'You',
    date: b.date.toISOString(),
    startTime: b.startTime,
    endTime: b.endTime,
    shootType: b.shootType,
    notes: b.notes,
    status: b.status as Exclude<BookingStatus, 'CANCELLED'>,
  }));
  const maskedOthers: AvailabilityEntry[] = othersApproved.map((b) => toMaskedView({ date: b.date.toISOString(), startTime: b.startTime, endTime: b.endTime }));

  return [...ownView, ...maskedOthers].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}
