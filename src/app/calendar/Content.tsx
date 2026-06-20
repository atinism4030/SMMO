'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { ContentStatusBadge, PlatformBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, PLATFORMS } from '@/lib/utils';
import type { IContentItem, IClient, ContentStatus } from '@/types';
import { Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CONTENT_TYPES = ['POST', 'REEL', 'STORY', 'CAROUSEL', 'VIDEO', 'PHOTO', 'AD'].map(v => ({ value: v, label: v }));
const emptyForm = { clientId: '', title: '', contentType: 'POST', caption: '', platforms: [] as string[], scheduledDate: '', status: 'IDEA' as ContentStatus, notes: '', mediaUrl: '', designUrl: '' };

export default function CalendarContent() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState<IContentItem[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editItem, setEditItem] = useState<IContentItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (clientFilter) params.set('clientId', clientFilter);
    if (statusFilter) params.set('status', statusFilter);
    const [iRes, cRes] = await Promise.all([fetch(`/api/content?${params}`), fetch('/api/clients')]);
    const [id, cd] = await Promise.all([iRes.json(), cRes.json()]);
    setItems(id.items ?? []);
    setClients(cd.clients ?? []);
    setLoading(false);
  }, [month, year, clientFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, platforms: selectedPlatforms };
      const url = editItem ? `/api/content/${editItem._id}` : '/api/content';
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editItem ? 'Updated' : 'Content item created');
      setShowForm(false); setEditItem(null); setForm(emptyForm); setSelectedPlatforms([]);
      fetchData();
    } finally { setSaving(false); }
  }

  async function updateStatus(itemId: string, newStatus: ContentStatus) {
    const res = await fetch(`/api/content/${itemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    const data = await res.json();
    if (res.ok) setItems(prev => prev.map(i => i._id === itemId ? data.item : i));
  }

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const byDay: Record<number, IContentItem[]> = {};
  items.forEach(item => {
    if (!item.scheduledDate) return;
    const d = new Date(item.scheduledDate).getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(item);
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const statusOpts = [
    { value: '', label: 'All Statuses' },
    { value: 'IDEA', label: 'Idea' },
    { value: 'IN_PRODUCTION', label: 'In Production' },
    { value: 'EDITING', label: 'Editing' },
    { value: 'WAITING_APPROVAL', label: 'Waiting Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'POSTED', label: 'Posted' },
  ];

  return (
    <>
      <Topbar title="Content Calendar" subtitle={`${MONTHS[month - 1]} ${year}`}
        actions={<Button onClick={() => { setEditItem(null); setForm(emptyForm); setSelectedPlatforms([]); setShowForm(true); }}><Plus size={14} />Add Content</Button>} />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={prevMonth}><ChevronLeft size={14} /></Button>
            <span className="text-sm font-medium px-3" style={{ color: 'var(--text-primary)' }}>{MONTHS[month - 1]} {year}</span>
            <Button variant="secondary" size="sm" onClick={nextMonth}><ChevronRight size={14} /></Button>
          </div>
          <div className="flex gap-2">
            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <option value="">All Clients</option>
              {clients.map(c => <option key={c._id} value={c._id} style={{ background: 'var(--bg-card)' }}>{c.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              {statusOpts.map(s => <option key={s.value} value={s.value} style={{ background: 'var(--bg-card)' }}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? <LoadingSpinner fullPage /> : (
          <>
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center py-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px] border-b border-r p-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                  const dayItems = byDay[day] ?? [];
                  return (
                    <div key={day} className="min-h-[80px] border-b border-r p-2" style={{ borderColor: 'var(--border)', background: isToday ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                      <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-indigo-500 text-white' : ''}`} style={!isToday ? { color: 'var(--text-muted)' } : {}}>{day}</span>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 2).map(item => (
                          <div key={item._id} className="text-xs truncate px-1 py-0.5 rounded cursor-pointer hover:opacity-80"
                            onClick={() => { setEditItem(item); setForm({ ...emptyForm, clientId: typeof item.clientId === 'string' ? item.clientId : (item.clientId as IClient)._id, title: item.title, contentType: item.contentType, caption: item.caption ?? '', scheduledDate: item.scheduledDate ? new Date(item.scheduledDate).toISOString().split('T')[0] : '', status: item.status, notes: item.notes ?? '', mediaUrl: item.mediaUrl ?? '', designUrl: item.designUrl ?? '' }); setSelectedPlatforms(item.platforms ?? []); setShowForm(true); }}
                            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                            {item.title}
                          </div>
                        ))}
                        {dayItems.length > 2 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>+{dayItems.length - 2} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {items.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>All Content This Month ({items.length})</h3>
                <div className="space-y-2">
                  {items.map(item => {
                    const client = item.clientId as IClient;
                    return (
                      <div key={item._id} className="flex items-center gap-4 p-3 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name} · {item.contentType}</p>
                        </div>
                        <div className="flex gap-1">{item.platforms?.slice(0, 2).map(p => <PlatformBadge key={p} platform={p} />)}</div>
                        <ContentStatusBadge status={item.status} />
                        {item.scheduledDate && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(item.scheduledDate)}</span>}
                        <select value={item.status} onChange={e => updateStatus(item._id, e.target.value as ContentStatus)}
                          className="text-xs px-2 py-1 rounded border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                          {statusOpts.filter(s => s.value).map(s => <option key={s.value} value={s.value} style={{ background: 'var(--bg-elevated)' }}>{s.label}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {items.length === 0 && <EmptyState title="No content this month" description="Add content items with scheduled dates" icon={Calendar} action={<Button onClick={() => setShowForm(true)}><Plus size={14} />Add Content</Button>} />}
          </>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Content' : 'New Content Item'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editItem ? 'Save' : 'Create'}</Button></>}>
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Client *" value={form.clientId} onChange={f('clientId')} options={[{ value: '', label: '— Select —' }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Title *" value={form.title} onChange={f('title')} required />
            <Select label="Content Type" value={form.contentType} onChange={f('contentType')} options={CONTENT_TYPES} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Scheduled Date" type="date" value={form.scheduledDate} onChange={f('scheduledDate')} />
            <Select label="Status" value={form.status} onChange={f('status')} options={statusOpts.filter(s => s.value).map(s => ({ value: s.value, label: s.label }))} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} type="button" onClick={() => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  className="px-3 py-1 rounded-full text-xs border transition-all"
                  style={{ background: selectedPlatforms.includes(p) ? 'rgba(99,102,241,0.2)' : 'var(--bg-elevated)', borderColor: selectedPlatforms.includes(p) ? '#6366f1' : 'var(--border)', color: selectedPlatforms.includes(p) ? '#a5b4fc' : 'var(--text-secondary)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Textarea label="Caption" value={form.caption} onChange={f('caption')} rows={3} placeholder="Post caption..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Media URL" value={form.mediaUrl} onChange={f('mediaUrl')} placeholder="https://..." />
            <Input label="Design URL" value={form.designUrl} onChange={f('designUrl')} placeholder="https://..." />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={f('notes')} rows={2} />
        </form>
      </Modal>
    </>
  );
}
