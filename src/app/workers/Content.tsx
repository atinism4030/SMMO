'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, getInitials } from '@/lib/utils';
import type { IUser } from '@/types';
import { Plus, UserCircle, Phone, Mail, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = { name: '', email: '', password: '', phone: '', role: 'WORKER', status: 'ACTIVE' };

export default function WorkersContent() {
  const [workers, setWorkers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editWorker, setEditWorker] = useState<IUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    const data = await res.json();
    setWorkers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  function openEdit(w: IUser) { setEditWorker(w); setForm({ ...emptyForm, name: w.name, email: w.email, phone: w.phone ?? '', role: w.role, status: w.status, password: '' }); setShowForm(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form };
      if (!body.password) delete (body as Partial<typeof body>).password;
      const res = await fetch(editWorker ? `/api/users/${editWorker._id}` : '/api/users', {
        method: editWorker ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editWorker ? 'User updated' : 'User created');
      setShowForm(false); setEditWorker(null); setForm(emptyForm);
      fetchWorkers();
    } finally { setSaving(false); }
  }

  async function toggleStatus(w: IUser) {
    const newStatus = w.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await fetch(`/api/users/${w._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) { fetchWorkers(); toast.success(`User ${newStatus.toLowerCase()}`); }
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <Topbar title="Workers" subtitle="Manage your team" actions={<Button onClick={() => { setEditWorker(null); setForm(emptyForm); setShowForm(true); }}><Plus size={14} />Add Worker</Button>} />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? <LoadingSpinner fullPage /> : workers.length === 0 ? (
          <EmptyState title="No users yet" description="Create worker accounts for your team" icon={UserCircle} action={<Button onClick={() => setShowForm(true)}><Plus size={14} />Add Worker</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {workers.map(w => (
              <div key={w._id} className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>{getInitials(w.name)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${w.role === 'CEO' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{w.role}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{w.status}</span>
                </div>
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2"><Mail size={12} style={{ color: 'var(--text-muted)' }} /><span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{w.email}</span></div>
                  {w.phone && <div className="flex items-center gap-2"><Phone size={12} style={{ color: 'var(--text-muted)' }} /><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{w.phone}</span></div>}
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Joined {formatDate(w.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(w)} className="flex-1 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}><Edit2 size={12} />Edit</button>
                  <button onClick={() => toggleStatus(w)} className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${w.status === 'ACTIVE' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                    {w.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditWorker(null); }} title={editWorker ? 'Edit User' : 'New Worker Account'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editWorker ? 'Save' : 'Create'}</Button></>}>
        <form onSubmit={handleSave} className="space-y-3">
          <Input label="Full Name *" value={form.name} onChange={f('name')} required />
          <Input label="Email *" type="email" value={form.email} onChange={f('email')} required />
          <Input label={editWorker ? 'New Password (leave blank to keep)' : 'Password *'} type="password" value={form.password} onChange={f('password')} required={!editWorker} />
          <Input label="Phone" value={form.phone} onChange={f('phone')} />
          <Select label="Role" value={form.role} onChange={f('role')} options={[{ value: 'WORKER', label: 'Worker' }, { value: 'CEO', label: 'CEO / Admin' }]} />
          <Select label="Status" value={form.status} onChange={f('status')} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
        </form>
      </Modal>
    </>
  );
}
