/**
 * Pure money primitives — no external imports, fully unit-testable.
 *
 * Shared by both the client-billing module ('@/lib/billing') and the
 * company finance module ('@/lib/finance'). Every monetary amount in this
 * app is an integer number of minor units (e.g. cents for EUR/USD, or the
 * smallest denomination of any other currency) to avoid floating-point
 * rounding errors when summing many transactions. Convert to/from major
 * units only at the UI boundary with toMinorUnits()/fromMinorUnits().
 */

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

// Currency is free-text in several places in this app (not always a locked
// dropdown), so bad/legacy values must never crash a page. Intl.NumberFormat
// throws a RangeError on anything that isn't a valid ISO 4217 code — fall
// back to a plain, non-crashing format for anything it rejects.
export function formatMoney(minor: number, currency = 'EUR'): string {
  const major = fromMinorUnits(minor);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}
