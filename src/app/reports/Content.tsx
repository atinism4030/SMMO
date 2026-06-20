'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import type { IReport, IClient, IContentItem } from '@/types';
import { Plus, BarChart3, Eye, Heart, MessageSquare, Share2, Bookmark, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = { clientId: '', contentItemId: '', reportDate: new Date().toISOString().split('T')[0], daysAfterPosting: '3', views: '', reach: '', likes: '', comments: '', shares: '', saves: '', clicks: '', engagementRate: '', notes: '', screenshotUrl: '' };

export default function ReportsContent() {
  const [reports, setReports] = useState<IReport[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [contentItems, setContentItems] = useState<IContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IReport | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clientFilter, setClientFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (clientFilter) params.set('clientId', clientFilter);
    const [rRes, cRes] = await Promise.all([fetch(`/api/reports?${params}`), fetch('/api/clients')]);
    const [rd, cd] = await Promise.all([rRes.json(), cRes.json()]);
    setReports(rd.reports ?? []);
    setClients(cd.clients ?? []);
    setLoading(false);
  }, [clientFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    async function loadContent() {
      if (!form.clientId) { setContentItems([]); return; }
      const res = await fetch(`/api/content?clientId=${form.clientId}`);
      const data = await res.json();
      setContentItems((data.items ?? []).filter((i: IContentItem) => i.status === 'POSTED' || i.status === 'REPORTED'));
    }
    loadContent();
  }, [form.clientId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        daysAfterPosting: form.daysAfterPosting ? parseInt(form.daysAfterPosting) : 3,
        views: form.views ? parseInt(form.views) : undefined,
        reach: form.reach ? parseInt(form.reach) : undefined,
        likes: form.likes ? parseInt(form.likes) : undefined,
        comments: form.comments ? parseInt(form.comments) : undefined,
        shares: form.shares ? parseInt(form.shares) : undefined,
        saves: form.saves ? parseInt(form.saves) : undefined,
        clicks: form.clicks ? parseInt(form.clicks) : undefined,
        engagementRate: form.engagementRate ? parseFloat(form.engagementRate) : undefined,
        contentItemId: form.contentItemId || undefined,
      };
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Report added');
      setShowForm(false); setForm(emptyForm); fetchData();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/reports/${deleteTarget._id}`, { method: 'DELETE' });
      setDeleteTarget(null); fetchData(); toast.success('Report deleted');
    } finally { setDeleting(false); }
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <Topbar title="Post Reports" subtitle="Track content performance after posting"
        actions={<Button onClick={() => setShowForm(true)}><Plus size={14} />Add Report</Button>} />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex gap-3">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c._id} value={c._id} style={{ background: 'var(--bg-card)' }}>{c.name}</option>)}
          </select>
        </div>

        {loading ? <LoadingSpinner fullPage /> : reports.length === 0 ? (
          <EmptyState title="No reports yet" description="Add post performance reports after content is published" icon={BarChart3}
            action={<Button onClick={() => setShowForm(true)}><Plus size={14} />Add Report</Button>} />
        ) : (
          <div className="space-y-3">
            {reports.map(r => {
              const client = r.clientId as IClient;
              const content = r.contentItemId as IContentItem | undefined;
              return (
                <div key={r._id} className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{content?.title ?? 'Post Report'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{client?.name} · {formatDate(r.reportDate)} · {r.daysAfterPosting ?? 3} days after posting</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.screenshotUrl && <a href={r.screenshotUrl} target="_blank" rel="noopener" className="text-xs text-indigo-400 hover:text-indigo-300">Screenshot</a>}
                      <button onClick={() => setDeleteTarget(r)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                    {[
                      { icon: Eye, label: 'Views', value: r.views },
                      { icon: Eye, label: 'Reach', value: r.reach },
                      { icon: Heart, label: 'Likes', value: r.likes },
                      { icon: MessageSquare, label: 'Comments', value: r.comments },
                      { icon: Share2, label: 'Shares', value: r.shares },
                      { icon: Bookmark, label: 'Saves', value: r.saves },
                      { label: 'Engagement', value: r.engagementRate ? `${r.engagementRate}%` : undefined },
                    ].map(({ label, value, icon: Icon }) => value !== undefined ? (
                      <div key={label} className="text-center p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                        {Icon && <Icon size={14} className="mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />}
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      </div>
                    ) : null)}
                  </div>
                  {r.notes && <p className="text-xs mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{r.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Post Report" size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>Add Report</Button></>}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Client *" value={form.clientId} onChange={f('clientId')} options={[{ value: '', label: '— Select Client —' }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
            <Select label="Content Item" value={form.contentItemId} onChange={f('contentItemId')} options={[{ value: '', label: '— Select Content (optional) —' }, ...contentItems.map(i => ({ value: i._id, label: i.title }))]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Report Date *" type="date" value={form.reportDate} onChange={f('reportDate')} required />
            <Input label="Days After Posting" type="number" value={form.daysAfterPosting} onChange={f('daysAfterPosting')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Views" type="number" value={form.views} onChange={f('views')} placeholder="4820" />
            <Input label="Reach" type="number" value={form.reach} onChange={f('reach')} placeholder="3900" />
            <Input label="Likes" type="number" value={form.likes} onChange={f('likes')} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Input label="Comments" type="number" value={form.comments} onChange={f('comments')} />
            <Input label="Shares" type="number" value={form.shares} onChange={f('shares')} />
            <Input label="Saves" type="number" value={form.saves} onChange={f('saves')} />
            <Input label="Clicks" type="number" value={form.clicks} onChange={f('clicks')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Engagement Rate (%)" type="number" step="0.1" value={form.engagementRate} onChange={f('engagementRate')} placeholder="12.4" />
            <Input label="Screenshot URL" value={form.screenshotUrl} onChange={f('screenshotUrl')} placeholder="https://..." />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={f('notes')} rows={3} placeholder="Analysis of performance..." />
        </form>
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} title="Delete Report" message="Delete this report?" />
    </>
  );
}
