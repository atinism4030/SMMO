/**
 * EN/SQ strings for the Monthly Report PDF (see '@/lib/monthlyReportPDF').
 * Kept separate from '@/lib/pdfTranslations' (used by the per-board PDF and
 * offer/agreement documents) so this new report has no risk of touching that
 * working, unrelated system — SMMO's two required app languages are EN/SQ
 * (see the Language setting), not the EN/SQ/MK set those documents support.
 */
export type ReportPdfLang = 'en' | 'sq';

export interface MonthlyReportPdfStrings {
  agencyName: string;
  reportTitle: string;
  client: string;
  month: string;
  generatedDate: string;
  preparedFor: string;
  confidential: string;
  monthlySummary: string;
  contentDelivered: string;
  totalPlanned: string;
  totalPosted: string;
  notCompleted: string;
  posts: string;
  reels: string;
  stories: string;
  other: string;
  completedShoots: string;
  performanceOverview: string;
  followersStart: string;
  followersEnd: string;
  totalReach: string;
  totalViews: string;
  profileVisits: string;
  engagementRate: string;
  facebookReach: string;
  tiktokViews: string;
  noMetricsProvided: string;
  highlights: string;
  bestPerforming: string;
  observations: string;
  recommendations: string;
  nextMonthPlan: string;
  noneProvided: string;
  summaryFallback: (client: string, month: string, posted: number, planned: number) => string;
}

const en: MonthlyReportPdfStrings = {
  agencyName: 'Horizonte Digital Group',
  reportTitle: 'Monthly Performance Report',
  client: 'Client',
  month: 'Month',
  generatedDate: 'Generated',
  preparedFor: 'Prepared for',
  confidential: 'CONFIDENTIAL — PREPARED EXCLUSIVELY FOR THE NAMED CLIENT',
  monthlySummary: 'Monthly Summary',
  contentDelivered: 'Content Delivered',
  totalPlanned: 'Planned',
  totalPosted: 'Posted',
  notCompleted: 'Not Completed',
  posts: 'Posts',
  reels: 'Reels',
  stories: 'Stories',
  other: 'Other',
  completedShoots: 'Completed Shoots',
  performanceOverview: 'Performance Overview',
  followersStart: 'Followers (Start)',
  followersEnd: 'Followers (End)',
  totalReach: 'Total Reach',
  totalViews: 'Total Views',
  profileVisits: 'Profile Visits',
  engagementRate: 'Engagement Rate',
  facebookReach: 'Facebook Reach',
  tiktokViews: 'TikTok Views',
  noMetricsProvided: 'No performance metrics were entered for this month.',
  highlights: 'Highlights',
  bestPerforming: 'Best Performing Content',
  observations: 'Observations',
  recommendations: 'Recommendations',
  nextMonthPlan: 'Next Month Plan',
  noneProvided: 'None provided.',
  summaryFallback: (client, month, posted, planned) =>
    `This report summarizes the social media activity for ${client} during ${month}. ${posted} of ${planned} planned content item${planned === 1 ? '' : 's'} were published this month.`,
};

const sq: MonthlyReportPdfStrings = {
  agencyName: 'Horizonte Digital Group',
  reportTitle: 'Raporti Mujor i Performancës',
  client: 'Klienti',
  month: 'Muaji',
  generatedDate: 'Gjeneruar më',
  preparedFor: 'Përgatitur për',
  confidential: 'KONFIDENCIALE — PËRGATITUR EKSKLUZIVISHT PËR KLIENTIN E EMËRTUAR',
  monthlySummary: 'Përmbledhje Mujore',
  contentDelivered: 'Përmbajtja e Realizuar',
  totalPlanned: 'Planifikuar',
  totalPosted: 'Publikuar',
  notCompleted: 'Pa Përfunduar',
  posts: 'Postime',
  reels: 'Reels',
  stories: 'Storie',
  other: 'Tjetër',
  completedShoots: 'Xhirime të Përfunduara',
  performanceOverview: 'Pasqyra e Performancës',
  followersStart: 'Ndjekës (Fillim)',
  followersEnd: 'Ndjekës (Fund)',
  totalReach: 'Arritja Totale',
  totalViews: 'Shikimet Totale',
  profileVisits: 'Vizita në Profil',
  engagementRate: 'Shkalla e Angazhimit',
  facebookReach: 'Arritja në Facebook',
  tiktokViews: 'Shikimet në TikTok',
  noMetricsProvided: 'Nuk u vendosën të dhëna performance për këtë muaj.',
  highlights: 'Pikat Kryesore',
  bestPerforming: 'Përmbajtja më e Suksesshme',
  observations: 'Vërejtje',
  recommendations: 'Rekomandime',
  nextMonthPlan: 'Plani për Muajin e Ardhshëm',
  noneProvided: 'Nuk është dhënë asnjë informacion.',
  summaryFallback: (client, month, posted, planned) =>
    `Ky raport përmbledh aktivitetin në rrjetet sociale për ${client} gjatë muajit ${month}. ${posted} nga ${planned} përmbajtje${planned === 1 ? '' : ''} të planifikuara u publikuan këtë muaj.`,
};

export function getMonthlyReportStrings(lang: ReportPdfLang): MonthlyReportPdfStrings {
  return lang === 'sq' ? sq : en;
}
