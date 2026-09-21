import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toMinorUnits,
  fromMinorUnits,
  formatMoney,
  computePeriodStatus,
  suggestAllocation,
  monthsBetweenInclusive,
  compareMonthKey,
  computePaidThroughMonth,
  computeOutstandingMinor,
} from '../lib/billing.js';

describe('money conversion', () => {
  it('toMinorUnits converts major units to integer cents', () => {
    assert.equal(toMinorUnits(300), 30000);
    assert.equal(toMinorUnits(19.99), 1999);
  });

  it('fromMinorUnits converts cents back to major units', () => {
    assert.equal(fromMinorUnits(30000), 300);
    assert.equal(fromMinorUnits(1999), 19.99);
  });

  it('formatMoney formats minor units as currency', () => {
    assert.equal(formatMoney(30000, 'EUR'), '€300.00');
    assert.equal(formatMoney(0, 'USD'), '$0.00');
  });

  it('formatMoney never throws on an invalid currency code (free-text field, real data can be bad)', () => {
    assert.equal(formatMoney(30000, 'euro'), '300.00 euro');
    assert.doesNotThrow(() => formatMoney(50000, 'not-a-currency'));
  });
});

describe('computePeriodStatus', () => {
  it('UNPAID when nothing verified paid', () => {
    assert.equal(computePeriodStatus(30000, 0), 'UNPAID');
  });

  it('PARTIALLY_PAID when some but not all is verified paid', () => {
    assert.equal(computePeriodStatus(30000, 15000), 'PARTIALLY_PAID');
  });

  it('PAID when verified paid exactly equals expected', () => {
    assert.equal(computePeriodStatus(30000, 30000), 'PAID');
  });

  it('OVERPAID when verified paid exceeds expected', () => {
    assert.equal(computePeriodStatus(30000, 35000), 'OVERPAID');
  });
});

describe('suggestAllocation — FIFO allocator', () => {
  it('spec worked example: €450 across April (owed 300) and May (owed 300) → April 300, May 150', () => {
    const targets = [
      { id: 'april', remainingMinor: 30000 },
      { id: 'may', remainingMinor: 30000 },
    ];
    const result = suggestAllocation(45000, targets);
    assert.deepEqual(result.allocations, [
      { billingPeriodId: 'april', amountMinor: 30000 },
      { billingPeriodId: 'may', amountMinor: 15000 },
    ]);
    assert.equal(result.creditAmountMinor, 0);
  });

  it('spec worked example continued: a further €150 finishes May', () => {
    // May now has only 150 remaining (300 owed - 150 already verified-paid).
    const targets = [{ id: 'may', remainingMinor: 15000 }];
    const result = suggestAllocation(15000, targets);
    assert.deepEqual(result.allocations, [{ billingPeriodId: 'may', amountMinor: 15000 }]);
    assert.equal(result.creditAmountMinor, 0);
  });

  it('overpayment beyond all outstanding periods becomes credit', () => {
    const targets = [{ id: 'jan', remainingMinor: 30000 }];
    const result = suggestAllocation(35000, targets);
    assert.deepEqual(result.allocations, [{ billingPeriodId: 'jan', amountMinor: 30000 }]);
    assert.equal(result.creditAmountMinor, 5000);
  });

  it('skips periods with nothing remaining (already paid)', () => {
    const targets = [
      { id: 'jan', remainingMinor: 0 },
      { id: 'feb', remainingMinor: 30000 },
    ];
    const result = suggestAllocation(30000, targets);
    assert.deepEqual(result.allocations, [{ billingPeriodId: 'feb', amountMinor: 30000 }]);
  });

  it('with no targets, the entire amount becomes credit', () => {
    const result = suggestAllocation(10000, []);
    assert.deepEqual(result.allocations, []);
    assert.equal(result.creditAmountMinor, 10000);
  });

  it('a single payment can span more than two months', () => {
    const targets = [
      { id: 'jan', remainingMinor: 10000 },
      { id: 'feb', remainingMinor: 10000 },
      { id: 'mar', remainingMinor: 10000 },
    ];
    const result = suggestAllocation(25000, targets);
    assert.deepEqual(result.allocations, [
      { billingPeriodId: 'jan', amountMinor: 10000 },
      { billingPeriodId: 'feb', amountMinor: 10000 },
      { billingPeriodId: 'mar', amountMinor: 5000 },
    ]);
    assert.equal(result.creditAmountMinor, 0);
  });
});

