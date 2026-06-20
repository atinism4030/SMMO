import { cn } from '@/lib/utils';
import type { TaskStatus, TaskPriority, PaymentStatus, ContentStatus, ClientStatus } from '@/types';
import {
  getTaskStatusColor,
  getTaskStatusLabel,
  getPriorityColor,
  getPaymentStatusColor,
  getContentStatusColor,
  getClientStatusColor,
  getPlatformColor,
} from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', className)}>
      {children}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge className={cn('border', getTaskStatusColor(status))}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', {
        'bg-gray-400': status === 'TO_DO',
        'bg-blue-400': status === 'IN_PROGRESS',
        'bg-yellow-400': status === 'WAITING_APPROVAL',
        'bg-green-400': status === 'APPROVED',
        'bg-purple-400': status === 'SCHEDULED',
        'bg-emerald-400': status === 'POSTED',
        'bg-green-300': status === 'DONE',
        'bg-red-400': status === 'CANCELLED',
      })} />
      {getTaskStatusLabel(status)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const labels: Record<TaskPriority, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Urgent',
  };
  return <Badge className={cn('border', getPriorityColor(priority))}>{labels[priority]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const labels: Record<PaymentStatus, string> = {
    PAID: 'Paid',
    UNPAID: 'Unpaid',
    PARTIAL: 'Partial',
    LATE: 'Late',
  };
  return <Badge className={cn('border', getPaymentStatusColor(status))}>{labels[status]}</Badge>;
}

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const labels: Record<ContentStatus, string> = {
    IDEA: 'Idea',
    IN_PRODUCTION: 'In Production',
    EDITING: 'Editing',
    WAITING_APPROVAL: 'Waiting Approval',
    APPROVED: 'Approved',
    SCHEDULED: 'Scheduled',
    POSTED: 'Posted',
    REPORTED: 'Reported',
  };
  return <Badge className={cn('border border-transparent', getContentStatusColor(status))}>{labels[status]}</Badge>;
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const labels: Record<ClientStatus, string> = { ACTIVE: 'Active', PAUSED: 'Paused', CLOSED: 'Closed' };
  return <Badge className={cn('border', getClientStatusColor(status))}>{labels[status]}</Badge>;
}

export function PlatformBadge({ platform }: { platform: string }) {
  return <Badge className={cn('border-0', getPlatformColor(platform))}>{platform}</Badge>;
}
