'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IClient, IUser } from '@/types';
import { EQUIPMENT_OPTIONS, CATEGORY_COLORS, type ShotTemplateItem } from '@/lib/shotTemplates';
import { ArrowLeft, Plus, X, Camera, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShotDraft extends ShotTemplateItem {
  id: string;
  order?: number;
}

let draftId = 0;
function newId() { return `draft-${++draftId}`; }

const BLANK_SHOT: () => ShotDraft = () => ({
  id: newId(), title: '', category: 'Other', required: false, priority: 'MEDIUM',
});

export default function NewPhotoshootContent() {
  const router = useRouter();
  const [clients, setClients] = useState<IClient[]>([]);
  const [workers, setWorkers] = useState<IUser[]>([]);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [clientId, setClientId]   = useState('');
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [shootDate, setShootDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime]     = useState('');
  const [location, setLocation]   = useState('');
  const [address, setAddress]     = useState('');
  const [priority, setPriority]   = useState('MEDIUM');
  const [notes, setNotes]         = useState('');
  const [contact, setContact]     = useState('');
  const [phone, setPhone]         = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);
  const [shots, setShots]         = useState<ShotDraft[]>([]);
  const [showShots, setShowShots] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/users?role=WORKER').then(r => r.json()),
    ]).then(([cd, wd]) => {
      setClients(cd.clients ?? []);
      setWorkers(wd.users ?? []);
    });
  }, []);

  function addShot() {
    setShots(prev => [...prev, { ...BLANK_SHOT(), order: prev.length }]);
  }

  function removeShot(id: string) {
    setShots(prev => prev.filter(s => s.id !== id));
  }

  function updateShot(id: string, field: string, value: string | boolean) {
    setShots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  function toggleEquipment(val: string) {
    setEquipment(prev => prev.includes(val) ? prev.filter(e => e !== val) : [...prev, val]);
  }

  function toggleWorker(id: string) {
    setAssignedWorkers(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !title || !shootDate || !startTime || !location) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const body = {
        clientId, title, description, shootDate, startTime, endTime: endTime || undefined,
        location, address: address || undefined, priority, notes: notes || undefined,
        clientContactName: contact || undefined, clientContactPhone: phone || undefined,
        equipmentNeeded: equipment, assignedWorkers,
        shotList: shots.map((s, i) => ({
          title: s.title, description: s.description, category: s.category,
          required: s.required, priority: s.priority, order: i,
        })).filter(s => s.title.trim()),
      };
      const res = await fetch('/api/photoshoots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? 'Failed to create session');
        return;
      }
      const { session } = await res.json();
      toast.success('Photoshoot session created!');
      router.push(`/photoshoots/${session._id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar
        title="New Photoshoot Session"
        subtitle="Plan a photoshooting day for a client"
        actions={
          <Link href="/photoshoots">
            <Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">

          {/* ── Basic Info ── */}
          <Section title="Session Details" icon={<Camera size={14} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <LabelSelect
                  label="Client *"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  required
                >
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </LabelSelect>
              </div>
              <div className="sm:col-span-2">
                <Input label="Session Title *" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Monthly Restaurant Shoot — July 2026" required />
              </div>
              <div className="sm:col-span-2">
                <Input label="Description" value={description} onChange={e => setDesc(e.target.value)} placeholder="Brief description of the shoot goals…" />
              </div>
              <Input label="Shoot Date *" type="date" value={shootDate} onChange={e => setShootDate(e.target.value)} required />
              <LabelSelect label="Priority" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </LabelSelect>
              <Input label="Start Time *" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              <Input label="End Time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </Section>

          {/* ── Location ── */}
          <Section title="Location">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Location Name *" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Client restaurant, Studio 4" required />
              </div>
              <div className="sm:col-span-2">
                <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address (optional)" />
              </div>
              <Input label="Client Contact Name" value={contact} onChange={e => setContact(e.target.value)} placeholder="On-site contact person" />
              <Input label="Client Contact Phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+355..." />
            </div>
          </Section>

          {/* ── Workers ── */}
          <Section title="Assigned Workers">
            {workers.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No workers found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workers.map(w => {
                  const selected = assignedWorkers.includes(w._id);
                  return (
                    <button
                      type="button"
                      key={w._id}
                      onClick={() => toggleWorker(w._id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border"
                      style={selected
                        ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderColor: '#6366f1' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
                      }
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white' }}>
                        {w.name.charAt(0).toUpperCase()}
                      </span>
                      {w.name}
                      {selected && <X size={11} />}
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── Equipment ── */}
          <Section title="Equipment Needed">
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(eq => {
                const sel = equipment.includes(eq.value);
                return (
                  <button
                    type="button"
                    key={eq.value}
                    onClick={() => toggleEquipment(eq.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                    style={sel
                      ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', borderColor: '#10b981' }
                      : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
                    }
                  >
                    {sel ? '✓ ' : ''}{eq.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Shot List ── */}
          <Section
            title={`Shot List (${shots.length} shots)`}
            icon={<Layers size={14} />}
            action={
              <button type="button" onClick={() => setShowShots(v => !v)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {showShots ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            }
          >
            {shots.length > 0 && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShots([])}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}
                >
                  Clear all shots
                </button>
              </div>
            )}

            {showShots && (
              <div className="space-y-2">
                {shots.map((shot, idx) => (
                  <div
                    key={shot.id}
                    className="rounded-xl border p-3"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold mt-2 w-5 text-center shrink-0" style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            className="w-full text-sm font-medium bg-transparent border-b outline-none py-1"
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                            placeholder="Shot title…"
                            value={shot.title}
                            onChange={e => updateShot(shot.id, 'title', e.target.value)}
                          />
                        </div>
                        <select
                          className="text-xs rounded-lg px-2 py-1 border"
                          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                          value={shot.category}
                          onChange={e => updateShot(shot.id, 'category', e.target.value)}
                        >
                          {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="sm:col-span-2">
                          <input
                            className="w-full text-xs bg-transparent outline-none py-1"
                            style={{ color: 'var(--text-muted)' }}
                            placeholder="Description (optional)…"
                            value={shot.description ?? ''}
                            onChange={e => updateShot(shot.id, 'description', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            className="text-xs rounded-lg px-2 py-1 border"
                            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                            value={shot.priority}
                            onChange={e => updateShot(shot.id, 'priority', e.target.value)}
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                          </select>
                          <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                            <input
                              type="checkbox"
                              checked={shot.required}
                              onChange={e => updateShot(shot.id, 'required', e.target.checked)}
                              className="rounded"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeShot(shot.id)} className="mt-1 shrink-0" style={{ color: '#f87171' }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addShot}
                  className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-all hover:border-indigo-500 hover:text-indigo-400"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  <Plus size={14} className="inline mr-1" /> Add Shot
                </button>
              </div>
            )}
          </Section>

          {/* ── Notes ── */}
          <Section title="Notes">
            <textarea
              className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none resize-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border)', minHeight: 80 }}
              placeholder="Internal notes about this photoshoot session…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </Section>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Link href="/photoshoots">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? <><LoadingSpinner size={13} /> Creating…</> : <><Camera size={13} /> Create Session</>}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

function LabelSelect({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <select
        {...props}
        className="w-full px-3 py-2.5 rounded-lg text-sm border focus:border-indigo-500 cursor-pointer"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        {children}
      </select>
    </div>
  );
}

function Section({ title, icon, action, children }: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {icon && <span style={{ color: '#818cf8' }}>{icon}</span>}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}
