'use client';

import { useState, useEffect, use } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { TaskStatusBadge, ContentTypeBadge, PriorityBadge, PlatformBadge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, getTaskStatusLabel, CARD_STATUSES, LINK_TYPES } from '@/lib/utils';
import { getEffectiveReportStatus } from '@/lib/reporting';
import type { ITask, IClient, IUser, IBoard, TaskStatus, IMetrics } from '@/types';
import {
  ArrowLeft, Send, CheckCircle, Check, AlertCircle, Link2, MessageSquare,
  BarChart2, Plus, X, ExternalLink, Clock, CheckCircle2, AlertTriangle, Edit2,
} from 'lucide-react';
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
  // reportEditing: true = form visible, false = read-only view
  const [reportEditing, setReportEditing] = useState(false);
  const [metricsForm, setMetricsForm] = useState<Partial<IMetrics>>({});
  const [savingReport, setSavingReport] = useState(false);

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

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!task) return <div className="p-6 text-red-400">Card not found.</div>;

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
  // Show the input form when: CEO AND (not completed OR explicitly editing)
  const showForm = isCEO && (effectiveStatus !== 'COMPLETED' || reportEditing);
  const showReadOnly = effectiveStatus === 'COMPLETED' && !reportEditing;

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
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">

          {/* Main content */}
          <div className="lg:col-span-2 p-6 space-y-5 border-r" style={{ borderColor: 'var(--border)' }}>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <TaskStatusBadge status={task.status} />
              <ContentTypeBadge type={task.contentType} />
              <PriorityBadge priority={task.priority} />
              {(task.platforms ?? []).map(p => <PlatformBadge key={p} platform={p} />)}
              {task.isOpenForClaim && !task.claimedBy && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Open for Claim</span>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
              </div>
            )}

            {/* Checklist */}
            {checklist.length > 0 && (
              <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Production Checklist</p>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{doneCount}/{checklist.length}</span>
                </div>
                <div className="h-1.5 rounded-full mb-4" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-1.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%` }} />
                </div>
                <div className="space-y-2">
                  {checklist.map((item, i) => (
                    <div key={i}
                      onClick={() => canEdit && toggleChecklist(i)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${canEdit ? 'cursor-pointer hover:bg-white/5' : ''}`}>
                      <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center transition-colors ${item.done ? 'bg-emerald-500' : 'border'}`}
                        style={!item.done ? { borderColor: 'var(--border)' } : {}}>
                        {item.done && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm" style={{ color: item.done ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: item.done ? 'line-through' : 'none' }}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Link2 size={13} />Links & Files
                </p>
                {canEdit && (
                  <button onClick={() => setShowLinkForm(p => !p)}
                    className="text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors hover:bg-white/10"
                    style={{ color: 'var(--text-muted)' }}>
                    <Plus size={11} />{showLinkForm ? 'Cancel' : 'Add Link'}
                  </button>
                )}
              </div>
              {showLinkForm && (
                <form onSubmit={addLink} className="mb-3 p-3 rounded-lg space-y-2" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={newLink.label} onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))}
                      placeholder="Label *" required
                      className="px-2 py-1.5 rounded text-xs border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <select value={newLink.type} onChange={e => setNewLink(p => ({ ...p, type: e.target.value }))}
                      className="px-2 py-1.5 rounded text-xs border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                      <option value="">— Type —</option>
                      {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <input value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))}
                    placeholder="URL *" required type="url"
                    className="w-full px-2 py-1.5 rounded text-xs border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  <Button size="sm" type="submit">Save Link</Button>
                </form>
              )}
              {(task.links ?? []).length === 0 && !showLinkForm && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No links yet.</p>
              )}
              <div className="space-y-2">
                {(task.links ?? []).map((lnk, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <a href={lnk.url} target="_blank" rel="noopener"
                      className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 truncate">
                      <ExternalLink size={11} />
                      <span className="font-medium">{lnk.label}</span>
                      {lnk.type && <span className="text-xs opacity-60">· {lnk.type}</span>}
                    </a>
                    {canEdit && (
                      <button onClick={() => removeLink(i)} className="text-xs opacity-40 hover:opacity-100 transition-opacity shrink-0">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <MessageSquare size={13} />Comments ({(task.comments ?? []).length})
              </p>
              <div className="space-y-3 mb-4">
                {(task.comments ?? []).length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>}
                {(task.comments ?? []).map((c, i) => {
                  const user = c.userId as IUser;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
                        {user?.name?.charAt(0) ?? 'U'}
                      </div>
                      <div className="flex-1 rounded-lg px-3 py-2" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{user?.name ?? 'User'}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleComment} className="flex gap-2">
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm border"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <Button type="submit" loading={posting} size="sm"><Send size={13} /></Button>
              </form>
            </div>

            {/* ─── PERFORMANCE REPORT SECTION ─────────────────────────────────── */}
            {showReport && (
              <div className="rounded-xl border-2 p-5"
                style={{ background: 'var(--bg-card)', borderColor: effectiveStatus === 'COMPLETED' ? 'rgba(16,185,129,0.4)' : effectiveStatus === 'NEEDS_DATA' ? 'rgba(245,158,11,0.4)' : 'var(--border)' }}>

                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <BarChart2 size={16} className="text-indigo-400" />
                      Performance Report
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Add views, reach, likes and other metrics after posting.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      {isStory ? 'Story' : task.contentType}
                    </span>
                    {isCEO && showReadOnly && (
                      <button
                        onClick={() => { setMetricsForm(metrics ?? {}); setReportEditing(true); }}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        <Edit2 size={11} />Edit Report
                      </button>
                    )}
                  </div>
                </div>

                {/* Status banner — informational only, never blocks input */}
                {effectiveStatus === 'WAITING' && task.reporting?.reportDueAt && (
                  <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg mb-5"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <Clock size={14} className="text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-blue-300 text-xs font-semibold">Report is not due yet.</p>
                      <p className="text-blue-200/70 text-xs mt-0.5">
                        Due: {formatDate(task.reporting.reportDueAt)} ({formatCountdown(task.reporting.reportDueAt)})
                      </p>
                      <p className="text-blue-200/50 text-xs mt-0.5">You can still add metrics manually if needed.</p>
                    </div>
                  </div>
                )}
                {effectiveStatus === 'NEEDS_DATA' && (
                  <div className="flex items-center gap-2.5 px-3 py-3 rounded-lg mb-5"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                    <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="text-amber-300 text-xs font-semibold">Report data is now due.</p>
                      <p className="text-amber-200/70 text-xs mt-0.5">
                        Enter the performance metrics below and click <strong>Save Report</strong>.
                      </p>
                    </div>
                  </div>
                )}
                {effectiveStatus === 'COMPLETED' && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-5"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-emerald-300 text-xs font-semibold">Report completed</p>
                      {task.reporting?.reportCompletedAt && (
                        <p className="text-emerald-200/60 text-xs">{formatDate(task.reporting.reportCompletedAt)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Read-only metrics display ── */}
                {showReadOnly && metrics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {metricFields.map(({ key, label }) => {
                        const val = (metrics as Record<string, unknown>)[key] as number | undefined;
                        if (val == null) return null;
                        return (
                          <div key={key} className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
                            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{val.toLocaleString()}</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                          </div>
                        );
                      })}
                      {!isStory && metrics.engagementRate != null && (
                        <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <p className="text-xl font-bold text-emerald-400">{metrics.engagementRate}%</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Engagement</p>
                        </div>
                      )}
                    </div>
                    {metrics.screenshotUrl && (
                      <a href={metrics.screenshotUrl} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
                        <ExternalLink size={11} />View Screenshot
                      </a>
                    )}
                    {metrics.notes && (
                      <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {metrics.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Input form (always visible for CEO when not completed) ── */}
                {showForm && (
                  <form onSubmit={saveReport} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {metricFields.map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={(metricsForm as Record<string, unknown>)[key] as number ?? ''}
                            onChange={e => setMetricsForm(p => ({
                              ...p,
                              [key]: e.target.value === '' ? undefined : Number(e.target.value),
                            }))}
                            className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      ))}
                    </div>

                    {!isStory && (
                      <p className="text-xs px-2 py-1.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        Engagement rate = (likes + comments + shares + saves) ÷ reach × 100 — calculated automatically on save.
                      </p>
                    )}

                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Screenshot URL</label>
                      <input
                        type="url"
                        value={metricsForm.screenshotUrl ?? ''}
                        onChange={e => setMetricsForm(p => ({ ...p, screenshotUrl: e.target.value }))}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3 py-2 rounded-lg text-sm border"
                        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Notes</label>
                      <textarea
                        rows={3}
                        value={metricsForm.notes ?? ''}
                        onChange={e => setMetricsForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Any observations about this content's performance..."
                        className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
                        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
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
          <div className="p-6 space-y-5">
            {canEdit && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Update Status</p>
                <select value={task.status} onChange={e => handleStatusChange(e.target.value as TaskStatus)} disabled={updating}
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {CARD_STATUSES.map(s => (
                    <option key={s.value} value={s.value} style={{ background: 'var(--bg-card)' }}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Details</p>
              {[
                ['Client', client?.name],
                ['Board', (board as IBoard)?.title],
                ['Scheduled', task.scheduledDate ? formatDate(task.scheduledDate) : '—'],
                ['Posted', task.postedDate ? formatDate(task.postedDate) : '—'],
                ['Created', formatDate(task.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span className="text-xs font-medium text-right" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Assignment</p>
              {assignedWorker && typeof assignedWorker === 'object' ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
                    {(assignedWorker as IUser).name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{(assignedWorker as IUser).name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(assignedWorker as IUser).email}</p>
                  </div>
                </div>
              ) : task.isOpenForClaim ? (
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-yellow-400" />
                  <span className="text-xs text-yellow-400">Open for claim</span>
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Unassigned</p>
              )}
              {claimedWorker && typeof claimedWorker === 'object' && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Claimed by</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{(claimedWorker as IUser).name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
