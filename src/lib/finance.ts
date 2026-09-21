/**
 * Pure company-finance logic — no external imports, fully unit-testable.
 * DB orchestration (creating transactions, syncing payments) lives in
 * '@/lib/financeService'.
 */

export type FinanceTransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type FinanceTransactionStatus = 'ACTIVE' | 'VOIDED';

// Extendable by editing these two arrays — nothing elsewhere branches on a
// hard-coded category list, so adding a new one requires no other changes.
export const INCOME_CATEGORIES = [
  'Social Media Management',
  'Website Development',
  'Software Development',
  'Design',
  'Photography',
  'Videography',
  'Consulting',
  'Other',
] as const;

export const EXPENSE_CATEGORIES = [
  'Software',
  'Subscriptions',
  'Equipment',
  'Fuel',
  'Transportation',
  'Advertising',
  'Workers',
  'Office',
  'Hosting',
  'Taxes / Fees',
  'Other',
] as const;

export const SOURCE_PAYMENT_CATEGORY = 'Social Media Management';

export interface FinanceLedgerEntry {
  type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  baseAmountMinor: number;
  walletId?: string;
  fromWalletId?: string;
  toWalletId?: string;
}

/**
 * A wallet's balance is never stored directly — it's always derived from the
 * ledger so it can never drift out of sync with transaction history. Voided
 * transactions contribute nothing (as if they never happened); transfers
 * move money between two wallets without touching company income/expense.
 */
export function computeWalletBalanceMinor(walletId: string, entries: FinanceLedgerEntry[]): number {
  let balance = 0;
  for (const e of entries) {
    if (e.status !== 'ACTIVE') continue;
    if (e.type === 'INCOME' && e.walletId === walletId) balance += e.baseAmountMinor;
    else if (e.type === 'EXPENSE' && e.walletId === walletId) balance -= e.baseAmountMinor;
    else if (e.type === 'TRANSFER' && e.fromWalletId === walletId) balance -= e.baseAmountMinor;
    else if (e.type === 'TRANSFER' && e.toWalletId === walletId) balance += e.baseAmountMinor;
  }
  return balance;
}

export interface FinanceSummary {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  netMinor: number;
}

/**
 * Company income/expense/net — transfers are deliberately excluded from all
 * three figures (moving money between your own wallets is not revenue or
 * cost). Voided transactions are excluded entirely.
 */
export function computeFinanceSummary(entries: { type: FinanceTransactionType; status: FinanceTransactionStatus; baseAmountMinor: number }[]): FinanceSummary {
  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;
  for (const e of entries) {
    if (e.status !== 'ACTIVE') continue;
    if (e.type === 'INCOME') totalIncomeMinor += e.baseAmountMinor;
    else if (e.type === 'EXPENSE') totalExpenseMinor += e.baseAmountMinor;
  }
  return { totalIncomeMinor, totalExpenseMinor, netMinor: totalIncomeMinor - totalExpenseMinor };
}

export const FINANCE_TRANSACTION_TYPE_LABELS: Record<FinanceTransactionType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  TRANSFER: 'Transfer',
};

export const WALLET_TYPE_LABELS: Record<'PERSONAL' | 'COMPANY' | 'SAVINGS', string> = {
  PERSONAL: 'Personal',
  COMPANY: 'Company',
  SAVINGS: 'Savings',
};
