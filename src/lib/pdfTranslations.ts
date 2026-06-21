export type PdfLang = 'en' | 'sq' | 'mk';

export interface PdfStrings {
  agencyName: string;
  reportTitle: string;
  client: string;
  month: string;
  board: string;
  generatedDate: string;
  monthlySummaryTitle: string;
  totalPublished: string;
  totalPosts: string;
  totalReels: string;
  totalStories: string;
  totalViews: string;
  totalReach: string;
  totalLikes: string;
  totalComments: string;
  totalShares: string;
  totalSaves: string;
  avgEngagement: string;
  missingInsights: string;
  publishedOverviewTitle: string;
  date: string;
  content: string;
  type: string;
  platform: string;
  views: string;
  reach: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
  engagementRate: string;
  postLink: string;
  viewPost: string;
  bestPerformingTitle: string;
  finalSummaryTitle: string;
  allInsightsComplete: string;
  someInsightsMissing: string;
  confidential: string;
  prepared: string;
  reportPreparedFor: string;
  reportingPeriod: string;
  dateIssued: string;
  contentPublishedIn: string;
  bestByViews: string;
  noLink: string;
  viewsSectionIntro: (clientName: string, totalViews: string) => string;
  execSummary: (clientName: string, monthLabel: string) => string;
  finalSummaryText: (clientName: string, monthLabel: string) => string;
  narrativeText: (
    monthLabel: string, clientName: string,
    views: string, reach: string,
    likes: string, comments: string,
    shares: string, saves: string,
    avgEng: string | null
  ) => string;
  missingNoteText: (count: number) => string;
  completionRateText: (
    postedCount: number,
    withMetricsCount: number,
    rate: number
  ) => string;
}

const en: PdfStrings = {
  agencyName: 'Horizonte Digital Group',
  reportTitle: 'Social Media Monthly Performance Report',
  client: 'Client',
  month: 'Month',
  board: 'Board',
  generatedDate: 'Generated Date',
  monthlySummaryTitle: 'Monthly Performance Summary',
  totalPublished: 'Total Published Content',
  totalPosts: 'Total Posts',
  totalReels: 'Total Reels',
  totalStories: 'Total Stories',
  totalViews: 'Total Views',
  totalReach: 'Total Reach',
  totalLikes: 'Total Likes',
  totalComments: 'Total Comments',
  totalShares: 'Total Shares',
  totalSaves: 'Total Saves',
  avgEngagement: 'Average Engagement Rate',
  missingInsights: 'Missing Insights',
  publishedOverviewTitle: 'Published Content Overview',
  date: 'Date',
  content: 'Content',
  type: 'Type',
  platform: 'Platform',
  views: 'Views',
  reach: 'Reach',
  likes: 'Likes',
  comments: 'Comments',
  shares: 'Shares',
  saves: 'Saves',
  engagementRate: 'Engagement Rate',
  postLink: 'Post Link',
  viewPost: 'View Post',
  bestPerformingTitle: 'Best Performing Content',
  finalSummaryTitle: 'Final Summary',
  allInsightsComplete: 'All published content has complete performance insights.',
  someInsightsMissing: 'Some published content is missing performance insights.',
  confidential: 'CONFIDENTIAL  —  THIS DOCUMENT IS PREPARED EXCLUSIVELY FOR THE NAMED CLIENT',
  prepared: 'PREPARED',
  reportPreparedFor: 'Report prepared for:',
  reportingPeriod: 'Reporting period:',
  dateIssued: 'Date issued:',
  contentPublishedIn: 'content piece(s) published in',
  bestByViews: 'Best performing content pieces by total views.',
  noLink: '—',
  viewsSectionIntro: (clientName, totalViews) =>
    `This month, the published content for ${clientName} generated a total of ${totalViews} views across all reported posts, reels, and stories.`,
  execSummary: (clientName, monthLabel) =>
    `This report summarizes the social media content performance for ${clientName} during ${monthLabel}. It includes published posts, reels, stories, total views, reach, engagement, and content insights collected by Horizonte Digital Group.`,
  finalSummaryText: (clientName, monthLabel) =>
    `This report summarizes the monthly social media performance for ${clientName}. The statistics are based on the content published and the insights recorded by Horizonte Digital Group during ${monthLabel}.`,
  narrativeText: (monthLabel, clientName, views, reach, likes, comments, shares, saves, avgEng) =>
    `During ${monthLabel}, content published for ${clientName} generated a total of ${views} views and ${reach} accounts reached. The combined engagement included ${likes} likes, ${comments} comments, ${shares} shares, and ${saves} saves.` +
    (avgEng ? ` The average engagement rate across all reported content was ${avgEng}.` : ''),
  missingNoteText: (count) =>
    `${count} published content piece${count !== 1 ? 's' : ''} ${count !== 1 ? 'are' : 'is'} missing performance data. Please add insights in the system to complete this report.`,
  completionRateText: (postedCount, withMetricsCount, rate) =>
    `A total of ${postedCount} content piece${postedCount !== 1 ? 's' : ''} ${postedCount !== 1 ? 'were' : 'was'} published during this period. Performance insights are complete for ${withMetricsCount} of ${postedCount} items, representing an insight completion rate of ${rate}%.`,
};

