'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getInitials } from '@/lib/utils';
import type { IUser } from '@/types';
import { User, Lock, Building2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsContent() {
  const [user, setUser] = useState<IUser | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [tab, setTab] = useState<'profile' | 'password' | 'agency'>('profile');

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
    const res = await fetch(`/api/users/${user._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileForm) });
    const data = await res.json();
    if (res.ok) { setUser(data.user); toast.success('Profile updated'); }
    else toast.error(data.error);
    setSavingProfile(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passwordForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPassword(true);
    const res = await fetch(`/api/users/${user!._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwordForm.newPassword }) });
    if (res.ok) { setPasswordForm({ newPassword: '', confirmPassword: '' }); toast.success('Password changed'); }
    else { const d = await res.json(); toast.error(d.error); }
    setSavingPassword(false);
  }

  async function runSeed() {
    setSeeding(true);
    const res = await fetch('/api/seed', { method: 'POST' });
    const data = await res.json();
    if (res.ok) toast.success(`Seed complete: ${JSON.stringify(data.data)}`);
    else toast.error('Seed failed');
    setSeeding(false);
  }

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: User },
    { key: 'password' as const, label: 'Password', icon: Lock },
    { key: 'agency' as const, label: 'Agency', icon: Building2 },
  ];

  return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {user && (
            <div className="flex items-center gap-4 mb-6 p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>{getInitials(user.name)}</div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${user.role === 'CEO' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{user.role}</span>
              </div>
            </div>
          )}

          <div className="flex gap-0 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors"
                style={{ borderColor: tab === t.key ? '#6366f1' : 'transparent', color: tab === t.key ? '#a5b4fc' : 'var(--text-muted)' }}>
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <form onSubmit={saveProfile} className="space-y-4 p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Profile</h3>
              <Input label="Full Name" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} required />
              <Input label="Email" type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} required />
              <Input label="Phone" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
              <Button type="submit" loading={savingProfile}>Save Profile</Button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={savePassword} className="space-y-4 p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Change Password</h3>
              <Input label="New Password" type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} required />
              <Input label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
              <Button type="submit" loading={savingPassword}>Change Password</Button>
            </form>
          )}

          {tab === 'agency' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Future Integrations</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Google Calendar sync is planned for a future version.</p>
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Google Calendar</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connect your Google Calendar to auto-sync deadlines and scheduled posts. Coming soon.</p>
                </div>
              </div>

              {user?.role === 'CEO' && (
                <div className="p-5 rounded-xl border border-yellow-500/20" style={{ background: 'rgba(234,179,8,0.05)' }}>
                  <h3 className="text-sm font-semibold mb-2 text-yellow-400">Developer Tools</h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Re-seed the database with demo data (this will delete all existing data).</p>
                  <Button variant="secondary" size="sm" loading={seeding} onClick={runSeed}><RefreshCw size={13} />Re-seed Demo Data</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
