'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { PaymentStatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { StatCard } from '@/components/ui/Card';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils';
import type { IPayment, IClient, PaymentStatus } from '@/types';
import { Plus, CreditCard, DollarSign, AlertCircle, Clock, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS_OPTS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2024, i)) }));
const YEARS_OPTS = ['2024', '2025', '2026', '2027'].map(y => ({ value: y, label: y }));
const now = new Date();

const emptyForm = { clientId: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), amount: '', currency: 'USD', status: 'UNPAID' as PaymentStatus, dueDate: '', paidDate: '', paymentMethod: 'BANK', invoiceUrl: '', notes: '' };

export default function PaymentsContent() {
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPayment, setEditPayment] = useState<IPayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IPayment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clientFilter, setClientFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(String(now.getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(now.getFullYear()));
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (clientFilter) params.set('clientId', clientFilter);
    if (monthFilter) params.set('month', monthFilter);
    if (yearFilter) params.set('year', yearFilter);
    if (statusFilter) params.set('status', statusFilter);
    const [pRes, cRes] = await Promise.all([fetch(`/api/payments?${params}`), fetch('/api/clients')]);
    const [pd, cd] = await Promise.all([pRes.json(), cRes.json()]);
    setPayments(pd.payments ?? []);
    setClients(cd.clients ?? []);
    setLoading(false);
  }, [clientFilter, monthFilter, yearFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openEdit(p: IPayment) {
    setEditPayment(p);
    const cId = typeof p.clientId === 'string' ? p.clientId : (p.clientId as IClient)._id;
    setForm({ ...emptyForm, clientId: cId, month: String(p.month), year: String(p.year), amount: String(p.amount), currency: p.currency, status: p.status, dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '', paidDate: p.paidDate ? new Date(p.paidDate).toISOString().split('T')[0] : '', paymentMethod: p.paymentMethod ?? 'BANK', invoiceUrl: p.invoiceUrl ?? '', notes: p.notes ?? '' });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, amount: parseFloat(form.amount), month: parseInt(form.month), year: parseInt(form.year) };
      const res = await fetch(editPayment ? `/api/payments/${editPayment._id}` : '/api/payments', {
        method: editPayment ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editPayment ? 'Payment updated' : 'Payment added');
      setShowForm(false); setEditPayment(null); setForm(emptyForm);
      fetchData();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/payments/${deleteTarget._id}`, { method: 'DELETE' });
      setDeleteTarget(null); fetchData(); toast.success('Payment deleted');
    } finally { setDeleting(false); }
  }

  async function quickStatus(paymentId: string, status: PaymentStatus) {
    const res = await fetch(`/api/payments/${paymentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, ...(status === 'PAID' ? { paidDate: new Date().toISOString() } : {}) }) });
    const data = await res.json();
    if (res.ok) { setPayments(prev => prev.map(p => p._id === paymentId ? data.payment : p)); toast.success(`Marked as ${status}`); }
  }

  const totalExpected = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalUnpaid = payments.filter(p => p.status === 'UNPAID').reduce((s, p) => s + p.amount, 0);
  const totalLate = payments.filter(p => p.status === 'LATE').length;

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <Topbar title="Payments" subtitle="Track monthly client payments"
        actions={<Button onClick={() => { setEditPayment(null); setForm(emptyForm); setShowForm(true); }}><Plus size={14} />Add Payment</Button>} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Expected This Month" value={formatCurrency(totalExpected)} icon={DollarSign} iconColor="text-indigo-400" />
          <StatCard label="Total Paid" value={formatCurrency(totalPaid)} icon={CreditCard} iconColor="text-emerald-400" />
          <StatCard label="Unpaid" value={formatCurrency(totalUnpaid)} icon={Clock} iconColor="text-yellow-400" />
          <StatCard label="Late Payments" value={totalLate} icon={AlertCircle} iconColor="text-red-400" />
        </div>

        <div className="flex flex-wrap gap-3">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c._id} value={c._id} style={{ background: 'var(--bg-card)' }}>{c.name}</option>)}
          </select>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="">All Months</option>
            {MONTHS_OPTS.map(m => <option key={m.value} value={m.value} style={{ background: 'var(--bg-card)' }}>{m.label}</option>)}
          </select>
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            {YEARS_OPTS.map(y => <option key={y.value} value={y.value} style={{ background: 'var(--bg-card)' }}>{y.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="">All Statuses</option>
            {['PAID', 'UNPAID', 'PARTIAL', 'LATE'].map(s => <option key={s} value={s} style={{ background: 'var(--bg-card)' }}>{s}</option>)}
          </select>
        </div>

        {loading ? <LoadingSpinner fullPage /> : payments.length === 0 ? (
          <EmptyState title="No payments found" icon={CreditCard} description="Add payment records for your clients" action={<Button onClick={() => setShowForm(true)}><Plus size={14} />Add Payment</Button>} />
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Client', 'Period', 'Amount', 'Status', 'Due Date', 'Paid Date', 'Method', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {payments.map(p => {
                  const client = p.clientId as IClient;
                  return (
                    <tr key={p._id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{client?.name}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatMonthYear(p.month, p.year)}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.amount, p.currency)}</td>
                      <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(p.dueDate)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(p.paidDate)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{p.paymentMethod ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {p.status !== 'PAID' && <button onClick={() => quickStatus(p._id, 'PAID')} className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">Paid</button>}
                          {p.status !== 'LATE' && p.status !== 'PAID' && <button onClick={() => quickStatus(p._id, 'LATE')} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Late</button>}
                          <button onClick={() => openEdit(p)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><Edit2 size={12} /></button>
                          <button onClick={() => setDeleteTarget(p)} className="p-1 rounded text-red-400 hover:text-red-300"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditPayment(null); }} title={editPayment ? 'Edit Payment' : 'Add Payment'} size="md"
        footer={<><Button variant="secondary" onClick={() => { setShowForm(false); setEditPayment(null); }}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editPayment ? 'Save' : 'Add Payment'}</Button></>}>
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Client *" value={form.clientId} onChange={f('clientId')} options={[{ value: '', label: '— Select Client —' }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" value={form.month} onChange={f('month')} options={MONTHS_OPTS} />
            <Select label="Year" value={form.year} onChange={f('year')} options={YEARS_OPTS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount *" type="number" value={form.amount} onChange={f('amount')} required placeholder="1500" />
            <Input label="Currency" value={form.currency} onChange={f('currency')} placeholder="USD" />
          </div>
          <Select label="Status" value={form.status} onChange={f('status')} options={[{ value: 'UNPAID', label: 'Unpaid' }, { value: 'PAID', label: 'Paid' }, { value: 'PARTIAL', label: 'Partial' }, { value: 'LATE', label: 'Late' }]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Due Date" type="date" value={form.dueDate} onChange={f('dueDate')} />
            <Input label="Paid Date" type="date" value={form.paidDate} onChange={f('paidDate')} />
          </div>
          <Select label="Payment Method" value={form.paymentMethod} onChange={f('paymentMethod')} options={[{ value: 'BANK', label: 'Bank Transfer' }, { value: 'CASH', label: 'Cash' }, { value: 'CARD', label: 'Card' }, { value: 'OTHER', label: 'Other' }]} />
          <Input label="Invoice URL" value={form.invoiceUrl} onChange={f('invoiceUrl')} placeholder="https://..." />
          <Textarea label="Notes" value={form.notes} onChange={f('notes')} rows={2} />
        </form>
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Payment" message="Are you sure you want to delete this payment record?" />
    </>
  );
}
