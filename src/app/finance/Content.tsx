'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { StatCard } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import { DEFAULT_MKD_PER_EUR } from '@/lib/exchangeRate';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/finance';
import type { IWallet, IFinanceTransaction, FinanceTransactionType, IClient } from '@/types';
import {
  Plus, Wallet as WalletIcon, TrendingUp, TrendingDown, Scale, Clock, AlertCircle,
  ArrowRightLeft, PiggyBank, Ban, Search, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/components/providers/LanguageProvider';

type RangePreset = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';

function computeRange(preset: RangePreset, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date();
  if (preset === 'THIS_MONTH') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: now.toISOString() };
  }
  if (preset === 'LAST_MONTH') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString(),
    };
  }
  if (preset === 'THIS_YEAR') {
    return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: now.toISOString() };
  }
  if (preset === 'CUSTOM') {
    return { from: customFrom ? new Date(customFrom).toISOString() : undefined, to: customTo ? new Date(customTo + 'T23:59:59').toISOString() : undefined };
  }
  return {};
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

interface Summary {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  netMinor: number;
  wallets: IWallet[];
  outstandingClientReceivablesMinor: number;
  pendingPaymentConfirmationsMinor: number;
  pendingPaymentConfirmationsCount: number;
}

const emptyIncomeForm = { category: INCOME_CATEGORIES[0] as string, description: '', clientId: '', reference: '', notes: '', amount: '', currency: 'EUR', exchangeRate: String(DEFAULT_MKD_PER_EUR), walletId: '', transactionDate: todayISO() };
const emptyExpenseForm = { category: EXPENSE_CATEGORIES[0] as string, description: '', reference: '', notes: '', amount: '', currency: 'EUR', exchangeRate: String(DEFAULT_MKD_PER_EUR), walletId: '', transactionDate: todayISO() };
const emptyTransferForm = { fromWalletId: '', toWalletId: '', amount: '', currency: 'EUR', exchangeRate: String(DEFAULT_MKD_PER_EUR), description: '', transactionDate: todayISO() };

