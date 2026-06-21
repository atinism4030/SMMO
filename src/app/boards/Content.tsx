'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatMonthYear } from '@/lib/utils';
import type { IBoard, IClient, IUser, DeadlinePattern } from '@/types';
import { Plus, LayoutGrid, Archive, AlertTriangle, Zap, Info } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2024, i)),
}));
const YEARS = ['2024', '2025', '2026', '2027'].map(y => ({ value: y, label: y }));
const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'YouTube'];

const emptyForm = {
  clientId: '',
  title: '',
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  description: '',
};
const emptyPlan = { posts: 0, reels: 0, stories: 0 };
const emptySettings = {
  isOpenForClaim: true,
  defaultAssignedWorker: '',
  deadlinePattern: 'NONE' as DeadlinePattern,
  sameDeadline: '',
  platforms: [] as string[],
};

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input
        type="number" min={0} max={99} value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-full text-sm text-center rounded-lg border px-2 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function totalCards(plan: typeof emptyPlan) {
  return plan.posts + plan.reels + plan.stories;
}

export default function BoardsContent() {
  const [boards, setBoards] = useState<IBoard[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [workers, setWorkers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [plan, setPlan] = useState(emptyPlan);
  const [settings, setSettings] = useState(emptySettings);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const now = new Date();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [bRes, cRes, wRes] = await Promise.all([
      fetch('/api/boards'),
      fetch('/api/clients?status=ACTIVE'),
      fetch('/api/users'),
    ]);
    const [bd, cd, wd] = await Promise.all([bRes.json(), cRes.json(), wRes.json()]);
    setBoards(bd.boards ?? []);
    setClients(cd.clients ?? []);
    setWorkers((wd.users ?? []).filter((u: IUser) => u.role === 'WORKER' && u.status === 'ACTIVE'));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function handleClientChange(clientId: string) {
    const client = clients.find(c => c._id === clientId);
    const monthName = MONTHS[parseInt(form.month) - 1]?.label;
    setForm(prev => ({
      ...prev, clientId,
      title: client ? `${client.name} — ${monthName} ${form.year} Board` : prev.title,
    }));
  }

  function handleMonthYearChange(field: 'month' | 'year', value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      const client = clients.find(c => c._id === prev.clientId);
      if (client) {
        const monthName = MONTHS[parseInt(next.month) - 1]?.label;
        next.title = `${client.name} — ${monthName} ${next.year} Board`;
      }
      return next;
    });
  }

  function openForm() {
    setForm(emptyForm); setPlan(emptyPlan); setSettings(emptySettings);
    setDuplicateWarning(null); setPendingConfirm(false); setShowForm(true);
  }

  async function handleSave(e: React.FormEvent, forceConfirm = false) {
    e.preventDefault();
    if (!form.clientId) { toast.error('Please select a client'); return; }
    setSaving(true); setDuplicateWarning(null);
    try {
      const hasContent = totalCards(plan) > 0;
      const body = {
        ...form,
        month: parseInt(form.month),
        year: parseInt(form.year),
        ...(hasContent ? {
          contentPlan: plan,
          platforms: settings.platforms,
          isOpenForClaim: settings.isOpenForClaim,
          defaultAssignedWorker: settings.defaultAssignedWorker || undefined,
          deadlinePattern: settings.deadlinePattern,
          sameDeadline: settings.deadlinePattern === 'SAME' ? settings.sameDeadline : undefined,
        } : {}),
        confirmDuplicate: forceConfirm || pendingConfirm,
      };
      const res = await fetch('/api/boards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === 'DUPLICATE_BOARD') {
        setDuplicateWarning(data.message); setPendingConfirm(true); return;
      }
      if (!res.ok) { toast.error(data.error ?? 'Failed to create board'); return; }
      const count = (data.board as IBoard).autoGeneratedTasksCount ?? 0;
      toast.success(count > 0 ? `Board created with ${count} content cards` : 'Board created');
      setShowForm(false); fetchAll();
    } finally { setSaving(false); }
  }

  const grouped = boards.reduce<Record<string, IBoard[]>>((acc, b) => {
    const key = `${b.year}-${String(b.month).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});
  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const cardPreview = totalCards(plan);

  return (
    <>
      <Topbar title="Boards" subtitle="Monthly workspaces per client"
        actions={<Button onClick={openForm}><Plus size={14} />New Board</Button>} />

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? <LoadingSpinner fullPage /> : boards.length === 0 ? (
          <EmptyState title="No boards yet" description="Create a monthly board for a client" icon={LayoutGrid}
            action={<Button onClick={openForm}><Plus size={14} />New Board</Button>} />
        ) : (
          <div className="space-y-8">
            {sortedKeys.map(key => {
              const [yearStr, monthStr] = key.split('-');
              const month = parseInt(monthStr); const year = parseInt(yearStr);
              const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
              return (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatMonthYear(month, year)}</h2>
                    {isCurrentMonth && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400">Current</span>}
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {grouped[key].map(board => {
                      const client = board.clientId as IClient;
                      const count = board.autoGeneratedTasksCount ?? 0;
                      return (
                        <Link key={board._id} href={`/boards/${board._id}`}
                          className="rounded-xl border p-4 hover:border-zinc-700 transition-all duration-150"
                          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: '#222222', color: '#ffffff' }}>
                              {client?.name?.charAt(0) ?? 'B'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{board.title}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: board.status === 'ACTIVE' ? 'rgba(255,255,255,0.08)' : 'rgba(107,114,128,0.1)', color: board.status === 'ACTIVE' ? '#ffffff' : '#9ca3af' }}>
                              {board.status}
                            </span>
                            <div className="flex items-center gap-2">
                              {count > 0 && (
                                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                  <Zap size={11} className="text-zinc-400" />{count} cards
                                </span>
                              )}
                              {board.status === 'ARCHIVED' && <Archive size={13} style={{ color: 'var(--text-muted)' }} />}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Monthly Board" size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {cardPreview > 0 && (
                <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Zap size={12} className="text-zinc-400" />
                  Will generate {cardPreview} content card{cardPreview > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              {pendingConfirm
                ? <Button variant="danger" onClick={e => handleSave(e, true)} loading={saving}>Create Anyway</Button>
                : <Button onClick={handleSave} loading={saving}>Create Board</Button>
              }
            </div>
          </div>
        }>
        <form onSubmit={handleSave} className="space-y-4">

          {duplicateWarning && (
            <div className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
              <AlertTriangle size={16} className="text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Duplicate Board Warning</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{duplicateWarning} Click "Create Anyway" to proceed.</p>
              </div>
            </div>
          )}

          <Divider label="Basic Info" />

          <Select label="Client *" value={form.clientId} onChange={e => handleClientChange(e.target.value)}
            options={[{ value: '', label: '— Select Client —' }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Month" value={form.month} onChange={e => handleMonthYearChange('month', e.target.value)} options={MONTHS} />
            <Select label="Year" value={form.year} onChange={e => handleMonthYearChange('year', e.target.value)} options={YEARS} />
          </div>
          <Input label="Board Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Meda 3 — June 2026 Board" />
          <Textarea label="Notes (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />

          <Divider label="Monthly Content Plan" />
          <div className="grid grid-cols-3 gap-3">
            <NumInput label="Posts" value={plan.posts} onChange={v => setPlan(p => ({ ...p, posts: v }))} />
            <NumInput label="Reels" value={plan.reels} onChange={v => setPlan(p => ({ ...p, reels: v }))} />
            <NumInput label="Stories" value={plan.stories} onChange={v => setPlan(p => ({ ...p, stories: v }))} />
          </div>

          {cardPreview > 0 && (
            <>
              <Divider label="Card Settings" />

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p} type="button"
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p],
                      }))}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                      style={{
                        background: settings.platforms.includes(p) ? 'rgba(255,255,255,0.1)' : 'var(--bg-elevated)',
                        borderColor: settings.platforms.includes(p) ? '#ffffff' : 'var(--border)',
                        color: settings.platforms.includes(p) ? '#ffffff' : 'var(--text-secondary)',
                      }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select label="Assign to Worker" value={settings.defaultAssignedWorker}
                  onChange={e => setSettings(p => ({ ...p, defaultAssignedWorker: e.target.value }))}
                  options={[{ value: '', label: '— Leave unassigned —' }, ...workers.map(w => ({ value: w._id, label: w.name }))]} />
                <Select label="Deadline Pattern" value={settings.deadlinePattern}
                  onChange={e => setSettings(p => ({ ...p, deadlinePattern: e.target.value as DeadlinePattern }))}
                  options={[
                    { value: 'NONE', label: 'No deadlines' },
                    { value: 'SPREAD', label: 'Spread across month' },
                    { value: 'SAME', label: 'Same deadline' },
                  ]} />
              </div>

              {settings.deadlinePattern === 'SPREAD' && (
                <div className="flex items-start gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                  <Info size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Content cards will have scheduled dates spread evenly across {MONTHS[parseInt(form.month) - 1]?.label} {form.year}.
                  </p>
                </div>
              )}

              {settings.deadlinePattern === 'SAME' && (
                <Input label="Scheduled Date" type="date" value={settings.sameDeadline}
                  onChange={e => setSettings(p => ({ ...p, sameDeadline: e.target.value }))} />
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="openForClaim" checked={settings.isOpenForClaim}
                  onChange={e => setSettings(p => ({ ...p, isOpenForClaim: e.target.checked }))} className="rounded" />
                <label htmlFor="openForClaim" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Cards open for workers to claim
                </label>
              </div>
            </>
          )}
        </form>
      </Modal>
    </>
  );
}
