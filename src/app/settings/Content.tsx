'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getInitials } from '@/lib/utils';
import { useTranslation } from '@/components/providers/LanguageProvider';
import { locales, LOCALE_LABELS } from '@/lib/i18n';
import type { IUser } from '@/types';
import { User, Lock, Building2, Languages, Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsContent() {
  const { t, locale, setLocale } = useTranslation();
  const [user, setUser] = useState<IUser | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [tab, setTab] = useState<'profile' | 'password' | 'company' | 'language' | 'email'>('profile');

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
    const res = await fetch(`/api/users/${user._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileForm),
    });
    const data = await res.json();
    if (res.ok) { setUser(data.user); toast.success(t('settings.profileUpdated')); }
    else toast.error(data.error);
    setSavingProfile(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error(t('settings.passwordsDoNotMatch')); return; }
    if (passwordForm.newPassword.length < 8) { toast.error(t('settings.passwordTooShort')); return; }
    setSavingPassword(true);
    const res = await fetch(`/api/users/${user!._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordForm.newPassword }),
    });
    if (res.ok) { setPasswordForm({ newPassword: '', confirmPassword: '' }); toast.success(t('settings.passwordChanged')); }
    else { const d = await res.json(); toast.error(d.error); }
    setSavingPassword(false);
  }

  // ─── Email test ───────────────────────────────────────────────────────
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ sent: boolean; reason?: string } | null>(null);

  async function sendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('settings.failedToSendTestEmail')); return; }
      setTestResult(data);
      if (data.sent) toast.success(t('settings.testEmailSent'));
      else toast.error(t('settings.emailNotSent'));
    } finally { setSendingTest(false); }
  }

  const tabs = [
    { key: 'profile' as const, label: t('settings.profile'), icon: User },
    { key: 'password' as const, label: t('settings.password'), icon: Lock },
    { key: 'language' as const, label: t('settings.language'), icon: Languages },
    ...(user?.role === 'CEO' ? [{ key: 'email' as const, label: t('settings.email'), icon: Mail }] : []),
    { key: 'company' as const, label: t('settings.company'), icon: Building2 },
  ];

  return (
    <>
      <Topbar title={t('settings.title')} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {user && (
            <div className="flex items-center gap-4 mb-6 p-5 rounded-xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: '#222222', color: 'white' }}>
                {getInitials(user.name)}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block bg-zinc-900 text-zinc-400">
                  {user.role === 'CEO' ? t('nav.ceoCoFounder') : user.role === 'WORKER' ? t('nav.worker') : t('nav.clientRole')}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-0 mb-6 border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
            {tabs.map(tb => (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className="px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                style={{
                  borderColor: tab === tb.key ? '#ffffff' : 'transparent',
                  color: tab === tb.key ? 'var(--text-primary)' : 'var(--text-muted)',
                }}>
                <tb.icon size={14} />{tb.label}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <form onSubmit={saveProfile} className="space-y-4 p-5 rounded-xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.editProfile')}</h3>
              <Input label={t('common.fullName')} value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} required />
              <Input label={t('common.email')} type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} required />
              <Input label={t('common.phone')} value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
              <Button type="submit" loading={savingProfile}>{t('settings.saveProfile')}</Button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={savePassword} className="space-y-4 p-5 rounded-xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.changePassword')}</h3>
              <Input label={t('settings.newPassword')} type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} required minLength={8} />
              <Input label={t('settings.confirmNewPassword')} type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} required minLength={8} />
              <Button type="submit" loading={savingPassword}>{t('settings.changePassword')}</Button>
            </form>
          )}

          {tab === 'language' && (
            <div className="p-5 rounded-xl border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.language')}</h3>
              <div className="flex gap-2">
                {locales.map(l => (
                  <button key={l} onClick={() => setLocale(l)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                    style={{
                      background: locale === l ? 'var(--text-primary)' : 'var(--bg-elevated)',
                      color: locale === l ? 'var(--bg-base)' : 'var(--text-secondary)',
                      borderColor: 'var(--border)',
                    }}>
                    {LOCALE_LABELS[l]}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('settings.languageSavedNote')}</p>
            </div>
          )}

          {tab === 'email' && user?.role === 'CEO' && (
            <div className="space-y-4">
              <form onSubmit={sendTestEmail} className="p-5 rounded-xl border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.testEmailDelivery')}</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('settings.testEmailDeliveryDesc')}
                </p>
                <Input label={t('settings.sendTestTo')} type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} required placeholder="you@company.com" />
                <Button type="submit" loading={sendingTest}><Send size={13} />{t('settings.sendTestEmail')}</Button>

                {testResult && (
                  <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-elevated)', color: testResult.sent ? 'var(--text-secondary)' : '#f87171' }}>
                    {testResult.sent ? t('settings.sentSuccessfully') : t('settings.notSent', { reason: testResult.reason ?? '' })}
                  </div>
                )}
              </form>
              <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('settings.configuration')}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {t('settings.configurationDesc')}
                </p>
              </div>
            </div>
          )}

          {tab === 'company' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Horizonte Digital Group</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {t('settings.companyWideSettings')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