export default function FinanceContent() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<IFinanceTransaction[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);

  const [rangePreset, setRangePreset] = useState<RangePreset>('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | FinanceTransactionType>('');
  const [walletFilter, setWalletFilter] = useState('');
  const [search, setSearch] = useState('');

  const range = useMemo(() => computeRange(rangePreset, customFrom, customTo), [rangePreset, customFrom, customTo]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    const txnParams = new URLSearchParams(params);
    if (typeFilter) txnParams.set('type', typeFilter);
    if (walletFilter) txnParams.set('walletId', walletFilter);
    if (search) txnParams.set('search', search);

    const [sRes, tRes, cRes] = await Promise.all([
      fetch(`/api/finance/summary?${params}`),
      fetch(`/api/finance/transactions?${txnParams}`),
      fetch('/api/clients'),
    ]);
    const [sd, td, cd] = await Promise.all([sRes.json(), tRes.json(), cRes.json()]);
    setSummary(sd);
    setTransactions(td.transactions ?? []);
    setClients(cd.clients ?? []);
    setLoading(false);
  }, [range.from, range.to, typeFilter, walletFilter, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const wallets = summary?.wallets ?? [];

  // ─── Add Transaction ────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<FinanceTransactionType>('INCOME');
  const [incomeForm, setIncomeForm] = useState(emptyIncomeForm);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [transferForm, setTransferForm] = useState(emptyTransferForm);
  const [saving, setSaving] = useState(false);

  function openAdd(type: FinanceTransactionType, prefill?: Partial<typeof emptyTransferForm>) {
    setAddType(type);
    setIncomeForm(emptyIncomeForm);
    setExpenseForm(emptyExpenseForm);
    setTransferForm({ ...emptyTransferForm, ...prefill });
    setShowAdd(true);
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let body: Record<string, unknown>;
      if (addType === 'INCOME') {
        if (!incomeForm.amount || !incomeForm.walletId) { toast.error(t('financeAdmin.amountAndWalletRequiredIncome')); return; }
        body = { type: 'INCOME', ...incomeForm, clientId: incomeForm.clientId || undefined, exchangeRate: incomeForm.currency === 'MKD' ? incomeForm.exchangeRate : undefined };
      } else if (addType === 'EXPENSE') {
        if (!expenseForm.amount || !expenseForm.walletId) { toast.error(t('financeAdmin.amountAndWalletRequiredExpense')); return; }
        body = { type: 'EXPENSE', ...expenseForm, exchangeRate: expenseForm.currency === 'MKD' ? expenseForm.exchangeRate : undefined };
      } else {
        if (!transferForm.amount || !transferForm.fromWalletId || !transferForm.toWalletId) { toast.error(t('financeAdmin.amountAndWalletsRequiredTransfer')); return; }
        body = { type: 'TRANSFER', ...transferForm, exchangeRate: transferForm.currency === 'MKD' ? transferForm.exchangeRate : undefined };
      }
      const res = await fetch('/api/finance/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('financeAdmin.failedToRecordTransaction')); return; }
      toast.success(addType === 'INCOME' ? t('financeAdmin.incomeRecorded') : addType === 'EXPENSE' ? t('financeAdmin.expenseRecorded') : t('financeAdmin.transferRecorded'));
      setShowAdd(false);
      fetchAll();
    } finally { setSaving(false); }
  }

  // ─── Void ───────────────────────────────────────────────────────────────
  const [voidTarget, setVoidTarget] = useState<IFinanceTransaction | null>(null);
  const [voiding, setVoiding] = useState(false);

  async function handleVoid() {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      const res = await fetch(`/api/finance/transactions/${voidTarget._id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('financeAdmin.failedToVoid')); return; }
      toast.success(t('financeAdmin.transactionVoided'));
      setVoidTarget(null);
      fetchAll();
    } finally { setVoiding(false); }
  }

  function walletName(w: unknown): string {
    if (!w) return '—';
    return typeof w === 'string' ? '—' : (w as IWallet).name;
  }

  return (
    <>
      <Topbar
        title={t('finance.title')}
        subtitle={t('finance.subtitle')}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => openAdd('TRANSFER')}><ArrowRightLeft size={13} />{t('financeAdmin.transfer')}</Button>
            <Button size="sm" onClick={() => openAdd('INCOME')}><Plus size={14} />{t('financeAdmin.addTransaction')}</Button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2">
          {(['THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR', 'ALL'] as RangePreset[]).map(p => (
            <button key={p} onClick={() => setRangePreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: rangePreset === p ? 'var(--text-primary)' : 'var(--bg-card)', color: rangePreset === p ? 'var(--bg-base)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {p === 'THIS_MONTH' ? t('financeAdmin.thisMonth') : p === 'LAST_MONTH' ? t('financeAdmin.lastMonth') : p === 'THIS_YEAR' ? t('financeAdmin.thisYear') : t('financeAdmin.allTime')}
            </button>
          ))}
          <button onClick={() => setRangePreset('CUSTOM')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: rangePreset === 'CUSTOM' ? 'var(--text-primary)' : 'var(--bg-card)', color: rangePreset === 'CUSTOM' ? 'var(--bg-base)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {t('financeAdmin.custom')}
          </button>
          {rangePreset === 'CUSTOM' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('financeAdmin.to')}</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label={t('financeAdmin.statTotalIncome')} value={formatMoney(summary?.totalIncomeMinor ?? 0)} icon={TrendingUp} />
          <StatCard label={t('financeAdmin.statTotalExpenses')} value={formatMoney(summary?.totalExpenseMinor ?? 0)} icon={TrendingDown} />
          <StatCard label={t('financeAdmin.statNetResult')} value={formatMoney(summary?.netMinor ?? 0)} icon={Scale} />
          <StatCard label={t('financeAdmin.statOutstandingReceivables')} value={formatMoney(summary?.outstandingClientReceivablesMinor ?? 0)} icon={AlertCircle} />
          <StatCard label={t('financeAdmin.statPendingConfirmations')} value={formatMoney(summary?.pendingPaymentConfirmationsMinor ?? 0)} icon={Clock} subtitle={t('financeAdmin.paymentCount', { count: summary?.pendingPaymentConfirmationsCount ?? 0 })} />
        </div>

        {/* Wallets */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{t('financeAdmin.wallets')}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {wallets.map(w => (
              <div key={w._id} className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{w.name}</p>
                  {w.type === 'SAVINGS' ? <PiggyBank size={14} style={{ color: 'var(--text-muted)' }} /> : <WalletIcon size={14} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoney(w.balanceMinor)}</p>
                {w.type === 'SAVINGS' && (
                  <button onClick={() => openAdd('TRANSFER', { toWalletId: w._id })} className="text-xs mt-2 underline" style={{ color: 'var(--text-secondary)' }}>{t('financeAdmin.addToSavings')}</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('financeAdmin.searchPlaceholder')}
              className="pl-8 pr-3 py-2 rounded-lg text-sm border w-64" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as '' | FinanceTransactionType)}
            className="px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="">{t('financeAdmin.allTypes')}</option>
            <option value="INCOME">{t('financeAdmin.income')}</option>
            <option value="EXPENSE">{t('financeAdmin.expense')}</option>
            <option value="TRANSFER">{t('financeAdmin.transfer')}</option>
          </select>
          <select value={walletFilter} onChange={e => setWalletFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="">{t('financeAdmin.allWallets')}</option>
            {wallets.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
          </select>
        </div>

        {/* Transactions table */}
        {loading ? <LoadingSpinner fullPage /> : transactions.length === 0 ? (
          <EmptyState title={t('financeAdmin.noTransactions')} description={t('financeAdmin.noTransactionsDesc')} icon={WalletIcon}
            action={<Button onClick={() => openAdd('INCOME')}><Plus size={14} />{t('financeAdmin.addTransaction')}</Button>} />
        ) : (
          <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {[t('financeAdmin.colDate'), t('financeAdmin.colType'), t('financeAdmin.colCategory'), t('financeAdmin.colDescription'), t('financeAdmin.colClient'), t('financeAdmin.colAmount'), 'EUR', t('financeAdmin.colWallet'), t('financeAdmin.colStatus'), ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {transactions.map(txn => (
                  <tr key={txn._id} className={txn.status === 'VOIDED' ? 'opacity-40' : ''}>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatDate(txn.transactionDate)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full ${txn.type === 'INCOME' ? 'bg-white text-black' : txn.type === 'EXPENSE' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-400'}`}>{txn.type}</span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{txn.category ?? '—'}</td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>{txn.description ?? '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{typeof txn.clientId === 'object' ? (txn.clientId as IClient)?.name : '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatMoney(txn.originalAmountMinor, txn.originalCurrency)}</td>
                    <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{formatMoney(txn.baseAmountMinor)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {txn.type === 'TRANSFER' ? `${walletName(txn.fromWalletId)} → ${walletName(txn.toWalletId)}` : walletName(txn.walletId)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {txn.status === 'VOIDED' ? <span className="text-zinc-500">{t('financeAdmin.voided')}</span> : txn.sourcePaymentId ? <span className="flex items-center gap-1 text-zinc-400"><ExternalLink size={11} />{t('financeAdmin.billing')}</span> : <span className="text-zinc-300">{t('financeAdmin.manual')}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {txn.status === 'ACTIVE' && !txn.sourcePaymentId && (
                        <button onClick={() => setVoidTarget(txn)} title={t('financeAdmin.voidTransaction')} className="p-1.5 rounded text-red-400 hover:text-red-300"><Ban size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('financeAdmin.addTransactionTitle')} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button><Button onClick={handleAddTransaction} loading={saving}>{t('financeAdmin.save')}</Button></>}>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['INCOME', 'EXPENSE', 'TRANSFER'] as FinanceTransactionType[]).map(txnType => (
              <button key={txnType} onClick={() => setAddType(txnType)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: addType === txnType ? 'var(--text-primary)' : 'var(--bg-elevated)', color: addType === txnType ? 'var(--bg-base)' : 'var(--text-secondary)' }}>
                {txnType === 'INCOME' ? t('financeAdmin.income') : txnType === 'EXPENSE' ? t('financeAdmin.expense') : t('financeAdmin.transfer')}
              </button>
            ))}
          </div>

          {addType === 'INCOME' && (
            <form onSubmit={handleAddTransaction} className="space-y-3">
              <Select label={t('financeAdmin.categoryRequired')} value={incomeForm.category} onChange={e => setIncomeForm(p => ({ ...p, category: e.target.value }))}
                options={INCOME_CATEGORIES.map(c => ({ value: c, label: c }))} />
              <Input label={t('financeAdmin.description')} value={incomeForm.description} onChange={e => setIncomeForm(p => ({ ...p, description: e.target.value }))} placeholder={t('financeAdmin.descriptionPlaceholderIncome')} />
              <Select label={t('financeAdmin.clientOptional')} value={incomeForm.clientId} onChange={e => setIncomeForm(p => ({ ...p, clientId: e.target.value }))}
                options={[{ value: '', label: t('financeAdmin.none') }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('financeAdmin.amountRequired')} type="number" step="0.01" min="0.01" value={incomeForm.amount} onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))} required />
                <Select label={t('financeAdmin.currency')} value={incomeForm.currency} onChange={e => setIncomeForm(p => ({ ...p, currency: e.target.value }))} options={[{ value: 'EUR', label: 'EUR' }, { value: 'MKD', label: 'MKD' }]} />
              </div>
              {incomeForm.currency === 'MKD' && (
                <Input label={t('financeAdmin.exchangeRateLabel', { rate: DEFAULT_MKD_PER_EUR })} type="number" step="0.01" value={incomeForm.exchangeRate} onChange={e => setIncomeForm(p => ({ ...p, exchangeRate: e.target.value }))} />
              )}
              <Select label={t('financeAdmin.destinationWalletRequired')} value={incomeForm.walletId} onChange={e => setIncomeForm(p => ({ ...p, walletId: e.target.value }))}
                options={[{ value: '', label: t('financeAdmin.selectWallet') }, ...wallets.map(w => ({ value: w._id, label: w.name }))]} />
              <Input label={t('financeAdmin.dateRequired')} type="date" value={incomeForm.transactionDate} onChange={e => setIncomeForm(p => ({ ...p, transactionDate: e.target.value }))} required />
              <Input label={t('financeAdmin.reference')} value={incomeForm.reference} onChange={e => setIncomeForm(p => ({ ...p, reference: e.target.value }))} />
              <Textarea label={t('financeAdmin.notes')} value={incomeForm.notes} onChange={e => setIncomeForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </form>
          )}

          {addType === 'EXPENSE' && (
            <form onSubmit={handleAddTransaction} className="space-y-3">
              <Select label={t('financeAdmin.categoryRequired')} value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}
                options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} />
              <Input label={t('financeAdmin.description')} value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} placeholder={t('financeAdmin.descriptionPlaceholderExpense')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('financeAdmin.amountRequired')} type="number" step="0.01" min="0.01" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} required />
                <Select label={t('financeAdmin.currency')} value={expenseForm.currency} onChange={e => setExpenseForm(p => ({ ...p, currency: e.target.value }))} options={[{ value: 'EUR', label: 'EUR' }, { value: 'MKD', label: 'MKD' }]} />
              </div>
              {expenseForm.currency === 'MKD' && (
                <Input label={t('financeAdmin.exchangeRateLabel', { rate: DEFAULT_MKD_PER_EUR })} type="number" step="0.01" value={expenseForm.exchangeRate} onChange={e => setExpenseForm(p => ({ ...p, exchangeRate: e.target.value }))} />
              )}
              <Select label={t('financeAdmin.paidFromWalletRequired')} value={expenseForm.walletId} onChange={e => setExpenseForm(p => ({ ...p, walletId: e.target.value }))}
                options={[{ value: '', label: t('financeAdmin.selectWallet') }, ...wallets.map(w => ({ value: w._id, label: w.name }))]} />
              <Input label={t('financeAdmin.dateRequired')} type="date" value={expenseForm.transactionDate} onChange={e => setExpenseForm(p => ({ ...p, transactionDate: e.target.value }))} required />
              <Input label={t('financeAdmin.reference')} value={expenseForm.reference} onChange={e => setExpenseForm(p => ({ ...p, reference: e.target.value }))} />
              <Textarea label={t('financeAdmin.notes')} value={expenseForm.notes} onChange={e => setExpenseForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </form>
          )}

          {addType === 'TRANSFER' && (
            <form onSubmit={handleAddTransaction} className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('financeAdmin.transferHint')}</p>
              <div className="grid grid-cols-2 gap-3">
                <Select label={t('financeAdmin.fromWalletRequired')} value={transferForm.fromWalletId} onChange={e => setTransferForm(p => ({ ...p, fromWalletId: e.target.value }))}
                  options={[{ value: '', label: t('financeAdmin.select') }, ...wallets.map(w => ({ value: w._id, label: w.name }))]} />
                <Select label={t('financeAdmin.toWalletRequired')} value={transferForm.toWalletId} onChange={e => setTransferForm(p => ({ ...p, toWalletId: e.target.value }))}
                  options={[{ value: '', label: t('financeAdmin.select') }, ...wallets.map(w => ({ value: w._id, label: w.name }))]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('financeAdmin.amountRequired')} type="number" step="0.01" min="0.01" value={transferForm.amount} onChange={e => setTransferForm(p => ({ ...p, amount: e.target.value }))} required />
                <Select label={t('financeAdmin.currency')} value={transferForm.currency} onChange={e => setTransferForm(p => ({ ...p, currency: e.target.value }))} options={[{ value: 'EUR', label: 'EUR' }, { value: 'MKD', label: 'MKD' }]} />
              </div>
              {transferForm.currency === 'MKD' && (
                <Input label={t('financeAdmin.exchangeRateLabel', { rate: DEFAULT_MKD_PER_EUR })} type="number" step="0.01" value={transferForm.exchangeRate} onChange={e => setTransferForm(p => ({ ...p, exchangeRate: e.target.value }))} />
              )}
              <Input label={t('financeAdmin.dateRequired')} type="date" value={transferForm.transactionDate} onChange={e => setTransferForm(p => ({ ...p, transactionDate: e.target.value }))} required />
              <Input label={t('financeAdmin.description')} value={transferForm.description} onChange={e => setTransferForm(p => ({ ...p, description: e.target.value }))} placeholder={t('financeAdmin.descriptionPlaceholderTransfer')} />
            </form>
          )}
        </div>
      </Modal>

      <ConfirmModal open={!!voidTarget} onClose={() => setVoidTarget(null)} onConfirm={handleVoid} loading={voiding}
        title={t('financeAdmin.voidTransactionTitle')} confirmLabel={t('financeAdmin.voidTransactionTitle')}
        message={t('financeAdmin.voidTransactionConfirm')} />
    </>
  );
}
