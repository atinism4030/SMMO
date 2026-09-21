import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toMinorUnits, fromMinorUnits, formatMoney } from '../lib/money.js';
import { toBaseEUR, DEFAULT_MKD_PER_EUR } from '../lib/exchangeRate.js';
import { computeWalletBalanceMinor, computeFinanceSummary } from '../lib/finance.js';

describe('money primitives', () => {
  it('toMinorUnits/fromMinorUnits round-trip', () => {
    assert.equal(toMinorUnits(300), 30000);
    assert.equal(fromMinorUnits(30000), 300);
  });

  it('formatMoney never throws on a bad currency code', () => {
    assert.doesNotThrow(() => formatMoney(10000, 'euro'));
    assert.equal(formatMoney(10000, 'EUR'), '€100.00');
  });
});

describe('toBaseEUR — MKD ⇄ EUR conversion', () => {
  it('spec test case 3: 6,150 MKD converts to approximately €100 at the default rate', () => {
    const result = toBaseEUR(toMinorUnits(6150), 'MKD');
    assert.equal(result.exchangeRate, DEFAULT_MKD_PER_EUR);
    assert.equal(result.baseAmountMinor, 10000); // €100.00
    // The original value must be preserved untouched, not destroyed by the conversion.
    assert.equal(result.originalAmountMinor, toMinorUnits(6150));
    assert.equal(result.originalCurrency, 'MKD');
  });

  it('EUR passes through unchanged with an exchange rate of 1', () => {
    const result = toBaseEUR(toMinorUnits(500), 'EUR');
    assert.equal(result.baseAmountMinor, toMinorUnits(500));
    assert.equal(result.exchangeRate, 1);
  });

  it('an overridden exchange rate is used instead of the default, and is preserved on the record', () => {
    const result = toBaseEUR(toMinorUnits(6150), 'MKD', 61.5);
    assert.equal(result.exchangeRate, 61.5);
    assert.equal(result.baseAmountMinor, 10000);

    const differentRate = toBaseEUR(toMinorUnits(6150), 'MKD', 50);
    assert.equal(differentRate.exchangeRate, 50);
    assert.equal(differentRate.baseAmountMinor, toMinorUnits(123)); // 6150 / 50 = 123
  });

  it('is case-insensitive and trims currency codes', () => {
    const result = toBaseEUR(toMinorUnits(1000), ' mkd ');
    assert.equal(result.originalCurrency, 'MKD');
  });

  it('an unrecognized currency falls back to 1:1 with EUR rather than throwing', () => {
    assert.doesNotThrow(() => toBaseEUR(toMinorUnits(100), 'XYZ'));
    const result = toBaseEUR(toMinorUnits(100), 'XYZ');
    assert.equal(result.baseAmountMinor, toMinorUnits(100));
  });
});

describe('computeWalletBalanceMinor — ledger math', () => {
  it('spec test 2: manual income increases the destination wallet', () => {
    const entries = [{ type: 'INCOME' as const, status: 'ACTIVE' as const, baseAmountMinor: 150000, walletId: 'bank' }];
    assert.equal(computeWalletBalanceMinor('bank', entries), 150000);
  });

  it('spec test 3: an expense decreases the paying wallet', () => {
    const entries = [{ type: 'EXPENSE' as const, status: 'ACTIVE' as const, baseAmountMinor: 10000, walletId: 'altin' }];
    assert.equal(computeWalletBalanceMinor('altin', entries), -10000);
  });

  it('spec test 6: a transfer moves money between wallets without inflating either side', () => {
    const entries = [
      { type: 'INCOME' as const, status: 'ACTIVE' as const, baseAmountMinor: 500000, walletId: 'bank' },
      { type: 'TRANSFER' as const, status: 'ACTIVE' as const, baseAmountMinor: 100000, fromWalletId: 'bank', toWalletId: 'savings' },
    ];
    assert.equal(computeWalletBalanceMinor('bank', entries), 400000); // 500000 - 100000
    assert.equal(computeWalletBalanceMinor('savings', entries), 100000);
  });

  it('a voided transaction contributes nothing to any wallet balance', () => {
    const entries = [{ type: 'INCOME' as const, status: 'VOIDED' as const, baseAmountMinor: 99999, walletId: 'bank' }];
    assert.equal(computeWalletBalanceMinor('bank', entries), 0);
  });

  it('a wallet with no matching entries has a zero balance', () => {
    assert.equal(computeWalletBalanceMinor('empty-wallet', []), 0);
  });
});

describe('computeFinanceSummary — company income/expense/net', () => {
  it('spec test 6: a transfer never changes income, expenses, or net', () => {
    const before = computeFinanceSummary([
      { type: 'INCOME', status: 'ACTIVE', baseAmountMinor: 500000 },
    ]);
    const after = computeFinanceSummary([
      { type: 'INCOME', status: 'ACTIVE', baseAmountMinor: 500000 },
      { type: 'TRANSFER', status: 'ACTIVE', baseAmountMinor: 100000 },
    ]);
    assert.deepEqual(before, after);
  });

  it('net is income minus expenses', () => {
    const summary = computeFinanceSummary([
      { type: 'INCOME', status: 'ACTIVE', baseAmountMinor: 150000 },
      { type: 'EXPENSE', status: 'ACTIVE', baseAmountMinor: 10000 },
    ]);
    assert.equal(summary.totalIncomeMinor, 150000);
    assert.equal(summary.totalExpenseMinor, 10000);
    assert.equal(summary.netMinor, 140000);
  });

  it('voided transactions are excluded from every total', () => {
    const summary = computeFinanceSummary([
      { type: 'INCOME', status: 'ACTIVE', baseAmountMinor: 100000 },
      { type: 'INCOME', status: 'VOIDED', baseAmountMinor: 999999 },
      { type: 'EXPENSE', status: 'VOIDED', baseAmountMinor: 999999 },
    ]);
    assert.equal(summary.totalIncomeMinor, 100000);
    assert.equal(summary.totalExpenseMinor, 0);
  });
});
