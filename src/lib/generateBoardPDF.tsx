import React from 'react';
import { Document, Page, View, Text, Font, pdf } from '@react-pdf/renderer';
import type { IPostedLink } from '@/types';
import type { IMetrics } from '@/types';
import { getStrings, type PdfLang, LANG_CODES } from './pdfTranslations';

// Register combined Latin + Cyrillic font (TTF covers all needed scripts)
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/noto-sans-regular.ttf', fontWeight: 400 },
    { src: '/fonts/noto-sans-bold.ttf', fontWeight: 700 },
  ],
});

// Disable hyphenation so long words don't split unexpectedly
Font.registerHyphenationCallback(word => [word]);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PDFTask {
  _id: string;
  title: string;
  contentType?: string;
  platforms?: string[];
  postedDate?: string | null;
  status: string;
  reporting?: {
    reportStatus?: string;
    reportDueAt?: string | null;
    metrics?: IMetrics;
  };
  postedLinks?: IPostedLink[];
  primaryPostUrl?: string;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n?: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US');
}
function fmtPct(n?: number | null): string {
  if (n == null) return '—';
  return `${Number(n).toFixed(2)}%`;
}
function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function hasMetrics(t: PDFTask): boolean {
  const m = t.reporting?.metrics;
  return !!m && (m.views !== undefined || m.reach !== undefined || m.likes !== undefined || m.comments !== undefined);
}
function getPrimaryLink(task: PDFTask): string {
  return task.postedLinks?.[0]?.url ?? task.primaryPostUrl ?? '';
}
function getPlatformLabel(task: PDFTask): string {
  if (task.postedLinks?.length) return task.postedLinks.map(l => l.platform).join(' / ');
  if (task.platforms?.length) return task.platforms.join(', ');
  return '—';
}
function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ─── Color palette ───────────────────────────────────────────────────────────

const C = {
  black:     '#080808',
  white:     '#FFFFFF',
  darkText:  '#282828',
  midGray:   '#787878',
  lightGray: '#969696',
  subtle:    '#B9B9B9',
  separator: '#DCDCDC',
  headerSub: '#AAAAAA',
  altRow:    '#F9F9F9',
  rule:      '#D4D4D4',
};

// ─── Shared sub-components ───────────────────────────────────────────────────

function RunningHeader({
  agencyName, clientName, monthLabel,
}: { agencyName: string; clientName: string; monthLabel: string }) {
  return (
    <View style={{
      backgroundColor: C.black,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingVertical: 8,
    }}>
      <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 6.5, color: C.white }}>
        {agencyName.toUpperCase()}
      </Text>
      <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6.5, color: C.headerSub }}>
        {`${clientName.toUpperCase()}  —  ${monthLabel}`}
      </Text>
    </View>
  );
}

function PageFooter({ agencyName }: { agencyName: string }) {
  return (
    <View style={{ paddingHorizontal: 40, paddingBottom: 12, marginTop: 'auto' }}>
      <View style={{ height: 0.3, backgroundColor: C.rule, marginBottom: 5 }} />
      <Text
        style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6.5, color: C.subtle, textAlign: 'center' }}
        render={({ pageNumber }) => `${agencyName}  ·  Confidential  ·  ${pageNumber}`}
      />
    </View>
  );
}

function Separator() {
  return <View style={{ height: 0.3, backgroundColor: C.rule, marginVertical: 8 }} />;
}

function SectionLabel({ num, title }: { num: number; title: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 6.5, color: C.lightGray, marginBottom: 3 }}>
        {`0${num}  /  ${title.toUpperCase()}`}
      </Text>
      <View style={{ height: 0.6, backgroundColor: C.black }} />
    </View>
  );
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

interface CoverPageProps {
  agencyName: string;
  reportTitle: string;
  clientName: string;
  monthLabel: string;
  boardTitle: string;
  preparedLabel: string;
  boardLabel: string;
  generatedDate: string;
  confidentialText: string;
}

