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
import type { IAvailabilityEntry, IBooking, ShootType } from '@/types';
import { Plus, CalendarClock, Check, X as XIcon } from 'lucide-react';
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

function pillClass(status: string): string {
  if (status === 'BUSY') return 'bg-zinc-700 text-zinc-300';
  if (status === 'APPROVED') return 'bg-white text-black';
  if (status === 'PENDING') return 'bg-amber-500/20 text-amber-400';
  if (status === 'SUGGESTED') return 'bg-zinc-700 text-zinc-200';
  return 'bg-zinc-800 text-zinc-500';
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const emptyForm = { date: todayISO(), startTime: '10:00', endTime: '12:00', shootType: 'PHOTO_SHOOT' as ShootType, notes: '' };

export default function ClientBookingContent() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<IAvailabilityEntry[]>([]);
  const [myBookings, setMyBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(dateKey(new Date()));

  const monthRange = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth() - 1, 25);
    const to = new Date(month.getFullYear(), month.getMonth() + 2, 5);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [month]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [aRes, bRes] = await Promise.all([
      fetch(`/api/bookings/availability?from=${monthRange.from}&to=${monthRange.to}`),
      fetch('/api/bookings'),
    ]);
    const [ad, bd] = await Promise.all([aRes.json(), bRes.json()]);
    setEntries(ad.entries ?? []);
    setMyBookings(bd.bookings ?? []);
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
      const label = e.status === 'BUSY' ? `${e.startTime} ${t('bookings.busy')}` : `${e.startTime} ${statusKey ? t(statusKey) : e.status}`;
      list.push({ key: `${key}-${e.startTime}-${list.length}`, label, className: pillClass(e.status) });
      map.set(key, list);
    }
    return map;
  }, [entries, t]);

  const selectedEntries = entries.filter((e) => e.date.split('T')[0] === selectedDateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // ─── Request a booking ──────────────────────────────────────────────────
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function openRequest() {
    setForm({ ...emptyForm, date: selectedDateKey ?? todayISO() });
    setShowRequest(true);
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('bookings.failedToSubmitRequest')); return; }
      toast.success(t('bookings.bookingRequestSent'));
      setShowRequest(false);
      fetchAll();
    } finally { setSaving(false); }
  }

  // ─── Respond to a suggestion / cancel ───────────────────────────────────
  const [acting, setActing] = useState<string | null>(null);

  async function respondToSuggestion(booking: IBooking, action: 'ACCEPT' | 'DECLINE') {
    setActing(booking._id);
    try {
      const res = await fetch(`/api/bookings/${booking._id}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('bookings.failedToRespond')); return; }
      toast.success(action === 'ACCEPT' ? t('bookings.timeAccepted') : t('bookings.suggestionDeclined'));
      fetchAll();
    } finally { setActing(null); }
  }

  async function cancelBooking(booking: IBooking) {
    if (!confirm(t('bookings.confirmCancelBooking'))) return;
    setActing(booking._id);
    try {
      const res = await fetch(`/api/bookings/${booking._id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('bookings.failedToCancel')); return; }
      toast.success(t('bookings.bookingCancelled'));
      fetchAll();
    } finally { setActing(null); }
  }

  return (
    <>
      <Topbar title={t('nav.bookAShoot')} subtitle={t('bookings.subtitleClient')} actions={<Button size="sm" onClick={openRequest}><Plus size={13} />{t('bookings.requestBooking')}</Button>} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? <LoadingSpinner fullPage /> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BookingCalendarGrid month={month} onMonthChange={setMonth} pillsByDate={pillsByDate} selectedDateKey={selectedDateKey} onSelectDate={setSelectedDateKey} />
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />{t('bookings.busyAnotherShoot')}</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><span className="w-2.5 h-2.5 rounded-full bg-white" />{t('bookings.yourApprovedBooking')}</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />{t('bookings.yourPendingRequest')}</span>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                {selectedDateKey ? formatDate(selectedDateKey) : t('bookings.selectADay')}
              </h3>
              {selectedEntries.length === 0 ? (
                <EmptyState title={t('bookings.nothingScheduled')} description={t('bookings.dayLooksOpen')} icon={CalendarClock} action={<Button size="sm" onClick={openRequest}><Plus size={13} />{t('bookings.requestThisDay')}</Button>} />
              ) : (
                <div className="space-y-2">
                  {selectedEntries.map((e, i) => (
                    <div key={e._id ?? i} className="p-3 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.startTime}–{e.endTime}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${pillClass(e.status)}`}>{e.status === 'BUSY' ? t('bookings.busy') : t(BOOKING_STATUS_KEYS[e.status])}</span>
                      </div>
                      {e.status !== 'BUSY' && e.shootType && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t(SHOOT_TYPE_KEYS[e.shootType])}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>{t('bookings.myBookings')}</h3>
          {myBookings.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('bookings.noBookingsYet')}</p>
          ) : (
            <div className="space-y-2">
              {myBookings.map((b) => (
                <div key={b._id} className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(b.date)} · {b.startTime}–{b.endTime}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t(SHOOT_TYPE_KEYS[b.shootType])}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pillClass(b.status)}`}>{t(BOOKING_STATUS_KEYS[b.status])}</span>
                  </div>

                  {b.status === 'REJECTED' && b.rejectionReason && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{t('bookings.reasonLabel', { reason: b.rejectionReason })}</p>
                  )}

                  {b.status === 'SUGGESTED' && b.suggestedDate && (
                    <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        {t('bookings.horizonteSuggested', { date: formatDate(b.suggestedDate), start: b.suggestedStartTime ?? '', end: b.suggestedEndTime ?? '' })}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respondToSuggestion(b, 'ACCEPT')} loading={acting === b._id}><Check size={12} />{t('bookings.accept')}</Button>
                        <Button size="sm" variant="secondary" onClick={() => respondToSuggestion(b, 'DECLINE')} loading={acting === b._id}><XIcon size={12} />{t('bookings.decline')}</Button>
                      </div>
                    </div>
                  )}

                  {(b.status === 'PENDING' || b.status === 'APPROVED') && (
                    <button onClick={() => cancelBooking(b)} className="text-xs mt-3 underline" style={{ color: 'var(--text-muted)' }}>{t('bookings.cancelRequest')}</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={showRequest} onClose={() => setShowRequest(false)} title={t('bookings.requestABooking')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowRequest(false)}>{t('common.cancel')}</Button><Button onClick={handleRequest} loading={saving}>{t('bookings.requestBooking')}</Button></>}>
        <form onSubmit={handleRequest} className="space-y-3">
          <Input label={t('bookings.dateRequired')} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required min={todayISO()} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('bookings.startTimeRequired')} type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} required />
            <Input label={t('bookings.endTimeRequired')} type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} required />
          </div>
          <Select label={t('bookings.shootType')} value={form.shootType} onChange={e => setForm(p => ({ ...p, shootType: e.target.value as ShootType }))}
            options={(Object.keys(SHOOT_TYPE_KEYS) as ShootType[]).map((value) => ({ value, label: t(SHOOT_TYPE_KEYS[value]) }))} />
          <Textarea label={t('common.notes') + ' (' + t('common.optional') + ')'} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder={t('bookings.notesOptionalPlaceholder')} />
        </form>
      </Modal>
    </>
  );
}