const sq: PdfStrings = {
  agencyName: 'Horizonte Digital Group',
  reportTitle: 'Raport Mujor i Performancës në Rrjete Sociale',
  client: 'Klienti',
  month: 'Muaji',
  board: 'Board-i',
  generatedDate: 'Data e Gjenerimit',
  monthlySummaryTitle: 'Përmbledhje Mujore e Performancës',
  totalPublished: 'Përmbajtje të Publikuara Gjithsej',
  totalPosts: 'Postime Gjithsej',
  totalReels: 'Reels Gjithsej',
  totalStories: 'Story Gjithsej',
  totalViews: 'Shikime Gjithsej',
  totalReach: 'Reach Gjithsej',
  totalLikes: 'Pelqime Gjithsej',
  totalComments: 'Komente Gjithsej',
  totalShares: 'Shperndarje Gjithsej',
  totalSaves: 'Ruajtje Gjithsej',
  avgEngagement: 'Mesatarja e Engagement',
  missingInsights: 'Insights qe mungojne',
  publishedOverviewTitle: 'Permbledhje e Permbajtjeve te Publikuara',
  date: 'Data',
  content: 'Permbajtja',
  type: 'Tipi',
  platform: 'Platforma',
  views: 'Shikime',
  reach: 'Reach',
  likes: 'Pelqime',
  comments: 'Komente',
  shares: 'Shperndarje',
  saves: 'Ruajtje',
  engagementRate: 'Engagement Rate',
  postLink: 'Linku i Postimit',
  viewPost: 'Shiko Postimin',
  bestPerformingTitle: 'Permbajtja me Performancen me te Mire',
  finalSummaryTitle: 'Permbledhje Finale',
  allInsightsComplete: 'Te gjitha permbajtjet e publikuara kane insights te plotësuara.',
  someInsightsMissing: 'Disa permbajtje te publikuara kane mungese te insights.',
  confidential: 'KONFIDENCIAL  —  KY DOKUMENT ESHTE PERGATITUR EKSKLUZIVISHT PER KLIENTIN E EMERTUAR',
  prepared: 'PERGATITUR',
  reportPreparedFor: 'Raport pergatitur per:',
  reportingPeriod: 'Periudha e raportimit:',
  dateIssued: 'Data e leshimit:',
  contentPublishedIn: 'permbajtje te publikuara ne',
  bestByViews: 'Permbajtjet me performancen me te mire sipas shikimeve totale.',
  noLink: '—',
  viewsSectionIntro: (clientName, totalViews) =>
    `Kete muaj, permbajtjet e publikuara per ${clientName} kane gjeneruar gjithsej ${totalViews} shikime ne postime, reels dhe story te raportuara.`,
  execSummary: (clientName, monthLabel) =>
    `Ky raport permbledh performancen e permbajtjeve ne rrjete sociale per ${clientName} gjate muajit ${monthLabel}. Ai perfshine postimet, reels, story, shikimet totale, reach, engagement dhe insights te mbledhura nga Horizonte Digital Group.`,
  finalSummaryText: (clientName, monthLabel) =>
    `Ky raport permbledh performancen mujore ne rrjete sociale per ${clientName}. Statistikat bazohen ne permbajtjet e publikuara dhe insights te regjistruara nga Horizonte Digital Group gjate muajit ${monthLabel}.`,
  narrativeText: (monthLabel, clientName, views, reach, likes, comments, shares, saves, avgEng) =>
    `Gjate ${monthLabel}, permbajtjet e publikuara per ${clientName} gjeneruan gjithsej ${views} shikime dhe ${reach} llogari te arritura. Angazhimi total perfshiu ${likes} pelqime, ${comments} komente, ${shares} shperndarje dhe ${saves} ruajtje.` +
    (avgEng ? ` Mesatarja e engagement rate per te gjithe permbajtjet e raportuara ishte ${avgEng}.` : ''),
  missingNoteText: (count) =>
    `${count} permbajtje${count !== 1 ? '' : 'je'} e publikuar${count !== 1 ? 'a' : 'e'} ${count !== 1 ? 'kane' : 'ka'} mungese te te dhenave te performances. Ju lutemi shtoni insights ne sistem per te perfunduar kete raport.`,
  completionRateText: (postedCount, withMetricsCount, rate) =>
    `Gjithsej ${postedCount} permbajtje${postedCount !== 1 ? '' : 'je'} u publikua${postedCount !== 1 ? 'n' : ''} gjate kesaj periudhe. Insights e performances jane te plota per ${withMetricsCount} nga ${postedCount} zera, duke perfaqesuar nje shkalle plotesimi te insights prej ${rate}%.`,
};