function CoverPage(p: CoverPageProps) {
  return (
    <Page size="A4" style={{ backgroundColor: C.black, position: 'relative' }}>
      {/* Agency name + thin rule + report title */}
      <View style={{ position: 'absolute', top: 52, left: 40, right: 40 }}>
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 700, fontSize: 8, color: C.white, letterSpacing: 1,
        }}>
          {'H O R I Z O N T E   D I G I T A L   G R O U P'}
        </Text>
        <View style={{ height: 0.3, backgroundColor: C.white, marginTop: 4, marginBottom: 7 }} />
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 400, fontSize: 7, color: '#969696', letterSpacing: 0.8,
        }}>
          {p.reportTitle.toUpperCase()}
        </Text>
      </View>

      {/* Client name (hero) */}
      <View style={{ position: 'absolute', top: 220, left: 40, right: 40 }}>
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 700, fontSize: 38, color: C.white, lineHeight: 1.1,
        }}>
          {p.clientName.toUpperCase()}
        </Text>
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 400, fontSize: 14, color: '#A0A0A0', marginTop: 10,
        }}>
          {p.monthLabel.toUpperCase()}
        </Text>
      </View>

      {/* Bottom info block */}
      <View style={{ position: 'absolute', bottom: 156, left: 40, right: 40 }}>
        <View style={{ height: 0.3, backgroundColor: '#323232', marginBottom: 10 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{
              fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6.5, color: C.midGray, marginBottom: 3,
            }}>
              {p.boardLabel.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 8.5, color: '#D2D2D2' }}>
              {p.boardTitle}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{
              fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6.5, color: C.midGray, marginBottom: 3,
            }}>
              {p.preparedLabel.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 8.5, color: '#D2D2D2' }}>
              {p.generatedDate}
            </Text>
          </View>
        </View>
      </View>

      {/* Confidential */}
      <View style={{ position: 'absolute', bottom: 32, left: 40, right: 40 }}>
        <View style={{ height: 0.25, backgroundColor: '#232323', marginBottom: 6 }} />
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6, color: '#464646', textAlign: 'center',
        }}>
          {p.confidentialText}
        </Text>
      </View>
    </Page>
  );
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

interface SummaryPageProps {
  agencyName: string;
  clientName: string;
  monthLabel: string;
  execSummaryText: string;
  monthlySummaryTitle: string;
  sectionNum: number;
  totals: {
    views: number; reach: number; likes: number; comments: number;
    shares: number; saves: number; posts: number; reels: number; stories: number;
  };
  posted: PDFTask[];
  missing: PDFTask[];
  avgEng: number | null;
  narrativeText: string;
  labels: {
    totalViews: string; totalReach: string; totalLikes: string;
    totalComments: string; totalShares: string; totalSaves: string;
    avgEngagement: string; totalPublished: string; totalPosts: string;
    totalReels: string; totalStories: string; missingInsights: string;
  };
}

