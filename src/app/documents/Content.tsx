'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import type { IAgreement, IGeneratedDocument, IClient } from '@/types';
import { FileText, ExternalLink, Trash2, Search, FileDown, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const TYPE_COLORS: Record<string, string> = {
  CONTRACT: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  OFFER: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  INVOICE: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  OTHER: 'bg-zinc-900 text-zinc-500 border-zinc-800',
};

const DOC_TYPE_LABEL: Record<string, string> = {
  offer: 'Offer',
  agreement: 'Agreement',
};

const LANG_LABEL: Record<string, string> = {
  en: 'EN',
  sq: 'SQ',
  mk: 'MK',
};

export default function DocumentsContent() {
  const [agreements, setAgreements] = useState<IAgreement[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<IGeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'offer' | 'agreement'>('all');
  const [deleteTarget, setDeleteTarget] = useState<IAgreement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showAttached, setShowAttached] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [agRes, genRes] = await Promise.all([
        fetch('/api/agreements'),
        fetch('/api/generated-documents'),
      ]);
      const [agData, genData] = await Promise.all([agRes.json(), genRes.json()]);
      setAgreements(agData.agreements ?? []);
      setGeneratedDocs(genData.documents ?? []);
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

  const searchLower = search.toLowerCase();

  const filteredGenerated = generatedDocs.filter(d => {
    const client = d.clientId as unknown as IClient;
    const matchSearch = !search
      || d.title.toLowerCase().includes(searchLower)
      || (client?.name ?? '').toLowerCase().includes(searchLower);
    const matchType = typeFilter === 'all' || d.documentType === typeFilter;
    return matchSearch && matchType;
  });

  const filteredAgreements = agreements.filter(a => {
    const client = a.clientId as unknown as IClient;
    return !search
      || a.title.toLowerCase().includes(searchLower)
      || (client?.name ?? '').toLowerCase().includes(searchLower);
  });

  // Mark the latest doc per client+type
  const latestKeys = new Set<string>();
  filteredGenerated.forEach(d => {
    const client = d.clientId as unknown as IClient;
    const key = `${client?._id ?? d.clientId}-${d.documentType}`;
    if (!latestKeys.has(key)) latestKeys.add(key); // first = most recent (sorted by createdAt desc)
  });
  const latestSet = new Set<string>();
  const seen = new Set<string>();
  filteredGenerated.forEach(d => {
    const client = d.clientId as unknown as IClient;
    const key = `${client?._id ?? d.clientId}-${d.documentType}`;
    if (!seen.has(key)) { latestSet.add(d._id); seen.add(key); }
  });

  return (
    <>
      <Topbar title="Documents" subtitle="Generated offers, agreements, and attached files" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

        {/* Search + filter bar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <option value="all" style={{ background: 'var(--bg-card)' }}>All Types</option>
            <option value="offer" style={{ background: 'var(--bg-card)' }}>Offers</option>
            <option value="agreement" style={{ background: 'var(--bg-card)' }}>Agreements</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner fullPage />
        ) : (
          <>
            {/* Generated Documents Section */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                  <FileDown size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Generated Documents</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF offers and agreements generated from client pages</p>
                </div>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  {filteredGenerated.length}
                </span>
              </div>

              {filteredGenerated.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--border)' }}>
                  <FileDown size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No generated documents</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Open a client&apos;s page and click <strong>Generate Offer</strong> or <strong>Generate Agreement</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredGenerated.map(d => {
                    const client = d.clientId as unknown as IClient;
                    const isLatest = latestSet.has(d._id);
                    return (
                      <div key={d._id} className="flex items-center gap-3 p-4 rounded-xl border transition-colors hover:border-zinc-700"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        {/* Icon */}
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                          <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{d.title}</p>
                            {isLatest && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {client && (
                              <Link href={`/clients/${typeof client === 'string' ? client : client._id}`}
                                className="text-xs text-zinc-400 hover:text-white transition-colors">
                                {typeof client === 'string' ? '' : client.name}
                              </Link>
                            )}
                            <span style={{ color: 'var(--text-muted)' }} className="text-xs">·</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(d.createdAt)}</span>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full border"
                            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                            {DOC_TYPE_LABEL[d.documentType] ?? d.documentType}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full border"
                            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                            {LANG_LABEL[d.language] ?? d.language.toUpperCase()}
                          </span>
                        </div>

                        {/* Go to client link */}
                        {client && typeof client !== 'string' && (
                          <Link
                            href={`/clients/${client._id}?tab=documents`}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            title="Open in client page">
                            <ExternalLink size={14} />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Attached Documents Section */}
            {typeFilter === 'all' && (
              <section>
                <button
                  className="flex items-center gap-3 mb-3 w-full text-left"
                  onClick={() => setShowAttached(p => !p)}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                    <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Attached Documents</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Manually attached agreements and contracts</p>
                  </div>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    {filteredAgreements.length}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {showAttached ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {showAttached && (
                  filteredAgreements.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No attached documents</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredAgreements.map(a => {
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
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {formatDate(a.createdAt)}</span>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[a.agreementType] ?? TYPE_COLORS.OTHER}`}>{a.agreementType}</span>
                            {a.fileUrl && (
                              <a href={a.fileUrl} target="_blank" rel="noopener"
                                className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                                style={{ color: 'var(--text-muted)' }} title="Open file">
                                <ExternalLink size={15} />
                              </a>
                            )}
                            <button onClick={() => setDeleteTarget(a)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                              style={{ color: 'var(--text-muted)' }}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Document"
        message={`Delete "${deleteTarget?.title}"?`}
      />
    </>
  );
}
