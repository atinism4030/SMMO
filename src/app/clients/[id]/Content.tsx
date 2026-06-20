'use client';

import { useState, useEffect, use } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { ClientStatusBadge, TaskStatusBadge, PlatformBadge, PaymentStatusBadge, ContentStatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils';
import type { IClient, IBoard, ITask, IPayment, IAgreement, IContentItem } from '@/types';
import { ArrowLeft, Plus, ExternalLink, FileText, Trash2, Globe, AtSign } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'boards' | 'tasks' | 'payments' | 'agreements' | 'content';

export default function ClientDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<IClient | null>(null);
  const [boards, setBoards] = useState<IBoard[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [agreements, setAgreements] = useState<IAgreement[]>([]);
  const [content, setContent] = useState<IContentItem[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [agreementForm, setAgreementForm] = useState({ title: '', fileUrl: '', fileName: '', agreementType: 'CONTRACT', startDate: '', endDate: '', notes: '' });
  const [savingAgreement, setSavingAgreement] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [clientRes, boardRes, taskRes, paymentRes, agreementRes, contentRes] = await Promise.all([
        fetch(`/api/clients/${id}`),
        fetch(`/api/boards?clientId=${id}`),
        fetch(`/api/tasks?clientId=${id}`),
        fetch(`/api/payments?clientId=${id}`),
        fetch(`/api/agreements?clientId=${id}`),
        fetch(`/api/content?clientId=${id}`),
      ]);
      const [cd, bd, td, pd, ad, con] = await Promise.all([clientRes.json(), boardRes.json(), taskRes.json(), paymentRes.json(), agreementRes.json(), contentRes.json()]);
      setClient(cd.client);
      setBoards(bd.boards ?? []);
      setTasks(td.tasks ?? []);
      setPayments(pd.payments ?? []);
      setAgreements(ad.agreements ?? []);
      setContent(con.items ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function saveAgreement(e: React.FormEvent) {
    e.preventDefault();
    setSavingAgreement(true);
    try {
      const res = await fetch('/api/agreements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...agreementForm, clientId: id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setAgreements(prev => [data.agreement, ...prev]);
      setShowAgreementForm(false);
      toast.success('Agreement added');
    } finally { setSavingAgreement(false); }
  }

  async function deleteAgreement(agId: string) {
    await fetch(`/api/agreements/${agId}`, { method: 'DELETE' });
    setAgreements(prev => prev.filter(a => a._id !== agId));
    toast.success('Agreement removed');
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!client) return <div className="p-6 text-red-400">Client not found.</div>;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'boards', label: 'Boards', count: boards.length },
    { key: 'tasks', label: 'Tasks', count: tasks.length },
    { key: 'payments', label: 'Payments', count: payments.length },
    { key: 'agreements', label: 'Documents', count: agreements.length },
    { key: 'content', label: 'Content', count: content.length },
  ];

  return (
    <>
      <Topbar
        title={client.name}
        subtitle={client.businessType}
        actions={
          <div className="flex items-center gap-2">
            <ClientStatusBadge status={client.status} />
            <Link href="/clients"><Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button></Link>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="border-b px-6 flex gap-0" style={{ borderColor: 'var(--border)' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
              style={{ borderColor: tab === t.key ? '#6366f1' : 'transparent', color: tab === t.key ? '#a5b4fc' : 'var(--text-muted)' }}>
              {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Client Info</h3>
                <div className="space-y-3">
                  {[
                    ['Contact', client.contactPerson],
                    ['Phone', client.phone],
                    ['Email', client.email],
                    ['Package', client.packageName],
                    ['Monthly Price', client.monthlyPrice ? formatCurrency(client.monthlyPrice, client.currency) : null],
                    ['Start Date', formatDate(client.startDate)],
                    ['Address', client.address],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Links</h3>
                <div className="space-y-2">
                  {client.instagramUrl && <a href={client.instagramUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300"><AtSign size={14} />Instagram</a>}
                  {client.facebookUrl && <a href={client.facebookUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"><ExternalLink size={14} />Facebook</a>}
                  {client.tiktokUrl && <a href={client.tiktokUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ExternalLink size={14} />TikTok</a>}
                  {client.websiteUrl && <a href={client.websiteUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300"><Globe size={14} />Website</a>}
                  {client.driveFolderUrl && <a href={client.driveFolderUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300"><ExternalLink size={14} />Google Drive</a>}
                  {!client.instagramUrl && !client.facebookUrl && !client.websiteUrl && !client.driveFolderUrl && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No links added.</p>}
                </div>
                {client.notes && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notes</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{client.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'boards' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Monthly Boards</h3>
                <Link href="/boards"><Button size="sm"><Plus size={13} />New Board</Button></Link>
              </div>
              {boards.length === 0 ? <EmptyState title="No boards yet" description="Create a monthly board for this client" icon={FileText} /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {boards.map(b => (
                    <Link key={b._id} href={`/boards/${b._id}`} className="block rounded-xl border p-4 hover:border-indigo-500/30 transition-all" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatMonthYear(b.month, b.year)}</p>
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full" style={{ background: b.status === 'ACTIVE' ? 'rgba(99,102,241,0.15)' : 'rgba(107,114,128,0.15)', color: b.status === 'ACTIVE' ? '#a5b4fc' : '#9ca3af' }}>{b.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-2">
              {tasks.length === 0 ? <EmptyState title="No tasks" icon={FileText} /> : tasks.map(task => (
                <Link key={task._id} href={`/tasks/${task._id}`} className="flex items-center gap-4 p-3 rounded-lg border hover:border-indigo-500/30 transition-all" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <TaskStatusBadge status={task.status} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(task.deadline)}</span>
                </Link>
              ))}
            </div>
          )}

          {tab === 'payments' && (
            <div className="space-y-2">
              {payments.length === 0 ? <EmptyState title="No payments" icon={FileText} /> : payments.map(p => (
                <div key={p._id} className="flex items-center gap-4 p-3 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <PaymentStatusBadge status={p.status} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{formatMonthYear(p.month, p.year)}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.amount, p.currency)}</span>
                  {p.dueDate && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Due {formatDate(p.dueDate)}</span>}
                </div>
              ))}
            </div>
          )}

          {tab === 'agreements' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Documents & Agreements</h3>
                <Button size="sm" onClick={() => setShowAgreementForm(true)}><Plus size={13} />Add Document</Button>
              </div>
              {agreements.length === 0 ? <EmptyState title="No documents" description="Attach agreements or contracts" icon={FileText} /> : (
                <div className="space-y-2">
                  {agreements.map(a => (
                    <div key={a._id} className="flex items-center gap-4 p-3 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.agreementType} · {formatDate(a.createdAt)}</p>
                      </div>
                      {a.fileUrl && <a href={a.fileUrl} target="_blank" rel="noopener" className="text-indigo-400 hover:text-indigo-300"><ExternalLink size={14} /></a>}
                      <button onClick={() => deleteAgreement(a._id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'content' && (
            <div className="space-y-2">
              {content.length === 0 ? <EmptyState title="No content items" icon={FileText} /> : content.map(c => (
                <div key={c._id} className="flex items-center gap-4 p-3 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <ContentStatusBadge status={c.status} />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{c.title}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.contentType}</span>
                  {c.scheduledDate && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(c.scheduledDate)}</span>}
                  <div className="flex gap-1">{c.platforms?.map(p => <PlatformBadge key={p} platform={p} />)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={showAgreementForm} onClose={() => setShowAgreementForm(false)} title="Add Document" size="md"
        footer={<><Button variant="secondary" onClick={() => setShowAgreementForm(false)}>Cancel</Button><Button onClick={saveAgreement} loading={savingAgreement}>Add Document</Button></>}>
        <form onSubmit={saveAgreement} className="space-y-3">
          <Input label="Title *" value={agreementForm.title} onChange={e => setAgreementForm(p => ({ ...p, title: e.target.value }))} required placeholder="Service Agreement June 2026" />
          <Select label="Type" value={agreementForm.agreementType} onChange={e => setAgreementForm(p => ({ ...p, agreementType: e.target.value }))}
            options={[{ value: 'CONTRACT', label: 'Contract' }, { value: 'OFFER', label: 'Offer' }, { value: 'INVOICE', label: 'Invoice' }, { value: 'OTHER', label: 'Other' }]} />
          <Input label="File URL (Google Drive, PDF link)" value={agreementForm.fileUrl} onChange={e => setAgreementForm(p => ({ ...p, fileUrl: e.target.value }))} placeholder="https://drive.google.com/..." />
          <Input label="File Name" value={agreementForm.fileName} onChange={e => setAgreementForm(p => ({ ...p, fileName: e.target.value }))} placeholder="contract-2026.pdf" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={agreementForm.startDate} onChange={e => setAgreementForm(p => ({ ...p, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={agreementForm.endDate} onChange={e => setAgreementForm(p => ({ ...p, endDate: e.target.value }))} />
          </div>
          <Textarea label="Notes" value={agreementForm.notes} onChange={e => setAgreementForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
        </form>
      </Modal>
    </>
  );
}