function SummaryPage(p: SummaryPageProps) {
  const secondaryStats = [
    [
      { l: p.labels.totalReach,    v: fmt(p.totals.reach) },
      { l: p.labels.totalLikes,    v: fmt(p.totals.likes) },
      { l: p.labels.totalComments, v: fmt(p.totals.comments) },
    ],
    [
      { l: p.labels.totalShares,   v: fmt(p.totals.shares) },
      { l: p.labels.totalSaves,    v: fmt(p.totals.saves) },
      { l: p.labels.avgEngagement, v: p.avgEng != null ? fmtPct(p.avgEng) : '—' },
    ],
  ];

  const breakdown = [
    { l: p.labels.totalPublished, v: String(p.posted.length) },
    { l: p.labels.totalPosts,     v: String(p.totals.posts) },
    { l: p.labels.totalReels,     v: String(p.totals.reels) },
    { l: p.labels.totalStories,   v: String(p.totals.stories) },
    { l: p.labels.missingInsights, v: String(p.missing.length) },
  ];

  return (
    <Page size="A4" style={{ flexDirection: 'column' }}>
      <RunningHeader agencyName={p.agencyName} clientName={p.clientName} monthLabel={p.monthLabel} />

      <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 22 }}>
        <SectionLabel num={p.sectionNum} title={p.monthlySummaryTitle} />

        {/* Executive summary paragraph */}
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 400, fontSize: 9,
          color: '#3C3C3C', lineHeight: 1.5, marginBottom: 8,
        }}>
          {p.execSummaryText}
        </Text>
        <Separator />

        {/* Total views hero */}
        <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 6.5, color: C.lightGray, marginBottom: 3 }}>
          {p.labels.totalViews.toUpperCase()}
        </Text>
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 700, fontSize: 48,
          color: C.darkText, lineHeight: 1, marginBottom: 5,
        }}>
          {fmt(p.totals.views)}
        </Text>
        <Separator />

        {/* Secondary stats — 3+3 */}
        {secondaryStats.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', marginBottom: ri === 0 ? 6 : 0 }}>
            {row.map((s, si) => (
              <View
                key={si}
                style={{
                  flex: 1,
                  paddingLeft: si > 0 ? 8 : 0,
                  borderLeftWidth: si > 0 ? 0.2 : 0,
                  borderLeftColor: C.separator,
                  borderLeftStyle: 'solid',
                }}
              >
                <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 16, color: C.darkText, marginBottom: 3 }}>
                  {s.v}
                </Text>
                <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6, color: C.lightGray }}>
                  {s.l.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <Separator />

        {/* Content type breakdown */}
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {breakdown.map((b, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                borderLeftWidth: i > 0 ? 0.2 : 0,
                borderLeftColor: C.separator,
                borderLeftStyle: 'solid',
              }}
            >
              <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 13, color: C.darkText, marginBottom: 3 }}>
                {b.v}
              </Text>
              <Text style={{
                fontFamily: 'NotoSans', fontWeight: 400, fontSize: 5.5,
                color: C.lightGray, textAlign: 'center',
              }}>
                {b.l.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        <Separator />

        {/* Narrative paragraph */}
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 400, fontSize: 9.5,
          color: '#2D2D2D', lineHeight: 1.6,
        }}>
          {p.narrativeText}
        </Text>
      </View>

      <PageFooter agencyName={p.agencyName} />
    </Page>
  );
}

// ─── Content Table Page ───────────────────────────────────────────────────────

const COL_WIDTHS = {
  num:  18,
  date: 60,
  title: 136,
  type: 39,
  platform: 60,
  views: 40,
  reach: 40,
  likes: 33,
  comments: 33,
  shares: 33,
  saves: 33,
  engRate: 43,
  link: 86,
};

interface TablePageProps {
  agencyName: string;
  clientName: string;
  monthLabel: string;
  sectionNum: number;
  sectionTitle: string;
  subtitle: string;
  sortedPosted: PDFTask[];
  labels: {
    date: string; content: string; type: string; platform: string;
    views: string; reach: string; likes: string; comments: string;
    shares: string; saves: string; engagementRate: string; postLink: string;
    noLink: string;
  };
}

