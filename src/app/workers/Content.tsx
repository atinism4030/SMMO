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
import { Plus, UserCircle, Phone, Mail, Edit2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = { name: '', email: '', phone: '', password: '', confirmPassword: '', status: 'ACTIVE' };

export default function WorkersContent() {
  const [workers, setWorkers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editWorker, setEditWorker] = useState<IUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState<IUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/users?role=WORKER');
    const data = await res.json();
    setWorkers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  function openCreate() {
    setEditWorker(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(w: IUser) {
    setEditWorker(w);
    setForm({ name: w.name, email: w.email, phone: w.phone ?? '', password: '', confirmPassword: '', status: w.status });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!editWorker) {
      if (!form.password) { toast.error('Password is required'); return; }
      if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
      if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    } else if (form.password) {
      if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
      if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { name: form.name, email: form.email, status: form.status };
      if (form.phone) body.phone = form.phone;
      if (form.password) body.password = form.password;

      const res = await fetch(editWorker ? `/api/users/${editWorker._id}` : '/api/users', {
        method: editWorker ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editWorker ? 'Worker updated' : 'Worker account created');
      setShowForm(false);
      fetchWorkers();
    } finally { setSaving(false); }
  }

  async function toggleStatus(w: IUser) {
    const newStatus = w.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await fetch(`/api/users/${w._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { fetchWorkers(); toast.success(`Worker ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`); }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!showResetModal) return;
    if (resetPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setResetting(true);
    const res = await fetch(`/api/users/${showResetModal._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPassword }),
    });
    const data = await res.json();
    setResetting(false);
    if (res.ok) { toast.success('Password reset successfully'); setShowResetModal(null); setResetPassword(''); }
    else toast.error(data.error);
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <Topbar title="Workers" subtitle="Manage your team"
        actions={<Button onClick={openCreate}><Plus size={14} />Add Worker</Button>} />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? <LoadingSpinner fullPage /> : workers.length === 0 ? (
          <EmptyState title="No workers yet" description="Create accounts for your team members"
            icon={UserCircle} action={<Button onClick={openCreate}><Plus size={14} />Add Worker</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {workers.map(w => (
              <div key={w._id} className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: '#222222', color: '#ffffff' }}>
                    {getInitials(w.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400">Worker</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${w.status === 'ACTIVE' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}>
                    {w.status}
                  </span>
                </div>
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{w.email}</span>
                  </div>
                  {w.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{w.phone}</span>
                    </div>
                  )}
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Joined {formatDate(w.createdAt)}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => openEdit(w)}
                    className="flex-1 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    <Edit2 size={12} />Edit
                  </button>
                  <button onClick={() => { setShowResetModal(w); setResetPassword(''); }}
                    className="flex-1 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    <Lock size={12} />Reset Password
                  </button>
                  <button onClick={() => toggleStatus(w)}
                    className={`w-full py-1.5 rounded-lg text-xs transition-colors ${w.status === 'ACTIVE' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                    {w.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Worker Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editWorker ? 'Edit Worker' : 'New Worker Account'} size="sm"
        footer={
          <><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editWorker ? 'Save Changes' : 'Create Worker'}</Button></>
        }>
        <form onSubmit={handleSave} className="space-y-3">
          <Input label="Full Name *" value={form.name} onChange={f('name')} required placeholder="Sara Designer" />
          <Input label="Email *" type="email" value={form.email} onChange={f('email')} required placeholder="sara@company.com" />
          <Input label="Phone" value={form.phone} onChange={f('phone')} placeholder="+1-555-0101" />
          <Input
            label={editWorker ? 'New Password (leave blank to keep)' : 'Password * (min 8 characters)'}
            type="password" value={form.password} onChange={f('password')}
            required={!editWorker} placeholder="••••••••" />
          {(form.password || !editWorker) && (
            <Input label="Confirm Password *" type="password" value={form.confirmPassword}
              onChange={f('confirmPassword')} required={!editWorker || !!form.password} placeholder="••••••••" />
          )}
          <Select label="Status" value={form.status} onChange={f('status')}
            options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!showResetModal} onClose={() => setShowResetModal(null)}
        title={`Reset Password — ${showResetModal?.name}`} size="sm"
        footer={
          <><Button variant="secondary" onClick={() => setShowResetModal(null)}>Cancel</Button>
          <Button onClick={handleResetPassword} loading={resetting}>Reset Password</Button></>
        }>
        <form onSubmit={handleResetPassword} className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Enter a new password for <strong style={{ color: 'var(--text-primary)' }}>{showResetModal?.name}</strong>.
            They will need to use this new password to log in.
          </p>
          <Input label="New Password * (min 8 characters)" type="password" value={resetPassword}
            onChange={e => setResetPassword(e.target.value)} required placeholder="••••••••" />
        </form>
      </Modal>
    </>
  );
}
