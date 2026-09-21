import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeMonthlyStats, type ReportTaskLike } from '../lib/monthlyReport.js';

function task(overrides: Partial<ReportTaskLike>): ReportTaskLike {
  return {
    _id: '1', title: 'Untitled', contentType: 'POST', status: 'POSTED',
    ...overrides,
  };
}

describe('computeMonthlyStats', () => {
  it('counts planned, posted, and not-completed correctly', () => {
    const tasks = [
      task({ _id: '1', status: 'POSTED' }),
      task({ _id: '2', status: 'POSTED' }),
      task({ _id: '3', status: 'CONTENT_PREPARATION' }),
    ];
    const stats = computeMonthlyStats(['Board A'], tasks, 0);
    assert.equal(stats.totalPlanned, 3);
    assert.equal(stats.totalPosted, 2);
    assert.equal(stats.totalNotCompleted, 1);
  });

  it('groups tasks by content type', () => {
    const tasks = [
      task({ _id: '1', contentType: 'POST' }),
      task({ _id: '2', contentType: 'POST' }),
      task({ _id: '3', contentType: 'REEL' }),
    ];
    const stats = computeMonthlyStats([], tasks, 0);
    assert.deepEqual(stats.byType, { POST: 2, REEL: 1 });
  });

  it('passes through the completed-shoots count unchanged', () => {
    const stats = computeMonthlyStats([], [], 4);
    assert.equal(stats.completedShoots, 4);
  });

  it('only includes posted tasks with a resolvable URL in postedLinks', () => {
    const tasks = [
      task({ _id: '1', status: 'POSTED', primaryPostUrl: 'https://instagram.com/p/1' }),
      task({ _id: '2', status: 'POSTED' }), // posted but no URL anywhere
      task({ _id: '3', status: 'POSTED', postedLinks: [{ url: 'https://instagram.com/p/3' }] }),
      task({ _id: '4', status: 'CONTENT_PREPARATION', primaryPostUrl: 'https://instagram.com/p/4' }), // not posted
    ];
    const stats = computeMonthlyStats([], tasks, 0);
    assert.equal(stats.postedLinks.length, 2);
    assert.deepEqual(stats.postedLinks.map((l) => l.taskId).sort(), ['1', '3']);
  });

  it('prefers primaryPostUrl over postedLinks when both are present', () => {
    const tasks = [
      task({
        _id: '1',
        status: 'POSTED',
        primaryPostUrl: 'https://instagram.com/primary',
        postedLinks: [{ url: 'https://instagram.com/secondary' }],
      }),
    ];
    const stats = computeMonthlyStats([], tasks, 0);
    assert.equal(stats.postedLinks[0].url, 'https://instagram.com/primary');
  });

  it('handles an empty month with no boards or tasks', () => {
    const stats = computeMonthlyStats([], [], 0);
    assert.equal(stats.totalPlanned, 0);
    assert.equal(stats.totalPosted, 0);
    assert.equal(stats.totalNotCompleted, 0);
    assert.deepEqual(stats.byType, {});
    assert.deepEqual(stats.postedLinks, []);
    assert.deepEqual(stats.boardTitles, []);
  });

  it('carries board titles through unchanged', () => {
    const stats = computeMonthlyStats(['Board A', 'Board B'], [], 0);
    assert.deepEqual(stats.boardTitles, ['Board A', 'Board B']);
  });
});
