import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  timesOverlap, hasConflict, normalizeDateOnly, isValidTimeString, toMaskedView,
} from '../lib/booking.js';

describe('timesOverlap', () => {
  it('spec test 9: 13:00-16:00 vs 15:00-17:00 overlap', () => {
    assert.equal(timesOverlap('13:00', '16:00', '15:00', '17:00'), true);
  });

  it('back-to-back windows do not overlap', () => {
    assert.equal(timesOverlap('09:00', '12:00', '12:00', '15:00'), false);
  });

  it('fully disjoint windows do not overlap', () => {
    assert.equal(timesOverlap('09:00', '10:00', '14:00', '16:00'), false);
  });

  it('one window fully containing another overlaps', () => {
    assert.equal(timesOverlap('09:00', '18:00', '13:00', '14:00'), true);
  });

  it('identical windows overlap', () => {
    assert.equal(timesOverlap('13:00', '16:00', '13:00', '16:00'), true);
  });
});

describe('hasConflict', () => {
  it('spec test 7/8: a requested slot with no existing approved bookings has no conflict', () => {
    assert.equal(hasConflict({ startTime: '14:00', endTime: '17:00' }, []), false);
  });

  it('spec test 9: Meda 3 approved 13:00-16:00 conflicts with a request for 15:00-17:00', () => {
    const existing = [{ startTime: '13:00', endTime: '16:00' }];
    assert.equal(hasConflict({ startTime: '15:00', endTime: '17:00' }, existing), true);
  });

  it('a non-overlapping slot on the same day has no conflict', () => {
    const existing = [{ startTime: '13:00', endTime: '16:00' }];
    assert.equal(hasConflict({ startTime: '09:00', endTime: '12:00' }, existing), false);
  });

  it('checks against every existing booking, not just the first', () => {
    const existing = [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '13:00', endTime: '16:00' },
    ];
    assert.equal(hasConflict({ startTime: '15:00', endTime: '17:00' }, existing), true);
  });
});

describe('normalizeDateOnly', () => {
  it('strips time-of-day to UTC midnight', () => {
    const d = normalizeDateOnly('2026-09-22T15:30:00.000Z');
    assert.equal(d.getUTCHours(), 0);
    assert.equal(d.getUTCMinutes(), 0);
    assert.equal(d.getUTCDate(), 22);
  });

  it('two different times on the same calendar day normalize to the same instant', () => {
    const a = normalizeDateOnly('2026-09-22T01:00:00.000Z');
    const b = normalizeDateOnly('2026-09-22T23:00:00.000Z');
    assert.equal(a.getTime(), b.getTime());
  });
});

describe('isValidTimeString', () => {
  it('accepts valid HH:MM', () => {
    assert.equal(isValidTimeString('09:00'), true);
    assert.equal(isValidTimeString('23:59'), true);
    assert.equal(isValidTimeString('00:00'), true);
  });

  it('rejects invalid formats', () => {
    assert.equal(isValidTimeString('9:00'), false);
    assert.equal(isValidTimeString('24:00'), false);
    assert.equal(isValidTimeString('12:60'), false);
    assert.equal(isValidTimeString('noon'), false);
  });
});

describe('toMaskedView — booking privacy (spec test 7 & 30)', () => {
  it('exposes only date/startTime/endTime/BUSY — nothing else', () => {
    const masked = toMaskedView({ date: '2026-09-22T00:00:00.000Z', startTime: '13:00', endTime: '16:00' });
    assert.deepEqual(masked, { date: '2026-09-22T00:00:00.000Z', startTime: '13:00', endTime: '16:00', status: 'BUSY' });
    assert.equal(Object.keys(masked).length, 4);
    assert.ok(!('clientName' in masked));
    assert.ok(!('notes' in masked));
    assert.ok(!('shootType' in masked));
    assert.ok(!('_id' in masked));
  });
});