const mk: PdfStrings = {
  agencyName: 'Horizonte Digital Group',
  reportTitle: 'Месечен извештај за перформанси на социјални мрежи',
  client: 'Клиент',
  month: 'Месец',
  board: 'Табла',
  generatedDate: 'Датум на генерирање',
  monthlySummaryTitle: 'Месечен преглед на перформанси',
  totalPublished: 'Вкупно објавени содржини',
  totalPosts: 'Вкупно објави',
  totalReels: 'Вкупно риелс',
  totalStories: 'Вкупно сторис',
  totalViews: 'Вкупно прегледи',
  totalReach: 'Вкупен опфат',
  totalLikes: 'Вкупно допаѓања',
  totalComments: 'Вкупно коментари',
  totalShares: 'Вкупно споделувања',
  totalSaves: 'Вкупно зачувувања',
  avgEngagement: 'Просечен степен на ангажирање',
  missingInsights: 'Недостасуваат увиди',
  publishedOverviewTitle: 'Преглед на објавени содржини',
  date: 'Датум',
  content: 'Содржина',
  type: 'Тип',
  platform: 'Платформа',
  views: 'Прегледи',
  reach: 'Опфат',
  likes: 'Допаѓања',
  comments: 'Коментари',
  shares: 'Споделувања',
  saves: 'Зачувувања',
  engagementRate: 'Степен на ангажирање',
  postLink: 'Линк до објавата',
  viewPost: 'Погледај ја објавата',
  bestPerformingTitle: 'Најуспешни содржини',
  finalSummaryTitle: 'Финален резиме',
  allInsightsComplete: 'Сите објавени содржини имаат целосно внесени увиди.',
  someInsightsMissing: 'Некои објавени содржини немаат внесени увиди.',
  confidential: 'ДОВЕРЛИВО — ОВОЈ ДОКУМЕНТ Е ПОДГОТВЕН ИСКЛУЧИВО ЗА ИМЕНУВАНИОТ КЛИЕНТ',
  prepared: 'ПОДГОТВЕНО',
  reportPreparedFor: 'Извештај подготвен за:',
  reportingPeriod: 'Период на известување:',
  dateIssued: 'Датум на издавање:',
  contentPublishedIn: 'содржини објавени во',
  bestByViews: 'Најдобри содржини според вкупни прегледи.',
  noLink: '—',
  viewsSectionIntro: (clientName, totalViews) =>
    `Овој месец, објавените содржини за ${clientName} генерираа вкупно ${totalViews} прегледи низ сите пријавени објави, риелс и сторис.`,
  execSummary: (clientName, monthLabel) =>
    `Овој извештај ги прикажува перформансите на содржините на социјалните мрежи за ${clientName} во текот на ${monthLabel}. Вклучува објави, риелс, сторис, вкупни прегледи, опфат, ангажирање и увиди внесени од Horizonte Digital Group.`,
  finalSummaryText: (clientName, monthLabel) =>
    `Овој извештај ги прикажува месечните перформанси на социјалните мрежи за ${clientName}. Статистиките се базирани на објавените содржини и увидите внесени од Horizonte Digital Group во текот на ${monthLabel}.`,
  narrativeText: (monthLabel, clientName, views, reach, likes, comments, shares, saves, avgEng) =>
    `Во текот на ${monthLabel}, објавените содржини за ${clientName} генерираа вкупно ${views} прегледи и ${reach} достигнати сметки. Вкупното ангажирање вклучува ${likes} допаѓања, ${comments} коментари, ${shares} споделувања и ${saves} зачувувања.` +
    (avgEng ? ` Просечниот степен на ангажирање за сите пријавени содржини беше ${avgEng}.` : ''),
  missingNoteText: (count) =>
    `${count} објавени содржини немаат внесени податоци за перформанси. Ве молиме додајте увиди во системот за да го завршите извештајот.`,
  completionRateText: (postedCount, withMetricsCount, rate) =>
    `Вкупно ${postedCount} содржини беа објавени во овој период. Увидите за перформансите се целосни за ${withMetricsCount} од ${postedCount} ставки, претставувајки стапка на исполнетост на увидите од ${rate}%.`,
};

const translations: Record<PdfLang, PdfStrings> = { en, sq, mk };

export function getStrings(lang: PdfLang): PdfStrings {
  return translations[lang] ?? translations.en;
}

export const LANG_LABELS: Record<PdfLang, string> = {
  en: 'English',
  sq: 'Shqip',
  mk: 'Македонски',
};

export const LANG_CODES: Record<PdfLang, string> = {
  en: 'EN',
  sq: 'SQ',
  mk: 'MK',
};
