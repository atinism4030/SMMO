'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/components/providers/LanguageProvider';

interface PortalAccount {
  _id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function PortalAccessCard({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { t } = useTranslation();
  const [account, setAccount] = useState<PortalAccount | null | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: clientName, email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/portal-access`);
    const data = await res.json();
    setAccount(data.account ?? null);
  }, [clientId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ name: clientName, email: '', password: '' });
    setShowCreate(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/portal-access`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('portalAccess.failedToCreate')); return; }
      toast.success(t('portalAccess.portalAccessCreated'));
      setShowCreate(false);
      load();
    } finally { setSaving(false); }
  }

  async function toggleStatus() {
    if (!account) return;
    setToggling(true);
    try {
      const nextStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const res = await fetch(`/api/clients/${clientId}/portal-access`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('portalAccess.failedToUpdate')); return; }
      toast.success(nextStatus === 'ACTIVE' ? t('portalAccess.portalAccessReactivated') : t('portalAccess.portalAccessDeactivated'));
      setAccount(data.account);
    } finally { setToggling(false); }
  }

  if (account === undefined) return null;

  return (
    <>
      <div className="mt-4 rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('portalAccess.title')}</h3>
          <KeyRound size={15} style={{ color: 'var(--text-muted)' }} />
        </div>
        {!account ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('portalAccess.notCreated')}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('portalAccess.notCreatedDesc')}</p>
            </div>
            <Button size="sm" onClick={openCreate}>{t('portalAccess.createClientAccount')}</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {account.status === 'ACTIVE' ? t('portalAccess.active') : t('portalAccess.deactivated')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{account.email}</p>
            </div>
            <Button size="sm" variant={account.status === 'ACTIVE' ? 'danger' : 'secondary'} onClick={toggleStatus} loading={toggling}>
              {account.status === 'ACTIVE' ? t('portalAccess.deactivate') : t('portalAccess.reactivate')}
            </Button>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('portalAccess.createClientAccount')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button><Button onClick={handleCreate} loading={saving}>{t('portalAccess.createAccount')}</Button></>}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label={t('portalAccess.nameRequired')} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label={t('portalAccess.emailRequired')} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required placeholder="client@company.com" />
          <div className="relative">
            <Input label={t('portalAccess.temporaryPasswordRequired')} type={showPassword ? 'text' : 'password'} value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
            <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-8" style={{ color: 'var(--text-muted)' }}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('portalAccess.shareCredentialsNote')}</p>
        </form>
      </Modal>
    </>
  );
}
