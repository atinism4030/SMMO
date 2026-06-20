import type { IMetrics } from '@/types';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

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
}

// ─── Formatters ──────────────────────────────────────────────────────────────
function fmt(n?: number | null): string {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString('en-US');
}
function fmtPct(n?: number | null): string {
  if (n === undefined || n === null) return '—';
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

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateBoardPDF(
  client: { name: string },
  board: { title: string; month: number; year: number },
  allTasks: PDFTask[]
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTableMod = await import('jspdf-autotable');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoTable = ((autoTableMod as any).default ?? autoTableMod) as (
    doc: InstanceType<typeof jsPDF>,
    opts: Record<string, unknown>
  ) => void;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ─── Constants ──────────────────────────────────────────────────────────────
  const PW = 210;
  const PH = 297;
  const M  = 14;          // page margins
  const UW = PW - M * 2; // 182mm usable width

  const monthLabel   = `${MONTH_NAMES[board.month - 1]} ${board.year}`;
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ─── Data ───────────────────────────────────────────────────────────────────
  const posted       = allTasks.filter(t => t.status === 'POSTED');
  const withMetrics  = posted.filter(hasMetrics);
  const missing      = posted.filter(t => !hasMetrics(t));

  const totals = {
    posts:     posted.filter(t => t.contentType === 'POST').length,
    reels:     posted.filter(t => t.contentType === 'REEL').length,
    stories:   posted.filter(t => t.contentType === 'STORY').length,
    carousels: posted.filter(t => t.contentType === 'CAROUSEL').length,
    views:     withMetrics.reduce((s,t) => s+(t.reporting?.metrics?.views    ?? 0), 0),
    reach:     withMetrics.reduce((s,t) => s+(t.reporting?.metrics?.reach    ?? 0), 0),
    likes:     withMetrics.reduce((s,t) => s+(t.reporting?.metrics?.likes    ?? 0), 0),
    comments:  withMetrics.reduce((s,t) => s+(t.reporting?.metrics?.comments ?? 0), 0),
    shares:    withMetrics.reduce((s,t) => s+(t.reporting?.metrics?.shares   ?? 0), 0),
    saves:     withMetrics.reduce((s,t) => s+(t.reporting?.metrics?.saves    ?? 0), 0),
  };
  const others  = posted.length - totals.posts - totals.reels - totals.stories - totals.carousels;
  const avgEng  = withMetrics.length > 0
    ? withMetrics.reduce((s,t) => s+(t.reporting?.metrics?.engagementRate ?? 0), 0) / withMetrics.length
    : null;
  const top3    = [...withMetrics]
    .sort((a,b) => (b.reporting?.metrics?.views ?? 0) - (a.reporting?.metrics?.views ?? 0))
    .slice(0, 3);

  let pageNum = 1;
  let secNum  = 0;

  // ─── Shared drawing helpers ──────────────────────────────────────────────────
  function runningHeader() {
    doc.setFillColor(8, 8, 8);
    doc.rect(0, 0, PW, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('HORIZONTE  DIGITAL  GROUP', M, 6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(170, 170, 170);
    doc.text(`${client.name.toUpperCase()}  —  ${monthLabel}`, PW - M, 6.8, { align: 'right' });
  }

  function pageFooter() {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(185, 185, 185);
    doc.text(`Horizonte Digital Group  ·  Confidential  ·  ${pageNum}`, PW / 2, PH - 5, { align: 'center' });
  }

  function rule(y: number, color = 220) {
    doc.setDrawColor(color, color, color);
    doc.setLineWidth(0.2);
    doc.line(M, y, PW - M, y);
  }

  function heavyRule(y: number) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(M, y, PW - M, y);
  }

  function sectionLabel(num: number, title: string, y: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(170, 170, 170);
    doc.text(`0${num}  /  ${title}`, M, y);
    heavyRule(y + 3);
    return y + 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════════

  // Full black background
  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, PW, PH, 'F');

  // ── Agency name row ──
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('H O R I Z O N T E   D I G I T A L   G R O U P', M, 24);

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(M, 27, PW - M, 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('S O C I A L   M E D I A   M O N T H L Y   P E R F O R M A N C E   R E P O R T', M, 33.5);

  // ── Client name — hero ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(40);
  doc.setTextColor(255, 255, 255);
  const nameLines = doc.splitTextToSize(client.name.toUpperCase(), UW) as string[];
  doc.text(nameLines, M, 100);

  // Month below name
  const nameBottomY = 100 + (nameLines.length - 1) * 17;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(15);
  doc.setTextColor(160, 160, 160);
  doc.text(monthLabel.toUpperCase(), M, nameBottomY + 14);

  // ── Bottom section ──
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.3);
  doc.line(M, PH - 55, PW - M, PH - 55);

  // Board
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('B O A R D', M, PH - 48);
  doc.setFontSize(8.5);
  doc.setTextColor(210, 210, 210);
  doc.text(board.title, M, PH - 42);

  // Date (right-aligned)
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('P R E P A R E D', PW - M, PH - 48, { align: 'right' });
  doc.setFontSize(8.5);
  doc.setTextColor(210, 210, 210);
  doc.text(generatedDate, PW - M, PH - 42, { align: 'right' });

  doc.setDrawColor(35, 35, 35);
  doc.setLineWidth(0.25);
  doc.line(M, PH - 18, PW - M, PH - 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(70, 70, 70);
  doc.text(
    'CONFIDENTIAL  —  THIS DOCUMENT IS PREPARED EXCLUSIVELY FOR THE NAMED CLIENT',
    PW / 2, PH - 11.5, { align: 'center' }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — PERFORMANCE OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage(); pageNum = 2;
  runningHeader(); pageFooter();

  secNum++;
  let y = sectionLabel(secNum, 'PERFORMANCE OVERVIEW', 20);

  // ── TOTAL VIEWS hero stat ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text('T O T A L   V I E W S', M, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(56);
  doc.setTextColor(0, 0, 0);
  doc.text(fmt(totals.views), M, y + 26);
  y += 38;

  rule(y); y += 8;

  // ── Secondary stats — 3+3 in two rows ──
  const sc = UW / 3; // 60.67mm per column
  const secondaries = [
    { l: 'T O T A L   R E A C H',    v: fmt(totals.reach) },
    { l: 'T O T A L   L I K E S',    v: fmt(totals.likes) },
    { l: 'T O T A L   C O M M E N T S', v: fmt(totals.comments) },
    { l: 'T O T A L   S H A R E S',  v: fmt(totals.shares) },
    { l: 'T O T A L   S A V E S',    v: fmt(totals.saves) },
    { l: 'A V G   E N G A G E M E N T', v: avgEng !== null ? fmtPct(avgEng) : '—' },
  ];

  [0, 3].forEach((offset, rowIdx) => {
    const rowY = y + rowIdx * 26;
    secondaries.slice(offset, offset + 3).forEach((s, i) => {
      const sx = M + i * sc;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(0, 0, 0);
      doc.text(s.v, sx, rowY + 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(145, 145, 145);
      doc.text(s.l, sx, rowY + 17);
      if (i < 2) {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.15);
        doc.line(sx + sc, rowY, sx + sc, rowY + 20);
      }
    });
    if (rowIdx === 0) { rule(y + 22); }
  });
  y += 54;

  // ── Content type breakdown ──
  rule(y); y += 6;

  const breakdown = [
    { l: 'PUBLISHED', v: posted.length },
    { l: 'POSTS',     v: totals.posts },
    { l: 'REELS',     v: totals.reels },
    { l: 'STORIES',   v: totals.stories },
    { l: 'CAROUSELS', v: totals.carousels },
    { l: 'OTHER',     v: others },
  ];
  const bc = UW / 6;
  breakdown.forEach((b, i) => {
    const bx = M + i * bc;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(String(b.v), bx + bc / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 140, 140);
    doc.text(b.l, bx + bc / 2, y + 14, { align: 'center' });
    if (i > 0) {
      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.15);
      doc.line(bx, y, bx, y + 17);
    }
  });
  y += 21; rule(y); y += 10;

  // Missing insights warning (if any)
  if (missing.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Note: ${missing.length} published content piece${missing.length !== 1 ? 's' : ''} ${missing.length !== 1 ? 'are' : 'is'} missing performance insights.`, M, y);
    y += 7;
  }

  // ── Narrative paragraph ──
  const narrative =
    `During ${monthLabel}, content published for ${client.name} generated a total of ` +
    `${fmt(totals.views)} views and ${fmt(totals.reach)} accounts reached. The combined engagement ` +
    `included ${fmt(totals.likes)} likes, ${fmt(totals.comments)} comments, ${fmt(totals.shares)} ` +
    `shares, and ${fmt(totals.saves)} saves.` +
    (avgEng !== null ? ` The average engagement rate across all reported content was ${fmtPct(avgEng)}.` : '');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(45, 45, 45);
  const nLines = doc.splitTextToSize(narrative, UW) as string[];
  doc.text(nLines, M, y);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3+ — PUBLISHED CONTENT TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage(); pageNum = 3;
  runningHeader();

  secNum++;
  y = sectionLabel(secNum, 'PUBLISHED CONTENT', 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${posted.length} content piece${posted.length !== 1 ? 's' : ''} published in ${monthLabel}`,
    M, y
  );
  y += 7;

  const sortedPosted = [...posted].sort((a, b) =>
    (a.postedDate ? new Date(a.postedDate).getTime() : 0) -
    (b.postedDate ? new Date(b.postedDate).getTime() : 0)
  );

  const tableRows = sortedPosted.map((t, idx) => {
    const m  = t.reporting?.metrics;
    const hm = hasMetrics(t);
    return [
      idx + 1,
      fmtDate(t.postedDate),
      t.title,
      t.contentType ?? '—',
      hm ? fmt(m?.views)    : '—',
      hm ? fmt(m?.reach)    : '—',
      hm ? fmt(m?.likes)    : '—',
      hm ? fmt(m?.comments) : '—',
      hm ? fmt(m?.shares)   : '—',
      hm ? fmt(m?.saves)    : '—',
      hm && m?.engagementRate !== undefined ? fmtPct(m.engagementRate) : '—',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Posted Date', 'Content Title', 'Type', 'Views', 'Reach', 'Likes', 'Comm.', 'Shares', 'Saves', 'Eng.%']],
    body: tableRows,
    styles: { font: 'helvetica', fontSize: 7, textColor: [30, 30, 30], cellPadding: 3 },
    headStyles: {
      fillColor: [8, 8, 8],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0:  { cellWidth: 6,  halign: 'center', fontStyle: 'bold' },
      1:  { cellWidth: 21 },
      2:  { cellWidth: 49 },
      3:  { cellWidth: 14 },
      4:  { cellWidth: 16, halign: 'right' },
      5:  { cellWidth: 16, halign: 'right' },
      6:  { cellWidth: 13, halign: 'right' },
      7:  { cellWidth: 13, halign: 'right' },
      8:  { cellWidth: 13, halign: 'right' },
      9:  { cellWidth: 13, halign: 'right' },
      10: { cellWidth: 14, halign: 'right' },
    },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.08,
    margin: { left: M, right: M, top: 14 },
    showHead: 'everyPage',
    didDrawPage: (data: { pageNumber: number }) => {
      if (data.pageNumber > 1) {
        pageNum++;
        runningHeader();
      }
      pageFooter();
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOP PERFORMERS PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  if (top3.length > 0) {
    doc.addPage(); pageNum++;
    runningHeader(); pageFooter();

    secNum++;
    y = sectionLabel(secNum, 'TOP PERFORMING CONTENT', 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Best performing content pieces by total views.', M, y);
    y += 10;

    // 3 columns
    const cardGap = 5;
    const cardW   = (UW - cardGap * (top3.length - 1)) / top3.length;
    const cardH   = 72;

    top3.forEach((t, i) => {
      const m  = t.reporting?.metrics;
      const cx = M + i * (cardW + cardGap);
      const cy = y;

      // Card outer border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(cx, cy, cardW, cardH);

      // Top accent — full black strip
      doc.setFillColor(8, 8, 8);
      doc.rect(cx, cy, cardW, 10, 'F');

      // Rank + label in black strip
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(`0${i + 1}`, cx + 3, cy + 6.8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(170, 170, 170);
      doc.text(
        ['TOP PERFORMER', 'SECOND PLACE', 'THIRD PLACE'][i],
        cx + cardW - 3, cy + 6.8, { align: 'right' }
      );

      // Content type badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(130, 130, 130);
      doc.text((t.contentType ?? 'CONTENT').toUpperCase(), cx + 3, cy + 16.5);

      // Content title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const titleLines = doc.splitTextToSize(t.title, cardW - 6) as string[];
      doc.text(titleLines.slice(0, 2), cx + 3, cy + 22);

      // Posted date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(150, 150, 150);
      doc.text(fmtDate(t.postedDate), cx + 3, cy + 33);

      // Divider
      doc.setDrawColor(215, 215, 215);
      doc.setLineWidth(0.2);
      doc.line(cx + 3, cy + 37, cx + cardW - 3, cy + 37);

      // Big view count
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text('V I E W S', cx + 3, cy + 43.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(fmt(m?.views), cx + 3, cy + 53);

      // Bottom row — Reach + Eng%
      doc.setDrawColor(215, 215, 215);
      doc.setLineWidth(0.2);
      doc.line(cx + 3, cy + 57, cx + cardW - 3, cy + 57);

      const half = (cardW - 6) / 2;
      [
        { l: 'REACH', v: fmt(m?.reach) },
        { l: 'ENG. RATE', v: fmtPct(m?.engagementRate) },
      ].forEach((s, si) => {
        const sx = cx + 3 + si * half;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(s.v, sx, cy + 64);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(140, 140, 140);
        doc.text(s.l, sx, cy + 69);
        if (si === 0) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.15);
          doc.line(sx + half, cy + 58, sx + half, cy + 71);
        }
      });
    });

    y += cardH + 14;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MISSING INSIGHTS PAGE (if any)
  // ═══════════════════════════════════════════════════════════════════════════
  if (missing.length > 0) {
    doc.addPage(); pageNum++;
    runningHeader(); pageFooter();

    secNum++;
    y = sectionLabel(secNum, 'MISSING PERFORMANCE INSIGHTS', 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    const missTxt =
      `${missing.length} published content piece${missing.length !== 1 ? 's' : ''} ` +
      `${missing.length !== 1 ? 'are' : 'is'} missing performance data. ` +
      `Please add insights in the system to complete this report.`;
    const missLines = doc.splitTextToSize(missTxt, UW) as string[];
    doc.text(missLines, M, y);
    y += missLines.length * 5.2 + 7;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Content Title', 'Type', 'Posted Date', 'Report Due']],
      body: missing.map((t, idx) => [
        idx + 1,
        t.title,
        t.contentType ?? '—',
        fmtDate(t.postedDate),
        t.reporting?.reportDueAt ? fmtDate(t.reporting.reportDueAt) : '—',
      ]),
      styles: { fontSize: 8, textColor: [30, 30, 30], cellPadding: 3.5 },
      headStyles: {
        fillColor: [8, 8, 8],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        lineWidth: 0,
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 82 },
        2: { cellWidth: 24 },
        3: { cellWidth: 34 },
        4: { cellWidth: 34 },
      },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.08,
      margin: { left: M, right: M, top: 14 },
      didDrawPage: () => { pageFooter(); },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL PAGE — REPORT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage(); pageNum++;
  runningHeader(); pageFooter();

  secNum++;
  y = sectionLabel(secNum, 'REPORT SUMMARY', 20);

  const completionRate = posted.length > 0
    ? Math.round((withMetrics.length / posted.length) * 100) : 0;

  const summaryText =
    `This report summarizes the monthly social media performance for ${client.name} ` +
    `during ${monthLabel}. The statistics presented are based on published content and ` +
    `performance insights recorded by Horizonte Digital Group.\n\n` +
    `A total of ${posted.length} content piece${posted.length !== 1 ? 's' : ''} ` +
    `${posted.length !== 1 ? 'were' : 'was'} published during this period, generating ` +
    `${fmt(totals.views)} total views and ${fmt(totals.reach)} in reach. ` +
    `Performance insights are complete for ${withMetrics.length} of ${posted.length} items, ` +
    `representing an insight completion rate of ${completionRate}%.\n\n` +
    (missing.length > 0
      ? `${missing.length} published item${missing.length !== 1 ? 's' : ''} ` +
        `${missing.length !== 1 ? 'are' : 'is'} still missing performance data. ` +
        `Please ensure all insights are submitted to finalize the monthly report.`
      : `All published content has complete performance insights for this reporting period.`);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const sumLines = doc.splitTextToSize(summaryText, UW) as string[];
  doc.text(sumLines, M, y);
  y += sumLines.length * 5.5 + 20;

  // Signature block
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + 70, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Horizonte Digital Group', M, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Report prepared for: ${client.name}`, M, y + 6);
  doc.text(`Reporting period: ${monthLabel}`, M, y + 12);
  doc.text(`Date issued: ${generatedDate}`, M, y + 18);

  // ── Save ──
  const safeName  = client.name.replace(/[^a-zA-Z0-9]/g, '_');
  const safeMonth = monthLabel.replace(/\s+/g, '_');
  doc.save(`Horizonte_Digital_Group_${safeName}_${safeMonth}_Report.pdf`);
}
