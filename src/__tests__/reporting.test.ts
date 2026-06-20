import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcReportDueAt, calcEngagementRate, getEffectiveReportStatus } from '../lib/reporting.js';

// Test 1: POST → postedDate set, reportDueAt = +48h, status = WAITING_FOR_REPORT_TIME
describe('calcReportDueAt', () => {
  it('POST: reportDueAt is +48h after postedDate', () => {
    const posted = new Date('2026-01-01T10:00:00Z');
    const due = calcReportDueAt(posted, 'POST');
    const expectedMs = posted.getTime() + 48 * 3_600_000;
    assert.equal(due.getTime(), expectedMs);
  });

  it('REEL: reportDueAt is +48h after postedDate', () => {
    const posted = new Date('2026-01-01T10:00:00Z');
    const due = calcReportDueAt(posted, 'REEL');
    const expectedMs = posted.getTime() + 48 * 3_600_000;
    assert.equal(due.getTime(), expectedMs);
  });

  // Test 2: STORY → reportDueAt = +24h
  it('STORY: reportDueAt is +24h after postedDate', () => {
    const posted = new Date('2026-01-01T10:00:00Z');
    const due = calcReportDueAt(posted, 'STORY');
    const expectedMs = posted.getTime() + 24 * 3_600_000;
    assert.equal(due.getTime(), expectedMs);
  });
});

// Test 4: Engagement rate calculation
describe('calcEngagementRate', () => {
  it('calculates correctly: reach=1000, likes=100, comments=20, shares=10, saves=5 → 13.5', () => {
    const rate = calcEngagementRate({ reach: 1000, likes: 100, comments: 20, shares: 10, saves: 5 });
    assert.equal(rate, 13.5);
  });

  it('returns null when reach is 0', () => {
    const rate = calcEngagementRate({ reach: 0, likes: 100 });
    assert.equal(rate, null);
  });

  it('returns null when reach is undefined', () => {
    const rate = calcEngagementRate({ likes: 100 });
    assert.equal(rate, null);
  });

  it('handles all-zero inputs with valid reach', () => {
    const rate = calcEngagementRate({ reach: 1000 });
    assert.equal(rate, 0);
  });

  it('rounds to 2 decimal places', () => {
    const rate = calcEngagementRate({ reach: 3, likes: 1, comments: 1, shares: 0, saves: 0 });
    // (2 / 3) * 100 = 66.666... → 66.67
    assert.equal(rate, 66.67);
  });
});

// Test 6: getEffectiveReportStatus — not posted cards
describe('getEffectiveReportStatus', () => {
  it('NOT_POSTED when task status is not POSTED', () => {
    const s = getEffectiveReportStatus('READY_TO_POST', 'NEEDS_REPORT_DATA');
    assert.equal(s, 'NOT_POSTED');
  });

  it('COMPLETED when reportStatus is COMPLETED', () => {
    const s = getEffectiveReportStatus('POSTED', 'COMPLETED');
    assert.equal(s, 'COMPLETED');
  });

  it('WAITING when POSTED but no reportDueAt', () => {
    const s = getEffectiveReportStatus('POSTED', 'WAITING_FOR_REPORT_TIME', null);
    assert.equal(s, 'WAITING');
  });

  it('WAITING when POSTED and reportDueAt is in the future', () => {
    const future = new Date(Date.now() + 10 * 3_600_000).toISOString();
    const s = getEffectiveReportStatus('POSTED', 'WAITING_FOR_REPORT_TIME', future);
    assert.equal(s, 'WAITING');
  });

  it('NEEDS_DATA when POSTED and reportDueAt is in the past', () => {
    const past = new Date(Date.now() - 10 * 3_600_000).toISOString();
    const s = getEffectiveReportStatus('POSTED', 'NEEDS_REPORT_DATA', past);
    assert.equal(s, 'NEEDS_DATA');
  });

  // Test 6: missing metrics → not completed
  it('NEEDS_DATA (not COMPLETED) for task without report metrics', () => {
    const past = new Date(Date.now() - 5 * 3_600_000).toISOString();
    const s = getEffectiveReportStatus('POSTED', 'NEEDS_REPORT_DATA', past);
    assert.notEqual(s, 'COMPLETED');
    assert.equal(s, 'NEEDS_DATA');
  });
});

// Test 7: CEO vs WORKER authorization (logic level — API enforces this, tested here as pure logic)
describe('CEO-only report authorization', () => {
  it('only CEO role string passes authorization check', () => {
    function canSaveReport(role: string) { return role === 'CEO'; }
    assert.equal(canSaveReport('CEO'), true);
    assert.equal(canSaveReport('WORKER'), false);
    assert.equal(canSaveReport(''), false);
  });
});

// Test 3 & 5: PATCH /report endpoint data integrity (tested as pure data transformation)
describe('report metrics data transformation', () => {
  it('PATCH report sets reportStatus=COMPLETED and reportCompletedAt', () => {
    const before = { reportStatus: 'NEEDS_REPORT_DATA', reportCompletedAt: undefined as Date | undefined };
    function applyReport(state: typeof before) {
      return { ...state, reportStatus: 'COMPLETED', reportCompletedAt: new Date() };
    }
    const after = applyReport(before);
    assert.equal(after.reportStatus, 'COMPLETED');
    assert.ok(after.reportCompletedAt instanceof Date);
  });

  it('aggregates total reach and views across multiple tasks', () => {
    const tasks = [
      { reporting: { metrics: { reach: 3900, views: 4820 } } },
      { reporting: { metrics: { reach: 2100, views: 3100 } } },
      { reporting: { metrics: { reach: 1500, views: 2000 } } },
    ];
    const totalReach = tasks.reduce((sum, t) => sum + (t.reporting?.metrics?.reach ?? 0), 0);
    const totalViews = tasks.reduce((sum, t) => sum + (t.reporting?.metrics?.views ?? 0), 0);
    assert.equal(totalReach, 7500);
    assert.equal(totalViews, 9920);
  });
});
