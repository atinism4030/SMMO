'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import { ClientStatusBadge, TaskStatusBadge, PlatformBadge, PaymentStatusBadge, ContentStatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils';
import type { IClient, IBoard, ITask, IPayment, IAgreement, IContentItem, IGeneratedDocument, DocLang } from '@/types';
import { ArrowLeft, Plus, ExternalLink, FileText, Trash2, Globe, AtSign, FileDown, Percent } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { DOC_LANG_LABELS } from '@/lib/documentTranslations';

type Tab = 'overview' | 'boards' | 'tasks' | 'payments' | 'agreements' | 'content' | 'documents';

const PLATFORMS_LIST = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Website'];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function fmtDateDisplay(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function makeOfferForm() {
  return {
    lang: 'en' as DocLang,
    packageName: '',
    date: todayISO(),
    durationMonths: 6,
    platforms: [] as string[],
    posts: 0, reels: 0, stories: 0, photoshoots: 0, videoProduction: 0, droneShots: 0,
    realPackagePrice: 0, offeredPrice: 0, currency: 'EUR',
    boostBudget: '', sponsoredContent: false,
    additionalServices: '', notes: '',
    updateStatus: true,
  };
}

function makeAgreementForm() {
  return {
    lang: 'en' as DocLang,
    agreementDate: todayISO(),
    startDate: todayISO(),
    durationMonths: 6,
    platforms: [] as string[],
    postsMin: 0, postsMax: 0,
    reelsMin: 0, reelsMax: 0,
    storiesMin: 0, storiesMax: 0,
    photoshoots: 0, videoProduction: 0, droneShots: 0,
    additionalServices: '', boostBudget: '',
    monthlyPrice: 0, currency: 'EUR',
    terminationNoticeDays: 30,
    governingLaw: 'Republic of North Macedonia',
    updateStatus: false,
  };
}

type OfferForm = ReturnType<typeof makeOfferForm>;
type AgreementForm = ReturnType<typeof makeAgreementForm>;

const LANG_LABEL: Record<string, string> = { en: 'EN', sq: 'SQ', mk: 'MK' };

