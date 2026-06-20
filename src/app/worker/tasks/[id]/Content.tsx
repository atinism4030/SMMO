'use client';

import { use } from 'react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { TaskStatusBadge, PriorityBadge, PlatformBadge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, TASK_TYPES, getTaskStatusLabel } from '@/lib/utils';
import type { ITask, IClient, IUser, TaskStatus } from '@/types';
import { ArrowLeft, Send, CheckCircle, Check, Paperclip, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkerTaskDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [task, setTask] = useState<ITask | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [newAttachment, setNewAttachment] = useState({ name: '', url: '' });
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    async function load() {
      const [taskRes, meRes] = await Promise.all([fetch(`/api/tasks/${id}`), fetch('/api/auth/me')]);
      const [td, me] = await Promise.all([taskRes.json(), meRes.json()]);
      setTask(td.task);
      setUserId(me.user?._id ?? '');
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleClaim() {
    const res = await fetch(`/api/tasks/${id}/claim`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) { setTask(data.task); toast.success('Task claimed!'); }
    else toast.error(data.error);
  }

  async function handleStatusChange(newStatus: TaskStatus) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    const data = await res.json();
    if (res.ok) { setTask(data.task); toast.success(`Status → ${getTaskStatusLabel(newStatus)}`); }
    else toast.error(data.error);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/tasks/${id}/comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: comment }) });
    const data = await res.json();
    if (res.ok) { setTask(data.task); setComment(''); }
    else toast.error(data.error);
    setPosting(false);
  }

  async function toggleChecklist(idx: number) {
    if (!task) return;
    const checklist = task.checklist?.map((c, i) => i === idx ? { ...c, done: !c.done } : c) ?? [];
    const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checklist }) });
    const data = await res.json();
    if (res.ok) setTask(data.task);
  }

  async function addAttachment(e: React.FormEvent) {
    e.preventDefault();
    if (!newAttachment.url || !task) return;
    const attachments = [...(task.attachments ?? []), { name: newAttachment.name || newAttachment.url, url: newAttachment.url }];
    const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attachments }) });
    const data = await res.json();
    if (res.ok) { setTask(data.task); setNewAttachment({ name: '', url: '' }); toast.success('Attachment added'); }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!task) return <div className="p-6 text-red-400">Task not found.</div>;

  const client = task.clientId as IClient;
  const assignedWorker = task.assignedTo as IUser | undefined;
  const claimedWorker = task.claimedBy as IUser | undefined;
  const myTask = userId && (
    (assignedWorker as { _id?: string } | undefined)?._id === userId ||
    (claimedWorker as { _id?: string } | undefined)?._id === userId ||
    (task.assignedTo as unknown as string) === userId ||
    (task.claimedBy as unknown as string) === userId
  );
  const canClaim = task.isOpenForClaim && !task.claimedBy;
  const taskType = TASK_TYPES.find(t => t.value === task.taskType)?.label ?? task.taskType;
  const checklist = task.checklist ?? [];
  const doneCount = checklist.filter(c => c.done).length;

  return (
    <>
      <Topbar
        title={task.title}
        subtitle={`${client?.name} · ${taskType}`}
        actions={
          <div className="flex items-center gap-2">
            {canClaim && <Button variant="success" size="sm" onClick={handleClaim}><CheckCircle size={13} />Claim Task</Button>}
            <Link href="/worker/my-tasks"><Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button></Link>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
          <div className="lg:col-span-2 p-6 space-y-5 border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="flex flex-wrap items-center gap-2">
              <TaskStatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.platforms?.map(p => <PlatformBadge key={p} platform={p} />)}
            </div>

            {task.description && (
              <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
              </div>
            )}

            {checklist.length > 0 && (
              <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex justify-between mb-3">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Checklist</p>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{doneCount}/{checklist.length}</span>
                </div>
                <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%` }} />
                </div>
                <div className="space-y-2">
                  {checklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 cursor-pointer" onClick={() => myTask && toggleChecklist(i)}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-500' : 'border'}`} style={!item.done ? { borderColor: 'var(--border)' } : {}}>
                        {item.done && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm" style={{ color: item.done ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Attachments</p>
              <div className="space-y-2 mb-3">
                {(task.attachments ?? []).map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noopener" className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300">
                    <Paperclip size={12} />{att.name || att.url}
                  </a>
                ))}
                {(task.attachments ?? []).length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No attachments.</p>}
              </div>
              {myTask && (
                <form onSubmit={addAttachment} className="flex gap-2">
                  <input value={newAttachment.name} onChange={e => setNewAttachment(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="flex-1 px-2 py-1.5 rounded text-xs border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  <input value={newAttachment.url} onChange={e => setNewAttachment(p => ({ ...p, url: e.target.value }))} placeholder="URL *" className="flex-1 px-2 py-1.5 rounded text-xs border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  <Button size="sm" type="submit">Add</Button>
                </form>
              )}
            </div>

            <div className="rounded-xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}><MessageSquare size={13} />Comments ({(task.comments ?? []).length})</p>
              <div className="space-y-3 mb-4">
                {(task.comments ?? []).length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>}
                {(task.comments ?? []).map((c, i) => {
                  const user = c.userId as IUser;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>{user?.name?.charAt(0) ?? 'U'}</div>
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

          <div className="p-6 space-y-4">
            {myTask && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Update Status</p>
                <select value={task.status} onChange={e => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {['TO_DO', 'IN_PROGRESS', 'WAITING_APPROVAL', 'DONE'].map(s => (
                    <option key={s} value={s} style={{ background: 'var(--bg-card)' }}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Details</p>
              {[['Client', client?.name], ['Type', taskType], ['Deadline', task.deadline ? formatDate(task.deadline) : '—']].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
