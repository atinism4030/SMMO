'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Select, Textarea } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { VerificationStatusBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { formatMoney, PAYMENT_METHOD_LABELS, DISPUTE_REASON_LABELS } from '@/lib/billing';
import type { IClientPayment, IUser, DisputeReason } from '@/types';
import { ShieldCheck, AlertTriangle, ArrowLeft, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/components/providers/LanguageProvider';

type LoadState = IClientPayment | 'forbidden' | 'not-found' | null;

export default function ClientPaymentDetailContent({ paymentId }: { paymentId: string }) {
  const { t } = useTranslation();
  const [payment, setPayment] = useState<LoadState>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/billing/payments/${paymentId}`);
    if (res.status === 403) { setPayment('forbidden'); setLoading(false); return; }
    if (res.status === 404) { setPayment('not-found'); setLoading(false); return; }
    const data = await res.json();
    setPayment(data.payment ?? null);
    setLoading(false);
  }, [paymentId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate fetch-on-mount, not a cascading-render bug
  useEffect(() => { load(); }, [load]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('WRONG_AMOUNT');
  const [disputeMessage, setDisputeMessage] = useState('');
  const [disputing, setDisputing] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/billing/payments/${paymentId}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('payments.failedToConfirm')); return; }
      toast.success(t('payments.paymentConfirmedSuccess'));
      setShowConfirm(false);
      load();
    } finally { setConfirming(false); }
  }

  async function handleDispute(e: React.FormEvent) {
    e.preventDefault();
    setDisputing(true);
    try {
      const res = await fetch(`/api/billing/payments/${paymentId}/dispute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason, message: disputeMessage }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t('payments.failedToSubmitDispute')); return; }
      toast.success(t('payments.issueSubmitted'));
      setShowDispute(false);
      load();
    } finally { setDisputing(false); }
  }

  if (loading) return <LoadingSpinner fullPage />;

  if (payment === 'forbidden' || payment === 'not-found' || !payment) {
    return (
      <>
        <Topbar title={t('payments.payment')} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {payment === 'forbidden' ? t('payments.noAccessToPayment') : t('payments.paymentNotFound')}
            </p>
            <Link href="/client/payments" className="text-xs mt-3 inline-block" style={{ color: 'var(--text-muted)' }}>{t('payments.backToPayments')}</Link>
          </div>
        </div>
      </>
    );
  }

  const createdBy = payment.createdBy as IUser | string;
  const createdByName = typeof createdBy === 'string' ? t('payments.yourAgency') : createdBy.name;

  return (
    <>
      <Topbar title={t('payments.paymentDetailsTitle')} actions={<Link href="/client/payments"><Button variant="secondary" size="sm"><ArrowLeft size={13} />{t('payments.back')}</Button></Link>} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto space-y-5">
          <div className="rounded-xl border p-6 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <VerificationStatusBadge status={payment.verificationStatus} />
            {(payment.verificationStatus === 'PENDING_CONFIRMATION' || payment.verificationStatus === 'DISPUTED') ? (
              <p className="text-3xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>{formatMoney(payment.amountMinor, payment.currency)}</p>
            ) : (
              <p className="text-lg font-semibold mt-3" style={{ color: 'var(--text-primary)' }}>{t('payments.paymentRecordedNoAmount')}</p>
            )}
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{formatDate(payment.paymentDate)} · {PAYMENT_METHOD_LABELS[payment.paymentMethod]}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{t('payments.recordedBy', { name: createdByName })}</p>
            {payment.reference && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('payments.referenceLabel', { reference: payment.reference })}</p>}
          </div>

          {payment.verificationStatus === 'PENDING_CONFIRMATION' && (
            <div className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{t('payments.awaitingConfirmation')}</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t('payments.awaitingConfirmationDesc')}</p>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setShowConfirm(true)}>{t('payments.confirmPayment')}</Button>
                <Button className="flex-1" variant="secondary" onClick={() => setShowDispute(true)}>{t('payments.reportAProblem')}</Button>
              </div>
            </div>
          )}

          {payment.verificationStatus === 'VERIFIED' && (
            <div className="rounded-xl border p-5 flex items-start gap-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <ShieldCheck size={18} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('payments.verifiedLabel')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('payments.confirmedOn', { date: formatDate(payment.verifiedAt) })}</p>
              </div>
            </div>
          )}

          {payment.verificationStatus === 'DISPUTED' && (
            <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}>
              <p className="text-sm font-semibold text-red-400 mb-1">{t('payments.issueReported', { reason: DISPUTE_REASON_LABELS[payment.disputeReason ?? 'OTHER'] })}</p>
              {payment.disputeMessage && <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{payment.disputeMessage}</p>}
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('payments.agencyNotified')}</p>
            </div>
          )}

          {payment.verificationStatus === 'CANCELLED' && (
            <div className="rounded-xl border p-5 flex items-start gap-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <Ban size={18} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('payments.cancelledNotice')}</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title={t('payments.confirmThisPayment')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowConfirm(false)}>{t('common.cancel')}</Button><Button onClick={handleConfirm} loading={confirming}>{t('payments.confirmPayment')}</Button></>}>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-muted)' }}>{t('payments.amount')}</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatMoney(payment.amountMinor, payment.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-muted)' }}>{t('payments.date')}</span>
            <span style={{ color: 'var(--text-primary)' }}>{formatDate(payment.paymentDate)}</span>
          </div>
          <p className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>{t('payments.confirmAcknowledge')}</p>
        </div>
      </Modal>

      <Modal open={showDispute} onClose={() => setShowDispute(false)} title={t('payments.reportAProblem')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowDispute(false)}>{t('common.cancel')}</Button><Button onClick={handleDispute} loading={disputing}>{t('payments.submit')}</Button></>}>
        <form onSubmit={handleDispute} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('payments.whatIsIncorrect')}</p>
          <Select label={t('payments.reason')} value={disputeReason} onChange={e => setDisputeReason(e.target.value as DisputeReason)}
            options={Object.entries(DISPUTE_REASON_LABELS).map(([value, label]) => ({ value, label }))} />
          <Textarea label={t('payments.detailsOptional')} value={disputeMessage} onChange={e => setDisputeMessage(e.target.value)} rows={3} placeholder={t('payments.detailsPlaceholder')} />
        </form>
      </Modal>
    </>
  );
}
