/**
 * Pure MKD ⇄ EUR conversion logic — fully unit-testable.
 *
 * EUR is the company's base reporting currency. Transactions may be entered
 * in MKD (or, defensively, any other free-text currency), but the rate used
 * is captured on the transaction at the moment it's recorded and never
 * recalculated later — that's what keeps historical accounting stable when
 * the "current" rate changes.
 *
 * The Macedonian denar has long traded in a tight band against the euro
 * (the central bank's de facto peg), so a single default rate is a
 * reasonable starting point. A CEO can override it per-transaction.
 */

export const DEFAULT_MKD_PER_EUR = 61.5;

export type SupportedCurrency = 'EUR' | 'MKD';

export interface ConvertedAmount {
  originalAmountMinor: number;
  originalCurrency: string;
  /** MKD per 1 EUR used for this conversion; 1 when the original currency is already EUR. */
  exchangeRate: number;
  /** EUR equivalent, in minor units (cents) — the company's base reporting amount. */
  baseAmountMinor: number;
}

/**
 * Converts a minor-unit amount in `originalCurrency` to its EUR-minor-unit
 * equivalent, using `mkdPerEur` (defaulting to DEFAULT_MKD_PER_EUR) for MKD.
 * Any currency other than EUR/MKD is treated 1:1 with EUR rather than
 * throwing — this is a defensive fallback for free-text currency fields
 * (see the matching note on formatMoney in '@/lib/money'), not a real FX
 * feature; extend this function if more currencies need real conversion.
 */
export function toBaseEUR(
  originalAmountMinor: number,
  originalCurrency: string,
  mkdPerEur: number = DEFAULT_MKD_PER_EUR
): ConvertedAmount {
  const currency = (originalCurrency || 'EUR').trim().toUpperCase();

  if (currency === 'EUR') {
    return { originalAmountMinor, originalCurrency: currency, exchangeRate: 1, baseAmountMinor: originalAmountMinor };
  }

  if (currency === 'MKD') {
    const rate = mkdPerEur > 0 ? mkdPerEur : DEFAULT_MKD_PER_EUR;
    const originalMajor = originalAmountMinor / 100;
    const baseMajor = originalMajor / rate;
    return { originalAmountMinor, originalCurrency: currency, exchangeRate: rate, baseAmountMinor: Math.round(baseMajor * 100) };
  }

  return { originalAmountMinor, originalCurrency: currency, exchangeRate: 1, baseAmountMinor: originalAmountMinor };
}
