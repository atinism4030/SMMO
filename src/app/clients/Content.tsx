'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { ClientStatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { toMinorUnits, formatMoney } from '@/lib/money';
import { toBaseEUR } from '@/lib/exchangeRate';
import type { IClient, ClientStatus } from '@/types';
import { Plus, Search, Users, Edit2, Trash2, Phone, Mail, TrendingUp, CalendarRange } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTranslation } from '@/components/providers/LanguageProvider';
import type { TranslationKey } from '@/lib/i18n';

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

const emptyForm = {
  name: '', businessType: '', contactPerson: '', phone: '', email: '',
  instagramUrl: '', facebookUrl: '', tiktokUrl: '', websiteUrl: '',
  packageName: '', monthlyPrice: '', currency: 'USD',
  status: 'LEAD' as ClientStatus, notes: '', driveFolderUrl: '',
};

const statusKeys: { value: string; labelKey: TranslationKey }[] = [
  { value: '', labelKey: 'clients.allStatuses' },
  { value: 'LEAD', labelKey: 'badges.clientStatusLead' },
  { value: 'OFFER_SENT', labelKey: 'badges.clientStatusOfferSent' },
  { value: 'WAITING_RESPONSE', labelKey: 'badges.clientStatusWaitingResponse' },
  { value: 'ACCEPTED', labelKey: 'badges.clientStatusAccepted' },
  { value: 'ACTIVE', labelKey: 'badges.clientStatusActive' },
  { value: 'INACTIVE', labelKey: 'badges.clientStatusInactive' },
  { value: 'REJECTED', labelKey: 'badges.clientStatusRejected' },
  { value: 'PAUSED', labelKey: 'badges.clientStatusPaused' },
  { value: 'CLOSED', labelKey: 'badges.clientStatusClosed' },
];

