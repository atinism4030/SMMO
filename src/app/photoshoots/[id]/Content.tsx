'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IPhotoshootSession, IClient, IUser, IShotItem } from '@/types';
import { CATEGORY_COLORS, SHOT_CATEGORIES } from '@/lib/shotTemplates';
import {
  ArrowLeft, MapPin, Clock, Users, CheckSquare, Plus, X, Edit3,
  Trash2, Camera, ChevronDown, Phone, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PLANNED:     { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
  IN_PROGRESS: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
  COMPLETED:   { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  CANCELLED:   { bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6b7280', MEDIUM: '#3b82f6', HIGH: '#f97316', URGENT: '#ef4444',
};

function progressColor(pct: number) {
  if (pct >= 100) return '#34d399';
  if (pct >= 60)  return '#6366f1';
  if (pct >= 30)  return '#f59e0b';
  return '#f87171';
}

export default function PhotoshootDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [ps, setPs] = useState<IPhotoshootSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [togglingShot, setTogglingShot]     = useState<string | null>(null);
  const [deletingShot, setDeletingShot]     = useState<string | null>(null);
  const [showAddShot, setShowAddShot]       = useState(false);
  const [editingShot, setEditingShot]       = useState<IShotItem | null>(null);

  const [newShot, setNewShot] = useState({ title: '', category: 'Other', priority: 'MEDIUM', required: false, description: '' });

  const load = useCallback(async () => {
    const res = await fetch(`/api/photoshoots/${id}`);
    if (!res.ok) { toast.error('Session not found'); return; }
    const data = await res.json();
    setPs(data.session);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(status: string) {
    setUpdatingStatus(true);
    const res = await fetch(`/api/photoshoots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const d = await res.json();
      setPs(d.session);
      toast.success(`Status → ${status.replace('_', ' ')}`);
    } else {
      toast.error('Failed to update status');
    }
    setUpdatingStatus(false);
  }

  async function toggleShot(shotId: string) {
    setTogglingShot(shotId);
    const res = await fetch(`/api/photoshoots/${id}/shots/${shotId}/toggle`, { method: 'PATCH' });
    if (res.ok) {
      const d = await res.json();
      setPs(d.session);
    } else {
      toast.error('Failed to update shot');
    }
    setTogglingShot(null);
  }

  async function deleteShot(shotId: string) {
    if (!confirm('Remove this shot from the list?')) return;
    setDeletingShot(shotId);
    const res = await fetch(`/api/photoshoots/${id}/shots/${shotId}`, { method: 'DELETE' });
    if (res.ok) {
      const d = await res.json();
      setPs(d.session);
      toast.success('Shot removed');
    } else {
      toast.error('Failed to remove shot');
    }
    setDeletingShot(null);
  }

  async function addShot() {
    if (!newShot.title.trim()) { toast.error('Shot title is required'); return; }
    const res = await fetch(`/api/photoshoots/${id}/shots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newShot),
    });
    if (res.ok) {
      const d = await res.json();
      setPs(d.session);
      setNewShot({ title: '', category: 'Other', priority: 'MEDIUM', required: false, description: '' });
      setShowAddShot(false);
      toast.success('Shot added');
    } else {
      toast.error('Failed to add shot');
    }
  }

  async function saveEditShot() {
    if (!editingShot) return;
    const res = await fetch(`/api/photoshoots/${id}/shots/${editingShot._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:       editingShot.title,
        description: editingShot.description,
        category:    editingShot.category,
        priority:    editingShot.priority,
        required:    editingShot.required,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setPs(d.session);
      setEditingShot(null);
      toast.success('Shot updated');
    } else {
      toast.error('Failed to update shot');
    }
  }

  async function deleteSession() {
    if (!confirm('Delete this entire photoshoot session? This cannot be undone.')) return;
    const res = await fetch(`/api/photoshoots/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Session deleted');
      router.push('/photoshoots');
    } else {
      toast.error('Failed to delete');
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!ps) return <div className="flex-1 flex items-center justify-center"><p style={{ color: 'var(--text-muted)' }}>Session not found.</p></div>;

  const client  = ps.clientId as IClient;
  const workers = ps.assignedWorkers as IUser[];
  const total   = ps.shotList.length;
  const done    = ps.shotList.filter(s => s.completed).length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const st      = STATUS_STYLES[ps.status] ?? STATUS_STYLES.PLANNED;
  const shootDate = new Date(ps.shootDate);

  const STATUS_TRANSITIONS: Record<string, { next: string; label: string }[]> = {
    PLANNED:     [{ next: 'IN_PROGRESS', label: 'Start Shoot' }, { next: 'CANCELLED', label: 'Cancel' }],
    IN_PROGRESS: [{ next: 'COMPLETED',   label: 'Mark Completed' }, { next: 'CANCELLED', label: 'Cancel' }],
    COMPLETED:   [],
    CANCELLED:   [{ next: 'PLANNED', label: 'Restore to Planned' }],
  };

  const transitions = STATUS_TRANSITIONS[ps.status] ?? [];

  const sortedShots = [...ps.shotList].sort((a, b) => a.order - b.order);
  const required    = sortedShots.filter(s => s.required);
  const optional    = sortedShots.filter(s => !s.required);

  return (
    <>
      <Topbar
        title={ps.title}
        subtitle={client?.name}
        actions={
          <div className="flex gap-2">
            <Link href="/photoshoots">
              <Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button>
            </Link>
            {transitions.map(t => (
              <Button
                key={t.next}
                size="sm"
                variant={t.next === 'CANCELLED' ? 'danger' : 'primary'}
                disabled={updatingStatus}
                onClick={() => changeStatus(t.next)}
              >
                {updatingStatus ? <LoadingSpinner size={12} /> : null}
                {t.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Header info ── */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Status + Priority */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: st.bg, color: st.text }}>
                  {ps.status.replace('_', ' ')}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-elevated)', color: PRIORITY_COLORS[ps.priority] }}>
                  {ps.priority}
                </span>
              </div>

              {/* Date/time + location */}
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-2">
                <InfoRow icon={<Clock size={13} />} text={`${shootDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} · ${ps.startTime}${ps.endTime ? `–${ps.endTime}` : ''}`} />
                <InfoRow icon={<MapPin size={13} />} text={ps.address ? `${ps.location} — ${ps.address}` : ps.location} />
                {ps.clientContactName && (
                  <InfoRow icon={<Phone size={13} />} text={`${ps.clientContactName}${ps.clientContactPhone ? ` · ${ps.clientContactPhone}` : ''}`} />
                )}
              </div>

              {/* Description */}
              {ps.description && (
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{ps.description}</p>
              )}
            </div>

            {/* Progress ring area */}
            {total > 0 && (
              <div className="text-center shrink-0">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg-elevated)" strokeWidth="7" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke={progressColor(pct)} strokeWidth="7"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black" style={{ color: progressColor(pct) }}>{pct}%</span>
                  </div>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{done}/{total} shots</p>
              </div>
            )}
          </div>

          {/* Workers */}
          {workers.length > 0 && (
            <div className="mt-4 pt-4 border-t flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
              <Users size={13} style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Workers:</p>
              {workers.map(w => (
                <span key={String(w._id)} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                  <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px] font-bold"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white' }}>
                    {w.name.charAt(0).toUpperCase()}
                  </span>
                  {w.name}
                </span>
              ))}
            </div>
          )}

          {/* Equipment */}
          {ps.equipmentNeeded.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Equipment:</p>
              {ps.equipmentNeeded.map(e => (
                <span key={e} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{e}</span>
              ))}
            </div>
          )}

          {/* Notes */}
          {ps.notes && (
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Notes</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{ps.notes}</p>
            </div>
          )}
        </div>

        {/* ── Shot List ── */}
        <div className="rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                <CheckSquare size={14} className="inline mr-2 text-indigo-400" />
                Shot List
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {total === 0 ? 'No shots added yet' : `${done} of ${total} completed`}
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAddShot(v => !v)}>
              <Plus size={13} />Add Shot
            </Button>
          </div>

          {/* Add shot form */}
          {showAddShot && (
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="sm:col-span-2">
                  <Input
                    label="Shot Title *"
                    value={newShot.title}
                    onChange={e => setNewShot(v => ({ ...v, title: e.target.value }))}
                    placeholder="e.g. Main dish close-up"
                  />
                </div>
                <LabelSelect label="Category" value={newShot.category} onChange={e => setNewShot(v => ({ ...v, category: e.target.value }))}>
                  {SHOT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </LabelSelect>
                <Input
                  label="Description"
                  value={newShot.description}
                  onChange={e => setNewShot(v => ({ ...v, description: e.target.value }))}
                  placeholder="Optional description…"
                />
                <LabelSelect label="Priority" value={newShot.priority} onChange={e => setNewShot(v => ({ ...v, priority: e.target.value }))}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </LabelSelect>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={newShot.required} onChange={e => setNewShot(v => ({ ...v, required: e.target.checked }))} className="rounded" />
                    Required shot
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addShot}><Plus size={12} />Add</Button>
                <Button size="sm" variant="secondary" onClick={() => setShowAddShot(false)}><X size={12} />Cancel</Button>
              </div>
            </div>
          )}

          {/* Edit shot form */}
          {editingShot && (
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-muted)' }}>Edit Shot</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="sm:col-span-2">
                  <Input label="Title" value={editingShot.title} onChange={e => setEditingShot(v => v ? { ...v, title: e.target.value } : v)} />
                </div>
                <LabelSelect label="Category" value={editingShot.category} onChange={e => setEditingShot(v => v ? { ...v, category: e.target.value as IShotItem['category'] } : v)}>
                  {SHOT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </LabelSelect>
                <div className="sm:col-span-2">
                  <Input label="Description" value={editingShot.description ?? ''} onChange={e => setEditingShot(v => v ? { ...v, description: e.target.value } : v)} />
                </div>
                <LabelSelect label="Priority" value={editingShot.priority} onChange={e => setEditingShot(v => v ? { ...v, priority: e.target.value as IShotItem['priority'] } : v)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </LabelSelect>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEditShot}>Save</Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingShot(null)}><X size={12} />Cancel</Button>
              </div>
            </div>
          )}

          <div className="divide-y" style={{ '--divide-color': 'var(--border)' } as React.CSSProperties}>
            {total === 0 ? (
              <div className="px-5 py-10 text-center">
                <Camera size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No shots added yet. Click "Add Shot" to build your list.</p>
              </div>
            ) : (
              <>
                {required.length > 0 && (
                  <ShotGroup label="Required Shots" shots={required} id={id} onToggle={toggleShot} togglingShot={togglingShot} onDelete={deleteShot} deletingShot={deletingShot} onEdit={setEditingShot} />
                )}
                {optional.length > 0 && (
                  <ShotGroup label="Optional Shots" shots={optional} id={id} onToggle={toggleShot} togglingShot={togglingShot} onDelete={deleteShot} deletingShot={deletingShot} onEdit={setEditingShot} />
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Danger zone ── */}
        <div className="rounded-2xl border p-4 flex items-center justify-between"
          style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#f87171' }}>Delete this session</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>This action is permanent and cannot be undone.</p>
          </div>
          <Button variant="danger" size="sm" onClick={deleteSession}>
            <Trash2 size={13} />Delete
          </Button>
        </div>
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

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      {text}
    </div>
  );
}

function ShotGroup({ label, shots, id, onToggle, togglingShot, onDelete, deletingShot, onEdit }: {
  label: string;
  shots: IShotItem[];
  id: string;
  onToggle: (shotId: string) => void;
  togglingShot: string | null;
  onDelete: (shotId: string) => void;
  deletingShot: string | null;
  onEdit: (shot: IShotItem) => void;
}) {
  return (
    <div>
      <p className="px-5 py-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>{label}</p>
      {shots.map(shot => (
        <ShotRow
          key={shot._id}
          shot={shot}
          onToggle={() => onToggle(shot._id)}
          toggling={togglingShot === shot._id}
          onDelete={() => onDelete(shot._id)}
          deleting={deletingShot === shot._id}
          onEdit={() => onEdit(shot)}
        />
      ))}
    </div>
  );
}

function ShotRow({ shot, onToggle, toggling, onDelete, deleting, onEdit }: {
  shot: IShotItem;
  onToggle: () => void;
  toggling: boolean;
  onDelete: () => void;
  deleting: boolean;
  onEdit: () => void;
}) {
  const catColor = CATEGORY_COLORS[shot.category] ?? '#6b7280';
  const completedBy = shot.completedBy as IUser | undefined;

  return (
    <div
      className="px-5 py-3.5 flex items-start gap-4 group border-t transition-colors hover:bg-opacity-50"
      style={{ borderColor: 'var(--border)', background: shot.completed ? 'rgba(16,185,129,0.03)' : 'transparent' }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        disabled={toggling}
        className="mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
        style={shot.completed
          ? { background: '#10b981', borderColor: '#10b981' }
          : { background: 'transparent', borderColor: 'var(--border)' }
        }
      >
        {toggling
          ? <LoadingSpinner size={10} />
          : shot.completed
            ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : null
        }
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span
            className={`text-sm font-medium transition-all ${shot.completed ? 'line-through' : ''}`}
            style={{ color: shot.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}
          >
            {shot.title}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${catColor}20`, color: catColor }}>
            {shot.category}
          </span>
          {shot.required && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
              Required
            </span>
          )}
        </div>
        {shot.description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{shot.description}</p>
        )}
        {shot.completed && completedBy && (
          <p className="text-xs mt-1" style={{ color: '#34d399' }}>
            Completed by {completedBy.name}
            {shot.completedAt ? ` · ${new Date(shot.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </p>
        )}
      </div>

      {/* Priority + actions */}
      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 rounded-md" style={{ color: '#6366f1' }} title="Edit shot">
          <Edit3 size={12} />
        </button>
        <button onClick={onDelete} disabled={deleting} className="p-1 rounded-md" style={{ color: '#f87171' }} title="Remove shot">
          {deleting ? <LoadingSpinner size={12} /> : <Trash2 size={12} />}
        </button>
      </div>
    </div>
  );
}
