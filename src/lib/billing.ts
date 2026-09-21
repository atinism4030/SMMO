/**
 * Pure billing logic — fully unit-testable.
 *
 * Money primitives (minor-unit conversion, safe currency formatting) live in
 * '@/lib/money' and are shared with the company finance module so both use
 * one implementation. Re-exported here so existing imports keep working.
 */
import { toMinorUnits, fromMinorUnits, formatMoney } from '@/lib/money';
export { toMinorUnits, fromMinorUnits, formatMoney };

export type BillingPeriodStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERPAID';

/**
 * Status of a billing period given its expected amount and the sum of
 * VERIFIED payment allocations against it. Pending/disputed allocations must
 * never be passed in here — only confirmed money moves a period out of UNPAID.
 */
export function computePeriodStatus(expectedMinor: number, verifiedPaidMinor: number): BillingPeriodStatus {
  if (verifiedPaidMinor <= 0) return 'UNPAID';
  if (verifiedPaidMinor < expectedMinor) return 'PARTIALLY_PAID';
  if (verifiedPaidMinor === expectedMinor) return 'PAID';
  return 'OVERPAID';
}

export interface AllocationTarget {
  id: string;
  /** Amount still owed on this period (expected minus already-verified-paid). Must be >= 0. */
  remainingMinor: number;
}

export interface SuggestedAllocation {
  billingPeriodId: string;
  amountMinor: number;
}

export interface AllocationResult {
  allocations: SuggestedAllocation[];
  creditAmountMinor: number;
}

/**
 * Reusable FIFO allocator: fills each target in the order given until the
 * payment amount is exhausted, then reports whatever is left over as credit.
 * Callers are responsible for sorting `targets` oldest-first — this function
 * has no notion of chronology, so it can also be used for manual/custom
 * allocation orders.
 */
export function suggestAllocation(amountMinor: number, targets: AllocationTarget[]): AllocationResult {
  let remaining = amountMinor;
  const allocations: SuggestedAllocation[] = [];
  for (const target of targets) {
    if (remaining <= 0) break;
    if (target.remainingMinor <= 0) continue;
    const amount = Math.min(remaining, target.remainingMinor);
    allocations.push({ billingPeriodId: target.id, amountMinor: amount });
    remaining -= amount;
  }
  return { allocations, creditAmountMinor: remaining };
}

export interface MonthKey {
  year: number;
  month: number; // 1-12
}

/** All (year, month) pairs from `start` to `end`, inclusive, in chronological order. */
export function monthsBetweenInclusive(start: MonthKey, end: MonthKey): MonthKey[] {
  const result: MonthKey[] = [];
  let y = start.year;
  let m = start.month;
  // Guard against pathological inputs generating an unbounded loop.
  let iterations = 0;
  while ((y < end.year || (y === end.year && m <= end.month)) && iterations < 2400) {
    result.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    iterations += 1;
  }
  return result;
}

export function compareMonthKey(a: MonthKey, b: MonthKey): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

/**
 * The most recent month such that it, and every month before it back to the
 * start of the list, is PAID or OVERPAID. A single UNPAID/PARTIALLY_PAID gap
 * breaks the chain — this matches "paid through" semantics on a subscription
 * (not just "the latest month that happens to be paid").
 */
export function computePaidThroughMonth(
  periodsAsc: { year: number; month: number; status: BillingPeriodStatus }[]
): MonthKey | null {
  let paidThrough: MonthKey | null = null;
  for (const p of periodsAsc) {
    if (p.status === 'PAID' || p.status === 'OVERPAID') {
      paidThrough = { year: p.year, month: p.month };
    } else {
      break;
    }
  }
  return paidThrough;
}

export interface BillingPeriodBalanceInput {
  expectedAmountMinor: number;
  verifiedPaidAmountMinor: number;
}

/** How much is still owed across a set of billing periods (never negative per-period). */
export function computeOutstandingMinor(periods: BillingPeriodBalanceInput[]): number {
  return periods.reduce((sum, p) => sum + Math.max(p.expectedAmountMinor - p.verifiedPaidAmountMinor, 0), 0);
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK: 'Bank Transfer',
  CARD: 'Card',
  OTHER: 'Other',
};

export const DISPUTE_REASON_LABELS: Record<string, string> = {
  WRONG_AMOUNT: 'Wrong amount',
  WRONG_DATE: 'Wrong date',
  NOT_MADE: 'I did not make this payment',
  DUPLICATE: 'Duplicate payment',
  OTHER: 'Other',
};