function ContentTablePage(p: TablePageProps) {
  const cols = [
    { w: COL_WIDTHS.num,      align: 'center' as const, bold: true },
    { w: COL_WIDTHS.date,     align: 'left'   as const, bold: false },
    { w: COL_WIDTHS.title,    align: 'left'   as const, bold: false },
    { w: COL_WIDTHS.type,     align: 'left'   as const, bold: false },
    { w: COL_WIDTHS.platform, align: 'left'   as const, bold: false },
    { w: COL_WIDTHS.views,    align: 'right'  as const, bold: false },
    { w: COL_WIDTHS.reach,    align: 'right'  as const, bold: false },
    { w: COL_WIDTHS.likes,    align: 'right'  as const, bold: false },
    { w: COL_WIDTHS.comments, align: 'right'  as const, bold: false },
    { w: COL_WIDTHS.shares,   align: 'right'  as const, bold: false },
    { w: COL_WIDTHS.saves,    align: 'right'  as const, bold: false },
    { w: COL_WIDTHS.engRate,  align: 'right'  as const, bold: false },
    { w: COL_WIDTHS.link,     align: 'left'   as const, bold: false },
  ];

  const headers = [
    '#', p.labels.date, p.labels.content, p.labels.type, p.labels.platform,
    p.labels.views, p.labels.reach, p.labels.likes, p.labels.comments,
    p.labels.shares, p.labels.saves, p.labels.engagementRate, p.labels.postLink,
  ];

  return (
    <Page size="A4" style={{ flexDirection: 'column' }}>
      <RunningHeader agencyName={p.agencyName} clientName={p.clientName} monthLabel={p.monthLabel} />

      <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 22 }}>
        <SectionLabel num={p.sectionNum} title={p.sectionTitle} />
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 400, fontSize: 8,
          color: C.lightGray, marginBottom: 8,
        }}>
          {p.subtitle}
        </Text>

        {/* Table header */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: C.black,
          paddingVertical: 5,
          paddingHorizontal: 2,
        }}>
          {headers.map((h, i) => (
            <Text
              key={i}
              style={{
                fontFamily: 'NotoSans', fontWeight: 700, fontSize: 5.5,
                color: C.white, width: cols[i].w, textAlign: cols[i].align,
                paddingHorizontal: 2,
              }}
            >
              {h.toUpperCase()}
            </Text>
          ))}
        </View>

        {/* Table rows */}
        {p.sortedPosted.map((task, idx) => {
          const m   = task.reporting?.metrics;
          const hm  = hasMetrics(task);
          const link = getPrimaryLink(task);
          const shortLink = link ? trunc(link, 28) : p.labels.noLink;

          const cells = [
            String(idx + 1),
            fmtDate(task.postedDate),
            trunc(task.title, 48),
            task.contentType ?? '—',
            trunc(getPlatformLabel(task), 18),
            hm ? fmt(m?.views)    : '—',
            hm ? fmt(m?.reach)    : '—',
            hm ? fmt(m?.likes)    : '—',
            hm ? fmt(m?.comments) : '—',
            hm ? fmt(m?.shares)   : '—',
            hm ? fmt(m?.saves)    : '—',
            hm && m?.engagementRate != null ? fmtPct(m.engagementRate) : '—',
            shortLink,
          ];

          return (
            <View
              key={task._id}
              wrap={false}
              style={{
                flexDirection: 'row',
                backgroundColor: idx % 2 === 0 ? C.white : C.altRow,
                borderBottomWidth: 0.15,
                borderBottomColor: C.rule,
                borderBottomStyle: 'solid',
                paddingHorizontal: 2,
              }}
            >
              {cells.map((cell, ci) => (
                <Text
                  key={ci}
                  style={{
                    fontFamily: 'NotoSans',
                    fontWeight: cols[ci].bold ? 700 : 400,
                    fontSize: 6,
                    color: '#1E1E1E',
                    width: cols[ci].w,
                    textAlign: cols[ci].align,
                    paddingHorizontal: 2,
                    paddingVertical: 3,
                  }}
                >
                  {cell}
                </Text>
              ))}
            </View>
          );
        })}
      </View>

      <PageFooter agencyName={p.agencyName} />
    </Page>
  );
}

// ─── Top Performers ───────────────────────────────────────────────────────────

interface TopPerformersPageProps {
  agencyName: string;
  clientName: string;
  monthLabel: string;
  sectionNum: number;
  top3: PDFTask[];
  labels: {
    bestPerformingTitle: string;
    bestByViews: string;
    views: string;
    reach: string;
    engagementRate: string;
  };
}

