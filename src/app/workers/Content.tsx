'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, getInitials } from '@/lib/utils';
import type { IUser, IClient } from '@/types';
import { Plus, UserCircle, Phone, Mail, Edit2, Lock, Crown, Users2, Search, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/components/providers/LanguageProvider';

const emptyWorkerForm = { name: '', email: '', phone: '', password: '', confirmPassword: '', status: 'ACTIVE' };
const emptyCoFounderForm = { name: '', email: '', password: '', confirmPassword: '' };

export default function WorkersContent() {
  const { t } = useTranslation();
  const [coFounders, setCoFounders] = useState<IUser[]>([]);
  const [workers, setWorkers] = useState<IUser[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [clientAccounts, setClientAccounts] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientSearch, setClientSearch] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [ceoRes, workerRes, clientRes, clientAccountRes] = await Promise.all([
      fetch('/api/users?role=CEO'),
      fetch('/api/users?role=WORKER'),
      fetch('/api/clients'),
      fetch('/api/users?role=CLIENT'),
    ]);
    const [ceoData, workerData, clientData, clientAccountData] = await Promise.all([
      ceoRes.json(), workerRes.json(), clientRes.json(), clientAccountRes.json(),
    ]);
    setCoFounders(ceoData.users ?? []);
    setWorkers(workerData.users ?? []);
    setClients(clientData.clients ?? []);
    setClientAccounts(clientAccountData.users ?? []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const accountByClientId = new Map(clientAccounts.map(a => [typeof a.clientId === 'string' ? a.clientId : (a.clientId as IClient)?._id, a]));
  const filteredClients = clients.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()));

  // ─── Co-Founders ────────────────────────────────────────────────────────
  const [showCoFounderForm, setShowCoFounderForm] = useState(false);
  const [coFounderForm, setCoFounderForm] = useState(emptyCoFounderForm);
  const [savingCoFounder, setSavingCoFounder] = useState(false);

  async function handleSaveCoFounder(e: React.FormEvent) {
    e.preventDefault();
    if (coFounderForm.password.length < 8) { toast.error(t('workers.passwordTooShort')); return; }
    if (coFounderForm.password !== coFounderForm.confirmPassword) { toast.error(t('workers.passwordsDoNotMatch')); return; }
    setSavingCoFounder(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: coFounderForm.name, email: coFounderForm.email, password: coFounderForm.password, role: 'CEO' }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(t('workers.coFounderCreated'));
      setShowCoFounderForm(false);
      setCoFounderForm(emptyCoFounderForm);
      fetchAll();
    } finally { setSavingCoFounder(false); }
  }

  async function toggleCoFounderStatus(u: IUser) {
    const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmMsg = newStatus === 'INACTIVE' ? t('workers.confirmDeactivateCoFounder', { name: u.name }) : t('workers.confirmReactivateCoFounder', { name: u.name });
    if (!confirm(confirmMsg)) return;
    const res = await fetch(`/api/users/${u._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { fetchAll(); toast.success(newStatus === 'ACTIVE' ? t('workers.accountReactivated') : t('workers.accountDeactivated')); }
  }

  // ─── Workers ────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editWorker, setEditWorker] = useState<IUser | null>(null);
  const [form, setForm] = useState(emptyWorkerForm);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState<IUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  function openCreate() {
    setEditWorker(null);
    setForm(emptyWorkerForm);
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
      if (!form.password) { toast.error(t('workers.passwordIsRequired')); return; }
      if (form.password.length < 8) { toast.error(t('workers.passwordTooShort')); return; }
      if (form.password !== form.confirmPassword) { toast.error(t('workers.passwordsDoNotMatch')); return; }
    } else if (form.password) {
      if (form.password.length < 8) { toast.error(t('workers.passwordTooShort')); return; }
      if (form.password !== form.confirmPassword) { toast.error(t('workers.passwordsDoNotMatch')); return; }
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
      toast.success(editWorker ? t('workers.workerUpdated') : t('workers.workerCreated'));
      setShowForm(false);
      fetchAll();
    } finally { setSaving(false); }
  }

  async function toggleStatus(w: IUser) {
    const newStatus = w.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await fetch(`/api/users/${w._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { fetchAll(); toast.success(newStatus === 'ACTIVE' ? t('workers.workerActivated') : t('workers.workerDeactivated')); }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!showResetModal) return;
    if (resetPassword.length < 8) { toast.error(t('workers.passwordTooShort')); return; }
    setResetting(true);
    const res = await fetch(`/api/users/${showResetModal._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPassword }),
    });
    const data = await res.json();
    setResetting(false);
    if (res.ok) { toast.success(t('workers.passwordResetSuccess')); setShowResetModal(null); setResetPassword(''); }
    else toast.error(data.error);
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (loading) return <><Topbar title={t('workers.title')} subtitle={t('workers.subtitle')} /><LoadingSpinner fullPage /></>;

  return (
    <>
      <Topbar title={t('workers.title')} subtitle={t('workers.subtitle')} />
      <div className="flex-1 overflow-y-auto p-6 space-y-10">

        {/* ─── Co-Founders ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown size={16} style={{ color: 'var(--text-muted)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('workers.coFounders')}</h2>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { setCoFounderForm(emptyCoFounderForm); setShowCoFounderForm(true); }}>
              <Plus size={13} />{t('workers.addCoFounder')}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coFounders.map(u => (
              <div key={u._id} className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: '#ffffff', color: '#000000' }}>
                    {getInitials(u.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('workers.ceoCoFounder')}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${u.status === 'ACTIVE' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}>{u.status === 'ACTIVE' ? t('workers.active') : t('workers.inactive')}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{u.email}</span>
                </div>
                <button onClick={() => toggleCoFounderStatus(u)}
                  className={`w-full py-1.5 rounded-lg text-xs transition-colors ${u.status === 'ACTIVE' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                  {u.status === 'ACTIVE' ? t('workers.deactivate') : t('workers.reactivate')}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Workers ─────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCircle size={16} style={{ color: 'var(--text-muted)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('workers.workersSection')}</h2>
            </div>
            <Button size="sm" onClick={openCreate}><Plus size={13} />{t('workers.addWorker')}</Button>
          </div>
          {workers.length === 0 ? (
            <EmptyState title={t('workers.noWorkersYet')} description={t('workers.noWorkersYetDesc')} icon={UserCircle} action={<Button onClick={openCreate}><Plus size={14} />{t('workers.addWorker')}</Button>} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {workers.map(w => (
                <div key={w._id} className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: '#222222', color: '#ffffff' }}>
                      {getInitials(w.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400">{t('workers.worker')}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${w.status === 'ACTIVE' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}>{w.status === 'ACTIVE' ? t('workers.active') : t('workers.inactive')}</span>
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
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('workers.joined', { date: formatDate(w.createdAt) })}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => openEdit(w)} className="flex-1 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                      <Edit2 size={12} />{t('workers.edit')}
                    </button>
                    <button onClick={() => { setShowResetModal(w); setResetPassword(''); }} className="flex-1 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                      <Lock size={12} />{t('workers.resetPassword')}
                    </button>
                    <button onClick={() => toggleStatus(w)} className={`w-full py-1.5 rounded-lg text-xs transition-colors ${w.status === 'ACTIVE' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                      {w.status === 'ACTIVE' ? t('workers.deactivate') : t('workers.activate')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── Client Accounts ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Users2 size={16} style={{ color: 'var(--text-muted)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('workers.clientAccounts')}</h2>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder={t('workers.searchClientsPlaceholder')}
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs border w-52" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          {filteredClients.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('workers.noClientsFound')}</p>
          ) : (
            <div className="rounded-xl border overflow-hidden divide-y" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              {filteredClients.map(c => {
                const account = accountByClientId.get(c._id);
                return (
                  <Link key={c._id} href={`/clients/${c._id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      {account && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{account.email}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {account ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${account.status === 'ACTIVE' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}>
                          {account.status === 'ACTIVE' ? t('workers.portalActive') : t('workers.portalInactive')}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-600">{t('workers.portalNotCreated')}</span>
                      )}
                      <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create/Edit Worker Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editWorker ? t('workers.editWorker') : t('workers.newWorkerAccount')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button><Button onClick={handleSave} loading={saving}>{editWorker ? t('workers.saveChanges') : t('workers.createWorker')}</Button></>}>
        <form onSubmit={handleSave} className="space-y-3">
          <Input label={t('workers.fullNameRequired')} value={form.name} onChange={f('name')} required placeholder="Sara Designer" />
          <Input label={t('workers.emailRequired')} type="email" value={form.email} onChange={f('email')} required placeholder="sara@company.com" />
          <Input label={t('workers.phone')} value={form.phone} onChange={f('phone')} placeholder="+1-555-0101" />
          <Input label={editWorker ? t('workers.newPasswordOptional') : t('workers.passwordRequiredMin')}
            type="password" value={form.password} onChange={f('password')} required={!editWorker} placeholder="••••••••" />
          {(form.password || !editWorker) && (
            <Input label={t('workers.confirmPasswordRequired')} type="password" value={form.confirmPassword} onChange={f('confirmPassword')} required={!editWorker || !!form.password} placeholder="••••••••" />
          )}
          <Select label={t('workers.status')} value={form.status} onChange={f('status')} options={[{ value: 'ACTIVE', label: t('common.active') }, { value: 'INACTIVE', label: t('common.inactive') }]} />
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!showResetModal} onClose={() => setShowResetModal(null)}
        title={t('workers.resetPasswordTitle', { name: showResetModal?.name ?? '' })} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowResetModal(null)}>{t('common.cancel')}</Button><Button onClick={handleResetPassword} loading={resetting}>{t('workers.resetPassword')}</Button></>}>
        <form onSubmit={handleResetPassword} className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('workers.resetPasswordDesc', { name: showResetModal?.name ?? '' })}
          </p>
          <Input label={t('workers.newPasswordRequiredMin')} type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} required placeholder="••••••••" />
        </form>
      </Modal>

      {/* Add Co-Founder Modal */}
      <Modal open={showCoFounderForm} onClose={() => setShowCoFounderForm(false)} title={t('workers.addCoFounder')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowCoFounderForm(false)}>{t('common.cancel')}</Button><Button onClick={handleSaveCoFounder} loading={savingCoFounder}>{t('workers.createAccount')}</Button></>}>
        <form onSubmit={handleSaveCoFounder} className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('workers.addCoFounderDesc')}</p>
          <Input label={t('workers.fullNameRequired')} value={coFounderForm.name} onChange={e => setCoFounderForm(p => ({ ...p, name: e.target.value }))} required placeholder="Ethnik" />
          <Input label={t('workers.emailRequired')} type="email" value={coFounderForm.email} onChange={e => setCoFounderForm(p => ({ ...p, email: e.target.value }))} required placeholder="ethnik@horizonte.com" />
          <Input label={t('workers.passwordRequiredMin')} type="password" value={coFounderForm.password} onChange={e => setCoFounderForm(p => ({ ...p, password: e.target.value }))} required minLength={8} placeholder="••••••••" />
          <Input label={t('workers.confirmPasswordRequired')} type="password" value={coFounderForm.confirmPassword} onChange={e => setCoFounderForm(p => ({ ...p, confirmPassword: e.target.value }))} required minLength={8} placeholder="••••••••" />
        </form>
      </Modal>
    </>
  );
}
