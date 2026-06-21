import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TaskStatus, TaskPriority, PaymentStatus, ContentStatus, ClientStatus, ContentType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDate(date: string | Date | undefined) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

export function formatMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1));
}

export function isOverdue(deadline: string | Date | undefined): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

export function getTaskStatusColor(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    CONTENT_PREPARATION: 'bg-zinc-900 text-zinc-500 border-zinc-800',
    QUALITY_ASSURANCE:   'bg-zinc-900 text-zinc-400 border-zinc-800',
    POST_VERIFIED:       'bg-zinc-800 text-zinc-300 border-zinc-700',
    READY_TO_POST:       'bg-zinc-700 text-white border-zinc-600',
    POSTED:              'bg-white text-black border-transparent',
    NEEDS_FIX:           'bg-zinc-900 text-red-400 border-red-900/60',
  };
  return map[status] ?? 'bg-zinc-900 text-zinc-500';
}

export function getTaskStatusDot(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    CONTENT_PREPARATION: 'bg-zinc-600',
    QUALITY_ASSURANCE:   'bg-zinc-500',
    POST_VERIFIED:       'bg-zinc-400',
    READY_TO_POST:       'bg-zinc-200',
    POSTED:              'bg-black',
    NEEDS_FIX:           'bg-red-400',
  };
  return map[status] ?? 'bg-zinc-500';
}

export function getTaskStatusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    CONTENT_PREPARATION: 'Content Preparation',
    QUALITY_ASSURANCE:   'Quality Assurance',
    POST_VERIFIED:       'Post Verified',
    READY_TO_POST:       'Ready to Post',
    POSTED:              'Posted',
    NEEDS_FIX:           'Needs Fix',
  };
  return map[status] ?? status;
}

export function getPriorityColor(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    LOW:    'bg-zinc-900 text-zinc-600 border-zinc-800',
    MEDIUM: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    HIGH:   'bg-zinc-800 text-zinc-200 border-zinc-700',
    URGENT: 'bg-zinc-900 text-red-400 border-red-900/60',
  };
  return map[priority] ?? 'bg-zinc-900 text-zinc-500';
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    PAID:    'bg-white text-black border-transparent',
    UNPAID:  'bg-zinc-900 text-zinc-500 border-zinc-800',
    PARTIAL: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    LATE:    'bg-zinc-900 text-red-400 border-red-900/60',
  };
  return map[status] ?? 'bg-zinc-900 text-zinc-500';
}

export function getContentStatusColor(status: ContentStatus): string {
  const map: Record<ContentStatus, string> = {
    IDEA:             'bg-zinc-900 text-zinc-600',
    IN_PRODUCTION:    'bg-zinc-900 text-zinc-400',
    EDITING:          'bg-zinc-800 text-zinc-300',
    WAITING_APPROVAL: 'bg-zinc-800 text-zinc-200',
    APPROVED:         'bg-zinc-700 text-white',
    SCHEDULED:        'bg-zinc-700 text-white',
    POSTED:           'bg-white text-black',
    REPORTED:         'bg-zinc-900 text-zinc-500',
  };
  return map[status] ?? 'bg-zinc-900 text-zinc-500';
}

export function getClientStatusColor(status: ClientStatus): string {
  const map: Record<ClientStatus, string> = {
    LEAD:             'bg-zinc-900 text-zinc-500 border-zinc-800',
    OFFER_SENT:       'bg-zinc-800 text-zinc-400 border-zinc-700',
    WAITING_RESPONSE: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    ACCEPTED:         'bg-zinc-700 text-white border-zinc-600',
    ACTIVE:           'bg-white text-black border-transparent',
    REJECTED:         'bg-zinc-900 text-zinc-700 border-zinc-800',
    PAUSED:           'bg-zinc-800 text-zinc-400 border-zinc-700',
    CLOSED:           'bg-zinc-900 text-zinc-800 border-zinc-800',
  };
  return map[status] ?? 'bg-zinc-900 text-zinc-500';
}

export function getPlatformColor(platform: string): string {
  return 'bg-zinc-800 text-zinc-300';
}

export function getContentTypeColor(type: ContentType): string {
  return 'bg-zinc-900 text-zinc-400';
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function daysUntil(date: string | Date): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CONTENT_TYPES = [
  { value: 'POST',     label: 'Post' },
  { value: 'REEL',     label: 'Reel' },
  { value: 'STORY',    label: 'Story' },
  { value: 'CAROUSEL', label: 'Carousel' },
  { value: 'VIDEO',    label: 'Video' },
  { value: 'PHOTO',    label: 'Photo' },
  { value: 'OTHER',    label: 'Other' },
];

export const CARD_STATUSES = [
  { value: 'CONTENT_PREPARATION', label: 'Content Preparation' },
  { value: 'QUALITY_ASSURANCE',   label: 'Quality Assurance' },
  { value: 'POST_VERIFIED',       label: 'Post Verified' },
  { value: 'READY_TO_POST',       label: 'Ready to Post' },
  { value: 'POSTED',              label: 'Posted' },
  { value: 'NEEDS_FIX',           label: 'Needs Fix' },
];

export const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Website'];

export const LINK_TYPES = [
  { value: 'DRIVE',  label: 'Google Drive' },
  { value: 'CANVA',  label: 'Canva' },
  { value: 'PHOTO',  label: 'Photo Folder' },
  { value: 'VIDEO',  label: 'Video Folder' },
  { value: 'FINAL',  label: 'Final Export' },
  { value: 'OTHER',  label: 'Other' },
];
