import React from 'react';
import { Document, Page, View, Text, Font, pdf } from '@react-pdf/renderer';
import { getMonthlyReportStrings, type ReportPdfLang } from './monthlyReportPdfTranslations';

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/noto-sans-regular.ttf', fontWeight: 400 },
    { src: '/fonts/noto-sans-bold.ttf', fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmt(n?: number | null): string {
  return n == null ? '—' : n.toLocaleString('en-US');
}

export interface MonthlyReportPDFInput {
  clientName: string;
  month: number;
  year: number;
  language: ReportPdfLang;
  stats: {
    totalPlanned: number;
    totalPosted: number;
    totalNotCompleted: number;
    byType: Record<string, number>;
    completedShoots: number;
    postedLinks: { title: string; url: string }[];
  };
  metrics: {
    followersStart?: number;
    followersEnd?: number;
    totalReach?: number;
    totalViews?: number;
    profileVisits?: number;
    engagementRatePct?: number;
    facebookReach?: number;
    tiktokViews?: number;
  };
  summary?: string;
  highlights?: string;
  bestPerformingContent?: string;
  observations?: string;
  recommendations?: string;
  nextMonthPlan?: string;
}

const styles = {
  page: { padding: 40, fontFamily: 'NotoSans', fontSize: 10, color: '#18181b' },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 24, borderBottom: '2pt solid #18181b', paddingBottom: 12 },
  agencyName: { fontSize: 16, fontWeight: 700 as const },
  reportTitle: { fontSize: 11, color: '#52525b', marginTop: 2 },
  metaBlock: { alignItems: 'flex-end' as const },
  metaLine: { fontSize: 9, color: '#52525b' },
  sectionTitle: { fontSize: 12, fontWeight: 700 as const, marginTop: 18, marginBottom: 8, borderBottom: '1pt solid #d4d4d8', paddingBottom: 4 },
  statGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  statBox: { width: '31%', border: '1pt solid #e4e4e7', borderRadius: 6, padding: 8, marginBottom: 8 },
  statLabel: { fontSize: 8, color: '#71717a' },
  statValue: { fontSize: 14, fontWeight: 700 as const, marginTop: 2 },
  paragraph: { fontSize: 10, lineHeight: 1.5, color: '#27272a' },
  linkRow: { fontSize: 9, color: '#3f3f46', marginBottom: 3 },
  footer: { position: 'absolute' as const, bottom: 24, left: 40, right: 40, fontSize: 7, color: '#a1a1aa', textAlign: 'center' as const, borderTop: '0.5pt solid #e4e4e7', paddingTop: 8 },
};

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function MonthlyReportDocument({ input }: { input: MonthlyReportPDFInput }) {
  const T = getMonthlyReportStrings(input.language);
  const monthLabel = `${MONTH_NAMES[input.month - 1]} ${input.year}`;
  const hasMetrics = Object.values(input.metrics).some((v) => v !== undefined && v !== null);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.agencyName}>{T.agencyName}</Text>
            <Text style={styles.reportTitle}>{T.reportTitle}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}>{T.client}: {input.clientName}</Text>
            <Text style={styles.metaLine}>{T.month}: {monthLabel}</Text>
            <Text style={styles.metaLine}>{T.generatedDate}: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
          </View>
        </View>

        {input.summary && (
          <>
            <Text style={styles.sectionTitle}>{T.monthlySummary}</Text>
            <Text style={styles.paragraph}>{input.summary}</Text>
          </>
        )}

        <Text style={styles.sectionTitle}>{T.contentDelivered}</Text>
        <View style={styles.statGrid}>
          <StatBox label={T.totalPlanned} value={fmt(input.stats.totalPlanned)} />
          <StatBox label={T.totalPosted} value={fmt(input.stats.totalPosted)} />
          <StatBox label={T.notCompleted} value={fmt(input.stats.totalNotCompleted)} />
          {Object.entries(input.stats.byType).map(([type, count]) => (
            <StatBox key={type} label={type} value={fmt(count)} />
          ))}
          <StatBox label={T.completedShoots} value={fmt(input.stats.completedShoots)} />
        </View>

        <Text style={styles.sectionTitle}>{T.performanceOverview}</Text>
        {hasMetrics ? (
          <View style={styles.statGrid}>
            {input.metrics.followersStart != null && <StatBox label={T.followersStart} value={fmt(input.metrics.followersStart)} />}
            {input.metrics.followersEnd != null && <StatBox label={T.followersEnd} value={fmt(input.metrics.followersEnd)} />}
            {input.metrics.totalReach != null && <StatBox label={T.totalReach} value={fmt(input.metrics.totalReach)} />}
            {input.metrics.totalViews != null && <StatBox label={T.totalViews} value={fmt(input.metrics.totalViews)} />}
            {input.metrics.profileVisits != null && <StatBox label={T.profileVisits} value={fmt(input.metrics.profileVisits)} />}
            {input.metrics.engagementRatePct != null && <StatBox label={T.engagementRate} value={`${input.metrics.engagementRatePct}%`} />}
            {input.metrics.facebookReach != null && <StatBox label={T.facebookReach} value={fmt(input.metrics.facebookReach)} />}
            {input.metrics.tiktokViews != null && <StatBox label={T.tiktokViews} value={fmt(input.metrics.tiktokViews)} />}
          </View>
        ) : (
          <Text style={styles.paragraph}>{T.noMetricsProvided}</Text>
        )}

        {input.highlights && (
          <>
            <Text style={styles.sectionTitle}>{T.highlights}</Text>
            <Text style={styles.paragraph}>{input.highlights}</Text>
          </>
        )}

        {(input.bestPerformingContent || input.stats.postedLinks.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>{T.bestPerforming}</Text>
            {input.bestPerformingContent && <Text style={styles.paragraph}>{input.bestPerformingContent}</Text>}
            {input.stats.postedLinks.slice(0, 8).map((l, i) => (
              <Text key={i} style={styles.linkRow}>• {l.title} — {l.url}</Text>
            ))}
          </>
        )}

        {input.observations && (
          <>
            <Text style={styles.sectionTitle}>{T.observations}</Text>
            <Text style={styles.paragraph}>{input.observations}</Text>
          </>
        )}

        {input.recommendations && (
          <>
            <Text style={styles.sectionTitle}>{T.recommendations}</Text>
            <Text style={styles.paragraph}>{input.recommendations}</Text>
          </>
        )}

        {input.nextMonthPlan && (
          <>
            <Text style={styles.sectionTitle}>{T.nextMonthPlan}</Text>
            <Text style={styles.paragraph}>{input.nextMonthPlan}</Text>
          </>
        )}

        <Text style={styles.footer} fixed>{T.confidential}</Text>
      </Page>
    </Document>
  );
}

export async function generateMonthlyReportPDF(input: MonthlyReportPDFInput): Promise<void> {
  const blob = await pdf(<MonthlyReportDocument input={input} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${input.clientName.replace(/\s+/g, '-')}-report-${input.year}-${String(input.month).padStart(2, '0')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
