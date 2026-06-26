'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, getTaskStatusLabel, CARD_STATUSES, LINK_TYPES, CONTENT_TYPES, PLATFORMS } from '@/lib/utils';
import { getEffectiveReportStatus } from '@/lib/reporting';
import type { ITask, IClient, IUser, IBoard, TaskStatus, TaskPriority, ContentType, IMetrics, IPostedLink, PostedLinkPlatform } from '@/types';
import {
  ArrowLeft, Send, CheckCircle, Check, AlertCircle, Link2, MessageSquare,
  BarChart2, Plus, X, ExternalLink, Clock, CheckCircle2, AlertTriangle, Edit2,
  Globe, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const POSTED_LINK_PLATFORMS: PostedLinkPlatform[] = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Website', 'Other'];

function platformIcon(platform: PostedLinkPlatform): string {
  const icons: Record<PostedLinkPlatform, string> = {
    Instagram: '📸', Facebook: '👥', TikTok: '🎵', YouTube: '▶️', Website: '🌐', Other: '🔗',
  };
  return icons[platform] ?? '🔗';
}

const POST_REEL_FIELDS = [
  { key: 'views',         label: 'Views' },
  { key: 'reach',         label: 'Reach' },
  { key: 'likes',         label: 'Likes' },
  { key: 'comments',      label: 'Comments' },
  { key: 'shares',        label: 'Shares' },
  { key: 'saves',         label: 'Saves' },
  { key: 'profileVisits', label: 'Profile Visits' },
  { key: 'linkClicks',    label: 'Link Clicks' },
];

const STORY_FIELDS = [
  { key: 'views',             label: 'Views' },
  { key: 'reach',             label: 'Reach' },
  { key: 'storyReplies',      label: 'Replies' },
  { key: 'storyTapsForward',  label: 'Taps Forward' },
  { key: 'storyTapsBack',     label: 'Taps Back' },
  { key: 'storyExits',        label: 'Exits' },
  { key: 'linkClicks',        label: 'Link Clicks' },
];

const STATUS_SHORT: Record<string, string> = {
  CONTENT_PREPARATION: 'In Preparation',
  QUALITY_ASSURANCE: 'Quality Assurance',
  POST_VERIFIED: 'Post Verified',
  READY_TO_POST: 'Ready to Post',
  POSTED: 'Posted',
  NEEDS_FIX: 'Needs Fix',
};

function formatCountdown(dueAt: string): string {
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff <= 0) return 'overdue';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h remaining` : `${h}h ${m}m remaining`;
}

const emptyEditForm = {
  title: '',
  description: '',
  contentType: 'POST' as ContentType,
  priority: 'MEDIUM' as TaskPriority,
  platforms: [] as string[],
  assignedTo: '',
  scheduledDate: '',
  isOpenForClaim: false,
};

export default function TaskDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [task, setTask] = useState<ITask | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [workers, setWorkers] = useState<IUser[]>([]);
  const [newLink, setNewLink] = useState({ label: '', url: '', type: '' });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [reportEditing, setReportEditing] = useState(false);
  const [metricsForm, setMetricsForm] = useState<Partial<IMetrics>>({});
  const [savingReport, setSavingReport] = useState(false);
  const [newPostedLink, setNewPostedLink] = useState<{ platform: PostedLinkPlatform; url: string }>({ platform: 'Instagram', url: '' });
  const [showPostedLinkForm, setShowPostedLinkForm] = useState(false);
  const [postedLinkError, setPostedLinkError] = useState('');
  const [savingPostedLink, setSavingPostedLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkData, setEditLinkData] = useState<{ platform: PostedLinkPlatform; url: string }>({ platform: 'Instagram', url: '' });

  // CEO edit/delete state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');

  useEffect(() => {
    async function load() {
      const [taskRes, meRes, workersRes] = await Promise.all([
        fetch(`/api/tasks/${id}`),
        fetch('/api/auth/me'),
        fetch('/api/users'),
      ]);
      const [td, me, wd] = await Promise.all([taskRes.json(), meRes.json(), workersRes.json()]);
      const loadedTask: ITask = td.task;
      setTask(loadedTask);
      setMetricsForm(loadedTask?.reporting?.metrics ?? {});
      setUserRole(me.user?.role ?? '');
      setUserId(me.user?._id ?? '');
      setWorkers((wd.users ?? []).filter((u: IUser) => u.role === 'WORKER' && u.status === 'ACTIVE'));
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleStatusChange(newStatus: TaskStatus) {
    setUpdating(true);
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      setTask(data.task);
      setMetricsForm(data.task?.reporting?.metrics ?? {});
      toast.success(`Status → ${getTaskStatusLabel(newStatus)}`);
    } else {
      toast.error(data.error);
    }
    setUpdating(false);
  }

  async function handleClaim() {
    const res = await fetch(`/api/tasks/${id}/claim`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) { setTask(data.task); toast.success('Card claimed!'); }
    else toast.error(data.error);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/tasks/${id}/comment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: comment }),
    });
    const data = await res.json();
    if (res.ok) { setTask(data.task); setComment(''); }
    else toast.error(data.error);
    setPosting(false);
  }

  async function toggleChecklist(checkIdx: number) {
    if (!task) return;
    const checklist = task.checklist?.map((c, i) => i === checkIdx ? { ...c, done: !c.done } : c) ?? [];
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist }),
    });
    const data = await res.json();
    if (res.ok) setTask(data.task);
  }

  async function addChecklistItem() {
    if (!task || !newCheckItem.trim()) return;
    const checklist = [...(task.checklist ?? []), { text: newCheckItem.trim(), done: false }];
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist }),
    });
    const data = await res.json();
    if (res.ok) { setTask(data.task); setNewCheckItem(''); toast.success('Item added'); }
    else toast.error(data.error);
  }

  async function removeChecklistItem(idx: number) {
    if (!task) return;
    const checklist = (task.checklist ?? []).filter((_, i) => i !== idx);
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist }),
    });
    const data = await res.json();
    if (res.ok) { setTask(data.task); }
    else toast.error(data.error);
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!newLink.url || !newLink.label || !task) return;
    const links = [...(task.links ?? []), { label: newLink.label, url: newLink.url, type: newLink.type || undefined }];
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links }),
    });
    const data = await res.json();
    if (res.ok) { setTask(data.task); setNewLink({ label: '', url: '', type: '' }); setShowLinkForm(false); toast.success('Link added'); }
  }

  async function removeLink(index: number) {
    if (!task) return;
    const links = (task.links ?? []).filter((_, i) => i !== index);
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links }),
    });
    const data = await res.json();
    if (res.ok) setTask(data.task);
  }

  async function saveReport(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setSavingReport(true);
    try {
      const res = await fetch(`/api/tasks/${id}/report`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metricsForm),
      });
      const data = await res.json();
      if (res.ok) {
        setTask(data.task);
        setMetricsForm(data.task?.reporting?.metrics ?? {});
        setReportEditing(false);
        toast.success('Report saved successfully');
      } else {
        toast.error(data.error ?? 'Could not save report');
      }
    } catch {
      toast.error('Could not save report');
    } finally {
      setSavingReport(false);
    }
  }

  async function addPostedLink(e: React.FormEvent) {
    e.preventDefault();
    setPostedLinkError('');
    setSavingPostedLink(true);
    try {
      const res = await fetch(`/api/tasks/${id}/posted-links`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', platform: newPostedLink.platform, url: newPostedLink.url }),
      });
      const data = await res.json();
      if (res.ok) {
        setTask(data.task);
        setNewPostedLink({ platform: 'Instagram', url: '' });
        setShowPostedLinkForm(false);
        toast.success('Post link added');
      } else {
        setPostedLinkError(data.error ?? 'Failed to add link');
      }
    } finally {
      setSavingPostedLink(false);
    }
  }

  async function deletePostedLink(linkId: string) {
    const res = await fetch(`/api/tasks/${id}/posted-links`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', linkId }),
    });
    const data = await res.json();
    if (res.ok) { setTask(data.task); toast.success('Link removed'); }
    else toast.error(data.error);
  }

  async function saveEditLink(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLinkId) return;
    const res = await fetch(`/api/tasks/${id}/posted-links`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', linkId: editingLinkId, platform: editLinkData.platform, url: editLinkData.url }),
    });
    const data = await res.json();
    if (res.ok) { setTask(data.task); setEditingLinkId(null); toast.success('Link updated'); }
    else toast.error(data.error);
  }

  function openEditModal() {
    if (!task) return;
    const assignedWorker = task.assignedTo as IUser | undefined;
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      contentType: task.contentType,
      priority: task.priority,
      platforms: task.platforms ?? [],
      assignedTo: typeof assignedWorker === 'object' ? (assignedWorker as IUser)?._id ?? '' : (task.assignedTo as string) ?? '',
      scheduledDate: task.scheduledDate ? task.scheduledDate.split('T')[0] : '',
      isOpenForClaim: task.isOpenForClaim,
    });
    setShowEditModal(true);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          contentType: editForm.contentType,
          priority: editForm.priority,
          platforms: editForm.platforms,
          assignedTo: editForm.assignedTo || null,
          scheduledDate: editForm.scheduledDate || null,
          isOpenForClaim: editForm.isOpenForClaim,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to save'); return; }
      setTask(data.task);
      setShowEditModal(false);
      toast.success('Card updated');
    } catch {
      toast.error('Network error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to delete');
        return;
      }
      toast.success('Card deleted');
      const board = task?.boardId as IBoard;
      router.push(board && typeof board !== 'string' ? `/boards/${board._id}` : '/tasks');
    } catch {
      toast.error('Network error');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}><LoadingSpinner size={32} /></div>;
  if (!task) return <div className="p-6" style={{ color: 'var(--text-muted)', background: 'var(--bg-base)' }}>Card not found.</div>;

  const client = task.clientId as IClient;
  const board = task.boardId as IBoard;
  const assignedWorker = task.assignedTo as IUser | undefined;
  const claimedWorker = task.claimedBy as IUser | undefined;
  const canClaim = task.isOpenForClaim && !task.claimedBy && userRole === 'WORKER';
  const isMyTask = userId && (
    (assignedWorker as IUser)?._id === userId ||
    (claimedWorker as IUser)?._id === userId ||
    (assignedWorker as unknown as string) === userId ||
    (claimedWorker as unknown as string) === userId
  );
  const isCEO = userRole === 'CEO';
  const canEdit = isCEO || isMyTask;
  const checklist = task.checklist ?? [];
  const doneCount = checklist.filter(c => c.done).length;
  const showReport = task.status === 'POSTED' || !!task.postedDate;
  const backHref = isCEO ? (board ? `/boards/${typeof board === 'string' ? board : board._id}` : '/tasks') : '/worker/my-tasks';
  const effectiveStatus = getEffectiveReportStatus(
    task.status, task.reporting?.reportStatus, task.reporting?.reportDueAt
  );
  const isStory = task.contentType === 'STORY';
  const metricFields = isStory ? STORY_FIELDS : POST_REEL_FIELDS;
  const metrics = task.reporting?.metrics;
  const showReportForm = isCEO && (effectiveStatus !== 'COMPLETED' || reportEditing);
  const showReadOnly = effectiveStatus === 'COMPLETED' && !reportEditing;

  const cardStyle = { background: 'var(--bg-card)', borderColor: 'var(--border)' };
  const inputStyle = { background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' };

  const reportBorderColor = effectiveStatus === 'COMPLETED'
    ? 'var(--border)'
    : effectiveStatus === 'NEEDS_DATA'
    ? '#71717a'
    : 'var(--border)';

  return (
    <>
      <Topbar
        title={task.title}
        subtitle={client?.name}
        actions={
          <div className="flex items-center gap-2">
            {canClaim && <Button variant="success" size="sm" onClick={handleClaim}><CheckCircle size={13} />Claim Card</Button>}
            {isCEO && (
              <>
                <Button variant="secondary" size="sm" onClick={openEditModal}><Edit2 size={13} />Edit</Button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10 hover:text-red-400"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <Trash2 size={13} />Delete
                </button>
              </>
            )}
            <Link href={backHref}><Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button></Link>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-full">

          {/* Main content */}
          <div className="lg:col-span-2 p-4 sm:p-6 space-y-4 border-r" style={{ borderColor: 'var(--border)' }}>

            {/* Status + type badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium px-3 py-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>
                {STATUS_SHORT[task.status] ?? task.status}
              </span>
              {task.contentType && (
                <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  {task.contentType}
                </span>
              )}
              {task.priority && (
                <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  {task.priority}
                </span>
              )}
              {(task.platforms ?? []).map(p => (
                <span key={p} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{p}</span>
              ))}
              {task.isOpenForClaim && !task.claimedBy && (
                <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Open for Claim</span>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div className="rounded-xl border p-4" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
              </div>
            )}

            {/* Checklist */}
            {(checklist.length > 0 || isCEO) && (
              <div className="rounded-xl border p-4" style={cardStyle}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Production Checklist</p>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{doneCount}/{checklist.length}</span>
                </div>
                {checklist.length > 0 && (
                  <div className="h-1.5 rounded-full mb-4" style={{ background: 'var(--bg-elevated)' }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%`, background: 'var(--text-primary)' }}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  {checklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                      <div
                        onClick={() => canEdit && toggleChecklist(i)}
                        className={`flex items-center gap-3 flex-1 rounded-lg px-3 py-2.5 transition-colors ${canEdit ? 'cursor-pointer' : ''}`}
                        style={{ background: 'transparent' }}
                        onMouseEnter={e => canEdit && ((e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                        <div
                          className="w-4 h-4 rounded shrink-0 flex items-center justify-center transition-colors border"
                          style={{
                            background: item.done ? 'var(--text-primary)' : 'transparent',
                            borderColor: item.done ? 'var(--text-primary)' : 'var(--border)',
                          }}>
                          {item.done && <Check size={10} style={{ color: 'var(--bg-base)' }} />}
                        </div>
                        <span
                          className="text-sm"
                          style={{
                            color: item.done ? 'var(--text-muted)' : 'var(--text-secondary)',
                            textDecoration: item.done ? 'line-through' : 'none',
                          }}>
                          {item.text}
                        </span>
                      </div>
                      {isCEO && (
                        <button
                          onClick={() => removeChecklistItem(i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                          title="Remove item">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {isCEO && (
                  <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <input
                      value={newCheckItem}
                      onChange={e => setNewCheckItem(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                      placeholder="Add checklist item..."
                      className="flex-1 px-3 py-2 rounded-lg text-sm border"
                      style={inputStyle}
                    />
                    <Button size="sm" onClick={addChecklistItem}><Plus size={12} />Add</Button>
                  </div>
                )}
              </div>
            )}

            {/* Links */}
            <div className="rounded-xl border p-4" style={cardStyle}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Link2 size={14} />Links & Files
                </p>
                {canEdit && (
                  <button
                    onClick={() => setShowLinkForm(p => !p)}
                    className="text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <Plus size={11} />{showLinkForm ? 'Cancel' : 'Add Link'}
                  </button>
                )}
              </div>
              {showLinkForm && (
                <form onSubmit={addLink} className="mb-3 p-3 rounded-lg border space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={newLink.label}
                      onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))}
                      placeholder="Label *" required
                      className="px-2 py-2 rounded-lg text-sm border"
                      style={inputStyle}
                    />
                    <select
                      value={newLink.type}
                      onChange={e => setNewLink(p => ({ ...p, type: e.target.value }))}
                      className="px-2 py-2 rounded-lg text-sm border"
                      style={inputStyle}>
                      <option value="">— Type —</option>
                      {LINK_TYPES.map(t => <option key={t.value} value={t.value} style={{ background: 'var(--bg-card)' }}>{t.label}</option>)}
                    </select>
                  </div>
                  <input
                    value={newLink.url}
                    onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))}
                    placeholder="URL *" required type="url"
                    className="w-full px-2 py-2 rounded-lg text-sm border"
                    style={inputStyle}
                  />
                  <Button size="sm" type="submit">Save Link</Button>
                </form>
              )}
              {(task.links ?? []).length === 0 && !showLinkForm && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No links yet.</p>
              )}
              <div className="space-y-2">
                {(task.links ?? []).map((lnk, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <a href={lnk.url} target="_blank" rel="noopener"
                      className="flex items-center gap-2 text-xs truncate"
                      style={{ color: 'var(--text-secondary)' }}>
                      <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
                      <span className="font-medium">{lnk.label}</span>
                      {lnk.type && <span style={{ color: 'var(--text-muted)' }}>· {lnk.type}</span>}
                    </a>
                    {canEdit && (
                      <button onClick={() => removeLink(i)} className="transition-colors shrink-0" style={{ color: 'var(--text-muted)' }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="rounded-xl border p-4" style={cardStyle}>
              <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <MessageSquare size={14} />Comments ({(task.comments ?? []).length})
              </p>
              <div className="space-y-3 mb-4">
                {(task.comments ?? []).length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>}
                {(task.comments ?? []).map((c, i) => {
                  const user = c.userId as IUser;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                        {user?.name?.charAt(0) ?? 'U'}
                      </div>
                      <div className="flex-1 rounded-xl px-3 py-2.5 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name ?? 'User'}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleComment} className="flex gap-2">
                <input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm border"
                  style={inputStyle}
                />
                <Button type="submit" loading={posting} size="sm"><Send size={13} /></Button>
              </form>
            </div>

            {/* Published Post Links */}
            {task.status === 'POSTED' && (
              <div className="rounded-xl border-2 p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--text-primary)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Globe size={14} />Published Post Links
                  </p>
                  {canEdit && !showPostedLinkForm && (
                    <button
                      onClick={() => { setShowPostedLinkForm(true); setPostedLinkError(''); }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                      <Plus size={11} />Add Link
                    </button>
                  )}
                </div>

                {showPostedLinkForm && (
                  <form onSubmit={addPostedLink} className="mb-3 p-3 rounded-lg border space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newPostedLink.platform}
                        onChange={e => setNewPostedLink(p => ({ ...p, platform: e.target.value as PostedLinkPlatform }))}
                        className="px-2 py-2 rounded-lg text-sm border"
                        style={inputStyle}>
                        {POSTED_LINK_PLATFORMS.map(pl => <option key={pl} value={pl} style={{ background: 'var(--bg-card)' }}>{pl}</option>)}
                      </select>
                      <div />
                    </div>
                    <input
                      type="url"
                      value={newPostedLink.url}
                      onChange={e => { setNewPostedLink(p => ({ ...p, url: e.target.value })); setPostedLinkError(''); }}
                      placeholder="https://www.instagram.com/p/..."
                      required
                      className="w-full px-2 py-2 rounded-lg text-sm border"
                      style={inputStyle}
                    />
                    {postedLinkError && <p className="text-xs text-red-400">{postedLinkError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" type="submit" loading={savingPostedLink}>Save Link</Button>
                      <Button size="sm" variant="secondary" type="button" onClick={() => { setShowPostedLinkForm(false); setPostedLinkError(''); }}>Cancel</Button>
                    </div>
                  </form>
                )}

                {(task.postedLinks ?? []).length === 0 && !showPostedLinkForm && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <AlertTriangle size={12} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No published post link added yet.</p>
                  </div>
                )}

                <div className="space-y-2">
                  {(task.postedLinks ?? []).map((lnk: IPostedLink) => (
                    <div key={lnk._id}>
                      {editingLinkId === lnk._id ? (
                        <form onSubmit={saveEditLink} className="p-3 rounded-lg border space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                          <select
                            value={editLinkData.platform}
                            onChange={e => setEditLinkData(p => ({ ...p, platform: e.target.value as PostedLinkPlatform }))}
                            className="w-full px-2 py-2 rounded-lg text-sm border"
                            style={inputStyle}>
                            {POSTED_LINK_PLATFORMS.map(pl => <option key={pl} value={pl} style={{ background: 'var(--bg-card)' }}>{pl}</option>)}
                          </select>
                          <input
                            type="url"
                            value={editLinkData.url}
                            onChange={e => setEditLinkData(p => ({ ...p, url: e.target.value }))}
                            required
                            className="w-full px-2 py-2 rounded-lg text-sm border"
                            style={inputStyle}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" type="submit">Save</Button>
                            <Button size="sm" variant="secondary" type="button" onClick={() => setEditingLinkId(null)}>Cancel</Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                          <a href={lnk.url} target="_blank" rel="noopener"
                            className="flex items-center gap-2 text-xs truncate"
                            style={{ color: 'var(--text-secondary)' }}>
                            <span>{platformIcon(lnk.platform)}</span>
                            <span className="font-semibold">{lnk.platform}</span>
                            <span style={{ color: 'var(--text-muted)' }}>— View Post</span>
                            <ExternalLink size={9} />
                          </a>
                          {isCEO && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingLinkId(lnk._id); setEditLinkData({ platform: lnk.platform, url: lnk.url }); }}
                                className="transition-colors p-1"
                                style={{ color: 'var(--text-muted)' }}>
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => deletePostedLink(lnk._id)}
                                className="transition-colors p-1 hover:text-red-400"
                                style={{ color: 'var(--text-muted)' }}>
                                <X size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Report */}
            {showReport && (
              <div className="rounded-xl border-2 p-5" style={{ background: 'var(--bg-card)', borderColor: reportBorderColor }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <BarChart2 size={16} />Performance Report
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Add views, reach, likes and other metrics after posting.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      {isStory ? 'Story' : task.contentType}
                    </span>
                    {isCEO && showReadOnly && (
                      <button
                        onClick={() => { setMetricsForm(metrics ?? {}); setReportEditing(true); }}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <Edit2 size={11} />Edit
                      </button>
                    )}
                  </div>
                </div>

                {effectiveStatus === 'WAITING' && task.reporting?.reportDueAt && (
                  <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg mb-5 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <Clock size={14} style={{ color: 'var(--text-muted)' }} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Report is not due yet.</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Due: {formatDate(task.reporting.reportDueAt)} ({formatCountdown(task.reporting.reportDueAt)})
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>You can still add metrics manually if needed.</p>
                    </div>
                  </div>
                )}
                {effectiveStatus === 'NEEDS_DATA' && (
                  <div className="flex items-center gap-2.5 px-3 py-3 rounded-lg mb-5 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <AlertTriangle size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Report data is now due.</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Enter the performance metrics below and click <strong>Save Report</strong>.
                      </p>
                    </div>
                  </div>
                )}
                {effectiveStatus === 'COMPLETED' && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-5 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Report completed</p>
                      {task.reporting?.reportCompletedAt && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(task.reporting.reportCompletedAt)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Read-only metrics */}
                {showReadOnly && metrics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {metricFields.map(({ key, label }) => {
                        const val = (metrics as Record<string, unknown>)[key] as number | undefined;
                        if (val == null) return null;
                        return (
                          <div key={key} className="rounded-xl p-3 text-center border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{val.toLocaleString()}</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                          </div>
                        );
                      })}
                      {!isStory && metrics.engagementRate != null && (
                        <div className="rounded-xl p-3 text-center border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{metrics.engagementRate}%</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Engagement</p>
                        </div>
                      )}
                    </div>
                    {metrics.screenshotUrl && (
                      <a href={metrics.screenshotUrl} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-1.5 text-xs"
                        style={{ color: 'var(--text-muted)' }}>
                        <ExternalLink size={11} />View Screenshot
                      </a>
                    )}
                    {metrics.notes && (
                      <div className="p-3 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        {metrics.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Input form */}
                {showReportForm && (
                  <form onSubmit={saveReport} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {metricFields.map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
                          <input
                            type="number" min="0" placeholder="0"
                            value={(metricsForm as Record<string, unknown>)[key] as number ?? ''}
                            onChange={e => setMetricsForm(p => ({
                              ...p,
                              [key]: e.target.value === '' ? undefined : Number(e.target.value),
                            }))}
                            className="w-full px-3 py-2.5 rounded-lg text-sm border"
                            style={inputStyle}
                          />
                        </div>
                      ))}
                    </div>

                    {!isStory && (
                      <p className="text-xs px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        Engagement rate = (likes + comments + shares + saves) ÷ reach × 100 — calculated automatically on save.
                      </p>
                    )}

                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Screenshot URL</label>
                      <input
                        type="url"
                        value={metricsForm.screenshotUrl ?? ''}
                        onChange={e => setMetricsForm(p => ({ ...p, screenshotUrl: e.target.value }))}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3 py-2.5 rounded-lg text-sm border"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Notes</label>
                      <textarea
                        rows={3}
                        value={metricsForm.notes ?? ''}
                        onChange={e => setMetricsForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Any observations about this content's performance..."
                        className="w-full px-3 py-2.5 rounded-lg text-sm border resize-none"
                        style={inputStyle}
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button type="submit" loading={savingReport}>
                        <CheckCircle2 size={14} />Save Report
                      </Button>
                      {reportEditing && (
                        <Button type="button" variant="secondary" onClick={() => setReportEditing(false)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="p-4 sm:p-6 space-y-4">
            {canEdit && (
              <div className="rounded-xl border p-4" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Update Status</p>
                <select
                  value={task.status}
                  onChange={e => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={updating}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={inputStyle}>
                  {CARD_STATUSES.map(s => (
                    <option key={s.value} value={s.value} style={{ background: 'var(--bg-card)' }}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Details</p>
              {[
                ['Client', client?.name],
                ['Board', (board as IBoard)?.title],
                ['Scheduled', task.scheduledDate ? formatDate(task.scheduledDate) : '—'],
                ['Posted', task.postedDate ? formatDate(task.postedDate) : '—'],
                ['Created', formatDate(task.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span className="text-xs font-medium text-right" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border p-4" style={cardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Assignment</p>
              {assignedWorker && typeof assignedWorker === 'object' ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    {(assignedWorker as IUser).name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{(assignedWorker as IUser).name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(assignedWorker as IUser).email}</p>
                  </div>
                </div>
              ) : task.isOpenForClaim ? (
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Open for claim</span>
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Unassigned</p>
              )}
              {claimedWorker && typeof claimedWorker === 'object' && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Claimed by</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{(claimedWorker as IUser).name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CEO Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Card" size="md"
        footer={<><Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button><Button onClick={handleEditSave} loading={savingEdit}>Save Changes</Button></>}>
        <form onSubmit={handleEditSave} className="space-y-4">
          <Input label="Title *" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} required />
          <Textarea label="Description" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Content Type" value={editForm.contentType}
              onChange={e => setEditForm(p => ({ ...p, contentType: e.target.value as ContentType }))}
              options={CONTENT_TYPES} />
            <Select label="Priority" value={editForm.priority}
              onChange={e => setEditForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Assign to Worker" value={editForm.assignedTo}
              onChange={e => setEditForm(p => ({ ...p, assignedTo: e.target.value }))}
              options={[{ value: '', label: '— Unassigned —' }, ...workers.map(w => ({ value: w._id, label: w.name }))]} />
            <Input label="Scheduled Date" type="date" value={editForm.scheduledDate}
              onChange={e => setEditForm(p => ({ ...p, scheduledDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} type="button"
                  onClick={() => setEditForm(prev => ({
                    ...prev,
                    platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p],
                  }))}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                  style={{
                    background: editForm.platforms.includes(p) ? 'rgba(255,255,255,0.1)' : 'var(--bg-elevated)',
                    borderColor: editForm.platforms.includes(p) ? '#ffffff' : 'var(--border)',
                    color: editForm.platforms.includes(p) ? '#ffffff' : 'var(--text-secondary)',
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="editOpenClaim" checked={editForm.isOpenForClaim}
              onChange={e => setEditForm(p => ({ ...p, isOpenForClaim: e.target.checked }))} className="rounded" />
            <label htmlFor="editOpenClaim" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Open for workers to claim</label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Card"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
      />
    </>
  );
}