function TopPerformersPage(p: TopPerformersPageProps) {
  const rankLabels = ['TOP PERFORMER', 'SECOND PLACE', 'THIRD PLACE'];

  return (
    <Page size="A4" style={{ flexDirection: 'column' }}>
      <RunningHeader agencyName={p.agencyName} clientName={p.clientName} monthLabel={p.monthLabel} />

      <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 22 }}>
        <SectionLabel num={p.sectionNum} title={p.labels.bestPerformingTitle} />
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 400, fontSize: 8.5, color: C.lightGray, marginBottom: 12,
        }}>
          {p.labels.bestByViews}
        </Text>

        <View style={{ flexDirection: 'row' }}>
          {p.top3.map((t, i) => {
            const m = t.reporting?.metrics;
            const link = getPrimaryLink(t);
            const gap = i > 0 ? 5 : 0;

            return (
              <View
                key={t._id}
                style={{
                  flex: 1,
                  marginLeft: gap,
                  borderWidth: 0.4,
                  borderColor: C.black,
                  borderStyle: 'solid',
                }}
              >
                {/* Card header */}
                <View style={{
                  backgroundColor: C.black,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 5,
                  paddingVertical: 5,
                }}>
                  <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 6.5, color: C.white }}>
                    {`0${i + 1}`}
                  </Text>
                  <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6, color: C.headerSub }}>
                    {rankLabels[i]}
                  </Text>
                </View>

                <View style={{ padding: 5 }}>
                  <Text style={{
                    fontFamily: 'NotoSans', fontWeight: 700, fontSize: 6, color: '#828282', marginBottom: 3,
                  }}>
                    {(t.contentType ?? 'CONTENT').toUpperCase()}
                  </Text>
                  <Text style={{
                    fontFamily: 'NotoSans', fontWeight: 700, fontSize: 8.5,
                    color: C.black, lineHeight: 1.3, marginBottom: 4,
                  }}>
                    {trunc(t.title, 60)}
                  </Text>
                  <Text style={{
                    fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6.5, color: C.lightGray, marginBottom: 6,
                  }}>
                    {fmtDate(t.postedDate)}
                  </Text>

                  <View style={{ height: 0.2, backgroundColor: C.rule, marginBottom: 6 }} />

                  <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 7, color: '#8C8C8C', marginBottom: 2 }}>
                    {p.labels.views.toUpperCase()}
                  </Text>
                  <Text style={{
                    fontFamily: 'NotoSans', fontWeight: 700, fontSize: 20,
                    color: C.black, lineHeight: 1, marginBottom: 4,
                  }}>
                    {fmt(m?.views)}
                  </Text>

                  <View style={{ height: 0.2, backgroundColor: C.rule, marginBottom: 5 }} />

                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 9, color: C.black, marginBottom: 2 }}>
                        {fmt(m?.reach)}
                      </Text>
                      <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6, color: '#8C8C8C' }}>
                        {p.labels.reach.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{
                      flex: 1,
                      borderLeftWidth: 0.2,
                      borderLeftColor: C.separator,
                      borderLeftStyle: 'solid',
                      paddingLeft: 5,
                    }}>
                      <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 9, color: C.black, marginBottom: 2 }}>
                        {fmtPct(m?.engagementRate)}
                      </Text>
                      <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6, color: '#8C8C8C' }}>
                        {p.labels.engagementRate.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {link ? (
                    <Text style={{
                      fontFamily: 'NotoSans', fontWeight: 400, fontSize: 6, color: '#6060C0', marginTop: 6,
                    }}>
                      {trunc(link, 45)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <PageFooter agencyName={p.agencyName} />
    </Page>
  );
}

// ─── Missing Insights Page ────────────────────────────────────────────────────

interface MissingPageProps {
  agencyName: string;
  clientName: string;
  monthLabel: string;
  sectionNum: number;
  missing: PDFTask[];
  missingNoteText: string;
  labels: {
    missingInsights: string;
    content: string;
    type: string;
    date: string;
    reportDue: string;
  };
}

function MissingInsightsPage(p: MissingPageProps) {
  return (
    <Page size="A4" style={{ flexDirection: 'column' }}>
      <RunningHeader agencyName={p.agencyName} clientName={p.clientName} monthLabel={p.monthLabel} />

      <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 22 }}>
        <SectionLabel num={p.sectionNum} title={p.labels.missingInsights} />
        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 400, fontSize: 9,
          color: '#5A5A5A', lineHeight: 1.5, marginBottom: 10,
        }}>
          {p.missingNoteText}
        </Text>

        {/* Header */}
        <View style={{
          flexDirection: 'row', backgroundColor: C.black,
          paddingVertical: 5, paddingHorizontal: 2,
        }}>
          {[{ w: 20, l: '#' }, { w: 240, l: p.labels.content }, { w: 70, l: p.labels.type }, { w: 100, l: p.labels.date }, { w: 100, l: p.labels.reportDue }].map((h, i) => (
            <Text key={i} style={{
              fontFamily: 'NotoSans', fontWeight: 700, fontSize: 6, color: C.white,
              width: h.w, paddingHorizontal: 2,
            }}>
              {h.l.toUpperCase()}
            </Text>
          ))}
        </View>

        {/* Rows */}
        {p.missing.map((t, idx) => (
          <View key={t._id} wrap={false} style={{
            flexDirection: 'row',
            backgroundColor: idx % 2 === 0 ? C.white : C.altRow,
            borderBottomWidth: 0.15, borderBottomColor: C.rule, borderBottomStyle: 'solid',
            paddingHorizontal: 2,
          }}>
            {[
              { w: 20,  v: String(idx + 1) },
              { w: 240, v: trunc(t.title, 60) },
              { w: 70,  v: t.contentType ?? '—' },
              { w: 100, v: fmtDate(t.postedDate) },
              { w: 100, v: t.reporting?.reportDueAt ? fmtDate(t.reporting.reportDueAt) : '—' },
            ].map((c, ci) => (
              <Text key={ci} style={{
                fontFamily: 'NotoSans', fontWeight: ci === 0 ? 700 : 400,
                fontSize: 7, color: '#1E1E1E',
                width: c.w, paddingHorizontal: 2, paddingVertical: 4,
              }}>
                {c.v}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <PageFooter agencyName={p.agencyName} />
    </Page>
  );
}

// ─── Final Summary Page ───────────────────────────────────────────────────────

interface FinalPageProps {
  agencyName: string;
  clientName: string;
  monthLabel: string;
  generatedDate: string;
  sectionNum: number;
  summaryText: string;
  labels: {
    finalSummaryTitle: string;
    reportPreparedFor: string;
    reportingPeriod: string;
    dateIssued: string;
  };
}

function FinalSummaryPage(p: FinalPageProps) {
  return (
    <Page size="A4" style={{ flexDirection: 'column' }}>
      <RunningHeader agencyName={p.agencyName} clientName={p.clientName} monthLabel={p.monthLabel} />

      <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 22 }}>
        <SectionLabel num={p.sectionNum} title={p.labels.finalSummaryTitle} />

        <Text style={{
          fontFamily: 'NotoSans', fontWeight: 400, fontSize: 10,
          color: '#282828', lineHeight: 1.7, marginBottom: 24,
        }}>
          {p.summaryText}
        </Text>

        <View style={{ width: 200, height: 0.4, backgroundColor: C.black, marginBottom: 10 }} />

        <Text style={{ fontFamily: 'NotoSans', fontWeight: 700, fontSize: 9.5, color: C.black, marginBottom: 8 }}>
          {p.agencyName}
        </Text>
        <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 8, color: C.midGray, marginBottom: 4 }}>
          {`${p.labels.reportPreparedFor} ${p.clientName}`}
        </Text>
        <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 8, color: C.midGray, marginBottom: 4 }}>
          {`${p.labels.reportingPeriod} ${p.monthLabel}`}
        </Text>
        <Text style={{ fontFamily: 'NotoSans', fontWeight: 400, fontSize: 8, color: C.midGray }}>
          {`${p.labels.dateIssued} ${p.generatedDate}`}
        </Text>
      </View>

      <PageFooter agencyName={p.agencyName} />
    </Page>
  );
}

