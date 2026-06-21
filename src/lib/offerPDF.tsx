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

export interface OfferData {
  clientName: string;
  contactPerson?: string;
  date: string;
  packageName: string;
  posts: number;
  reels: number;
  stories: number;
  photoshoots: number;
  videoProduction: number;
  droneShots: number;
  platforms: string[];
  additionalServices: string;
  realPackagePrice: number;
  offeredPrice: number;
  discountPercent: number;
  currency: string;
  boostBudget: string;
  sponsoredContent: boolean;
  durationMonths: number;
  notes: string;
  lang: DocLang;
}

const S = StyleSheet.create({
  // Cover page
  coverPage: { fontFamily: 'NotoSans', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', padding: 0 },
  coverTop: { paddingHorizontal: 52, paddingTop: 48, paddingBottom: 0 },
  coverAgency: { fontSize: 8, letterSpacing: 3.5, color: '#555555', textTransform: 'uppercase', fontWeight: 700 },
  coverMid: { flex: 1, paddingHorizontal: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  coverTitle: { fontSize: 78, fontWeight: 700, color: '#ffffff', letterSpacing: -2, lineHeight: 1 },
  coverDivider: { height: 1, backgroundColor: '#333333', marginVertical: 18, width: 80 },
  coverClientLabel: { fontSize: 8, letterSpacing: 3, color: '#555555', textTransform: 'uppercase', marginBottom: 8 },
  coverClientName: { fontSize: 28, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 },
  coverContactPerson: { fontSize: 12, color: '#888888', marginTop: 6 },
  coverDate: { fontSize: 11, color: '#666666', marginTop: 12 },
  coverBottom: { paddingHorizontal: 52, paddingBottom: 40 },
  coverTagline: { fontSize: 10, color: '#444444', letterSpacing: 0.5 },
  coverPhones: { fontSize: 10, color: '#444444', marginTop: 5, letterSpacing: 0.5 },
  confidentialBar: { backgroundColor: '#0f0f0f', paddingHorizontal: 52, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  confidentialText: { fontSize: 6.5, color: '#333333', letterSpacing: 1.5, textAlign: 'center', textTransform: 'uppercase' },

  // Content pages
  page: { fontFamily: 'NotoSans', backgroundColor: '#ffffff', paddingTop: 0, paddingBottom: 52, paddingHorizontal: 0 },
  pageHeader: { paddingHorizontal: 52, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageHeaderAgency: { fontSize: 7.5, letterSpacing: 2.5, color: '#999999', textTransform: 'uppercase' },
  pageHeaderRight: { fontSize: 7.5, color: '#cccccc', textAlign: 'right' },
  body: { paddingHorizontal: 52, paddingTop: 28 },
  section: { marginBottom: 18 },
  sectionHeader: { fontSize: 7, letterSpacing: 3, color: '#999999', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#eeeeee' },
  introText: { fontSize: 10.5, color: '#333333', lineHeight: 1.7, marginBottom: 0 },
  clauseText: { fontSize: 10, color: '#444444', lineHeight: 1.7 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f4f4f4' },
  rowLabel: { fontSize: 9.5, color: '#666666' },
  rowValue: { fontSize: 9.5, color: '#111111', fontWeight: 700, textAlign: 'right', flex: 1, marginLeft: 12 },
  contentGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  contentCell: { width: '33.33%', paddingVertical: 8, paddingRight: 12 },
  contentCellLabel: { fontSize: 7.5, color: '#aaaaaa', marginBottom: 3, letterSpacing: 0.5, textTransform: 'uppercase' },
  contentCellValue: { fontSize: 20, fontWeight: 700, color: '#111111' },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  platformTag: { backgroundColor: '#f4f4f4', borderRadius: 3, paddingHorizontal: 9, paddingVertical: 4, marginRight: 5, marginBottom: 5 },
  platformTagText: { fontSize: 8.5, color: '#444444', letterSpacing: 0.3 },
  priceSplit: { flexDirection: 'row', gap: 24 },
  priceSide: { flex: 1, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#fafafa', borderRadius: 4 },
  priceLabel: { fontSize: 7.5, color: '#aaaaaa', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  priceValueStrike: { fontSize: 11, color: '#cccccc' },
  priceValueMain: { fontSize: 18, fontWeight: 700, color: '#111111' },
  discountBadge: { backgroundColor: '#111111', borderRadius: 3, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 8 },
  discountText: { fontSize: 9, color: '#ffffff', fontWeight: 700, letterSpacing: 0.5 },
  notesBox: { backgroundColor: '#fafafa', borderRadius: 4, padding: 12, borderWidth: 1, borderColor: '#eeeeee' },
  notesText: { fontSize: 9.5, color: '#555555', lineHeight: 1.6 },
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

function OfferDocument({ data }: { data: OfferData }) {
  const s = getDocStrings(data.lang);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const contentItems = [
    { label: s.posts, value: data.posts },
    { label: s.reels, value: data.reels },
    { label: s.stories, value: data.stories },
    { label: s.photoshoots, value: data.photoshoots },
    { label: s.videoProduction, value: data.videoProduction },
    { label: s.droneShots, value: data.droneShots },
  ].filter(i => i.value > 0);

  const hasBoost = !!(data.boostBudget || data.sponsoredContent);
  const hasAdditional = !!data.additionalServices;

  return (
    <Document>
      {/* ── Cover Page ── */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverTop}>
          <Text style={S.coverAgency}>{s.agencyName}</Text>
        </View>
        <View style={S.coverMid}>
          <Text style={S.coverTitle}>{s.offerTitle}</Text>
          <View style={S.coverDivider} />
          <Text style={S.coverClientLabel}>{s.preparedFor}</Text>
          <Text style={S.coverClientName}>{data.clientName}</Text>
          {data.contactPerson ? <Text style={S.coverContactPerson}>{data.contactPerson}</Text> : null}
          <Text style={S.coverDate}>{s.date}: {data.date}</Text>
          {data.packageName ? <Text style={[S.coverDate, { marginTop: 4 }]}>{s.packageName}: {data.packageName}</Text> : null}
          <Text style={[S.coverDate, { marginTop: 4 }]}>{s.duration}: {data.durationMonths} {s.months}</Text>
        </View>
        <View style={S.coverBottom}>
          <Text style={S.coverTagline}>{s.tagline}</Text>
          <Text style={S.coverPhones}>{s.phone1} · {s.phone2}</Text>
        </View>
        <View style={S.confidentialBar}>
          <Text style={S.confidentialText}>{s.confidential}</Text>
        </View>
      </Page>

      {/* ── Content Page ── */}
      <Page size="A4" style={S.page}>
        <PageHeader s={s} doc={`${s.offerTitle} · ${data.clientName}`} />
        <View style={S.body}>

          {/* Introduction */}
          <View style={[S.section, { marginBottom: 22 }]}>
            <Text style={S.introText}>{s.offerIntro}</Text>
          </View>

          {/* Package Details */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.packageDetails}</Text>
            {data.packageName ? (
              <View style={S.row}>
                <Text style={S.rowLabel}>{s.packageName}</Text>
                <Text style={S.rowValue}>{data.packageName}</Text>
              </View>
            ) : null}
            <View style={S.row}>
              <Text style={S.rowLabel}>{s.duration}</Text>
              <Text style={S.rowValue}>{data.durationMonths} {s.months}</Text>
            </View>
            {data.platforms.length > 0 && (
              <View style={[S.row, { alignItems: 'flex-start', paddingVertical: 8 }]}>
                <Text style={S.rowLabel}>{s.platforms}</Text>
                <View style={[S.platformRow, { flex: 1, marginLeft: 12, justifyContent: 'flex-end' }]}>
                  {data.platforms.map(p => (
                    <View key={p} style={S.platformTag}>
                      <Text style={S.platformTagText}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Monthly Content */}
          {contentItems.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionHeader}>{s.contentPerMonth}</Text>
              <View style={S.contentGrid}>
                {contentItems.map(item => (
                  <View key={item.label} style={S.contentCell}>
                    <Text style={S.contentCellLabel}>{item.label}</Text>
                    <Text style={S.contentCellValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Pricing */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.pricing}</Text>
            <View style={S.priceSplit}>
              {data.realPackagePrice > 0 && (
                <View style={S.priceSide}>
                  <Text style={S.priceLabel}>{s.realPackagePrice}</Text>
                  <Text style={S.priceValueStrike}>{fmt(data.realPackagePrice)} {data.currency}</Text>
                </View>
              )}
              <View style={[S.priceSide, { backgroundColor: '#111111' }]}>
                <Text style={[S.priceLabel, { color: '#666666' }]}>{s.offeredPrice}</Text>
                <Text style={[S.priceValueMain, { color: '#ffffff' }]}>{fmt(data.offeredPrice)} {data.currency}</Text>
              </View>
            </View>
            {data.discountPercent > 0 && (
              <View style={S.discountBadge}>
                <Text style={S.discountText}>{s.discount}: {data.discountPercent.toFixed(1)}%</Text>
              </View>
            )}
          </View>

          {/* Services Included / Additional */}
          {(hasAdditional || hasBoost) && (
            <View style={S.section}>
              <Text style={S.sectionHeader}>{s.servicesHeading}</Text>
              {hasBoost && (
                <>
                  {data.boostBudget ? (
                    <View style={S.row}>
                      <Text style={S.rowLabel}>{s.boostBudget}</Text>
                      <Text style={S.rowValue}>{data.boostBudget}</Text>
                    </View>
                  ) : null}
                  <View style={S.row}>
                    <Text style={S.rowLabel}>{s.sponsoredContent}</Text>
                    <Text style={S.rowValue}>{data.sponsoredContent ? s.yes : s.no}</Text>
                  </View>
                </>
              )}
              {hasAdditional && (
                <View style={[S.notesBox, { marginTop: hasBoost ? 10 : 0 }]}>
                  <Text style={S.notesText}>{data.additionalServices}</Text>
                </View>
              )}
            </View>
          )}

          {/* Purpose of Cooperation */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.purposeHeading}</Text>
            <Text style={S.clauseText}>{s.purposeBody}</Text>
          </View>

          {/* Boost Section (if boost exists, show details paragraph) */}
          {hasBoost && (
            <View style={S.section}>
              <Text style={S.sectionHeader}>{s.boostHeading}</Text>
              <Text style={S.clauseText}>{s.boostBody}</Text>
            </View>
          )}

          {/* Notes */}
          {data.notes ? (
            <View style={S.section}>
              <Text style={S.sectionHeader}>{s.notes}</Text>
              <View style={S.notesBox}>
                <Text style={S.notesText}>{data.notes}</Text>
              </View>
            </View>
          ) : null}

          {/* Validity */}
          <View style={S.section}>
            <Text style={S.sectionHeader}>{s.validityHeading}</Text>
            <Text style={S.clauseText}>{s.validityBody}</Text>
          </View>

        </View>
        <Footer s={s} />
      </Page>
    </Document>
  );
}

export async function generateOfferPDF(data: OfferData): Promise<void> {
  const blob = await pdf(<OfferDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = data.clientName.replace(/[^a-zA-Z0-9]/g, '-');
  a.href = url;
  a.download = `offer-${safeName}-${data.date.replace(/[^0-9]/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
