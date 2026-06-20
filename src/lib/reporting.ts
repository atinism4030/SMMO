/**
 * Pure reporting logic — no external imports, fully unit-testable.
 */

export function calcReportDueAt(postedDate: Date, contentType: string): Date {
  const hours = contentType === 'STORY' ? 24 : 48;
  return new Date(postedDate.getTime() + hours * 3_600_000);
}

export function calcEngagementRate(params: {
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
}): number | null {
  const { likes = 0, comments = 0, shares = 0, saves = 0, reach } = params;
  if (!reach || reach <= 0) return null;
  const interactions = likes + comments + shares + saves;
  return parseFloat(((interactions / reach) * 100).toFixed(2));
}

export type EffectiveReportStatus = 'NOT_POSTED' | 'WAITING' | 'NEEDS_DATA' | 'COMPLETED';

export function getEffectiveReportStatus(
  taskStatus: string,
  reportStatus?: string,
  reportDueAt?: Date | string | null
): EffectiveReportStatus {
  if (taskStatus !== 'POSTED') return 'NOT_POSTED';
  if (reportStatus === 'COMPLETED') return 'COMPLETED';
  if (!reportDueAt) return 'WAITING';
  return new Date(reportDueAt) <= new Date() ? 'NEEDS_DATA' : 'WAITING';
}