// ─── Root Document ─────────────────────────────────────────────────────────────

interface ReportDocumentProps {
  client: { name: string };
  board: { title: string; month: number; year: number };
  allTasks: PDFTask[];
  lang: PdfLang;
}

function ReportDocument({ client, board, allTasks, lang }: ReportDocumentProps) {
  const T = getStrings(lang);
  const monthLabel    = `${MONTH_NAMES[board.month - 1]} ${board.year}`;
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const posted      = allTasks.filter(t => t.status === 'POSTED');
  const withMetrics = posted.filter(hasMetrics);
  const missing     = posted.filter(t => !hasMetrics(t));

  const totals = {
    posts:    posted.filter(t => t.contentType === 'POST').length,
    reels:    posted.filter(t => t.contentType === 'REEL').length,
    stories:  posted.filter(t => t.contentType === 'STORY').length,
    views:    withMetrics.reduce((s, t) => s + (t.reporting?.metrics?.views    ?? 0), 0),
    reach:    withMetrics.reduce((s, t) => s + (t.reporting?.metrics?.reach    ?? 0), 0),
    likes:    withMetrics.reduce((s, t) => s + (t.reporting?.metrics?.likes    ?? 0), 0),
    comments: withMetrics.reduce((s, t) => s + (t.reporting?.metrics?.comments ?? 0), 0),
    shares:   withMetrics.reduce((s, t) => s + (t.reporting?.metrics?.shares   ?? 0), 0),
    saves:    withMetrics.reduce((s, t) => s + (t.reporting?.metrics?.saves    ?? 0), 0),
  };
  const avgEng = withMetrics.length > 0
    ? withMetrics.reduce((s, t) => s + (t.reporting?.metrics?.engagementRate ?? 0), 0) / withMetrics.length
    : null;
  const top3 = [...withMetrics]
    .sort((a, b) => (b.reporting?.metrics?.views ?? 0) - (a.reporting?.metrics?.views ?? 0))
    .slice(0, 3);

  const sortedPosted = [...posted].sort((a, b) =>
    (a.postedDate ? new Date(a.postedDate).getTime() : 0) -
    (b.postedDate ? new Date(b.postedDate).getTime() : 0)
  );

  const completionRate = posted.length > 0
    ? Math.round((withMetrics.length / posted.length) * 100) : 0;
  const summaryText =
    T.finalSummaryText(client.name, monthLabel) + '\n\n' +
    T.completionRateText(posted.length, withMetrics.length, completionRate) + '\n\n' +
    (missing.length > 0 ? T.someInsightsMissing : T.allInsightsComplete);

  let sectionNum = 1;
  const withTop3     = top3.length > 0;
  const withMissing  = missing.length > 0;
  const tableSecNum  = sectionNum + 1;      // 2
  const topSecNum    = tableSecNum + 1;     // 3
  const missSecNum   = withTop3 ? topSecNum + 1 : topSecNum;  // 3 or 4
  const finalSecNum  = withMissing ? missSecNum + 1 : missSecNum; // depends

  return (
    <Document>
      {/* Page 1 — Cover */}
      <CoverPage
        agencyName={T.agencyName}
        reportTitle={T.reportTitle}
        clientName={client.name}
        monthLabel={monthLabel}
        boardTitle={board.title}
        boardLabel={T.board}
        preparedLabel={T.prepared}
        generatedDate={generatedDate}
        confidentialText={T.confidential}
      />

      {/* Page 2 — Executive Summary + Stats */}
      <SummaryPage
        agencyName={T.agencyName}
        clientName={client.name}
        monthLabel={monthLabel}
        execSummaryText={T.execSummary(client.name, monthLabel)}
        monthlySummaryTitle={T.monthlySummaryTitle}
        sectionNum={sectionNum}
        totals={totals}
        posted={posted}
        missing={missing}
        avgEng={avgEng}
        narrativeText={T.narrativeText(
          monthLabel, client.name,
          fmt(totals.views), fmt(totals.reach),
          fmt(totals.likes), fmt(totals.comments),
          fmt(totals.shares), fmt(totals.saves),
          avgEng != null ? fmtPct(avgEng) : null
        )}
        labels={{
          totalViews:    T.totalViews,
          totalReach:    T.totalReach,
          totalLikes:    T.totalLikes,
          totalComments: T.totalComments,
          totalShares:   T.totalShares,
          totalSaves:    T.totalSaves,
          avgEngagement: T.avgEngagement,
          totalPublished: T.totalPublished,
          totalPosts:    T.totalPosts,
          totalReels:    T.totalReels,
          totalStories:  T.totalStories,
          missingInsights: T.missingInsights,
        }}
      />

      {/* Page 3+ — Content Table */}
      <ContentTablePage
        agencyName={T.agencyName}
        clientName={client.name}
        monthLabel={monthLabel}
        sectionNum={tableSecNum}
        sectionTitle={T.publishedOverviewTitle}
        subtitle={`${posted.length} ${T.contentPublishedIn} ${monthLabel}`}
        sortedPosted={sortedPosted}
        labels={{
          date:          T.date,
          content:       T.content,
          type:          T.type,
          platform:      T.platform,
          views:         T.views,
          reach:         T.reach,
          likes:         T.likes,
          comments:      T.comments,
          shares:        T.shares,
          saves:         T.saves,
          engagementRate: T.engagementRate,
          postLink:      T.postLink,
          noLink:        T.noLink,
        }}
      />

      {/* Top Performers */}
      {withTop3 && (
        <TopPerformersPage
          agencyName={T.agencyName}
          clientName={client.name}
          monthLabel={monthLabel}
          sectionNum={topSecNum}
          top3={top3}
          labels={{
            bestPerformingTitle: T.bestPerformingTitle,
            bestByViews:         T.bestByViews,
            views:               T.views,
            reach:               T.reach,
            engagementRate:      T.engagementRate,
          }}
        />
      )}

      {/* Missing Insights */}
      {withMissing && (
        <MissingInsightsPage
          agencyName={T.agencyName}
          clientName={client.name}
          monthLabel={monthLabel}
          sectionNum={missSecNum}
          missing={missing}
          missingNoteText={T.missingNoteText(missing.length)}
          labels={{
            missingInsights: T.missingInsights,
            content:         T.content,
            type:            T.type,
            date:            T.date,
            reportDue:       'Report Due',
          }}
        />
      )}

      {/* Final Summary */}
      <FinalSummaryPage
        agencyName={T.agencyName}
        clientName={client.name}
        monthLabel={monthLabel}
        generatedDate={generatedDate}
        sectionNum={finalSecNum}
        summaryText={summaryText}
        labels={{
          finalSummaryTitle: T.finalSummaryTitle,
          reportPreparedFor: T.reportPreparedFor,
          reportingPeriod:   T.reportingPeriod,
          dateIssued:        T.dateIssued,
        }}
      />
    </Document>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateBoardPDF(
  client: { name: string },
  board: { title: string; month: number; year: number },
  allTasks: PDFTask[],
  lang: PdfLang = 'en'
): Promise<void> {
  const docElement = (
    <ReportDocument client={client} board={board} allTasks={allTasks} lang={lang} />
  );

  const blob = await pdf(docElement).toBlob();

  const safeName  = client.name.replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = `${MONTH_NAMES[board.month - 1]}_${board.year}`;
  const langCode  = LANG_CODES[lang];
  const filename  = `Horizonte_Digital_Group_${safeName}_${safeMonth}_Report_${langCode}.pdf`;

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
