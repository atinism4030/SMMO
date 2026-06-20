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
    CONTENT_PREPARATION: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    QUALITY_ASSURANCE:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    POST_VERIFIED:       'bg-green-500/20 text-green-400 border-green-500/30',
    READY_TO_POST:       'bg-purple-500/20 text-purple-400 border-purple-500/30',
    POSTED:              'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    NEEDS_FIX:           'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[status] ?? 'bg-gray-500/20 text-gray-400';
}

export function getTaskStatusDot(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    CONTENT_PREPARATION: 'bg-blue-400',
    QUALITY_ASSURANCE:   'bg-yellow-400',
    POST_VERIFIED:       'bg-green-400',
    READY_TO_POST:       'bg-purple-400',
    POSTED:              'bg-emerald-400',
    NEEDS_FIX:           'bg-red-400',
  };
  return map[status] ?? 'bg-gray-400';
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
    LOW:    'bg-slate-500/20 text-slate-400 border-slate-500/30',
    MEDIUM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    HIGH:   'bg-orange-500/20 text-orange-400 border-orange-500/30',
    URGENT: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[priority] ?? 'bg-slate-500/20 text-slate-400';
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    PAID:    'bg-green-500/20 text-green-400 border-green-500/30',
    UNPAID:  'bg-gray-500/20 text-gray-400 border-gray-500/30',
    PARTIAL: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LATE:    'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[status] ?? 'bg-gray-500/20 text-gray-400';
}

export function getContentStatusColor(status: ContentStatus): string {
  const map: Record<ContentStatus, string> = {
    IDEA:             'bg-slate-500/20 text-slate-400',
    IN_PRODUCTION:    'bg-blue-500/20 text-blue-400',
    EDITING:          'bg-indigo-500/20 text-indigo-400',
    WAITING_APPROVAL: 'bg-yellow-500/20 text-yellow-400',
    APPROVED:         'bg-green-500/20 text-green-400',
    SCHEDULED:        'bg-purple-500/20 text-purple-400',
    POSTED:           'bg-emerald-500/20 text-emerald-400',
    REPORTED:         'bg-teal-500/20 text-teal-400',
  };
  return map[status] ?? 'bg-slate-500/20 text-slate-400';
}

export function getClientStatusColor(status: ClientStatus): string {
  const map: Record<ClientStatus, string> = {
    ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
    PAUSED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    CLOSED: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[status] ?? 'bg-gray-500/20 text-gray-400';
}

export function getPlatformColor(platform: string): string {
  const map: Record<string, string> = {
    Instagram: 'bg-pink-500/20 text-pink-400',
    Facebook:  'bg-blue-600/20 text-blue-400',
    TikTok:    'bg-slate-500/20 text-slate-300',
    YouTube:   'bg-red-600/20 text-red-400',
    Website:   'bg-teal-500/20 text-teal-400',
  };
  return map[platform] ?? 'bg-slate-500/20 text-slate-400';
}

export function getContentTypeColor(type: ContentType): string {
  const map: Record<ContentType, string> = {
    POST:      'bg-indigo-500/20 text-indigo-300',
    REEL:      'bg-pink-500/20 text-pink-300',
    STORY:     'bg-amber-500/20 text-amber-300',
    CAROUSEL:  'bg-violet-500/20 text-violet-300',
    VIDEO:     'bg-red-500/20 text-red-300',
    PHOTO:     'bg-teal-500/20 text-teal-300',
    OTHER:     'bg-gray-500/20 text-gray-300',
  };
  return map[type] ?? 'bg-slate-500/20 text-slate-400';
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
