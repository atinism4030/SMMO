import { cn } from '@/lib/utils';
import type { TaskStatus, TaskPriority, PaymentStatus, ContentStatus, ClientStatus, ContentType } from '@/types';
import {
  getTaskStatusColor,
  getTaskStatusDot,
  getTaskStatusLabel,
  getPriorityColor,
  getPaymentStatusColor,
  getContentStatusColor,
  getClientStatusColor,
  getPlatformColor,
  getContentTypeColor,
} from '@/lib/utils';

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
  return (
    <Badge className={cn('border', getTaskStatusColor(status))}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', getTaskStatusDot(status))} />
      {getTaskStatusLabel(status)}
    </Badge>
  );
}

export function ContentTypeBadge({ type }: { type: ContentType }) {
  const labels: Record<ContentType, string> = {
    POST: 'Post', REEL: 'Reel', STORY: 'Story',
    CAROUSEL: 'Carousel', VIDEO: 'Video', PHOTO: 'Photo', OTHER: 'Other',
  };
  return <Badge className={cn('border-0', getContentTypeColor(type))}>{labels[type] ?? type}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const labels: Record<TaskPriority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
  return <Badge className={cn('border', getPriorityColor(priority))}>{labels[priority]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const labels: Record<PaymentStatus, string> = { PAID: 'Paid', UNPAID: 'Unpaid', PARTIAL: 'Partial', LATE: 'Late' };
  return <Badge className={cn('border', getPaymentStatusColor(status))}>{labels[status]}</Badge>;
}

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const labels: Record<ContentStatus, string> = {
    IDEA: 'Idea', IN_PRODUCTION: 'In Production', EDITING: 'Editing',
    WAITING_APPROVAL: 'Waiting Approval', APPROVED: 'Approved',
    SCHEDULED: 'Scheduled', POSTED: 'Posted', REPORTED: 'Reported',
  };
  return <Badge className={cn('border border-transparent', getContentStatusColor(status))}>{labels[status]}</Badge>;
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const labels: Record<ClientStatus, string> = {
    LEAD: 'Lead', OFFER_SENT: 'Offer Sent', WAITING_RESPONSE: 'Waiting',
    ACCEPTED: 'Accepted', ACTIVE: 'Active', REJECTED: 'Rejected',
    PAUSED: 'Paused', CLOSED: 'Closed',
  };
  return <Badge className={cn('border', getClientStatusColor(status))}>{labels[status] ?? status}</Badge>;
}

export function PlatformBadge({ platform }: { platform: string }) {
  return <Badge className={cn('border-0', getPlatformColor(platform))}>{platform}</Badge>;
}