export default function ClientsContent() {
  const { t } = useTranslation();
  const statusOptions = statusKeys.map(s => ({ value: s.value, label: t(s.labelKey) }));
  const statusFormOptions = statusOptions.slice(1);
  const [clients, setClients] = useState<IClient[]>([]);
  const [activeClients, setActiveClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<IClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IClient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/clients?${params}`);
      const data = await readJsonSafe(res);
      setClients(data.clients ?? []);
    } catch {
      toast.error(t('clients.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, t]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { fetchClients(); }, [fetchClients]);

  // MRR/ARR must reflect the whole company, not whatever search/status filter is
  // currently applied to the list above — fetched once, independently.
  const fetchActiveClients = useCallback(async () => {
    const res = await fetch('/api/clients?status=ACTIVE');
    const data = await readJsonSafe(res);
    setActiveClients(data.clients ?? []);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { fetchActiveClients(); }, [fetchActiveClients]);

  // Every client's monthlyPrice/currency is normalized to EUR minor units (same
  // defensive 1:1 fallback as Finance) before summing, so mixed currencies don't
  // silently produce a meaningless total.
  const mrrMinor = activeClients.reduce((sum, c) => {
    if (!c.monthlyPrice) return sum;
    const { baseAmountMinor } = toBaseEUR(toMinorUnits(c.monthlyPrice), c.currency ?? 'EUR');
    return sum + baseAmountMinor;
  }, 0);
  const arrMinor = mrrMinor * 12;
  const payingClientsCount = activeClients.filter((c) => c.monthlyPrice).length;

  function openCreate() { setForm(emptyForm); setEditClient(null); setShowForm(true); }
  function openEdit(c: IClient) { setForm({ ...c, monthlyPrice: String(c.monthlyPrice ?? '') } as typeof emptyForm); setEditClient(c); setShowForm(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, monthlyPrice: form.monthlyPrice ? parseFloat(form.monthlyPrice) : undefined };
      const res = await fetch(editClient ? `/api/clients/${editClient._id}` : '/api/clients', {
        method: editClient ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) { toast.error(data.error || t('clients.somethingWentWrong')); return; }
      toast.success(editClient ? t('clients.clientUpdated') : t('clients.clientCreated'));
      setShowForm(false);
      fetchClients();
      fetchActiveClients();
    } catch {
      toast.error(t('clients.networkError'));
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${deleteTarget._id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error(t('clients.failedToDelete')); return; }
      toast.success(t('clients.clientDeleted'));
      setDeleteTarget(null);
      fetchClients();
      fetchActiveClients();
    } catch {
      toast.error(t('clients.networkError'));
    } finally { setDeleting(false); }
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <Topbar
        title={t('clients.title')}
        subtitle={t('clients.clientCount', { count: clients.length, plural: clients.length !== 1 ? 's' : '' })}
        actions={<Button onClick={openCreate}><Plus size={14} />{t('clients.addClient')}</Button>}
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard label={t('clients.mrrFull')} value={formatMoney(mrrMinor)} icon={TrendingUp}
            subtitle={t('clients.activeClientsCount', { count: payingClientsCount, plural: payingClientsCount === 1 ? '' : 's' })} />
          <StatCard label={t('clients.arrFull')} value={formatMoney(arrMinor)} icon={CalendarRange} />
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('clients.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            {statusOptions.map(o => <option key={o.value} value={o.value} style={{ background: 'var(--bg-card)' }}>{o.label}</option>)}
          </select>
        </div>

        {loading ? (
          <LoadingSpinner fullPage />
        ) : clients.length === 0 ? (
          <EmptyState title={t('clients.noClientsYet')} description={t('clients.noClientsYetDesc')} icon={Users} action={<Button onClick={openCreate}><Plus size={14} />{t('clients.addClient')}</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div key={client._id} className="rounded-xl border p-5 hover:border-zinc-700 transition-all duration-150" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: '#222222', color: '#ffffff' }}>
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{client.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client.businessType ?? t('clients.business')}</p>
                    </div>
                  </div>
                  <ClientStatusBadge status={client.status} />
                </div>

                {(client.contactPerson || client.phone || client.email) && (
                  <div className="space-y-1 mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    {client.contactPerson && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{client.contactPerson}</p>}
                    {client.phone && <div className="flex items-center gap-1.5"><Phone size={11} style={{ color: 'var(--text-muted)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{client.phone}</span></div>}
                    {client.email && <div className="flex items-center gap-1.5"><Mail size={11} style={{ color: 'var(--text-muted)' }} /><span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{client.email}</span></div>}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client.packageName ?? t('clients.noPackage')}</p>
                    {client.monthlyPrice && <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(client.monthlyPrice, client.currency)}/mo</p>}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('clients.since', { date: formatDate(client.startDate) })}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/clients/${client._id}`} className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    {t('clients.viewDetails')}
                  </Link>
                  <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} title={t('clients.edit')}><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteTarget(client)} className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} title={t('clients.delete')}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editClient ? t('clients.editClient') : t('clients.newClient')} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button><Button onClick={handleSave} loading={saving}>{editClient ? t('clients.saveChanges') : t('clients.createClient')}</Button></>}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('clients.clientName')} value={form.name} onChange={f('name')} required placeholder={t('clients.clientNamePlaceholder')} />
            <Input label={t('clients.businessType')} value={form.businessType} onChange={f('businessType')} placeholder={t('clients.businessTypePlaceholder')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('clients.contactPerson')} value={form.contactPerson} onChange={f('contactPerson')} />
            <Input label={t('clients.phone')} value={form.phone} onChange={f('phone')} type="tel" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('clients.email')} value={form.email} onChange={f('email')} type="email" />
            <Select label={t('clients.status')} value={form.status} onChange={f('status')} options={statusFormOptions} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('clients.packageName')} value={form.packageName} onChange={f('packageName')} placeholder={t('clients.packageNamePlaceholder')} />
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('clients.monthlyPrice')} value={form.monthlyPrice} onChange={f('monthlyPrice')} type="number" placeholder="1500" />
              <Input label={t('clients.currency')} value={form.currency} onChange={f('currency')} placeholder="USD" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('clients.instagramUrl')} value={form.instagramUrl} onChange={f('instagramUrl')} placeholder="https://instagram.com/..." />
            <Input label={t('clients.facebookUrl')} value={form.facebookUrl} onChange={f('facebookUrl')} placeholder="https://facebook.com/..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('clients.tiktokUrl')} value={form.tiktokUrl} onChange={f('tiktokUrl')} />
            <Input label={t('clients.websiteUrl')} value={form.websiteUrl} onChange={f('websiteUrl')} />
          </div>
          <Input label={t('clients.driveFolderUrl')} value={form.driveFolderUrl} onChange={f('driveFolderUrl')} placeholder="https://drive.google.com/..." />
          <Textarea label={t('clients.notes')} value={form.notes} onChange={f('notes')} rows={3} placeholder={t('clients.notesPlaceholder')} />
        </form>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title={t('clients.deleteClient')} message={t('clients.deleteClientConfirm', { name: deleteTarget?.name ?? '' })} />
    </>
  );
}
