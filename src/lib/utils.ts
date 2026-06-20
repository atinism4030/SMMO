import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TaskStatus, TaskPriority, PaymentStatus, ContentStatus, ClientStatus } from '@/types';

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
    TO_DO: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    WAITING_APPROVAL: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
    SCHEDULED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    POSTED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    DONE: 'bg-green-600/20 text-green-300 border-green-600/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[status] ?? 'bg-gray-500/20 text-gray-400';
}

export function getTaskStatusDot(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    TO_DO: 'bg-gray-400',
    IN_PROGRESS: 'bg-blue-400',
    WAITING_APPROVAL: 'bg-yellow-400',
    APPROVED: 'bg-green-400',
    SCHEDULED: 'bg-purple-400',
    POSTED: 'bg-emerald-400',
    DONE: 'bg-green-300',
    CANCELLED: 'bg-red-400',
  };
  return map[status] ?? 'bg-gray-400';
}

export function getTaskStatusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    TO_DO: 'To Do',
    IN_PROGRESS: 'In Progress',
    WAITING_APPROVAL: 'Waiting Approval',
    APPROVED: 'Approved',
    SCHEDULED: 'Scheduled',
    POSTED: 'Posted',
    DONE: 'Done',
    CANCELLED: 'Cancelled',
  };
  return map[status] ?? status;
}

export function getPriorityColor(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    LOW: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    MEDIUM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    URGENT: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[priority] ?? 'bg-slate-500/20 text-slate-400';
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    PAID: 'bg-green-500/20 text-green-400 border-green-500/30',
    UNPAID: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    PARTIAL: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LATE: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[status] ?? 'bg-gray-500/20 text-gray-400';
}

export function getContentStatusColor(status: ContentStatus): string {
  const map: Record<ContentStatus, string> = {
    IDEA: 'bg-slate-500/20 text-slate-400',
    IN_PRODUCTION: 'bg-blue-500/20 text-blue-400',
    EDITING: 'bg-indigo-500/20 text-indigo-400',
    WAITING_APPROVAL: 'bg-yellow-500/20 text-yellow-400',
    APPROVED: 'bg-green-500/20 text-green-400',
    SCHEDULED: 'bg-purple-500/20 text-purple-400',
    POSTED: 'bg-emerald-500/20 text-emerald-400',
    REPORTED: 'bg-teal-500/20 text-teal-400',
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
    Facebook: 'bg-blue-600/20 text-blue-400',
    TikTok: 'bg-slate-500/20 text-slate-300',
    YouTube: 'bg-red-600/20 text-red-400',
    Website: 'bg-teal-500/20 text-teal-400',
  };
  return map[platform] ?? 'bg-slate-500/20 text-slate-400';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function daysUntil(date: string | Date): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const TASK_TYPES = [
  { value: 'PHOTOSHOOT', label: 'Photoshoot' },
  { value: 'VIDEO_SHOOT', label: 'Video Shoot' },
  { value: 'DRONE', label: 'Drone' },
  { value: 'EDITING', label: 'Editing' },
  { value: 'REEL', label: 'Reel' },
  { value: 'STORY', label: 'Story' },
  { value: 'POST_DESIGN', label: 'Post Design' },
  { value: 'COPYWRITING', label: 'Copywriting' },
  { value: 'CLIENT_APPROVAL', label: 'Client Approval' },
  { value: 'POSTING', label: 'Posting' },
  { value: 'REPORTING', label: 'Reporting' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'OTHER', label: 'Other' },
];

export const TASK_STATUSES = [
  { value: 'TO_DO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_APPROVAL', label: 'Waiting Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Website'];