describe('monthsBetweenInclusive', () => {
  it('same month returns a single entry', () => {
    assert.deepEqual(monthsBetweenInclusive({ year: 2026, month: 3 }, { year: 2026, month: 3 }), [{ year: 2026, month: 3 }]);
  });

  it('spans a year boundary', () => {
    const months = monthsBetweenInclusive({ year: 2025, month: 11 }, { year: 2026, month: 2 });
    assert.deepEqual(months, [
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
    ]);
  });

  it('returns empty when start is after end', () => {
    assert.deepEqual(monthsBetweenInclusive({ year: 2026, month: 5 }, { year: 2026, month: 1 }), []);
  });
});

describe('compareMonthKey', () => {
  it('orders by year first, then month', () => {
    assert.ok(compareMonthKey({ year: 2025, month: 12 }, { year: 2026, month: 1 }) < 0);
    assert.ok(compareMonthKey({ year: 2026, month: 3 }, { year: 2026, month: 1 }) > 0);
    assert.equal(compareMonthKey({ year: 2026, month: 3 }, { year: 2026, month: 3 }), 0);
  });
});

describe('computePaidThroughMonth', () => {
  it('spec example: Jan/Feb/Mar paid, Apr/May unpaid → paid through March', () => {
    const periods = [
      { year: 2026, month: 1, status: 'PAID' as const },
      { year: 2026, month: 2, status: 'PAID' as const },
      { year: 2026, month: 3, status: 'PAID' as const },
      { year: 2026, month: 4, status: 'UNPAID' as const },
      { year: 2026, month: 5, status: 'UNPAID' as const },
    ];
    assert.deepEqual(computePaidThroughMonth(periods), { year: 2026, month: 3 });
  });

  it('a gap breaks the chain even if a later month is paid', () => {
    const periods = [
      { year: 2026, month: 1, status: 'PAID' as const },
      { year: 2026, month: 2, status: 'UNPAID' as const },
      { year: 2026, month: 3, status: 'PAID' as const },
    ];
    assert.deepEqual(computePaidThroughMonth(periods), { year: 2026, month: 1 });
  });

  it('returns null when nothing is paid yet', () => {
    assert.equal(computePaidThroughMonth([{ year: 2026, month: 1, status: 'UNPAID' }]), null);
  });

  it('OVERPAID counts as paid for the chain', () => {
    const periods = [
      { year: 2026, month: 1, status: 'OVERPAID' as const },
      { year: 2026, month: 2, status: 'UNPAID' as const },
    ];
    assert.deepEqual(computePaidThroughMonth(periods), { year: 2026, month: 1 });
  });
});

describe('computeOutstandingMinor', () => {
  it('sums what is still owed, never counting a period as negative', () => {
    const periods = [
      { expectedAmountMinor: 30000, verifiedPaidAmountMinor: 30000 }, // PAID
      { expectedAmountMinor: 30000, verifiedPaidAmountMinor: 15000 }, // PARTIALLY_PAID
      { expectedAmountMinor: 30000, verifiedPaidAmountMinor: 0 },     // UNPAID
      { expectedAmountMinor: 30000, verifiedPaidAmountMinor: 40000 }, // OVERPAID — contributes 0, not negative
    ];
    assert.equal(computeOutstandingMinor(periods), 45000);
  });

  it('is zero for an empty list', () => {
    assert.equal(computeOutstandingMinor([]), 0);
  });
});

// Authorization-level checks — API/proxy enforce this; documented here as pure logic.
describe('CLIENT role isolation (logic level)', () => {
  it('a CLIENT can only act on their own connected clientId', () => {
    function canAccessClient(sessionRole: string, sessionClientId: string | undefined, targetClientId: string) {
      if (sessionRole !== 'CLIENT') return sessionRole === 'CEO';
      return sessionClientId === targetClientId;
    }
    assert.equal(canAccessClient('CLIENT', 'client-a', 'client-a'), true);
    assert.equal(canAccessClient('CLIENT', 'client-a', 'client-b'), false);
    assert.equal(canAccessClient('CLIENT', undefined, 'client-a'), false);
    assert.equal(canAccessClient('CEO', undefined, 'client-a'), true);
    assert.equal(canAccessClient('WORKER', undefined, 'client-a'), false);
  });
});
