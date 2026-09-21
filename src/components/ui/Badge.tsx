'use client';

import { cn } from '@/lib/utils';
import type {
  TaskStatus, TaskPriority, ContentStatus, ClientStatus, ContentType,
  PaymentVerificationStatus, BillingPeriodStatus,
} from '@/types';
import {
  getTaskStatusColor,
  getTaskStatusDot,
  getPriorityColor,
  getContentStatusColor,
  getClientStatusColor,
  getPlatformColor,
  getContentTypeColor,
  getPaymentVerificationStatusColor,
  getBillingPeriodStatusColor,
} from '@/lib/utils';
import { useTranslation } from '@/components/providers/LanguageProvider';
import type { TranslationKey } from '@/lib/i18n';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', className)}>
      {children}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useTranslation();
  const keys: Record<TaskStatus, TranslationKey> = {
    CONTENT_PREPARATION: 'tasks.statusPrep', QUALITY_ASSURANCE: 'tasks.statusQA',
    POST_VERIFIED: 'tasks.statusVerified', READY_TO_POST: 'tasks.statusReady',
    POSTED: 'tasks.statusPosted', NEEDS_FIX: 'tasks.statusNeedsFix',
  };
  return (
    <Badge className={cn('border', getTaskStatusColor(status))}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', getTaskStatusDot(status))} />
      {t(keys[status] ?? 'tasks.statusPrep')}
    </Badge>
  );
}

export function ContentTypeBadge({ type }: { type: ContentType }) {
  const { t } = useTranslation();
  const keys: Record<ContentType, TranslationKey> = {
    POST: 'badges.contentTypePost', REEL: 'badges.contentTypeReel', STORY: 'badges.contentTypeStory',
    CAROUSEL: 'badges.contentTypeCarousel', VIDEO: 'badges.contentTypeVideo',
    PHOTO: 'badges.contentTypePhoto', OTHER: 'badges.contentTypeOther',
  };
  return <Badge className={cn('border-0', getContentTypeColor(type))}>{t(keys[type] ?? 'badges.contentTypeOther')}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { t } = useTranslation();
  const keys: Record<TaskPriority, TranslationKey> = {
    LOW: 'badges.priorityLow', MEDIUM: 'badges.priorityMedium', HIGH: 'badges.priorityHigh', URGENT: 'badges.priorityUrgent',
  };
  return <Badge className={cn('border', getPriorityColor(priority))}>{t(keys[priority])}</Badge>;
}

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const { t } = useTranslation();
  const keys: Record<ContentStatus, TranslationKey> = {
    IDEA: 'badges.contentStatusIdea', IN_PRODUCTION: 'badges.contentStatusInProduction', EDITING: 'badges.contentStatusEditing',
    WAITING_APPROVAL: 'badges.contentStatusWaitingApproval', APPROVED: 'badges.contentStatusApproved',
    SCHEDULED: 'badges.contentStatusScheduled', POSTED: 'badges.contentStatusPosted', REPORTED: 'badges.contentStatusReported',
  };
  return <Badge className={cn('border border-transparent', getContentStatusColor(status))}>{t(keys[status])}</Badge>;
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const { t } = useTranslation();
  const keys: Record<ClientStatus, TranslationKey> = {
    LEAD: 'badges.clientStatusLead', OFFER_SENT: 'badges.clientStatusOfferSent', WAITING_RESPONSE: 'badges.clientStatusWaitingResponse',
    ACCEPTED: 'badges.clientStatusAccepted', ACTIVE: 'badges.clientStatusActive', INACTIVE: 'badges.clientStatusInactive',
    REJECTED: 'badges.clientStatusRejected', PAUSED: 'badges.clientStatusPaused', CLOSED: 'badges.clientStatusClosed',
  };
  return <Badge className={cn('border', getClientStatusColor(status))}>{t(keys[status] ?? 'badges.clientStatusLead')}</Badge>;
}

export function PlatformBadge({ platform }: { platform: string }) {
  return <Badge className={cn('border-0', getPlatformColor(platform))}>{platform}</Badge>;
}

export function VerificationStatusBadge({ status }: { status: PaymentVerificationStatus }) {
  const { t } = useTranslation();
  const keys: Record<PaymentVerificationStatus, TranslationKey> = {
    VERIFIED: 'payments.verified', PENDING_CONFIRMATION: 'payments.pendingConfirmation',
    DISPUTED: 'payments.disputed', CANCELLED: 'payments.cancelled',
  };
  return <Badge className={cn('border', getPaymentVerificationStatusColor(status))}>{t(keys[status])}</Badge>;
}

export function BillingPeriodStatusBadge({ status }: { status: BillingPeriodStatus }) {
  const { t } = useTranslation();
  const keys: Record<BillingPeriodStatus, TranslationKey> = {
    PAID: 'badges.billingPeriodPaid', PARTIALLY_PAID: 'badges.billingPeriodPartiallyPaid',
    UNPAID: 'badges.billingPeriodUnpaid', OVERPAID: 'badges.billingPeriodOverpaid',
  };
  return <Badge className={cn('border', getBillingPeriodStatusColor(status))}>{t(keys[status])}</Badge>;
}
