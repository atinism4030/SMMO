'use client';

import { useState, useEffect, use } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { TaskStatusBadge, PriorityBadge, PlatformBadge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, TASK_TYPES, getTaskStatusLabel } from '@/lib/utils';
import type { ITask, IClient, IUser, IBoard, TaskStatus } from '@/types';
import { ArrowLeft, Send, CheckCircle, XCircle, Check, AlertCircle, Paperclip, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function TaskDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [task, setTask] = useState<ITask | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newAttachment, setNewAttachment] = useState({ name: '', url: '' });
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    async function load() {
      const [taskRes, meRes] = await Promise.all([fetch(`/api/tasks/${id}`), fetch('/api/auth/me')]);
      const [td, me] = await Promise.all([taskRes.json(), meRes.json()]);
      setTask(td.task);
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
    if (res.ok) { setTask(data.task); toast.success(`Status → ${getTaskStatusLabel(newStatus)}`); }
    else toast.error(data.error);
    setUpdating(false);
  }

  async function handleClaim() {
    const res = await fetch(`/api/tasks/${id}/claim`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) { setTask(data.task); toast.success('Task claimed!'); }
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

  async function addAttachment(e: React.FormEvent) {
    e.preventDefault();
    if (!newAttachment.url) return;
    if (!task) return;
    const attachments = [...(task.attachments ?? []), { name: newAttachment.name || newAttachment.url, url: newAttachment.url }];
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachments }),
    });
    const data = await res.json();
    if (res.ok) { setTask(data.task); setNewAttachment({ name: '', url: '' }); toast.success('Attachment added'); }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!task) return <div className="p-6 text-red-400">Task not found.</div>;

  const client = task.clientId as IClient;
  const board = task.boardId as IBoard;
  const assignedWorker = task.assignedTo as IUser | undefined;
  const claimedWorker = task.claimedBy as IUser | undefined;
  const canClaim = task.isOpenForClaim && !task.claimedBy && userRole === 'WORKER';
  const isMyTask = userId && (assignedWorker?._id === userId || claimedWorker?._id === userId || (assignedWorker as unknown as string) === userId || (claimedWorker as unknown as string) === userId);
  const isCEO = userRole === 'CEO';
  const canEdit = isCEO || isMyTask;
  const taskType = TASK_TYPES.find(t => t.value === task.taskType)?.label ?? task.taskType;
  const checklist = task.checklist ?? [];
  const doneCount = checklist.filter(c => c.done).length;

  const statusOptions = [
    { value: 'TO_DO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'WAITING_APPROVAL', label: 'Waiting Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'POSTED', label: 'Posted' },
    { value: 'DONE', label: 'Done' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const backHref = isCEO ? (board ? `/boards/${typeof board === 'string' ? board : board._id}` : '/tasks') : '/worker/my-tasks';

  return (
    <>
      <Topbar
        title={task.title}
        subtitle={`${client?.name} · ${taskType}`}
        actions={
          <div className="flex items-center gap-2">
            {canClaim && <Button variant="success" size="sm" onClick={handleClaim}><CheckCircle size={13} />Claim Task</Button>}
            {isCEO && task.status === 'WAITING_APPROVAL' && (
              <>
                <Button variant="success" size="sm" onClick={() => handleStatusChange('APPROVED')}><CheckCircle size={13} />Approve</Button>
                <Button variant="danger" size="sm" onClick={() => handleStatusChange('IN_PROGRESS')}><XCircle size={13} />Reject</Button>
              </>
            )}
            <Link href={backHref}><Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button></Link>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
          <div className="lg:col-span-2 p-6 space-y-6 border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="flex flex-wrap items-center gap-3">
              <TaskStatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.platforms?.map(p => <PlatformBadge key={p} platform={p} />)}
              {task.isOpenForClaim && !task.claimedBy && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Open for Claim</span>
              )}
            </div>

            {task.description && (
              <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
              </div>
            )}

            {checklist.length > 0 && (
              <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Checklist</p>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{doneCount}/{checklist.length}</span>
                </div>
                <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%` }} />
                </div>
                <div className="space-y-2">
                  {checklist.map((item, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => canEdit && toggleChecklist(i)}
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${canEdit ? 'cursor-pointer' : ''} ${item.done ? 'bg-emerald-500' : 'border'}`}
                        style={!item.done ? { borderColor: 'var(--border)' } : {}}
                      >
                        {item.done && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm transition-colors" style={{ color: item.done ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: item.done ? 'line-through' : 'none' }}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Attachments & Links</p>
              {(task.attachments ?? []).length === 0 && <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>No attachments yet.</p>}
              <div className="space-y-2 mb-3">
                {(task.attachments ?? []).map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300">
                    <Paperclip size={12} />{att.name || att.url}
                  </a>
                ))}
              </div>
              {canEdit && (
                <form onSubmit={addAttachment} className="flex gap-2">
                  <input value={newAttachment.name} onChange={e => setNewAttachment(p => ({ ...p, name: e.target.value }))} placeholder="Name (optional)"
                    className="flex-1 px-2 py-1.5 rounded text-xs border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  <input value={newAttachment.url} onChange={e => setNewAttachment(p => ({ ...p, url: e.target.value }))} placeholder="URL *"
                    className="flex-1 px-2 py-1.5 rounded text-xs border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  <Button size="sm" type="submit">Add</Button>
                </form>
              )}
            </div>

            <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <MessageSquare size={13} />Comments ({(task.comments ?? []).length})
              </p>
              <div className="space-y-3 mb-4">
                {(task.comments ?? []).length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>}
                {(task.comments ?? []).map((c, i) => {
                  const user = c.userId as IUser;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
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
                  className="flex-1 px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <Button type="submit" loading={posting} size="sm"><Send size={13} /></Button>
              </form>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {canEdit && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Update Status</p>
                <select value={task.status} onChange={e => handleStatusChange(e.target.value as TaskStatus)} disabled={updating}
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {statusOptions.map(s => <option key={s.value} value={s.value} style={{ background: 'var(--bg-card)' }}>{s.label}</option>)}
                </select>
              </div>
            )}

            <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Details</p>
              {[
                ['Client', client?.name],
                ['Type', taskType],
                ['Board', (board as IBoard)?.title],
                ['Deadline', task.deadline ? formatDate(task.deadline) : '—'],
                ['Created', formatDate(task.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Assignment</p>
              {assignedWorker ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>{assignedWorker.name?.charAt(0)}</div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{assignedWorker.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{assignedWorker.email}</p>
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
