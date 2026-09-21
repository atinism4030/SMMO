import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateBoardImport, summarizeByType, BOARD_IMPORT_TEMPLATE } from '../lib/boardImport.js';

describe('validateBoardImport — valid input', () => {
  it('the shipped template validates cleanly with no errors', () => {
    const result = validateBoardImport(BOARD_IMPORT_TEMPLATE, "Armando's Pizza");
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.items.length, 3);
    assert.equal(result.month, 9);
    assert.equal(result.year, 2026);
  });

  it('summarizeByType counts items per content type (spec: "4 Posts, 8 Stories, 2 Reels")', () => {
    const result = validateBoardImport(BOARD_IMPORT_TEMPLATE, "Armando's Pizza");
    const summary = summarizeByType(result.items);
    assert.equal(summary.POST, 1);
    assert.equal(summary.STORY, 1);
    assert.equal(summary.REEL, 1);
  });
});

describe('validateBoardImport — spec test 63 cases', () => {
  it('invalid JSON shape (not an object) fails with a human-readable error, not a crash', () => {
    const result = validateBoardImport('just a string');
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].length > 0);
    assert.doesNotThrow(() => validateBoardImport(null));
    assert.doesNotThrow(() => validateBoardImport(42));
    assert.doesNotThrow(() => validateBoardImport(['array', 'not', 'object']));
  });

  it('a missing field produces a specific, human-readable error naming the item', () => {
    const result = validateBoardImport({
      version: '1.0', client: 'X', month: '2026-09',
      content: [{ type: 'POST', scheduledDate: '2026-09-03' }], // missing title
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('Content item #1') && e.includes('title')));
  });

  it('a wrong/invalid date is rejected with a clear error', () => {
    const result = validateBoardImport({
      version: '1.0', client: 'X', month: '2026-09',
      content: [{ type: 'POST', title: 'Post', scheduledDate: 'not-a-date' }],
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('scheduledDate')));
  });

  it('a date outside the stated month warns but does not hard-block', () => {
    const result = validateBoardImport({
      version: '1.0', client: 'X', month: '2026-09',
      content: [{ type: 'POST', title: 'Post', scheduledDate: '2026-10-15' }],
    });
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes('outside the board\'s month')));
  });

  it('an unknown content type is rejected with a clear error', () => {
    const result = validateBoardImport({
      version: '1.0', client: 'X', month: '2026-09',
      content: [{ type: 'TWEET', title: 'Post', scheduledDate: '2026-09-03' }],
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('invalid or missing type')));
  });

  it('duplicate content items are flagged as a warning, not silently merged or hard-blocked', () => {
    const result = validateBoardImport({
      version: '1.0', client: 'X', month: '2026-09',
      content: [
        { type: 'POST', title: 'Same Post', scheduledDate: '2026-09-03' },
        { type: 'POST', title: 'Same Post', scheduledDate: '2026-09-03' },
      ],
    });
    assert.equal(result.valid, true);
    assert.equal(result.items.length, 2);
    assert.ok(result.warnings.some((w) => w.includes('duplicate')));
  });

  it('a client name mismatch warns but never blocks the import (the UI dropdown selection is authoritative)', () => {
    const result = validateBoardImport({ version: '1.0', client: 'Wrong Client', month: '2026-09', content: [] }, 'Correct Client');
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes('Wrong Client') && w.includes('Correct Client')));
  });

  it('empty content is allowed (warns, creates an empty board) rather than erroring', () => {
    const result = validateBoardImport({ version: '1.0', client: 'X', month: '2026-09', content: [] });
    assert.equal(result.valid, true);
    assert.equal(result.items.length, 0);
    assert.ok(result.warnings.some((w) => w.includes('empty')));
  });

  it('a large monthly plan (50+ items) validates without issue', () => {
    const content = Array.from({ length: 60 }, (_, i) => ({
      type: 'POST', title: `Post ${i + 1}`, scheduledDate: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
    }));
    const result = validateBoardImport({ version: '1.0', client: 'X', month: '2026-09', content });
    assert.equal(result.valid, true);
    assert.equal(result.items.length, 60);
  });

  it('missing "month" entirely is rejected with a clear error', () => {
    const result = validateBoardImport({ version: '1.0', client: 'X', content: [] });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('month')));
  });

  it('an unsupported schema version is rejected', () => {
    const result = validateBoardImport({ version: '2.0', client: 'X', month: '2026-09', content: [] });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('version')));
  });

  it('a missing version is tolerated with a warning, not an error (assumes 1.0)', () => {
    const result = validateBoardImport({ client: 'X', month: '2026-09', content: [] });
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes('version')));
  });

  it('an unrecognized platform warns but does not block', () => {
    const result = validateBoardImport({
      version: '1.0', client: 'X', month: '2026-09',
      content: [{ type: 'POST', title: 'Post', scheduledDate: '2026-09-03', platforms: ['Snapchat'] }],
    });
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes('Snapchat')));
  });
});
