/**
 * Pure booking/availability logic — no external imports, fully unit-testable.
 * DB orchestration (conflict-checked approval, notifications) lives in
 * '@/lib/bookingService'.
 */

export type ShootType = 'PHOTO_SHOOT' | 'VIDEO_SHOOT' | 'PHOTO_VIDEO' | 'CONTENT_SESSION' | 'OTHER';
export type BookingStatus = 'PENDING' | 'SUGGESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const SHOOT_TYPE_LABELS: Record<ShootType, string> = {
  PHOTO_SHOOT: 'Photo Shoot',
  VIDEO_SHOOT: 'Video Shoot',
  PHOTO_VIDEO: 'Photo + Video',
  CONTENT_SESSION: 'Content Session',
  OTHER: 'Other',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  SUGGESTED: 'Alternative Suggested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

/**
 * Normalizes any date input to UTC midnight of that calendar day, discarding
 * time-of-day — bookings store the date and time-of-day (HH:MM strings)
 * separately, and this keeps "same day" comparisons exact regardless of the
 * timezone a date string arrived in.
 */
export function normalizeDateOnly(date: string | Date): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Basic "HH:MM" 24-hour format check — good enough to reject garbage before it hits the DB. */
export function isValidTimeString(t: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
}

/**
 * Two time windows on the same day overlap iff each starts before the other
 * ends. "HH:MM" strings compare correctly as plain strings since they're
 * fixed-width and zero-padded, so no time parsing is needed.
 */
export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface BookingWindow {
  startTime: string;
  endTime: string;
}

/** True if `window` overlaps any of `existing` (same-day windows only — caller filters by date). */
export function hasConflict(window: BookingWindow, existing: BookingWindow[]): boolean {
  return existing.some((b) => timesOverlap(window.startTime, window.endTime, b.startTime, b.endTime));
}

export interface FullBookingView {
  _id: string;
  clientId: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  shootType: ShootType;
  status: BookingStatus;
  notes?: string;
}

/** What the CEO (or the requesting client, for their own booking) can see. */
export type OwnBookingView = FullBookingView;

/**
 * What a DIFFERENT client sees for someone else's approved booking: only the
 * time window and a generic "BUSY" marker — never the other client's name,
 * shoot type, notes, or booking id. Pending/suggested/rejected/cancelled
 * bookings from other clients are invisible entirely (only APPROVED time
 * actually blocks the calendar), so this is only ever called for those.
 */
export interface MaskedBookingView {
  date: string;
  startTime: string;
  endTime: string;
  status: 'BUSY';
}

export function toMaskedView(booking: { date: string; startTime: string; endTime: string }): MaskedBookingView {
  return { date: booking.date, startTime: booking.startTime, endTime: booking.endTime, status: 'BUSY' };
}
