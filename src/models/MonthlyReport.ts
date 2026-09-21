import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * One report per client per calendar month — replaces the old per-task
 * granular "Report" concept (which required entering analytics for every
 * single post). `stats` is auto-gathered from Board/Task/Booking data (see
 * '@/lib/monthlyReportService') and refreshed on every read while the report
 * is still a DRAFT; once FINALIZED it's frozen, matching the "don't
 * retroactively rewrite finalized history" convention used by billing.
 *
 * `metrics` and the narrative sections are the only fields a human fills in
 * by hand — and only the high-level ones (follower counts, total reach,
 * etc.), never a per-post breakdown.
 */
export interface IMonthlyReportStats {
  boardTitles: string[];
  totalPlanned: number;
  totalPosted: number;
  totalNotCompleted: number;
  byType: Record<string, number>;
  completedShoots: number;
  postedLinks: { taskId: string; title: string; contentType: string; url: string }[];
}

export interface IMonthlyReportMetrics {
  followersStart?: number;
  followersEnd?: number;
  totalReach?: number;
  totalViews?: number;
  profileVisits?: number;
  engagementRatePct?: number;
  facebookReach?: number;
  tiktokViews?: number;
}

export interface IMonthlyReportDoc extends Document {
  clientId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  status: 'DRAFT' | 'FINALIZED';
  language: 'en' | 'sq';
  stats: IMonthlyReportStats;
  metrics: IMonthlyReportMetrics;
  summary?: string;
  highlights?: string;
  bestPerformingContent?: string;
  observations?: string;
  recommendations?: string;
  nextMonthPlan?: string;
  createdBy: mongoose.Types.ObjectId;
  finalizedAt?: Date;
  finalizedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StatsSchema = new Schema<IMonthlyReportStats>(
  {
    boardTitles: [{ type: String }],
    totalPlanned: { type: Number, default: 0 },
    totalPosted: { type: Number, default: 0 },
    totalNotCompleted: { type: Number, default: 0 },
    byType: { type: Schema.Types.Mixed, default: {} },
    completedShoots: { type: Number, default: 0 },
    postedLinks: [{ taskId: String, title: String, contentType: String, url: String }],
  },
  { _id: false }
);

const MetricsSchema = new Schema<IMonthlyReportMetrics>(
  {
    followersStart: { type: Number },
    followersEnd: { type: Number },
    totalReach: { type: Number },
    totalViews: { type: Number },
    profileVisits: { type: Number },
    engagementRatePct: { type: Number },
    facebookReach: { type: Number },
    tiktokViews: { type: Number },
  },
  { _id: false }
);

const MonthlyReportSchema = new Schema<IMonthlyReportDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    status: { type: String, enum: ['DRAFT', 'FINALIZED'], default: 'DRAFT' },
    language: { type: String, enum: ['en', 'sq'], default: 'en' },
    stats: { type: StatsSchema, default: () => ({}) },
    metrics: { type: MetricsSchema, default: () => ({}) },
    summary: { type: String },
    highlights: { type: String },
    bestPerformingContent: { type: String },
    observations: { type: String },
    recommendations: { type: String },
    nextMonthPlan: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    finalizedAt: { type: Date },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MonthlyReportSchema.index({ clientId: 1, year: 1, month: 1 }, { unique: true });

const MonthlyReport: Model<IMonthlyReportDoc> =
  mongoose.models.MonthlyReport ?? mongoose.model<IMonthlyReportDoc>('MonthlyReport', MonthlyReportSchema);
export default MonthlyReport;
