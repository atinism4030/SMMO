/**
 * Pure monthly-report aggregation — no external imports, fully unit-testable.
 * DB orchestration lives in '@/lib/monthlyReportService'.
 */

export interface ReportTaskLike {
  _id: string;
  title: string;
  contentType: string;
  status: string;
  primaryPostUrl?: string;
  postedLinks?: { url: string }[];
}

export interface MonthlyReportStats {
  boardTitles: string[];
  totalPlanned: number;
  totalPosted: number;
  totalNotCompleted: number;
  byType: Record<string, number>;
  completedShoots: number;
  postedLinks: { taskId: string; title: string; contentType: string; url: string }[];
}

/**
 * Everything here comes from what actually happened this month (board/task
 * data) — no analytics need to be entered per post. `completedShoots` is the
 * count of approved bookings for the client in that month, computed by the
 * caller and passed in.
 */
export function computeMonthlyStats(boardTitles: string[], tasks: ReportTaskLike[], completedShoots: number): MonthlyReportStats {
  const totalPlanned = tasks.length;
  const posted = tasks.filter((t) => t.status === 'POSTED');
  const totalPosted = posted.length;
  const totalNotCompleted = totalPlanned - totalPosted;

  const byType: Record<string, number> = {};
  for (const t of tasks) byType[t.contentType] = (byType[t.contentType] ?? 0) + 1;

  const postedLinks = posted
    .map((t) => ({
      taskId: t._id,
      title: t.title,
      contentType: t.contentType,
      url: t.primaryPostUrl || t.postedLinks?.[0]?.url || '',
    }))
    .filter((l) => l.url);

  return { boardTitles, totalPlanned, totalPosted, totalNotCompleted, byType, completedShoots, postedLinks };
}