function GeneratedDocCard({ doc, isLatest, client }: { doc: IGeneratedDocument; isLatest: boolean; client: IClient }) {
  const [downloading, setDownloading] = useState(false);

  async function redownload() {
    setDownloading(true);
    try {
      const data = doc.documentData as Record<string, unknown>;
      if (doc.documentType === 'offer') {
        const { generateOfferPDF } = await import('@/lib/offerPDF');
        await generateOfferPDF({
          clientName: client.name,
          contactPerson: client.contactPerson,
          date: fmtDateDisplay(data.date as string),
          packageName: (data.packageName as string) ?? '',
          posts: (data.posts as number) ?? 0,
          reels: (data.reels as number) ?? 0,
          stories: (data.stories as number) ?? 0,
          photoshoots: (data.photoshoots as number) ?? 0,
          videoProduction: (data.videoProduction as number) ?? 0,
          droneShots: (data.droneShots as number) ?? 0,
          platforms: (data.platforms as string[]) ?? [],
          additionalServices: (data.additionalServices as string) ?? '',
          realPackagePrice: (data.realPackagePrice as number) ?? 0,
          offeredPrice: (data.offeredPrice as number) ?? 0,
          discountPercent: (data.discountPercent as number) ?? 0,
          currency: (data.currency as string) ?? 'EUR',
          boostBudget: (data.boostBudget as string) ?? '',
          sponsoredContent: (data.sponsoredContent as boolean) ?? false,
          durationMonths: (data.durationMonths as number) ?? 6,
          notes: (data.notes as string) ?? '',
          lang: doc.language,
        });
      } else {
        const { generateAgreementPDF } = await import('@/lib/agreementPDF');
        await generateAgreementPDF({
          clientName: client.name,
          contactPerson: client.contactPerson,
          agreementDate: fmtDateDisplay(data.agreementDate as string),
          startDate: fmtDateDisplay(data.startDate as string),
          durationMonths: (data.durationMonths as number) ?? 6,
          platforms: (data.platforms as string[]) ?? [],
          postsMin: (data.postsMin as number) ?? 0,
          postsMax: (data.postsMax as number) ?? 0,
          reelsMin: (data.reelsMin as number) ?? 0,
          reelsMax: (data.reelsMax as number) ?? 0,
          storiesMin: (data.storiesMin as number) ?? 0,
          storiesMax: (data.storiesMax as number) ?? 0,
          photoshoots: (data.photoshoots as number) ?? 0,
          videoProduction: (data.videoProduction as number) ?? 0,
          droneShots: (data.droneShots as number) ?? 0,
          additionalServices: (data.additionalServices as string) ?? '',
          boostBudget: (data.boostBudget as string) ?? '',
          monthlyPrice: (data.monthlyPrice as number) ?? 0,
          currency: (data.currency as string) ?? 'EUR',
          terminationNoticeDays: (data.terminationNoticeDays as number) ?? 30,
          governingLaw: (data.governingLaw as string) ?? 'Republic of North Macedonia',
          lang: doc.language,
        });
      }
      toast.success('PDF downloaded');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Download failed: ${msg}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
        <FileText size={15} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{doc.title}</p>
          {isLatest && (
            <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)' }}>
              Latest
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {formatDate(doc.createdAt)}
        </p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full border flex-shrink-0"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        {LANG_LABEL[doc.language] ?? doc.language.toUpperCase()}
      </span>
      <button
        onClick={redownload}
        disabled={downloading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex-shrink-0"
        style={{ borderColor: 'var(--border)', color: downloading ? 'var(--text-muted)' : 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
        title="Re-download PDF">
        <FileDown size={12} />
        {downloading ? 'Generating...' : 'Download'}
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mt-5 mb-2 pb-1 border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
      {children}
    </p>
  );
}

function PlatformCheckboxes({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {PLATFORMS_LIST.map(p => (
        <label key={p} className="flex items-center gap-1.5 cursor-pointer select-none text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={selected.includes(p)}
            onChange={() => onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p])}
            className="accent-white"
          />
          {p}
        </label>
      ))}
    </div>
  );
}

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        type="number" min="0" value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 rounded-lg text-sm border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

export default function ClientDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<IClient | null>(null);
  const [boards, setBoards] = useState<IBoard[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [agreements, setAgreements] = useState<IAgreement[]>([]);
  const [content, setContent] = useState<IContentItem[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<IGeneratedDocument[]>([]);
  const [userRole, setUserRole] = useState<'CEO' | 'WORKER' | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Quick status change (CEO only)
  const [changingStatus, setChangingStatus] = useState(false);

  async function handleStatusChange(newStatus: string) {
    if (!client) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to update status'); return; }
      setClient(data.client);
      toast.success('Status updated');
    } catch {
      toast.error('Network error');
    } finally {
      setChangingStatus(false);
    }
  }

  // Legacy agreement form
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [agreementForm, setAgreementForm] = useState({ title: '', fileUrl: '', fileName: '', agreementType: 'CONTRACT', startDate: '', endDate: '', notes: '' });
  const [savingAgreement, setSavingAgreement] = useState(false);

  // Offer PDF modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState<OfferForm>(makeOfferForm());
  const [generatingOffer, setGeneratingOffer] = useState(false);

  // Agreement PDF modal
  const [showAgreementPDFModal, setShowAgreementPDFModal] = useState(false);
  const [agreementPDFForm, setAgreementPDFForm] = useState<AgreementForm>(makeAgreementForm());
  const [generatingAgreement, setGeneratingAgreement] = useState(false);

  const loadGeneratedDocs = useCallback(async () => {
    const res = await fetch(`/api/generated-documents?clientId=${id}`);
    const data = await res.json();
    setGeneratedDocs(data.documents ?? []);
  }, [id]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [clientRes, boardRes, taskRes, paymentRes, agreementRes, contentRes, meRes, docsRes] = await Promise.all([
        fetch(`/api/clients/${id}`),
        fetch(`/api/boards?clientId=${id}`),
        fetch(`/api/tasks?clientId=${id}`),
        fetch(`/api/payments?clientId=${id}`),
        fetch(`/api/agreements?clientId=${id}`),
        fetch(`/api/content?clientId=${id}`),
        fetch('/api/users/me'),
        fetch(`/api/generated-documents?clientId=${id}`),
      ]);
      const [cd, bd, td, pd, ad, con, me, docs] = await Promise.all([
        clientRes.json(), boardRes.json(), taskRes.json(), paymentRes.json(),
        agreementRes.json(), contentRes.json(), meRes.json(), docsRes.json(),
      ]);
      setClient(cd.client);
      setBoards(bd.boards ?? []);
      setTasks(td.tasks ?? []);
      setPayments(pd.payments ?? []);
      setAgreements(ad.agreements ?? []);
      setContent(con.items ?? []);
      setUserRole(me.user?.role ?? null);
      setGeneratedDocs(docs.documents ?? []);
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

  async function handleGenerateOffer() {
    if (!client) return;
    setGeneratingOffer(true);
    try {
      const discountPercent = offerForm.realPackagePrice > 0
        ? Math.max(0, ((offerForm.realPackagePrice - offerForm.offeredPrice) / offerForm.realPackagePrice) * 100)
        : 0;

      const { generateOfferPDF } = await import('@/lib/offerPDF');
      await generateOfferPDF({
        clientName: client.name,
        contactPerson: client.contactPerson,
        date: fmtDateDisplay(offerForm.date),
        packageName: offerForm.packageName,
        posts: offerForm.posts,
        reels: offerForm.reels,
        stories: offerForm.stories,
        photoshoots: offerForm.photoshoots,
        videoProduction: offerForm.videoProduction,
        droneShots: offerForm.droneShots,
        platforms: offerForm.platforms,
        additionalServices: offerForm.additionalServices,
        realPackagePrice: offerForm.realPackagePrice,
        offeredPrice: offerForm.offeredPrice,
        discountPercent,
        currency: offerForm.currency,
        boostBudget: offerForm.boostBudget,
        sponsoredContent: offerForm.sponsoredContent,
        durationMonths: offerForm.durationMonths,
        notes: offerForm.notes,
        lang: offerForm.lang,
      });

      await fetch(`/api/clients/${id}/generate-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: offerForm.lang,
          title: `Offer — ${client.name} — ${offerForm.date}`,
          updateStatus: offerForm.updateStatus,
          documentData: { ...offerForm, discountPercent },
        }),
      });

      await loadGeneratedDocs();
      if (offerForm.updateStatus) {
        setClient(prev => prev ? { ...prev, status: 'OFFER_SENT' } : prev);
      }
      setShowOfferModal(false);
      toast.success('Offer PDF generated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`PDF generation failed: ${msg}`);
    } finally { setGeneratingOffer(false); }
  }

  async function handleGenerateAgreement() {
    if (!client) return;
    setGeneratingAgreement(true);
    try {
      const { generateAgreementPDF } = await import('@/lib/agreementPDF');
      await generateAgreementPDF({
        clientName: client.name,
        contactPerson: client.contactPerson,
        agreementDate: fmtDateDisplay(agreementPDFForm.agreementDate),
        startDate: fmtDateDisplay(agreementPDFForm.startDate),
        durationMonths: agreementPDFForm.durationMonths,
        platforms: agreementPDFForm.platforms,
        postsMin: agreementPDFForm.postsMin,
        postsMax: agreementPDFForm.postsMax,
        reelsMin: agreementPDFForm.reelsMin,
        reelsMax: agreementPDFForm.reelsMax,
        storiesMin: agreementPDFForm.storiesMin,
        storiesMax: agreementPDFForm.storiesMax,
        photoshoots: agreementPDFForm.photoshoots,
        videoProduction: agreementPDFForm.videoProduction,
        droneShots: agreementPDFForm.droneShots,
        additionalServices: agreementPDFForm.additionalServices,
        boostBudget: agreementPDFForm.boostBudget,
        monthlyPrice: agreementPDFForm.monthlyPrice,
        currency: agreementPDFForm.currency,
        terminationNoticeDays: agreementPDFForm.terminationNoticeDays,
        governingLaw: agreementPDFForm.governingLaw,
        lang: agreementPDFForm.lang,
      });

      await fetch(`/api/clients/${id}/generate-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: agreementPDFForm.lang,
          title: `Agreement — ${client.name} — ${agreementPDFForm.agreementDate}`,
          updateStatus: agreementPDFForm.updateStatus,
          documentData: { ...agreementPDFForm },
        }),
      });

      await loadGeneratedDocs();
      if (agreementPDFForm.updateStatus) {
        setClient(prev => prev ? { ...prev, status: 'ACTIVE' } : prev);
      }
      setShowAgreementPDFModal(false);
      toast.success('Agreement PDF generated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`PDF generation failed: ${msg}`);
    } finally { setGeneratingAgreement(false); }
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
    { key: 'documents', label: 'Generated', count: generatedDocs.length },
  ];

  const offerDiscount = offerForm.realPackagePrice > 0
    ? Math.max(0, ((offerForm.realPackagePrice - offerForm.offeredPrice) / offerForm.realPackagePrice) * 100)
    : 0;

  const of = <K extends keyof OfferForm>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setOfferForm(p => ({ ...p, [k]: e.target.value as OfferForm[K] }));
  const ag = <K extends keyof AgreementForm>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setAgreementPDFForm(p => ({ ...p, [k]: e.target.value as AgreementForm[K] }));

  return (
    <>
      <Topbar
        title={client.name}
        subtitle={client.businessType}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {userRole === 'CEO' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setOfferForm(makeOfferForm()); setShowOfferModal(true); }}>
                  <FileText size={13} />Generate Offer
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setAgreementPDFForm(makeAgreementForm()); setShowAgreementPDFModal(true); }}>
                  <FileDown size={13} />Generate Agreement
                </Button>
              </>
            )}
            <ClientStatusBadge status={client.status} />
            <Link href="/clients"><Button variant="secondary" size="sm"><ArrowLeft size={13} />Back</Button></Link>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="border-b px-6 flex gap-0 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
              style={{ borderColor: tab === t.key ? '#ffffff' : 'transparent', color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'overview' && (
            <>
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
                  {client.facebookUrl && <a href={client.facebookUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ExternalLink size={14} />Facebook</a>}
                  {client.tiktokUrl && <a href={client.tiktokUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ExternalLink size={14} />TikTok</a>}
                  {client.websiteUrl && <a href={client.websiteUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300"><Globe size={14} />Website</a>}
                  {client.driveFolderUrl && <a href={client.driveFolderUrl} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ExternalLink size={14} />Google Drive</a>}
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

            {/* Quick Status Change — CEO only */}
            {userRole === 'CEO' && (
              <div className="mt-4 rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Client Status</h3>
                <select
                  value={client.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={changingStatus}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {[
                    { value: 'LEAD',             label: 'Lead' },
                    { value: 'OFFER_SENT',        label: 'Offer Sent' },
                    { value: 'WAITING_RESPONSE',  label: 'Waiting Response' },
                    { value: 'ACCEPTED',          label: 'Accepted' },
                    { value: 'ACTIVE',            label: 'Active' },
                    { value: 'INACTIVE',          label: 'Inactive' },
                    { value: 'PAUSED',            label: 'Paused' },
                    { value: 'REJECTED',          label: 'Rejected' },
                    { value: 'CLOSED',            label: 'Closed' },
                  ].map(o => (
                    <option key={o.value} value={o.value} style={{ background: 'var(--bg-card)' }}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            </>
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
                    <Link key={b._id} href={`/boards/${b._id}`} className="block rounded-xl border p-4 hover:border-zinc-600 transition-all" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{b.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatMonthYear(b.month, b.year)}</p>
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full" style={{ background: b.status === 'ACTIVE' ? 'rgba(255,255,255,0.08)' : 'rgba(107,114,128,0.15)', color: b.status === 'ACTIVE' ? '#ffffff' : '#9ca3af' }}>{b.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-2">
              {tasks.length === 0 ? <EmptyState title="No tasks" icon={FileText} /> : tasks.map(task => (
                <Link key={task._id} href={`/tasks/${task._id}`} className="flex items-center gap-4 p-3 rounded-lg border hover:border-zinc-600 transition-all" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
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
                      {a.fileUrl && <a href={a.fileUrl} target="_blank" rel="noopener" className="text-zinc-400 hover:text-white"><ExternalLink size={14} /></a>}
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

          {tab === 'documents' && (
            <div>
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Generated Documents</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>PDF offers and agreements generated for this client</p>
                </div>
                {userRole === 'CEO' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { setOfferForm(makeOfferForm()); setShowOfferModal(true); }}>
                      <FileText size={13} />New Offer
                    </Button>
                    <Button size="sm" onClick={() => { setAgreementPDFForm(makeAgreementForm()); setShowAgreementPDFModal(true); }}>
                      <FileDown size={13} />New Agreement
                    </Button>
                  </div>
                )}
              </div>

              {generatedDocs.length === 0 ? (
                <EmptyState
                  title="No generated documents"
                  description={userRole === 'CEO' ? 'Use the buttons above to generate an offer or agreement PDF' : 'No documents have been generated for this client yet'}
                  icon={FileText}
                  action={userRole === 'CEO' ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setOfferForm(makeOfferForm()); setShowOfferModal(true); }}>
                        <FileText size={13} />Generate Offer
                      </Button>
                      <Button size="sm" onClick={() => { setAgreementPDFForm(makeAgreementForm()); setShowAgreementPDFModal(true); }}>
                        <FileDown size={13} />Generate Agreement
                      </Button>
                    </div>
                  ) : undefined}
                />
              ) : (
                <>
                  {/* Group: Offers */}
                  {generatedDocs.filter(d => d.documentType === 'offer').length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2 pb-1 border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                        Offers
                      </p>
                      <div className="space-y-2">
                        {generatedDocs.filter(d => d.documentType === 'offer').map((d, idx) => (
                          <GeneratedDocCard
                            key={d._id}
                            doc={d}
                            isLatest={idx === 0}
                            client={client}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Group: Agreements */}
                  {generatedDocs.filter(d => d.documentType === 'agreement').length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2 pb-1 border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                        Agreements
                      </p>
                      <div className="space-y-2">
                        {generatedDocs.filter(d => d.documentType === 'agreement').map((d, idx) => (
                          <GeneratedDocCard
                            key={d._id}
                            doc={d}
                            isLatest={idx === 0}
                            client={client}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legacy document add modal */}
      <Modal open={showAgreementForm} onClose={() => setShowAgreementForm(false)} title="Add Document" size="md"
        footer={<><Button variant="secondary" onClick={() => setShowAgreementForm(false)}>Cancel</Button><Button onClick={saveAgreement} loading={savingAgreement}>Add Document</Button></>}>
        <form onSubmit={saveAgreement} className="space-y-3">
          <Input label="Title *" value={agreementForm.title} onChange={e => setAgreementForm(p => ({ ...p, title: e.target.value }))} required placeholder="Service Agreement June 2026" />
          <Select label="Type" value={agreementForm.agreementType} onChange={e => setAgreementForm(p => ({ ...p, agreementType: e.target.value }))}
            options={[{ value: 'CONTRACT', label: 'Contract' }, { value: 'OFFER', label: 'Offer' }, { value: 'INVOICE', label: 'Invoice' }, { value: 'OTHER', label: 'Other' }]} />
          <Input label="File URL (Google Drive, PDF link)" value={agreementForm.fileUrl} onChange={e => setAgreementForm(p => ({ ...p, fileUrl: e.target.value }))} placeholder="https://drive.google.com/..." />
          <Input label="File Name" value={agreementForm.fileName} onChange={e => setAgreementForm(p => ({ ...p, fileName: e.target.value }))} placeholder="contract-2026.pdf" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={agreementForm.startDate} onChange={e => setAgreementForm(p => ({ ...p, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={agreementForm.endDate} onChange={e => setAgreementForm(p => ({ ...p, endDate: e.target.value }))} />
          </div>
          <Textarea label="Notes" value={agreementForm.notes} onChange={e => setAgreementForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
        </form>
      </Modal>

      {/* Generate Offer Modal */}
      <Modal open={showOfferModal} onClose={() => setShowOfferModal(false)} title={`Generate Offer — ${client.name}`} size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" className="accent-white" checked={offerForm.updateStatus}
                onChange={e => setOfferForm(p => ({ ...p, updateStatus: e.target.checked }))} />
              Set status to &quot;Offer Sent&quot;
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowOfferModal(false)}>Cancel</Button>
              <Button onClick={handleGenerateOffer} loading={generatingOffer}><FileDown size={13} />Generate PDF</Button>
            </div>
          </div>
        }>
        <div className="space-y-2">
          <SectionLabel>Settings</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Language</label>
              <select value={offerForm.lang} onChange={e => setOfferForm(p => ({ ...p, lang: e.target.value as DocLang }))}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                {(Object.entries(DOC_LANG_LABELS) as [DocLang, string][]).map(([v, l]) => (
                  <option key={v} value={v} style={{ background: 'var(--bg-card)' }}>{l}</option>
                ))}
              </select>
            </div>
            <Input label="Date" type="date" value={offerForm.date} onChange={of('date')} />
          </div>

          <SectionLabel>Package Details</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Package Name" value={offerForm.packageName} onChange={of('packageName')} placeholder="Pro Package" />
            <NumInput label="Duration (months)" value={offerForm.durationMonths} onChange={v => setOfferForm(p => ({ ...p, durationMonths: v }))} />
          </div>

          <SectionLabel>Monthly Content</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Posts" value={offerForm.posts} onChange={v => setOfferForm(p => ({ ...p, posts: v }))} />
            <NumInput label="Reels" value={offerForm.reels} onChange={v => setOfferForm(p => ({ ...p, reels: v }))} />
            <NumInput label="Stories" value={offerForm.stories} onChange={v => setOfferForm(p => ({ ...p, stories: v }))} />
            <NumInput label="Photoshoots" value={offerForm.photoshoots} onChange={v => setOfferForm(p => ({ ...p, photoshoots: v }))} />
            <NumInput label="Video Production" value={offerForm.videoProduction} onChange={v => setOfferForm(p => ({ ...p, videoProduction: v }))} />
            <NumInput label="Drone Shots" value={offerForm.droneShots} onChange={v => setOfferForm(p => ({ ...p, droneShots: v }))} />
          </div>

          <SectionLabel>Platforms</SectionLabel>
          <PlatformCheckboxes selected={offerForm.platforms} onChange={v => setOfferForm(p => ({ ...p, platforms: v }))} />

          <SectionLabel>Pricing</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Package Value" value={offerForm.realPackagePrice} onChange={v => setOfferForm(p => ({ ...p, realPackagePrice: v }))} />
            <NumInput label="Offered Price" value={offerForm.offeredPrice} onChange={v => setOfferForm(p => ({ ...p, offeredPrice: v }))} />
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Currency</label>
              <select value={offerForm.currency} onChange={of('currency')}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                {['EUR', 'USD', 'MKD', 'ALL'].map(c => <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>)}
              </select>
            </div>
          </div>
          {offerDiscount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Percent size={12} className="text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300">Discount: {offerDiscount.toFixed(1)}%</span>
            </div>
          )}

          <SectionLabel>Additional Services</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Monthly Boost Budget" value={offerForm.boostBudget} onChange={of('boostBudget')} placeholder="e.g. 50 EUR/month" />
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Sponsored Content</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-2" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" className="accent-white" checked={offerForm.sponsoredContent}
                  onChange={e => setOfferForm(p => ({ ...p, sponsoredContent: e.target.checked }))} />
                Included
              </label>
            </div>
          </div>
          <Textarea label="Additional Services" value={offerForm.additionalServices} onChange={of('additionalServices')} rows={2} placeholder="e.g. Monthly strategy meeting, analytics report..." />
          <Textarea label="Notes" value={offerForm.notes} onChange={of('notes')} rows={2} placeholder="Any additional notes for the client..." />
        </div>
      </Modal>

      {/* Generate Agreement Modal */}
      <Modal open={showAgreementPDFModal} onClose={() => setShowAgreementPDFModal(false)} title={`Generate Agreement — ${client.name}`} size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" className="accent-white" checked={agreementPDFForm.updateStatus}
                onChange={e => setAgreementPDFForm(p => ({ ...p, updateStatus: e.target.checked }))} />
              Set status to &quot;Active&quot;
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAgreementPDFModal(false)}>Cancel</Button>
              <Button onClick={handleGenerateAgreement} loading={generatingAgreement}><FileDown size={13} />Generate PDF</Button>
            </div>
          </div>
        }>
        <div className="space-y-2">
          <SectionLabel>Settings</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Language</label>
              <select value={agreementPDFForm.lang} onChange={e => setAgreementPDFForm(p => ({ ...p, lang: e.target.value as DocLang }))}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                {(Object.entries(DOC_LANG_LABELS) as [DocLang, string][]).map(([v, l]) => (
                  <option key={v} value={v} style={{ background: 'var(--bg-card)' }}>{l}</option>
                ))}
              </select>
            </div>
            <Input label="Agreement Date" type="date" value={agreementPDFForm.agreementDate} onChange={ag('agreementDate')} />
            <Input label="Service Start Date" type="date" value={agreementPDFForm.startDate} onChange={ag('startDate')} />
          </div>
          <NumInput label="Duration (months)" value={agreementPDFForm.durationMonths} onChange={v => setAgreementPDFForm(p => ({ ...p, durationMonths: v }))} />

          <SectionLabel>Platforms</SectionLabel>
          <PlatformCheckboxes selected={agreementPDFForm.platforms} onChange={v => setAgreementPDFForm(p => ({ ...p, platforms: v }))} />

          <SectionLabel>Monthly Content Plan</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Posts</p>
              <div className="grid grid-cols-2 gap-2">
                <NumInput label="Min" value={agreementPDFForm.postsMin} onChange={v => setAgreementPDFForm(p => ({ ...p, postsMin: v }))} />
                <NumInput label="Max" value={agreementPDFForm.postsMax} onChange={v => setAgreementPDFForm(p => ({ ...p, postsMax: v }))} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Reels</p>
              <div className="grid grid-cols-2 gap-2">
                <NumInput label="Min" value={agreementPDFForm.reelsMin} onChange={v => setAgreementPDFForm(p => ({ ...p, reelsMin: v }))} />
                <NumInput label="Max" value={agreementPDFForm.reelsMax} onChange={v => setAgreementPDFForm(p => ({ ...p, reelsMax: v }))} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Stories</p>
              <div className="grid grid-cols-2 gap-2">
                <NumInput label="Min" value={agreementPDFForm.storiesMin} onChange={v => setAgreementPDFForm(p => ({ ...p, storiesMin: v }))} />
                <NumInput label="Max" value={agreementPDFForm.storiesMax} onChange={v => setAgreementPDFForm(p => ({ ...p, storiesMax: v }))} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Other</p>
              <div className="grid grid-cols-3 gap-2">
                <NumInput label="Photoshoots" value={agreementPDFForm.photoshoots} onChange={v => setAgreementPDFForm(p => ({ ...p, photoshoots: v }))} />
                <NumInput label="Video" value={agreementPDFForm.videoProduction} onChange={v => setAgreementPDFForm(p => ({ ...p, videoProduction: v }))} />
                <NumInput label="Drone" value={agreementPDFForm.droneShots} onChange={v => setAgreementPDFForm(p => ({ ...p, droneShots: v }))} />
              </div>
            </div>
          </div>
          <Input label="Monthly Boost Budget" value={agreementPDFForm.boostBudget} onChange={ag('boostBudget')} placeholder="e.g. 50 EUR/month" />
          <Textarea label="Additional Services" value={agreementPDFForm.additionalServices} onChange={ag('additionalServices')} rows={2} />

          <SectionLabel>Pricing & Payment</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Monthly Price" value={agreementPDFForm.monthlyPrice} onChange={v => setAgreementPDFForm(p => ({ ...p, monthlyPrice: v }))} />
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Currency</label>
              <select value={agreementPDFForm.currency} onChange={ag('currency')}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                {['EUR', 'USD', 'MKD', 'ALL'].map(c => <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>)}
              </select>
            </div>
          </div>

          <SectionLabel>Terms</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumInput label="Termination Notice (days)" value={agreementPDFForm.terminationNoticeDays} onChange={v => setAgreementPDFForm(p => ({ ...p, terminationNoticeDays: v }))} />
            <Input label="Governing Law" value={agreementPDFForm.governingLaw} onChange={ag('governingLaw')} placeholder="Republic of North Macedonia" />
          </div>
        </div>
      </Modal>
    </>
  );
}
