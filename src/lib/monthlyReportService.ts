/**
 * DB-backed monthly report orchestration. Pure aggregation lives in
 * '@/lib/monthlyReport'; this module is the only place that reads/writes
 * MonthlyReport documents.
 */
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import Board from '@/models/Board';
import Task from '@/models/Task';
import Booking from '@/models/Booking';
import MonthlyReport, { type IMonthlyReportDoc, type IMonthlyReportMetrics } from '@/models/MonthlyReport';
import ActivityLog from '@/models/ActivityLog';
import { computeMonthlyStats } from '@/lib/monthlyReport';

export class MonthlyReportError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = 'MonthlyReportError';
  }
}

async function log(userId: string, action: string, entityId: mongoose.Types.ObjectId | string, message: string) {
  await ActivityLog.create({ userId, action, entityType: 'MonthlyReport', entityId, message });
}

async function gatherStats(clientId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [boards, completedShoots] = await Promise.all([
    Board.find({ clientId, month, year }, 'title'),
    Booking.countDocuments({ clientId, status: 'APPROVED', date: { $gte: start, $lt: end } }),
  ]);

  const boardIds = boards.map((b) => b._id);
  const tasks = boardIds.length > 0
    ? await Task.find({ boardId: { $in: boardIds } }, '_id title contentType status primaryPostUrl postedLinks')
    : [];

  const taskLike = tasks.map((t) => ({
    _id: t._id.toString(),
    title: t.title,
    contentType: t.contentType,
    status: t.status,
    primaryPostUrl: t.primaryPostUrl,
    postedLinks: t.postedLinks?.map((l) => ({ url: l.url })),
  }));

  return computeMonthlyStats(boards.map((b) => b.title), taskLike, completedShoots);
}

/** Workers can draft/edit report content; only the CEO can finalize, unfinalize, or delete. */
export function canEditReport(role: 'CEO' | 'WORKER', status: 'DRAFT' | 'FINALIZED'): boolean {
  if (role === 'CEO') return true;
  return status === 'DRAFT';
}

/** Idempotent: returns the existing report for this client+month, creating an empty DRAFT if none exists. Stats are refreshed on every call while still a DRAFT. */
export async function getOrCreateMonthlyReport(clientId: string, month: number, year: number, createdBy: string): Promise<IMonthlyReportDoc> {
  await connectDB();
  const client = await Client.findById(clientId);
  if (!client) throw new MonthlyReportError('Client not found', 404);

  let report = await MonthlyReport.findOne({ clientId, month, year });
  if (!report) {
    const stats = await gatherStats(clientId, month, year);
    report = await MonthlyReport.create({ clientId, month, year, stats, createdBy });
    await log(createdBy, 'CREATE', report._id, `Started ${month}/${year} report for "${client.name}"`);
  } else if (report.status === 'DRAFT') {
    report.stats = await gatherStats(clientId, month, year);
    await report.save();
  }
  return report;
}

export interface MonthlyReportPatch {
  language?: 'en' | 'sq';
  metrics?: IMonthlyReportMetrics;
  summary?: string;
  highlights?: string;
  bestPerformingContent?: string;
  observations?: string;
  recommendations?: string;
  nextMonthPlan?: string;
}

export async function updateMonthlyReport(id: string, actorUserId: string, actorRole: 'CEO' | 'WORKER', patch: MonthlyReportPatch): Promise<IMonthlyReportDoc> {
  await connectDB();
  const report = await MonthlyReport.findById(id);
  if (!report) throw new MonthlyReportError('Report not found', 404);
  if (!canEditReport(actorRole, report.status)) {
    throw new MonthlyReportError('This report is finalized — only a CEO can reopen it for edits', 403);
  }

  Object.assign(report, patch);
  await report.save();
  await log(actorUserId, 'UPDATE', report._id, 'Updated report content');
  return report;
}

export async function finalizeMonthlyReport(id: string, ceoUserId: string): Promise<IMonthlyReportDoc> {
  await connectDB();
  const report = await MonthlyReport.findOneAndUpdate(
    { _id: id, status: 'DRAFT' },
    { $set: { status: 'FINALIZED', finalizedAt: new Date(), finalizedBy: ceoUserId } },
    { new: true }
  );
  if (!report) throw new MonthlyReportError('Report not found or already finalized', 409);
  await log(ceoUserId, 'FINALIZE', report._id, 'Finalized report');
  return report;
}

export async function unfinalizeMonthlyReport(id: string, ceoUserId: string): Promise<IMonthlyReportDoc> {
  await connectDB();
  const report = await MonthlyReport.findOneAndUpdate(
    { _id: id, status: 'FINALIZED' },
    { $set: { status: 'DRAFT' }, $unset: { finalizedAt: '', finalizedBy: '' } },
    { new: true }
  );
  if (!report) throw new MonthlyReportError('Report not found or not finalized', 409);
  // Reopening for correction should reflect the latest board/task activity again.
  report.stats = await gatherStats(report.clientId.toString(), report.month, report.year);
  await report.save();
  await log(ceoUserId, 'UNFINALIZE', report._id, 'Reopened report for edits');
  return report;
}

export async function deleteMonthlyReport(id: string, ceoUserId: string): Promise<void> {
  await connectDB();
  const report = await MonthlyReport.findByIdAndDelete(id);
  if (!report) throw new MonthlyReportError('Report not found', 404);
  await log(ceoUserId, 'DELETE', id, 'Deleted report');
}
