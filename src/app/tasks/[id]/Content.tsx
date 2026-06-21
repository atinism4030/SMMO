'use client';

import { useState, useEffect, use } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, getTaskStatusLabel, CARD_STATUSES, LINK_TYPES } from '@/lib/utils';
import { getEffectiveReportStatus } from '@/lib/reporting';
import type { ITask, IClient, IUser, IBoard, TaskStatus, IMetrics, IPostedLink, PostedLinkPlatform } from '@/types';
import {
  ArrowLeft, Send, CheckCircle, Check, AlertCircle, Link2, MessageSquare,
  BarChart2, Plus, X, ExternalLink, Clock, CheckCircle2, AlertTriangle, Edit2,
  Globe,
} from 'lucide-react';

const POSTED_LINK_PLATFORMS: PostedLinkPlatform[] = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Website', 'Other'];

function platformIcon(platform: PostedLinkPlatform): string {
  const icons: Record<PostedLinkPlatform, string> = {
    Instagram: '📸', Facebook: '👥', TikTok: '🎵', YouTube: '▶️', Website: '🌐', Other: '🔗',
  };
  return icons[platform] ?? '🔗';
}
import Link from 'next/link';
import toast from 'react-hot-toast';

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

export default function TaskDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [task, setTask] = useState<ITask | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
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

  useEffect(() => {
    async function load() {
      const [taskRes, meRes] = await Promise.all([fetch(`/api/tasks/${id}`), fetch('/api/auth/me')]);
      const [td, me] = await Promise.all([taskRes.json(), meRes.json()]);
      const loadedTask: ITask = td.task;
      setTask(loadedTask);
      setMetricsForm(loadedTask?.reporting?.metrics ?? {});
      setUserRole(me.user?.role ?? '');
      setUserId(me.user?._id ?? '');
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

  if (loading) return <div className="flex-1 flex items-center justify-center" style={{ background: '#f8f8f8' }}><LoadingSpinner size={32} /></div>;
  if (!task) return <div className="p-6 text-red-500" style={{ background: '#f8f8f8' }}>Card not found.</div>;

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
  const showForm = isCEO && (effectiveStatus !== 'COMPLETED' || reportEditing);
  const showReadOnly = effectiveStatus === 'COMPLETED' && !reportEditing;

  const inputStyle = { background: '#ffffff', borderColor: '#e5e5e5', color: '#111111' };
  const cardStyle = { background: '#ffffff', borderColor: '#e5e5e5' };

  return (
    <>
      <Topbar
        title={task.title}
        subtitle={client?.name}
        actions={
          <div className="flex items-center gap-2">
            {canClaim && <Button variant="success" size="sm" onClick={handleClaim}><CheckCircle size={13} />Claim Card</Button>}
            <Link href={backHref}><Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button></Link>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto" style={{ background: '#f8f8f8' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-full">

          {/* Main content */}
          <div className="lg:col-span-2 p-4 sm:p-6 space-y-4 border-r border-gray-200">

            {/* Status + type badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium px-3 py-1 rounded-full border border-gray-200 bg-white text-gray-700">
                {STATUS_SHORT[task.status] ?? task.status}
              </span>
              {task.contentType && (
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                  {task.contentType}
                </span>
              )}
              {task.priority && (
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                  {task.priority}
                </span>
              )}
              {(task.platforms ?? []).map(p => (
                <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{p}</span>
              ))}
              {task.isOpenForClaim && !task.claimedBy && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500">Open for Claim</span>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div className="rounded-xl border p-4" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Description</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{task.description}</p>
              </div>
            )}

            {/* Checklist */}
            {checklist.length > 0 && (
              <div className="rounded-xl border p-4" style={cardStyle}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">Production Checklist</p>
                  <span className="text-xs font-medium text-gray-400">{doneCount}/{checklist.length}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 mb-4">
                  <div
                    className="h-1.5 rounded-full bg-gray-900 transition-all"
                    style={{ width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {checklist.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => canEdit && toggleChecklist(i)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors ${canEdit ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''}`}>
                      <div
                        className={`w-5 h-5 rounded shrink-0 flex items-center justify-center transition-colors border ${item.done ? 'bg-gray-900 border-gray-900' : 'border-gray-300 bg-white'}`}>
                        {item.done && <Check size={11} className="text-white" />}
                      </div>
                      <span
                        className="text-sm"
                        style={{
                          color: item.done ? '#aaaaaa' : '#333333',
                          textDecoration: item.done ? 'line-through' : 'none',
                        }}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="rounded-xl border p-4" style={cardStyle}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Link2 size={14} />Links & Files
                </p>
                {canEdit && (
                  <button
                    onClick={() => setShowLinkForm(p => !p)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1">
                    <Plus size={11} />{showLinkForm ? 'Cancel' : 'Add Link'}
                  </button>
                )}
              </div>
              {showLinkForm && (
                <form onSubmit={addLink} className="mb-3 p-3 rounded-lg border border-gray-100 bg-gray-50 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={newLink.label}
                      onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))}
                      placeholder="Label *" required
                      className="px-2 py-2 rounded-lg text-sm border bg-white text-gray-900"
                      style={{ borderColor: '#e5e5e5' }}
                    />
                    <select
                      value={newLink.type}
                      onChange={e => setNewLink(p => ({ ...p, type: e.target.value }))}
                      className="px-2 py-2 rounded-lg text-sm border bg-white text-gray-700"
                      style={{ borderColor: '#e5e5e5' }}>
                      <option value="">— Type —</option>
                      {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <input
                    value={newLink.url}
                    onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))}
                    placeholder="URL *" required type="url"
                    className="w-full px-2 py-2 rounded-lg text-sm border bg-white text-gray-900"
                    style={{ borderColor: '#e5e5e5' }}
                  />
                  <Button size="sm" type="submit">Save Link</Button>
                </form>
              )}
              {(task.links ?? []).length === 0 && !showLinkForm && (
                <p className="text-xs text-gray-400">No links yet.</p>
              )}
              <div className="space-y-2">
                {(task.links ?? []).map((lnk, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-gray-50 border border-gray-100">
                    <a href={lnk.url} target="_blank" rel="noopener"
                      className="flex items-center gap-2 text-xs text-gray-700 hover:text-gray-900 truncate">
                      <ExternalLink size={11} className="text-gray-400" />
                      <span className="font-medium">{lnk.label}</span>
                      {lnk.type && <span className="text-gray-400">· {lnk.type}</span>}
                    </a>
                    {canEdit && (
                      <button onClick={() => removeLink(i)} className="text-gray-300 hover:text-gray-600 transition-colors shrink-0">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="rounded-xl border p-4" style={cardStyle}>
              <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <MessageSquare size={14} />Comments ({(task.comments ?? []).length})
              </p>
              <div className="space-y-3 mb-4">
                {(task.comments ?? []).length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
                {(task.comments ?? []).map((c, i) => {
                  const user = c.userId as IUser;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {user?.name?.charAt(0) ?? 'U'}
                      </div>
                      <div className="flex-1 rounded-xl px-3 py-2.5 bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-900">{user?.name ?? 'User'}</span>
                          <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{c.text}</p>
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
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm border bg-gray-50 text-gray-900"
                  style={{ borderColor: '#e5e5e5' }}
                />
                <Button type="submit" loading={posting} size="sm"><Send size={13} /></Button>
              </form>
            </div>

            {/* Published Post Links */}
            {task.status === 'POSTED' && (
              <div className="rounded-xl border-2 p-4" style={{ background: '#ffffff', borderColor: '#111111' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Globe size={14} />Published Post Links
                  </p>
                  {canEdit && !showPostedLinkForm && (
                    <button
                      onClick={() => { setShowPostedLinkForm(true); setPostedLinkError(''); }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      <Plus size={11} />Add Link
                    </button>
                  )}
                </div>

                {showPostedLinkForm && (
                  <form onSubmit={addPostedLink} className="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newPostedLink.platform}
                        onChange={e => setNewPostedLink(p => ({ ...p, platform: e.target.value as PostedLinkPlatform }))}
                        className="px-2 py-2 rounded-lg text-sm border bg-white text-gray-700"
                        style={{ borderColor: '#e5e5e5' }}>
                        {POSTED_LINK_PLATFORMS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                      </select>
                      <div />
                    </div>
                    <input
                      type="url"
                      value={newPostedLink.url}
                      onChange={e => { setNewPostedLink(p => ({ ...p, url: e.target.value })); setPostedLinkError(''); }}
                      placeholder="https://www.instagram.com/p/..."
                      required
                      className="w-full px-2 py-2 rounded-lg text-sm border bg-white text-gray-900"
                      style={{ borderColor: '#e5e5e5' }}
                    />
                    {postedLinkError && <p className="text-xs text-red-500">{postedLinkError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" type="submit" loading={savingPostedLink}>Save Link</Button>
                      <Button size="sm" variant="secondary" type="button" onClick={() => { setShowPostedLinkForm(false); setPostedLinkError(''); }}>Cancel</Button>
                    </div>
                  </form>
                )}

                {(task.postedLinks ?? []).length === 0 && !showPostedLinkForm && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700">
                    <AlertTriangle size={12} className="text-zinc-500 shrink-0" />
                    <p className="text-xs text-zinc-400">No published post link added yet.</p>
                  </div>
                )}

                <div className="space-y-2">
                  {(task.postedLinks ?? []).map((lnk: IPostedLink) => (
                    <div key={lnk._id}>
                      {editingLinkId === lnk._id ? (
                        <form onSubmit={saveEditLink} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                          <select
                            value={editLinkData.platform}
                            onChange={e => setEditLinkData(p => ({ ...p, platform: e.target.value as PostedLinkPlatform }))}
                            className="w-full px-2 py-2 rounded-lg text-sm border"
                            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                            {POSTED_LINK_PLATFORMS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                          </select>
                          <input
                            type="url"
                            value={editLinkData.url}
                            onChange={e => setEditLinkData(p => ({ ...p, url: e.target.value }))}
                            required
                            className="w-full px-2 py-2 rounded-lg text-sm border bg-white text-gray-900"
                            style={{ borderColor: '#e5e5e5' }}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" type="submit">Save</Button>
                            <Button size="sm" variant="secondary" type="button" onClick={() => setEditingLinkId(null)}>Cancel</Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-gray-50 border border-gray-100">
                          <a href={lnk.url} target="_blank" rel="noopener"
                            className="flex items-center gap-2 text-xs text-gray-700 hover:text-gray-900 truncate">
                            <span>{platformIcon(lnk.platform)}</span>
                            <span className="font-semibold">{lnk.platform}</span>
                            <span className="text-gray-400">— View Post</span>
                            <ExternalLink size={9} />
                          </a>
                          {isCEO && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingLinkId(lnk._id); setEditLinkData({ platform: lnk.platform, url: lnk.url }); }}
                                className="text-gray-300 hover:text-gray-600 transition-colors p-1">
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => deletePostedLink(lnk._id)}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1">
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
              <div
                className="rounded-xl border-2 p-5"
                style={{
                  background: '#ffffff',
                  borderColor: effectiveStatus === 'COMPLETED' ? '#bbf7d0' : effectiveStatus === 'NEEDS_DATA' ? '#fde68a' : '#e5e5e5',
                }}>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <BarChart2 size={16} />Performance Report
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Add views, reach, likes and other metrics after posting.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {isStory ? 'Story' : task.contentType}
                    </span>
                    {isCEO && showReadOnly && (
                      <button
                        onClick={() => { setMetricsForm(metrics ?? {}); setReportEditing(true); }}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-900 transition-colors">
                        <Edit2 size={11} />Edit
                      </button>
                    )}
                  </div>
                </div>

                {effectiveStatus === 'WAITING' && task.reporting?.reportDueAt && (
                  <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg mb-5 bg-zinc-900 border border-zinc-700">
                    <Clock size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-zinc-200 text-xs font-semibold">Report is not due yet.</p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        Due: {formatDate(task.reporting.reportDueAt)} ({formatCountdown(task.reporting.reportDueAt)})
                      </p>
                      <p className="text-zinc-600 text-xs mt-0.5">You can still add metrics manually if needed.</p>
                    </div>
                  </div>
                )}
                {effectiveStatus === 'NEEDS_DATA' && (
                  <div className="flex items-center gap-2.5 px-3 py-3 rounded-lg mb-5 bg-zinc-900 border border-zinc-700">
                    <AlertTriangle size={14} className="text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-zinc-200 text-xs font-semibold">Report data is now due.</p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        Enter the performance metrics below and click <strong>Save Report</strong>.
                      </p>
                    </div>
                  </div>
                )}
                {effectiveStatus === 'COMPLETED' && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-5 bg-zinc-900 border border-zinc-700">
                    <CheckCircle2 size={14} className="text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-zinc-200 text-xs font-semibold">Report completed</p>
                      {task.reporting?.reportCompletedAt && (
                        <p className="text-zinc-500 text-xs">{formatDate(task.reporting.reportCompletedAt)}</p>
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
                          <div key={key} className="rounded-xl p-3 text-center bg-zinc-900 border border-zinc-800">
                            <p className="text-xl font-bold text-white">{val.toLocaleString()}</p>
                            <p className="text-xs mt-1 text-zinc-500">{label}</p>
                          </div>
                        );
                      })}
                      {!isStory && metrics.engagementRate != null && (
                        <div className="rounded-xl p-3 text-center bg-zinc-900 border border-zinc-700">
                          <p className="text-xl font-bold text-white">{metrics.engagementRate}%</p>
                          <p className="text-xs mt-1 text-zinc-500">Engagement</p>
                        </div>
                      )}
                    </div>
                    {metrics.screenshotUrl && (
                      <a href={metrics.screenshotUrl} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white">
                        <ExternalLink size={11} />View Screenshot
                      </a>
                    )}
                    {metrics.notes && (
                      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-400">
                        {metrics.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Input form */}
                {showForm && (
                  <form onSubmit={saveReport} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {metricFields.map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs font-medium mb-1.5 block text-gray-600">{label}</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={(metricsForm as Record<string, unknown>)[key] as number ?? ''}
                            onChange={e => setMetricsForm(p => ({
                              ...p,
                              [key]: e.target.value === '' ? undefined : Number(e.target.value),
                            }))}
                            className="w-full px-3 py-2.5 rounded-lg text-sm border bg-white text-gray-900"
                            style={inputStyle}
                          />
                        </div>
                      ))}
                    </div>

                    {!isStory && (
                      <p className="text-xs px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-500">
                        Engagement rate = (likes + comments + shares + saves) ÷ reach × 100 — calculated automatically on save.
                      </p>
                    )}

                    <div>
                      <label className="text-xs font-medium mb-1.5 block text-gray-600">Screenshot URL</label>
                      <input
                        type="url"
                        value={metricsForm.screenshotUrl ?? ''}
                        onChange={e => setMetricsForm(p => ({ ...p, screenshotUrl: e.target.value }))}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3 py-2.5 rounded-lg text-sm border bg-white text-gray-900"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1.5 block text-gray-600">Notes</label>
                      <textarea
                        rows={3}
                        value={metricsForm.notes ?? ''}
                        onChange={e => setMetricsForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Any observations about this content's performance..."
                        className="w-full px-3 py-2.5 rounded-lg text-sm border bg-white text-gray-900 resize-none"
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

          {/* Sidebar */}
          <div className="p-4 sm:p-6 space-y-4">
            {canEdit && (
              <div className="rounded-xl border p-4" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Update Status</p>
                <select
                  value={task.status}
                  onChange={e => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={updating}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border bg-white text-gray-900"
                  style={{ borderColor: '#e5e5e5' }}>
                  {CARD_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Details</p>
              {[
                ['Client', client?.name],
                ['Board', (board as IBoard)?.title],
                ['Scheduled', task.scheduledDate ? formatDate(task.scheduledDate) : '—'],
                ['Posted', task.postedDate ? formatDate(task.postedDate) : '—'],
                ['Created', formatDate(task.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-xs text-gray-400 shrink-0">{k}</span>
                  <span className="text-xs font-medium text-gray-700 text-right">{v}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border p-4" style={cardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Assignment</p>
              {assignedWorker && typeof assignedWorker === 'object' ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {(assignedWorker as IUser).name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{(assignedWorker as IUser).name}</p>
                    <p className="text-xs text-gray-400">{(assignedWorker as IUser).email}</p>
                  </div>
                </div>
              ) : task.isOpenForClaim ? (
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Open for claim</span>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Unassigned</p>
              )}
              {claimedWorker && typeof claimedWorker === 'object' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Claimed by</p>
                  <p className="text-sm font-medium text-gray-700">{(claimedWorker as IUser).name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
