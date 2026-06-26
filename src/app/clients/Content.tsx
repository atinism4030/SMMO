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
import type { IClient, ClientStatus } from '@/types';
import { Plus, Search, Users, Edit2, Trash2, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'OFFER_SENT', label: 'Offer Sent' },
  { value: 'WAITING_RESPONSE', label: 'Waiting Response' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CLOSED', label: 'Closed' },
];

const statusFormOptions = statusOptions.slice(1);

export default function ClientsContent() {
  const [clients, setClients] = useState<IClient[]>([]);
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
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

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
      if (!res.ok) { toast.error(data.error || 'Something went wrong'); return; }
      toast.success(editClient ? 'Client updated' : 'Client created');
      setShowForm(false);
      fetchClients();
    } catch {
      toast.error('Network error — please try again');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${deleteTarget._id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to delete'); return; }
      toast.success('Client deleted');
      setDeleteTarget(null);
      fetchClients();
    } catch {
      toast.error('Network error — please try again');
    } finally { setDeleting(false); }
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <Topbar
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''}`}
        actions={<Button onClick={openCreate}><Plus size={14} />Add Client</Button>}
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..."
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
          <EmptyState title="No clients yet" description="Add your first client to get started" icon={Users} action={<Button onClick={openCreate}><Plus size={14} />Add Client</Button>} />
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
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client.businessType ?? 'Business'}</p>
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
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client.packageName ?? 'No package'}</p>
                    {client.monthlyPrice && <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(client.monthlyPrice, client.currency)}/mo</p>}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Since {formatDate(client.startDate)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/clients/${client._id}`} className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    View Details
                  </Link>
                  <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} title="Edit"><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteTarget(client)} className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editClient ? 'Edit Client' : 'New Client'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editClient ? 'Save Changes' : 'Create Client'}</Button></>}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Client Name *" value={form.name} onChange={f('name')} required placeholder="e.g. Meda 3" />
            <Input label="Business Type" value={form.businessType} onChange={f('businessType')} placeholder="e.g. Restaurant" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Contact Person" value={form.contactPerson} onChange={f('contactPerson')} />
            <Input label="Phone" value={form.phone} onChange={f('phone')} type="tel" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" value={form.email} onChange={f('email')} type="email" />
            <Select label="Status" value={form.status} onChange={f('status')} options={statusFormOptions} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Package Name" value={form.packageName} onChange={f('packageName')} placeholder="e.g. Pro Package" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Monthly Price" value={form.monthlyPrice} onChange={f('monthlyPrice')} type="number" placeholder="1500" />
              <Input label="Currency" value={form.currency} onChange={f('currency')} placeholder="USD" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Instagram URL" value={form.instagramUrl} onChange={f('instagramUrl')} placeholder="https://instagram.com/..." />
            <Input label="Facebook URL" value={form.facebookUrl} onChange={f('facebookUrl')} placeholder="https://facebook.com/..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="TikTok URL" value={form.tiktokUrl} onChange={f('tiktokUrl')} />
            <Input label="Website URL" value={form.websiteUrl} onChange={f('websiteUrl')} />
          </div>
          <Input label="Google Drive Folder URL" value={form.driveFolderUrl} onChange={f('driveFolderUrl')} placeholder="https://drive.google.com/..." />
          <Textarea label="Notes" value={form.notes} onChange={f('notes')} rows={3} placeholder="Internal notes about this client..." />
        </form>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Client" message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`} />
    </>
  );
}
