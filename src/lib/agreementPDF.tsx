import React from 'react';
import { Document, Page, View, Text, Font, pdf, StyleSheet } from '@react-pdf/renderer';
import { getDocStrings } from './documentTranslations';
import type { DocLang } from '@/types';

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/noto-sans-regular.ttf', fontWeight: 400 },
    { src: '/fonts/noto-sans-bold.ttf', fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback(word => [word]);

export interface AgreementData {
  clientName: string;
  contactPerson?: string;
  agreementDate: string;
  startDate: string;
  durationMonths: number;
  platforms: string[];
  postsMin: number;
  postsMax: number;
  reelsMin: number;
  reelsMax: number;
  storiesMin: number;
  storiesMax: number;
  photoshoots: number;
  videoProduction: number;
  droneShots: number;
  additionalServices: string;
  boostBudget: string;
  monthlyPrice: number;
  currency: string;
  terminationNoticeDays: number;
  governingLaw: string;
  lang: DocLang;
}

const S = StyleSheet.create({
  // Cover page
  coverPage: { fontFamily: 'NotoSans', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', padding: 0 },
  coverTop: { paddingHorizontal: 52, paddingTop: 48, paddingBottom: 0 },
  coverAgency: { fontSize: 8, letterSpacing: 3.5, color: '#555555', textTransform: 'uppercase', fontWeight: 700 },
  coverMid: { flex: 1, paddingHorizontal: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  coverTitle: { fontSize: 38, fontWeight: 700, color: '#ffffff', letterSpacing: -0.5, lineHeight: 1.15 },
  coverDivider: { height: 1, backgroundColor: '#333333', marginVertical: 20, width: 80 },
  coverClientLabel: { fontSize: 8, letterSpacing: 3, color: '#555555', textTransform: 'uppercase', marginBottom: 8 },
  coverClientName: { fontSize: 28, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 },
  coverDetail: { fontSize: 11, color: '#666666', marginTop: 7 },
  coverBottom: { paddingHorizontal: 52, paddingBottom: 40 },
  coverTagline: { fontSize: 10, color: '#444444', letterSpacing: 0.5 },
  coverPhones: { fontSize: 10, color: '#444444', marginTop: 5, letterSpacing: 0.5 },
  confidentialBar: { backgroundColor: '#0f0f0f', paddingHorizontal: 52, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  confidentialText: { fontSize: 6.5, color: '#333333', letterSpacing: 1.5, textAlign: 'center', textTransform: 'uppercase' },

  // Content pages
  page: { fontFamily: 'NotoSans', backgroundColor: '#ffffff', paddingTop: 0, paddingBottom: 56, paddingHorizontal: 0 },
  pageHeader: { paddingHorizontal: 52, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageHeaderAgency: { fontSize: 7.5, letterSpacing: 2.5, color: '#999999', textTransform: 'uppercase' },
  pageHeaderRight: { fontSize: 7.5, color: '#cccccc' },
  body: { paddingHorizontal: 52, paddingTop: 24 },
  section: { marginBottom: 16 },
  sectionHeader: { fontSize: 7, letterSpacing: 3, color: '#999999', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eeeeee' },
  clauseText: { fontSize: 10, color: '#444444', lineHeight: 1.7 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f4f4f4' },
  rowLabel: { fontSize: 9.5, color: '#666666', flex: 1 },
  rowValue: { fontSize: 9.5, color: '#111111', fontWeight: 700, textAlign: 'right' },

  // Parties
  partiesGrid: { flexDirection: 'row', gap: 20 },
  partyBlock: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fafafa', borderRadius: 4, borderWidth: 1, borderColor: '#eeeeee' },
  partyLabel: { fontSize: 7, color: '#aaaaaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 },
  partyName: { fontSize: 12, fontWeight: 700, color: '#111111', lineHeight: 1.3 },
  partyDetail: { fontSize: 9.5, color: '#666666', marginTop: 3 },

  // Content plan table
  table: { borderWidth: 1, borderColor: '#eeeeee', borderRadius: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#111111', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 3 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f4f4f4' },
  tableLastRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 7 },
  colType: { flex: 2, fontSize: 8, color: '#ffffff', fontWeight: 700, letterSpacing: 0.5 },
  colNum: { flex: 1, fontSize: 8, color: '#aaaaaa', fontWeight: 700, textAlign: 'center' },
  colTypeVal: { flex: 2, fontSize: 10, color: '#111111' },
  colNumVal: { flex: 1, fontSize: 10, color: '#333333', textAlign: 'center', fontWeight: 700 },

  // Platforms
  platformRow: { flexDirection: 'row', flexWrap: 'wrap' },
  platformTag: { backgroundColor: '#f4f4f4', borderRadius: 3, paddingHorizontal: 9, paddingVertical: 4, marginRight: 5, marginBottom: 5 },
  platformTagText: { fontSize: 8.5, color: '#444444' },

  // Pricing
  priceBox: { backgroundColor: '#111111', borderRadius: 4, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceBoxLabel: { fontSize: 10, color: '#888888' },
  priceBoxValue: { fontSize: 22, fontWeight: 700, color: '#ffffff' },

  // Signatures
  sigGrid: { flexDirection: 'row', gap: 24 },
  sigBlock: { flex: 1 },
  sigLine: { height: 1, backgroundColor: '#111111', marginBottom: 8 },
  sigLabel: { fontSize: 8, color: '#888888', letterSpacing: 0.5, marginBottom: 20 },
  sigName: { fontSize: 10, fontWeight: 700, color: '#111111' },
  sigDateRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sigDateLabel: { fontSize: 8, color: '#aaaaaa' },
  sigDateLine: { flex: 1, height: 1, backgroundColor: '#dddddd' },

  // Notes box
  notesBox: { backgroundColor: '#fafafa', borderRadius: 4, padding: 10, borderWidth: 1, borderColor: '#eeeeee' },
  notesText: { fontSize: 9.5, color: '#555555', lineHeight: 1.6 },

  // Legal note
  legalBox: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#eeeeee' },
  legalText: { fontSize: 8.5, color: '#888888', lineHeight: 1.6 },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingHorizontal: 52, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { fontSize: 7.5, color: '#bbbbbb', letterSpacing: 0.3 },
  footerRight: { fontSize: 7.5, color: '#bbbbbb', textAlign: 'right', letterSpacing: 0.3 },
});

function PageHeader({ s, doc }: { s: ReturnType<typeof getDocStrings>; doc: string }) {
  return (
    <View style={S.pageHeader} fixed>
      <Text style={S.pageHeaderAgency}>{s.agencyName}</Text>
      <Text style={S.pageHeaderRight}>{doc}</Text>
    </View>
  );
}

function Footer({ s }: { s: ReturnType<typeof getDocStrings> }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerLeft}>{s.agencyName} · {s.tagline}</Text>
      <Text style={S.footerRight}>{s.phone1} · {s.phone2}</Text>
    </View>
  );
}

function AgreementDocument({ data }: { data: AgreementData }) {
  const s = getDocStrings(data.lang);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const contentRows = [
    { label: s.posts, min: data.postsMin, max: data.postsMax },
    { label: s.reels, min: data.reelsMin, max: data.reelsMax },
    { label: s.stories, min: data.storiesMin, max: data.storiesMax },
  ].filter(r => r.max > 0);

  const fixedRows = [
    { label: s.photoshoots, value: data.photoshoots },
    { label: s.videoProduction, value: data.videoProduction },
    { label: s.droneShots, value: data.droneShots },
  ].filter(r => r.value > 0);

  const allRows = [
    ...contentRows.map(r => ({ label: r.label, min: r.min, max: r.max })),
    ...fixedRows.map(r => ({ label: r.label, min: r.value, max: r.value })),
  ];

  const termBody = s.sec9Body.replace('{days}', String(data.terminationNoticeDays));
  const hasContent = allRows.length > 0;
  const hasBoost = !!data.boostBudget;
  const hasAdditional = !!data.additionalServices;

  return (
    <Document>
      {/* ── Cover Page ── */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverTop}>
          <Text style={S.coverAgency}>{s.agencyName}</Text>
        </View>
        <View style={S.coverMid}>
          <Text style={S.coverTitle}>{s.agreementTitle}</Text>
          <View style={S.coverDivider} />
          <Text style={S.coverClientLabel}>{s.client}</Text>
          <Text style={S.coverClientName}>{data.clientName}</Text>
          {data.contactPerson ? <Text style={S.coverDetail}>{data.contactPerson}</Text> : null}
          <Text style={S.coverDetail}>{s.agreementDate}: {data.agreementDate}</Text>
          <Text style={S.coverDetail}>{s.startDate}: {data.startDate}</Text>
          <Text style={S.coverDetail}>{s.duration}: {data.durationMonths} {s.months}</Text>
        </View>
        <View style={S.coverBottom}>
          <Text style={S.coverTagline}>{s.tagline}</Text>
          <Text style={S.coverPhones}>{s.phone1} · {s.phone2}</Text>
        </View>
        <View style={S.confidentialBar}>
          <Text style={S.confidentialText}>{s.confidential}</Text>
        </View>
      </Page>

      {/* ── Agreement Content ── */}
      <Page size="A4" style={S.page}>
        <PageHeader s={s} doc={`${s.agreementTitle} · ${data.clientName}`} />
        <View style={S.body}>

          {/* Parties */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.parties}</Text>
            <View style={S.partiesGrid}>
              <View style={S.partyBlock}>
                <Text style={S.partyLabel}>{s.serviceProvider}</Text>
                <Text style={S.partyName}>{s.agencyName}</Text>
                <Text style={S.partyDetail}>{s.phone1} · {s.phone2}</Text>
              </View>
              <View style={S.partyBlock}>
                <Text style={S.partyLabel}>{s.client}</Text>
                <Text style={S.partyName}>{data.clientName}</Text>
                {data.contactPerson ? <Text style={S.partyDetail}>{data.contactPerson}</Text> : null}
              </View>
            </View>
          </View>

          {/* Section 1 — Purpose */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.sec1Heading}</Text>
            <Text style={S.clauseText}>{s.sec1Body}</Text>
          </View>

          {/* Section 2 — Platforms */}
          {data.platforms.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionHeader}>{s.sec2Heading}</Text>
              <View style={S.platformRow}>
                {data.platforms.map(p => (
                  <View key={p} style={S.platformTag}>
                    <Text style={S.platformTagText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Section 3 — Monthly Content Plan */}
          {hasContent && (
            <View style={S.section}>
              <Text style={S.sectionHeader}>{s.sec3Heading}</Text>
              <View style={S.table}>
                <View style={S.tableHeader}>
                  <Text style={S.colType}>{s.contentPlan}</Text>
                  <Text style={S.colNum}>{s.perMonthMin}</Text>
                  <Text style={S.colNum}>{s.perMonthMax}</Text>
                </View>
                {allRows.map((r, i) => (
                  <View key={r.label} style={i < allRows.length - 1 ? S.tableRow : S.tableLastRow}>
                    <Text style={S.colTypeVal}>{r.label}</Text>
                    <Text style={S.colNumVal}>{r.min}</Text>
                    <Text style={S.colNumVal}>{r.max}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Section 4 — Boost & Advertising */}
          {hasBoost && (
            <View style={S.section}>
              <Text style={S.sectionHeader}>{s.sec4Heading}</Text>
              <Text style={S.clauseText}>{s.sec4Body}</Text>
              <View style={[S.row, { marginTop: 8 }]}>
                <Text style={S.rowLabel}>{s.boostBudget}</Text>
                <Text style={S.rowValue}>{data.boostBudget}</Text>
              </View>
            </View>
          )}

          {/* Section 5 — Content Flexibility */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.sec5Heading}</Text>
            <Text style={S.clauseText}>{s.sec5Body}</Text>
          </View>

          {/* Additional Services */}
          {hasAdditional && (
            <View style={S.section}>
              <Text style={S.sectionHeader}>{s.additionalServices}</Text>
              <View style={S.notesBox}>
                <Text style={S.notesText}>{data.additionalServices}</Text>
              </View>
            </View>
          )}

          {/* Section 6 — Service Fee */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.sec6Heading}</Text>
            <View style={S.priceBox}>
              <Text style={S.priceBoxLabel}>{s.monthlyPrice}</Text>
              <Text style={S.priceBoxValue}>{fmt(data.monthlyPrice)} {data.currency}</Text>
            </View>
          </View>

          {/* Section 7 — Performance Reporting */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.sec7Heading}</Text>
            <Text style={S.clauseText}>{s.sec7Body}</Text>
          </View>

          {/* Section 8 — Duration */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.sec8Heading}</Text>
            <View style={S.row}>
              <Text style={S.rowLabel}>{s.startDate}</Text>
              <Text style={S.rowValue}>{data.startDate}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.rowLabel}>{s.duration}</Text>
              <Text style={S.rowValue}>{data.durationMonths} {s.months}</Text>
            </View>
          </View>

          {/* Section 9 — Termination */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.sec9Heading}</Text>
            <Text style={S.clauseText}>{termBody}</Text>
            <View style={[S.row, { marginTop: 8 }]}>
              <Text style={S.rowLabel}>{s.terminationNotice}</Text>
              <Text style={S.rowValue}>{data.terminationNoticeDays} {s.days}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.rowLabel}>{s.governingLaw}</Text>
              <Text style={S.rowValue}>{data.governingLaw}</Text>
            </View>
          </View>

          {/* Signatures */}
          <View style={[S.section, { marginTop: 28 }]}>
            <Text style={S.sectionHeader}>{s.signatures}</Text>
            <View style={S.sigGrid}>
              <View style={S.sigBlock}>
                <View style={S.sigLine} />
                <Text style={S.sigLabel}>{s.serviceProvider}</Text>
                <Text style={S.sigName}>{s.agencyName}</Text>
                <View style={S.sigDateRow}>
                  <Text style={S.sigDateLabel}>{s.date}:</Text>
                  <View style={S.sigDateLine} />
                </View>
              </View>
              <View style={S.sigBlock}>
                <View style={S.sigLine} />
                <Text style={S.sigLabel}>{s.client}</Text>
                <Text style={S.sigName}>{data.clientName}</Text>
                {data.contactPerson ? <Text style={[S.sigLabel, { marginBottom: 0, marginTop: 2 }]}>{data.contactPerson}</Text> : null}
                <View style={S.sigDateRow}>
                  <Text style={S.sigDateLabel}>{s.date}:</Text>
                  <View style={S.sigDateLine} />
                </View>
              </View>
            </View>
          </View>

          {/* Legal Note */}
          <View style={S.legalBox}>
            <Text style={S.legalText}>{s.legalNote}</Text>
          </View>

        </View>
        <Footer s={s} />
      </Page>
    </Document>
  );
}

export async function generateAgreementPDF(data: AgreementData): Promise<void> {
  const blob = await pdf(<AgreementDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = data.clientName.replace(/[^a-zA-Z0-9]/g, '-');
  a.href = url;
  a.download = `agreement-${safeName}-${data.agreementDate.replace(/[^0-9]/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
