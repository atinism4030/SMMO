'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import type { IAgreement, IClient } from '@/types';
import { FileText, ExternalLink, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const TYPE_COLORS: Record<string, string> = {
  CONTRACT: 'bg-zinc-900 text-zinc-400',
  OFFER: 'bg-zinc-900 text-zinc-400',
  INVOICE: 'bg-zinc-800 text-zinc-300',
  OTHER: 'bg-zinc-900 text-zinc-500',
};

export default function DocumentsContent() {
  const [agreements, setAgreements] = useState<IAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<IAgreement | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch('/api/agreements');
      const data = await res.json();
      setAgreements(data.agreements ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/agreements/${deleteTarget._id}`, { method: 'DELETE' });
    setAgreements(prev => prev.filter(a => a._id !== deleteTarget._id));
    setDeleteTarget(null);
    setDeleting(false);
    toast.success('Document deleted');
  }

  const filtered = agreements.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || ((a.clientId as unknown as IClient)?.name ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Topbar title="Documents" subtitle="All client agreements and contracts" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        {loading ? <LoadingSpinner fullPage /> : filtered.length === 0 ? (
          <EmptyState title="No documents" description="Add agreements from client detail pages" icon={FileText} />
        ) : (
          <div className="space-y-2">
            {filtered.map(a => {
              const client = a.clientId as unknown as IClient;
              return (
                <div key={a._id} className="flex items-center gap-4 p-4 rounded-xl border hover:border-zinc-700 transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                    <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Link href={`/clients/${typeof client === 'string' ? client : client?._id}`} className="text-xs text-zinc-400 hover:text-white">{client?.name}</Link>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(a.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[a.agreementType] ?? TYPE_COLORS.OTHER}`}>{a.agreementType}</span>
                  {a.fileUrl && (
                    <a href={a.fileUrl} target="_blank" rel="noopener" className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors" style={{ color: 'var(--text-muted)' }} title="Open file">
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: 'var(--text-muted)' }}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} title="Delete Document" message={`Delete "${deleteTarget?.title}"?`} />
    </>
  );
}
