'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import BookingCalendarGrid, { type CalendarPill, dateKey } from '@/components/booking/BookingCalendarGrid';
import { formatDate } from '@/lib/utils';
import type { IAvailabilityEntry, IBooking, IClient, ShootType } from '@/types';
import { Plus, Check, X as XIcon, Clock3, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/components/providers/LanguageProvider';
import type { TranslationKey } from '@/lib/i18n';

const SHOOT_TYPE_KEYS: Record<ShootType, TranslationKey> = {
  PHOTO_SHOOT: 'bookings.shootTypePhoto',
  VIDEO_SHOOT: 'bookings.shootTypeVideo',
  PHOTO_VIDEO: 'bookings.shootTypePhotoVideo',
  CONTENT_SESSION: 'bookings.shootTypeContentSession',
  OTHER: 'bookings.shootTypeOther',
};

const BOOKING_STATUS_KEYS: Record<string, TranslationKey> = {
  PENDING: 'bookings.pending',
  SUGGESTED: 'bookings.suggested',
  APPROVED: 'bookings.approved',
  REJECTED: 'bookings.rejected',
  CANCELLED: 'bookings.cancelled',
};

function statusPillClass(status: string): string {
  if (status === 'APPROVED') return 'bg-white text-black';
  if (status === 'PENDING') return 'bg-amber-500/20 text-amber-400';
  if (status === 'SUGGESTED') return 'bg-zinc-700 text-zinc-200';
  return 'bg-zinc-800 text-zinc-400';
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const emptyDirectForm = { clientId: '', date: todayISO(), startTime: '10:00', endTime: '12:00', shootType: 'PHOTO_SHOOT' as ShootType, notes: '' };
const emptySuggestForm = { date: todayISO(), startTime: '10:00', endTime: '12:00' };

export default function BookingsContent() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<IAvailabilityEntry[]>([]);
  const [pending, setPending] = useState<IBooking[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(dateKey(new Date()));

  const monthRange = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth() - 1, 25);
    const to = new Date(month.getFullYear(), month.getMonth() + 2, 5);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [month]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [aRes, pRes, cRes] = await Promise.all([
      fetch(`/api/bookings/availability?from=${monthRange.from}&to=${monthRange.to}`),
      fetch('/api/bookings?status=PENDING'),
      fetch('/api/clients'),
    ]);
    const [ad, pd, cd] = await Promise.all([aRes.json(), pRes.json(), cRes.json()]);
    setEntries(ad.entries ?? []);
    setPending(pd.bookings ?? []);
    setClients(cd.clients ?? []);
    setLoading(false);
  }, [monthRange.from, monthRange.to]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pillsByDate = useMemo(() => {
    const map = new Map<string, CalendarPill[]>();
    for (const e of entries) {
      const key = e.date.split('T')[0];
      const list = map.get(key) ?? [];
      const statusKey = BOOKING_STATUS_KEYS[e.status];
      list.push({
        key: `${e._id ?? key}-${e.startTime}`,
        label: `${e.startTime} ${e.clientName ?? (statusKey ? t(statusKey) : e.status)}`,
        className: statusPillClass(e.status),
      });
      map.set(key, list);
    }
    return map;
  }, [entries, t]);

  const selectedEntries = entries.filter((e) => e.date.split('T')[0] === selectedDateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // ─── Direct booking (CEO books on client's behalf) ─────────────────────
  const [showDirect, setShowDirect] = useState(false);
  const [directForm, setDirectForm] = useState(emptyDirectForm);
  const [savingDirect, setSavingDirect] = useState(false);

  function openDirect() {
    setDirectForm({ ...emptyDirectForm, date: selectedDateKey ?? todayISO() });
    setShowDirect(true);
  }

  async function handleCreateDirect(e: React.FormEvent) {
    e.preventDefault();
    if (!directForm.clientId) { toast.error(t('bookings.selectClientError')); return; }
    setSavingDirect(true);
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(directForm) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('bookings.failedToCreateBooking')); return; }
      toast.success(t('bookings.bookingCreated'));
      setShowDirect(false);
      fetchAll();
    } finally { setSavingDirect(false); }
  }

  // ─── Pending request actions ────────────────────────────────────────────
  const [suggestTarget, setSuggestTarget] = useState<IBooking | null>(null);
  const [suggestForm, setSuggestForm] = useState(emptySuggestForm);
  const [acting, setActing] = useState<string | null>(null);

  async function handleApprove(booking: IBooking) {
    setActing(booking._id);
    try {
      const res = await fetch(`/api/bookings/${booking._id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('bookings.failedToApprove')); return; }
      toast.success(t('bookings.bookingApproved'));
      fetchAll();
    } finally { setActing(null); }
  }

  async function handleReject(booking: IBooking) {
    const reason = window.prompt(t('bookings.reasonForRejecting')) ?? undefined;
    setActing(booking._id);
    try {
      const res = await fetch(`/api/bookings/${booking._id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('bookings.failedToReject')); return; }
      toast.success(t('bookings.bookingRejected'));
      fetchAll();
    } finally { setActing(null); }
  }

  async function handleSuggest(e: React.FormEvent) {
    e.preventDefault();
    if (!suggestTarget) return;
    setActing(suggestTarget._id);
    try {
      const res = await fetch(`/api/bookings/${suggestTarget._id}/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(suggestForm) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('bookings.failedToSuggest')); return; }
      toast.success(t('bookings.alternativeTimeSuggested'));
      setSuggestTarget(null);
      fetchAll();
    } finally { setActing(null); }
  }

  return (
    <>
      <Topbar title={t('bookings.title')} subtitle={t('bookings.subtitleAdmin')} actions={<Button size="sm" onClick={openDirect}><Plus size={13} />{t('bookings.newBooking')}</Button>} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {pending.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{t('bookings.pendingRequests')}</h3>
            <div className="space-y-2">
              {pending.map((b) => (
                <div key={b._id} className="flex items-center gap-4 p-4 rounded-xl border flex-wrap" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{(b.clientId as IClient)?.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(b.date)} · {b.startTime}–{b.endTime} · {t(SHOOT_TYPE_KEYS[b.shootType])}</p>
                    {b.notes && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{b.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => handleApprove(b)} loading={acting === b._id}><Check size={13} />{t('bookings.approve')}</Button>
                    <Button size="sm" variant="secondary" onClick={() => { setSuggestTarget(b); setSuggestForm({ date: b.date.split('T')[0], startTime: b.startTime, endTime: b.endTime }); }}>
                      <Clock3 size={13} />{t('bookings.suggestTime')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleReject(b)} loading={acting === b._id}><XIcon size={13} />{t('bookings.reject')}</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? <LoadingSpinner fullPage /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BookingCalendarGrid month={month} onMonthChange={setMonth} pillsByDate={pillsByDate} selectedDateKey={selectedDateKey} onSelectDate={setSelectedDateKey} />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                {selectedDateKey ? formatDate(selectedDateKey) : t('bookings.selectADay')}
              </h3>
              {selectedEntries.length === 0 ? (
                <EmptyState title={t('bookings.nothingScheduled')} icon={CalendarClock} />
              ) : (
                <div className="space-y-2">
                  {selectedEntries.map((e, i) => (
                    <div key={e._id ?? i} className="p-3 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.startTime}–{e.endTime}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusPillClass(e.status)}`}>{BOOKING_STATUS_KEYS[e.status] ? t(BOOKING_STATUS_KEYS[e.status]) : e.status}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{e.clientName}</p>
                      {e.shootType && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t(SHOOT_TYPE_KEYS[e.shootType])}</p>}
                      {e.notes && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{e.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Direct Booking Modal */}
      <Modal open={showDirect} onClose={() => setShowDirect(false)} title={t('bookings.newBooking')} size="md"
        footer={<><Button variant="secondary" onClick={() => setShowDirect(false)}>{t('common.cancel')}</Button><Button onClick={handleCreateDirect} loading={savingDirect}>{t('bookings.createBooking')}</Button></>}>
        <form onSubmit={handleCreateDirect} className="space-y-3">
          <Select label={t('bookings.selectClientRequired')} value={directForm.clientId} onChange={e => setDirectForm(p => ({ ...p, clientId: e.target.value }))}
            options={[{ value: '', label: t('bookings.selectClient') }, ...clients.map(c => ({ value: c._id, label: c.name }))]} />
          <Input label={t('bookings.dateRequired')} type="date" value={directForm.date} onChange={e => setDirectForm(p => ({ ...p, date: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('bookings.startTimeRequired')} type="time" value={directForm.startTime} onChange={e => setDirectForm(p => ({ ...p, startTime: e.target.value }))} required />
            <Input label={t('bookings.endTimeRequired')} type="time" value={directForm.endTime} onChange={e => setDirectForm(p => ({ ...p, endTime: e.target.value }))} required />
          </div>
          <Select label={t('bookings.shootType')} value={directForm.shootType} onChange={e => setDirectForm(p => ({ ...p, shootType: e.target.value as ShootType }))}
            options={(Object.keys(SHOOT_TYPE_KEYS) as ShootType[]).map((value) => ({ value, label: t(SHOOT_TYPE_KEYS[value]) }))} />
          <Textarea label={t('bookings.notes')} value={directForm.notes} onChange={e => setDirectForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
        </form>
      </Modal>

      {/* Suggest Alternative Modal */}
      <Modal open={!!suggestTarget} onClose={() => setSuggestTarget(null)} title={t('bookings.suggestADifferentTime')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setSuggestTarget(null)}>{t('common.cancel')}</Button><Button onClick={handleSuggest} loading={!!acting}>{t('bookings.sendSuggestion')}</Button></>}>
        <form onSubmit={handleSuggest} className="space-y-3">
          <Input label={t('bookings.dateRequired')} type="date" value={suggestForm.date} onChange={e => setSuggestForm(p => ({ ...p, date: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('bookings.startTimeRequired')} type="time" value={suggestForm.startTime} onChange={e => setSuggestForm(p => ({ ...p, startTime: e.target.value }))} required />
            <Input label={t('bookings.endTimeRequired')} type="time" value={suggestForm.endTime} onChange={e => setSuggestForm(p => ({ ...p, endTime: e.target.value }))} required />
          </div>
        </form>
      </Modal>
    </>
  );
}
