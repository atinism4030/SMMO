'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getInitials } from '@/lib/utils';
import type { IUser } from '@/types';
import { User, Lock, Building2, FlaskConical, CheckCircle2, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function SettingsContent() {
  const [user, setUser] = useState<IUser | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [tab, setTab] = useState<'profile' | 'password' | 'agency' | 'demo'>('profile');

  // Demo data state
  const now = new Date();
  const [demoMonth, setDemoMonth] = useState(now.getMonth() + 1);
  const [demoYear, setDemoYear] = useState(now.getFullYear());
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [demoExists, setDemoExists] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUser(d.user);
      setProfileForm({ name: d.user?.name ?? '', email: d.user?.email ?? '', phone: d.user?.phone ?? '' });
    });
  }, []);

  // Check if demo data exists when switching to demo tab
  useEffect(() => {
    if (tab === 'demo' && demoExists === null) {
      checkDemoExists();
    }
  }, [tab]);

  async function checkDemoExists() {
    const res = await fetch('/api/clients?isDemo=true&limit=1');
    const data = await res.json();
    setDemoExists((data.clients ?? []).length > 0);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const res = await fetch(`/api/users/${user._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileForm),
    });
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
    const res = await fetch(`/api/users/${user!._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordForm.newPassword }),
    });
    if (res.ok) { setPasswordForm({ newPassword: '', confirmPassword: '' }); toast.success('Password changed'); }
    else { const d = await res.json(); toast.error(d.error); }
    setSavingPassword(false);
  }

  async function createDemoData() {
    setCreatingDemo(true);
    const res = await fetch('/api/demo-data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: demoMonth, year: demoYear }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Demo data created — ${data.data.tasks} cards across 2 clients`);
      setDemoExists(true);
    } else {
      toast.error(data.error ?? 'Failed to create demo data');
      if (res.status === 409) setDemoExists(true);
    }
    setCreatingDemo(false);
  }

  async function resetDemoData() {
    if (!confirm('This will delete all demo data. Continue?')) return;
    setResettingDemo(true);
    const res = await fetch('/api/demo-data', { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Demo data reset — ${data.data.tasksDeleted} cards removed`);
      setDemoExists(false);
    } else {
      toast.error(data.error ?? 'Failed to reset demo data');
    }
    setResettingDemo(false);
  }

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: User },
    { key: 'password' as const, label: 'Password', icon: Lock },
    { key: 'agency' as const, label: 'Agency', icon: Building2 },
    ...(user?.role === 'CEO' ? [{ key: 'demo' as const, label: 'Demo Data', icon: FlaskConical }] : []),
  ];

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {user && (
            <div className="flex items-center gap-4 mb-6 p-5 rounded-xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
                {getInitials(user.name)}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${user.role === 'CEO' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {user.role}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-0 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors"
                style={{
                  borderColor: tab === t.key ? '#6366f1' : 'transparent',
                  color: tab === t.key ? '#a5b4fc' : 'var(--text-muted)',
                }}>
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <form onSubmit={saveProfile} className="space-y-4 p-5 rounded-xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Profile</h3>
              <Input label="Full Name" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} required />
              <Input label="Email" type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} required />
              <Input label="Phone" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
              <Button type="submit" loading={savingProfile}>Save Profile</Button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={savePassword} className="space-y-4 p-5 rounded-xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
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
            </div>
          )}

          {tab === 'demo' && (
            <div className="space-y-5">

              {/* Header card */}
              <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical size={16} className="text-indigo-400" />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Demo Report Data</h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Creates realistic sample data to test the Reports system and PDF generation. Includes 2 demo clients
                  (Timimetal and Meda 3), monthly boards, posted content cards — some with completed metrics, some missing insights.
                  Demo records are marked with <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-elevated)' }}>isDemo: true</code> and
                  will never interfere with your real data.
                </p>
              </div>

              {/* Month / Year selector */}
              <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Select Month & Year</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Month</label>
                    <select value={demoMonth} onChange={e => setDemoMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg text-sm border"
                      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1} style={{ background: 'var(--bg-card)' }}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Year</label>
                    <select value={demoYear} onChange={e => setDemoYear(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg text-sm border"
                      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {years.map(y => (
                        <option key={y} value={y} style={{ background: 'var(--bg-card)' }}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Status + actions */}
              {demoExists === true && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <p className="text-emerald-300 text-xs font-medium flex-1">Demo report data already exists.</p>
                  <Link href="/reports">
                    <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>
                      <ExternalLink size={11} />View Reports
                    </button>
                  </Link>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={createDemoData}
                  loading={creatingDemo}
                  disabled={demoExists === true}
                >
                  <FlaskConical size={14} />
                  Create Demo Report Data
                </Button>

                {demoExists === true && (
                  <Button variant="danger" onClick={resetDemoData} loading={resettingDemo}>
                    <Trash2 size={14} />
                    Reset Demo Data
                  </Button>
                )}
              </div>

              {/* What gets created */}
              <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>What gets created</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      client: 'Timimetal',
                      cards: [
                        { label: 'Post 1 — Summer Collection', done: true },
                        { label: 'Post 2 — Product Showcase', done: true },
                        { label: 'Reel 1 — Behind the Scenes', done: true },
                        { label: 'Story 1 — Flash Sale', done: true },
                        { label: 'Story 2 — Product Highlight', done: false },
                        { label: 'Post 3 — Client Testimonial', done: false },
                      ],
                    },
                    {
                      client: 'Meda 3',
                      cards: [
                        { label: 'Post 1 — Brand Launch', done: true },
                        { label: 'Reel 1 — Product Demo', done: true },
                        { label: 'Story 1 — Flash Sale', done: false },
                      ],
                    },
                  ].map(({ client, cards }) => (
                    <div key={client} className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>{client}</p>
                      <div className="space-y-1.5">
                        {cards.map(c => (
                          <div key={c.label} className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                              {c.done ? '✓' : '!'}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t flex justify-between text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <span>{cards.filter(c => c.done).length} completed</span>
                        <span>{cards.filter(c => !c.done).length} missing</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test checklist */}
              <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Manual test checklist</p>
                <ol className="space-y-1.5 text-xs list-decimal list-inside" style={{ color: 'var(--text-muted)' }}>
                  {[
                    'Click Create Demo Report Data above',
                    'Go to /reports — confirm Timimetal and Meda 3 appear',
                    'Check each card shows completion % (Timimetal: 4/6 = 67%, Meda 3: 2/3 = 67%)',
                    'Open Timimetal report — confirm Completed and Missing sections',
                    'Click Add Insights on a missing card → fill views/reach/likes → Save',
                    'Confirm completion % updates after saving',
                    'Click Generate PDF — confirm it downloads with client branding and full data',
                    'Click Reset Demo Data — confirm all demo records are removed',
                  ].map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
