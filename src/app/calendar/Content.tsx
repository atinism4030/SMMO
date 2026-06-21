'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, PLATFORMS } from '@/lib/utils';
import type { IContentItem, IClient, ContentStatus, ITask, IPhotoshootSession } from '@/types';
import { Plus, Calendar, ChevronLeft, ChevronRight, Camera, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CONTENT_TYPES = ['POST', 'REEL', 'STORY', 'CAROUSEL', 'VIDEO', 'PHOTO', 'AD'].map(v => ({ value: v, label: v }));
const emptyForm = {
  clientId: '', title: '', contentType: 'POST', caption: '', platforms: [] as string[],
  scheduledDate: '', status: 'IDEA' as ContentStatus, notes: '', mediaUrl: '', designUrl: '',
};

type CalendarEvent = {
  id: string;
  title: string;
  day: number;
  type: 'content' | 'task' | 'photoshoot';
  contentItem?: IContentItem;
  task?: ITask;
  photoshoot?: IPhotoshootSession;
};

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

const typeFilterOpts = [
  { value: '', label: 'All Types' },
  { value: 'content', label: 'Content' },
  { value: 'task', label: 'Tasks' },
  { value: 'photoshoot', label: 'Photoshoots' },
];

export default function CalendarContent() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState<IContentItem[]>([]);
  const [calTasks, setCalTasks] = useState<ITask[]>([]);
  const [calPhotoshoots, setCalPhotoshoots] = useState<IPhotoshootSession[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editItem, setEditItem] = useState<IContentItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (clientFilter) params.set('clientId', clientFilter);
    if (statusFilter) params.set('status', statusFilter);
    const taskParams = new URLSearchParams();
    if (clientFilter) taskParams.set('clientId', clientFilter);
    const [iRes, cRes, tRes, pRes] = await Promise.all([
      fetch(`/api/content?${params}`),
      fetch('/api/clients'),
      fetch(`/api/tasks?${taskParams}`),
      fetch('/api/photoshoots'),
    ]);
    const [id, cd, td, pd] = await Promise.all([iRes.json(), cRes.json(), tRes.json(), pRes.json()]);
    setItems(id.items ?? []);
    setClients(cd.clients ?? []);
    const allTasks: ITask[] = td.tasks ?? [];
    setCalTasks(allTasks.filter(t => {
      const date = t.scheduledDate ?? t.deadline;
      if (!date) return false;
      const d = new Date(date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }));
    const allPhotoshoots: IPhotoshootSession[] = pd.sessions ?? pd.photoshoots ?? [];
    setCalPhotoshoots(allPhotoshoots.filter(p => {
      if (!p.shootDate) return false;
      const d = new Date(p.shootDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }));
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
  function goToday() { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  // Build events
  const byDay: Record<number, CalendarEvent[]> = {};
  items.forEach(item => {
    if (!item.scheduledDate) return;
    const d = new Date(item.scheduledDate).getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push({ id: item._id, title: item.title, day: d, type: 'content', contentItem: item });
  });
  calTasks.forEach(task => {
    const date = task.scheduledDate ?? task.deadline;
    if (!date) return;
    const d = new Date(date).getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push({ id: task._id, title: task.title, day: d, type: 'task', task });
  });
  calPhotoshoots.forEach(ps => {
    if (!ps.shootDate) return;
    const d = new Date(ps.shootDate).getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push({ id: ps._id, title: ps.title, day: d, type: 'photoshoot', photoshoot: ps });
  });

  const filteredByDay: Record<number, CalendarEvent[]> = {};
  Object.entries(byDay).forEach(([day, events]) => {
    const filtered = typeFilter ? events.filter(e => e.type === typeFilter) : events;
    if (filtered.length > 0) filteredByDay[Number(day)] = filtered;
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const allEvents: CalendarEvent[] = Object.values(filteredByDay).flat().sort((a, b) => a.day - b.day);
  const selectedDayEvents = selectedDay ? (filteredByDay[selectedDay] ?? []) : [];

  function openEditItem(item: IContentItem) {
    setEditItem(item);
    setForm({
      ...emptyForm,
      clientId: typeof item.clientId === 'string' ? item.clientId : (item.clientId as IClient)._id,
      title: item.title,
      contentType: item.contentType,
      caption: item.caption ?? '',
      scheduledDate: item.scheduledDate ? new Date(item.scheduledDate).toISOString().split('T')[0] : '',
      status: item.status,
      notes: item.notes ?? '',
      mediaUrl: item.mediaUrl ?? '',
      designUrl: item.designUrl ?? '',
    });
    setSelectedPlatforms(item.platforms ?? []);
    setShowForm(true);
  }

  return (
    <>
      <Topbar
        title="Calendar"
        subtitle={`${MONTHS[month - 1]} ${year}`}
        actions={
          <Button onClick={() => { setEditItem(null); setForm(emptyForm); setSelectedPlatforms([]); setShowForm(true); }}>
            <Plus size={14} />Add Content
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto">

        {/* Controls */}
        <div className="px-4 sm:px-6 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={prevMonth}><ChevronLeft size={14} /></Button>
            <span className="text-sm font-semibold px-2 min-w-[140px] text-center" style={{ color: 'var(--text-primary)' }}>{MONTHS[month - 1]} {year}</span>
            <Button variant="secondary" size="sm" onClick={nextMonth}><ChevronRight size={14} /></Button>
            <button
              onClick={goToday}
              className="ml-1 px-3 py-1.5 text-xs rounded-lg border transition-colors"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              Today
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <option value="" style={{ background: 'var(--bg-card)' }}>All Clients</option>
              {clients.map(c => <option key={c._id} value={c._id} style={{ background: 'var(--bg-card)' }}>{c.name}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              {typeFilterOpts.map(o => <option key={o.value} value={o.value} style={{ background: 'var(--bg-card)' }}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="px-6 pb-6"><LoadingSpinner fullPage /></div>
        ) : (
          <>
            {/* Desktop: Monthly grid */}
            <div className="hidden sm:block px-6 pb-6">
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{d}</div>
                  ))}
                </div>
                {/* Grid cells */}
                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[100px] border-b border-r p-2"
                      style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.01)' }} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                    const dayEvents = filteredByDay[day] ?? [];
                    const isSelected = selectedDay === day;
                    return (
                      <div
                        key={day}
                        className="min-h-[100px] border-b border-r p-2 cursor-pointer transition-colors"
                        style={{
                          borderColor: 'var(--border)',
                          background: isSelected ? 'rgba(255,255,255,0.05)' : isToday ? 'rgba(255,255,255,0.02)' : 'transparent',
                        }}
                        onClick={() => setSelectedDay(isSelected ? null : day)}>
                        <span
                          className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1"
                          style={{
                            background: isToday ? '#ffffff' : 'transparent',
                            color: isToday ? '#000000' : 'var(--text-secondary)',
                          }}>
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map(ev => (
                            <EventChip key={ev.id} event={ev} onEditContent={openEditItem} />
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs pl-1" style={{ color: 'var(--text-muted)' }}>+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected day panel */}
              {selectedDay && selectedDayEvents.length > 0 && (
                <div className="mt-4 rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{MONTHS[month - 1]} {selectedDay}</h3>
                    <button onClick={() => setSelectedDay(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Close</button>
                  </div>
                  <div className="space-y-2">
                    {selectedDayEvents.map(ev => (
                      <EventRow key={ev.id} event={ev} onEditContent={openEditItem} onStatusChange={updateStatus} statusOpts={statusOpts} />
                    ))}
                  </div>
                </div>
              )}

              {/* All events list */}
              {allEvents.length > 0 && !selectedDay && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                    All Events This Month ({allEvents.length})
                  </p>
                  <div className="space-y-2">
                    {allEvents.map(ev => (
                      <EventRow key={ev.id} event={ev} onEditContent={openEditItem} onStatusChange={updateStatus} statusOpts={statusOpts} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile: Agenda view */}
            <div className="sm:hidden px-4 pb-6">
              {allEvents.length === 0 ? (
                <EmptyState
                  title="No events this month"
                  description="Add content items with scheduled dates"
                  icon={Calendar}
                  action={<Button onClick={() => setShowForm(true)}><Plus size={14} />Add Content</Button>}
                />
              ) : (
                <div className="space-y-1">
                  {Object.entries(filteredByDay)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([day, events]) => {
                      const d = Number(day);
                      const isToday = d === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                      return (
                        <div key={day}>
                          <div className="flex items-center gap-3 py-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                              style={{
                                background: isToday ? '#ffffff' : 'var(--bg-elevated)',
                                color: isToday ? '#000000' : 'var(--text-secondary)',
                              }}>
                              {d}
                            </div>
                            <span className="text-xs font-medium" style={{ color: isToday ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {new Date(year, month - 1, d).toLocaleDateString('en-US', { weekday: 'short' })}{isToday ? ' · Today' : ''}
                            </span>
                            <div className="flex-1 border-t" style={{ borderColor: 'var(--border)' }} />
                          </div>
                          <div className="space-y-2 pl-11 pb-2">
                            {events.map(ev => (
                              <EventRow key={ev.id} event={ev} onEditContent={openEditItem} onStatusChange={updateStatus} statusOpts={statusOpts} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Content item modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? 'Edit Content' : 'New Content Item'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Save' : 'Create'}</Button>
          </>
        }>
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Client *"
            value={form.clientId}
            onChange={f('clientId')}
            options={[{ value: '', label: '— Select —' }, ...clients.map(c => ({ value: c._id, label: c.name }))]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Title *" value={form.title} onChange={f('title')} required />
            <Select label="Content Type" value={form.contentType} onChange={f('contentType')} options={CONTENT_TYPES} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Scheduled Date" type="date" value={form.scheduledDate} onChange={f('scheduledDate')} />
            <Select
              label="Status"
              value={form.status}
              onChange={f('status')}
              options={statusOpts.filter(s => s.value).map(s => ({ value: s.value, label: s.label }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  className="px-3 py-1 rounded-full text-xs border transition-all"
                  style={{
                    background: selectedPlatforms.includes(p) ? 'rgba(255,255,255,0.1)' : 'var(--bg-elevated)',
                    borderColor: selectedPlatforms.includes(p) ? '#ffffff' : 'var(--border)',
                    color: selectedPlatforms.includes(p) ? '#ffffff' : 'var(--text-secondary)',
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Textarea label="Caption" value={form.caption} onChange={f('caption')} rows={3} placeholder="Post caption..." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Media URL" value={form.mediaUrl} onChange={f('mediaUrl')} placeholder="https://..." />
            <Input label="Design URL" value={form.designUrl} onChange={f('designUrl')} placeholder="https://..." />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={f('notes')} rows={2} />
        </form>
      </Modal>
    </>
  );
}

function EventChip({ event, onEditContent }: { event: CalendarEvent; onEditContent: (item: IContentItem) => void }) {
  if (event.type === 'task' && event.task) {
    return (
      <Link href={`/tasks/${event.task._id}`}>
        <div className="text-xs truncate px-1.5 py-0.5 rounded flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          <CheckSquare size={9} className="shrink-0" />
          <span className="truncate">{event.title}</span>
        </div>
      </Link>
    );
  }
  if (event.type === 'photoshoot') {
    return (
      <div className="text-xs truncate px-1.5 py-0.5 rounded flex items-center gap-1"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#ffffff' }}>
        <Camera size={9} className="shrink-0" />
        <span className="truncate">{event.title}</span>
      </div>
    );
  }
  return (
    <div className="text-xs truncate px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
      onClick={() => event.contentItem && onEditContent(event.contentItem)}>
      {event.title}
    </div>
  );
}

function EventRow({
  event, onEditContent, onStatusChange, statusOpts,
}: {
  event: CalendarEvent;
  onEditContent: (item: IContentItem) => void;
  onStatusChange: (id: string, status: ContentStatus) => void;
  statusOpts: { value: string; label: string }[];
}) {
  if (event.type === 'task' && event.task) {
    const client = event.task.clientId as IClient;
    return (
      <Link href={`/tasks/${event.task._id}`}>
        <div className="flex items-center gap-3 p-3 rounded-xl border hover:border-zinc-600 transition-colors"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bg-elevated)' }}>
            <CheckSquare size={13} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name} · Task</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            {event.task.status?.replace(/_/g, ' ')}
          </span>
        </div>
      </Link>
    );
  }

  if (event.type === 'photoshoot' && event.photoshoot) {
    const client = event.photoshoot.clientId as IClient;
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <Camera size={13} style={{ color: '#d4d4d8' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {typeof client === 'object' ? client?.name : ''}{event.photoshoot.startTime ? ` · ${event.photoshoot.startTime}` : ''}{event.photoshoot.location ? ` · ${event.photoshoot.location}` : ''}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
          {event.photoshoot.status}
        </span>
      </div>
    );
  }

  if (event.type === 'content' && event.contentItem) {
    const item = event.contentItem;
    const client = item.clientId as IClient;
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-xl border hover:border-zinc-600 transition-colors cursor-pointer"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={() => onEditContent(item)}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{client?.name} · {item.contentType}</p>
        </div>
        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{item.scheduledDate ? formatDate(item.scheduledDate) : ''}</span>
        <select
          value={item.status}
          onChange={e => { e.stopPropagation(); onStatusChange(item._id, e.target.value as ContentStatus); }}
          onClick={e => e.stopPropagation()}
          className="text-xs px-2 py-1 rounded-lg border shrink-0"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          {statusOpts.filter(s => s.value).map(s => <option key={s.value} value={s.value} style={{ background: 'var(--bg-card)' }}>{s.label}</option>)}
        </select>
      </div>
    );
  }

  return null;
}
