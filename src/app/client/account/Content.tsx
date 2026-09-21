'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getInitials } from '@/lib/utils';
import type { IUser } from '@/types';
import { User, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/components/providers/LanguageProvider';

export default function ClientAccountContent() {
  const { t } = useTranslation();
  const [user, setUser] = useState<IUser | null>(null);
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUser(d.user);
      setProfileForm({ name: d.user?.name ?? '', email: d.user?.email ?? '', phone: d.user?.phone ?? '' });
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (res.ok) { setUser(data.user); toast.success(t('settings.profileUpdated')); }
      else toast.error(data.error);
    } finally { setSavingProfile(false); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error(t('settings.passwordsDoNotMatch')); return; }
    if (passwordForm.newPassword.length < 8) { toast.error(t('settings.passwordTooShort')); return; }
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/users/${user!._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwordForm.newPassword }),
      });
      if (res.ok) { setPasswordForm({ newPassword: '', confirmPassword: '' }); toast.success(t('settings.passwordChanged')); }
      else { const d = await res.json(); toast.error(d.error); }
    } finally { setSavingPassword(false); }
  }

  const tabs = [
    { key: 'profile' as const, label: t('settings.profile'), icon: User },
    { key: 'password' as const, label: t('settings.password'), icon: Lock },
  ];

  return (
    <>
      <Topbar title={t('settings.account')} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto">
          {user && (
            <div className="flex items-center gap-4 mb-6 p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: '#222222', color: 'white' }}>
                {getInitials(user.name)}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex gap-0 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors"
                style={{ borderColor: tab === t.key ? '#ffffff' : 'transparent', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <form onSubmit={saveProfile} className="space-y-4 p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.editProfile')}</h3>
              <Input label={t('common.fullName')} value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} required />
              <Input label={t('common.email')} type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} required />
              <Input label={t('common.phone')} value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
              <Button type="submit" loading={savingProfile}>{t('settings.saveProfile')}</Button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={savePassword} className="space-y-4 p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.changePassword')}</h3>
              <Input label={t('settings.newPassword')} type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} required minLength={8} />
              <Input label={t('settings.confirmNewPassword')} type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} required minLength={8} />
              <Button type="submit" loading={savingPassword}>{t('settings.changePassword')}</Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
