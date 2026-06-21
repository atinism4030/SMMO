import type { DocLang } from '@/types';

export interface DocStrings {
  // Shared
  agencyName: string;
  tagline: string;
  phone1: string;
  phone2: string;
  date: string;
  duration: string;
  months: string;
  platforms: string;
  additionalServices: string;
  notes: string;
  confidential: string;
  preparedFor: string;
  currency: string;
  included: string;
  yes: string;
  no: string;

  // Offer
  offerTitle: string;
  packageDetails: string;
  packageName: string;
  contentPerMonth: string;
  posts: string;
  reels: string;
  stories: string;
  photoshoots: string;
  videoProduction: string;
  droneShots: string;
  pricing: string;
  realPackagePrice: string;
  offeredPrice: string;
  discount: string;
  boostBudget: string;
  sponsoredContent: string;

  // Offer — professional sections
  offerIntro: string;
  purposeHeading: string;
  purposeBody: string;
  servicesHeading: string;
  boostHeading: string;
  boostBody: string;
  validityHeading: string;
  validityBody: string;

  // Agreement
  agreementTitle: string;
  agreementDate: string;
  startDate: string;
  parties: string;
  serviceProvider: string;
  client: string;
  services: string;
  contentPlan: string;
  perMonthMin: string;
  perMonthMax: string;
  pricingPayment: string;
  monthlyPrice: string;
  paymentDue: string;
  daysFromInvoice: string;
  termsConditions: string;
  terminationNotice: string;
  governingLaw: string;
  days: string;
  signatures: string;
  name: string;
  signature: string;

  // Agreement — sections 1–9 (payment terms removed; sections renumbered)
  sec1Heading: string;
  sec1Body: string;
  sec2Heading: string;
  sec3Heading: string;
  sec4Heading: string;
  sec4Body: string;
  sec5Heading: string;
  sec5Body: string;
  sec6Heading: string;
  sec7Heading: string;  // was sec8 — Performance Reporting
  sec7Body: string;
  sec8Heading: string;  // was sec9 — Duration
  sec9Heading: string;  // was sec10 — Termination
  sec9Body: string;
  legalNote: string;
}

const en: DocStrings = {
  agencyName: 'Horizonte Digital Group',
  tagline: 'Your Vision. Our Creation.',
  phone1: '070 629 606',
  phone2: '076 224 065',
  date: 'Date',
  duration: 'Duration',
  months: 'months',
  platforms: 'Platforms',
  additionalServices: 'Additional Services',
  notes: 'Notes',
  confidential: 'CONFIDENTIAL — THIS DOCUMENT IS PREPARED EXCLUSIVELY FOR THE NAMED CLIENT',
  preparedFor: 'Prepared for',
  currency: 'Currency',
  included: 'Included',
  yes: 'Yes',
  no: 'No',

  offerTitle: 'OFFER',
  packageDetails: 'Package Details',
  packageName: 'Package Name',
  contentPerMonth: 'Monthly Content',
  posts: 'Posts',
  reels: 'Reels',
  stories: 'Stories',
  photoshoots: 'Photoshoots',
  videoProduction: 'Video Production',
  droneShots: 'Drone Shots',
  pricing: 'Pricing',
  realPackagePrice: 'Package Value',
  offeredPrice: 'Offered Price',
  discount: 'Discount',
  boostBudget: 'Monthly Boost Budget',
  sponsoredContent: 'Sponsored Content',

  offerIntro: 'Thank you for considering Horizonte Digital Group as your digital marketing partner. This proposal outlines a tailored social media management package designed to grow your brand\'s online presence, increase audience engagement, and deliver measurable results across the agreed platforms.',
  purposeHeading: 'PURPOSE OF COOPERATION',
  purposeBody: 'The purpose of this proposal is to present a customized digital marketing solution for your business. Our team will manage content creation, scheduling, and publication across your social media channels — ensuring consistent brand communication and a strategy driven by data and creativity.',
  servicesHeading: 'SERVICES INCLUDED',
  boostHeading: 'BOOST & ADVERTISING',
  boostBody: 'Where a monthly boost budget is included, our team will manage paid promotion campaigns on your behalf — targeting the most relevant audience segments to maximize reach and return on investment.',
  validityHeading: 'OFFER VALIDITY',
  validityBody: 'This offer is valid for 14 days from the date stated above. Should you have any questions or require adjustments, please do not hesitate to contact us.',

  agreementTitle: 'SERVICE AGREEMENT',
  agreementDate: 'Agreement Date',
  startDate: 'Service Start Date',
  parties: 'PARTIES',
  serviceProvider: 'Service Provider',
  client: 'Client',
  services: 'SERVICES',
  contentPlan: 'Monthly Content Plan',
  perMonthMin: 'Min. per month',
  perMonthMax: 'Max. per month',
  pricingPayment: 'PRICING & PAYMENT',
  monthlyPrice: 'Monthly Service Fee',
  paymentDue: 'Payment Due',
  daysFromInvoice: 'days from invoice date',
  termsConditions: 'TERMS & CONDITIONS',
  terminationNotice: 'Termination Notice',
  governingLaw: 'Governing Law',
  days: 'days',
  signatures: 'SIGNATURES',
  name: 'Name',
  signature: 'Signature',

  sec1Heading: '1. PURPOSE',
  sec1Body: 'Horizonte Digital Group (hereinafter the "Agency") agrees to provide professional social media management and digital content production services to the Client as detailed in this Agreement. The objective is to strengthen the Client\'s digital presence, build brand awareness, and maximize audience engagement across the agreed platforms.',
  sec2Heading: '2. PLATFORMS',
  sec3Heading: '3. MONTHLY CONTENT PLAN',
  sec4Heading: '4. BOOST & ADVERTISING',
  sec4Body: 'Where a monthly boost budget has been agreed, the Agency shall manage paid promotion campaigns on behalf of the Client. The boost budget is separate from the monthly service fee and will be managed with full transparency and reported monthly.',
  sec5Heading: '5. CONTENT FLEXIBILITY',
  sec5Body: 'The content quantities stated in this Agreement represent the planned monthly volume. Actual delivery may vary by up to 20% based on content performance, strategic recommendations, and platform algorithm changes, without constituting a breach of this Agreement.',
  sec6Heading: '6. SERVICE FEE',
  sec7Heading: '7. PERFORMANCE REPORTING',
  sec7Body: 'The Agency shall provide a monthly performance report covering key metrics for all published content, including reach, impressions, engagement rate, and follower growth. Reports will be delivered within the first 10 days of the following month.',
  sec8Heading: '8. DURATION',
  sec9Heading: '9. TERMINATION',
  sec9Body: 'Either party may terminate this Agreement by providing written notice at least {days} calendar days in advance. Services already rendered and invoiced shall remain due and payable regardless of termination. Early termination by the Client does not entitle the Client to a refund of fees already paid.',
  legalNote: 'This Agreement constitutes the entire understanding between the parties and supersedes all prior negotiations, representations, and arrangements. Any amendments to this Agreement must be agreed in writing and signed by authorized representatives of both parties.',
};

const sq: DocStrings = {
  agencyName: 'Horizonte Digital Group',
  tagline: 'Your Vision. Our Creation.',
  phone1: '070 629 606',
  phone2: '076 224 065',
  date: 'Data',
  duration: 'Kohezgjatja',
  months: 'muaj',
  platforms: 'Platformat',
  additionalServices: 'Shërbime Shtesë',
  notes: 'Shënime',
  confidential: 'KONFIDENCIAL — KY DOKUMENT ËSHTË PËRGATITUR EKSKLUZIVISHT PËR KLIENTIN E EMËRTUAR',
  preparedFor: 'Përgatitur për',
  currency: 'Monedha',
  included: 'Përfshire',
  yes: 'Po',
  no: 'Jo',

  offerTitle: 'OFERTË',
  packageDetails: 'Detajet e Paketës',
  packageName: 'Emri i Paketës',
  contentPerMonth: 'Përmbajtja Mujore',
  posts: 'Postime',
  reels: 'Reels',
  stories: 'Stories',
  photoshoots: 'Fotosesione',
  videoProduction: 'Prodhim Video',
  droneShots: 'Dron Shots',
  pricing: 'Çmimet',
  realPackagePrice: 'Vlera e Paketës',
  offeredPrice: 'Çmimi i Ofruar',
  discount: 'Zbritje',
  boostBudget: 'Buxheti Mujor i Boost',
  sponsoredContent: 'Përmbajtje e Sponsorizuar',

  offerIntro: 'Faleminderit që konsideroni Horizonte Digital Group si partnerin tuaj të marketingut dixhital. Ky propozim paraqet një paketë të personalizuar të menaxhimit të mediave sociale, të projektuar për të rritur praninë online të markës suaj, për të rritur angazhimin e audiencës dhe për të ofruar rezultate të matshme nëpër platformat e rëna dakord.',
  purposeHeading: 'QËLLIMI I BASHKËPUNIMIT',
  purposeBody: 'Qëllimi i këtij propozimi është të prezantojë një zgjidhje të personalizuar të marketingut dixhital për biznesin tuaj. Ekipi ynë do të menaxhojë krijimin e përmbajtjes, planifikimin dhe publikimin nëpër kanalet tuaja të mediave sociale — duke siguruar komunikim të qëndrueshëm të markës dhe strategji të bazuar në të dhëna dhe kreativitet.',
  servicesHeading: 'SHËRBIME TË PËRFSHIRA',
  boostHeading: 'BOOST DHE REKLAMIM',
  boostBody: 'Ku përfshihet një buxhet mujor boost, ekipi ynë do të menaxhojë fushatat e promovimit me pagesë në emër tuaj — duke synuar segmentet më relevante të audiencës për të maksimizuar shtrirjen dhe kthimin e investimit.',
  validityHeading: 'VLEFSHMËRIA E OFERTËS',
  validityBody: 'Kjo ofertë është e vlefshme për 14 ditë nga data e sipërcituar. Nëse keni pyetje ose kërkoni ndryshime, ju lutemi mos hezitoni të na kontaktoni.',

  agreementTitle: 'KONTRATË SHËRBIMI',
  agreementDate: 'Data e Kontratës',
  startDate: 'Data e Fillimit të Shërbimit',
  parties: 'PALËT',
  serviceProvider: 'Ofruesi i Shërbimit',
  client: 'Klienti',
  services: 'SHËRBIMET',
  contentPlan: 'Plani Mujor i Përmbajtjes',
  perMonthMin: 'Min. në muaj',
  perMonthMax: 'Maks. në muaj',
  pricingPayment: 'ÇMIMI DHE PAGESA',
  monthlyPrice: 'Tarifa Mujore e Shërbimit',
  paymentDue: 'Afati i Pagesës',
  daysFromInvoice: 'ditë nga data e faturës',
  termsConditions: 'TERMAT DHE KUSHTET',
  terminationNotice: 'Njoftimi për Ndërprerje',
  governingLaw: 'Legjislacioni i Zbatueshëm',
  days: 'ditë',
  signatures: 'NËNSHKRIMET',
  name: 'Emri',
  signature: 'Nënshkrimi',

  sec1Heading: '1. QËLLIMI',
  sec1Body: 'Horizonte Digital Group (këtu e tutje "Agjencia") bie dakord të ofrojë shërbime profesionale të menaxhimit të mediave sociale dhe prodhimit të përmbajtjes dixhitale për Klientin, siç detajohet në këtë Kontratë. Objektivi është të forcojë praninë dixhitale të Klientit, të rrisë ndërgjegjësimin e markës dhe të maksimizojë angazhimin e audiencës nëpër platformat e rëna dakord.',
  sec2Heading: '2. PLATFORMAT',
  sec3Heading: '3. PLANI MUJOR I PËRMBAJTJES',
  sec4Heading: '4. BOOST DHE REKLAMIM',
  sec4Body: 'Ku është rënë dakord për buxhet mujor boost, Agjencia do të menaxhojë fushatat e promovimit me pagesë në emër të Klientit. Buxheti i boost-it është i ndarë nga tarifa mujore e shërbimit dhe do të menaxhohet me transparencë të plotë dhe raportohet çdo muaj.',
  sec5Heading: '5. FLEKSIBILITETI I PËRMBAJTJES',
  sec5Body: 'Sasitë e përmbajtjes të specifikuara në këtë Kontratë përfaqësojnë vëllimin e planifikuar mujor. Realizimi aktual mund të ndryshojë deri në 20% bazuar në performancën e përmbajtjes, rekomandimet strategjike dhe ndryshimet e algoritmeve të platformave, pa përbërë shkelje të kësaj Kontrate.',
  sec6Heading: '6. TARIFA E SHËRBIMIT',
  sec7Heading: '7. RAPORTIMI I PERFORMANCËS',
  sec7Body: 'Agjencia do të ofrojë raport mujor të performancës që mbulon metrikat kryesore për të gjithë përmbajtjen e publikuar, duke përfshirë shtrirjen, impresionet, shkallën e angazhimit dhe rritjen e ndjekësve. Raportet do të dorëzohen brenda 10 ditëve të para të muajit pasardhës.',
  sec8Heading: '8. KOHËZGJATJA',
  sec9Heading: '9. NDËRPRERJA',
  sec9Body: 'Secila palë mund ta ndërpresë këtë Kontratë duke dhënë njoftim me shkrim të paktën {days} ditë kalendarike paraprakisht. Shërbimet tashmë të kryera dhe të faturuara mbeten të detyrueshme dhe të pagueshme pavarësisht nga ndërprerja. Ndërprerja e hershme nga Klienti nuk i jep të drejtë Klientit të marrë rimbursim për tarifat e paguara.',
  legalNote: 'Kjo Kontratë përbën të gjithë marrëveshjen ndërmjet palëve dhe zëvendëson të gjitha negociatat, përfaqësimet dhe marrëveshjet e mëparshme. Çdo ndryshim i kësaj Kontrate duhet të dakordohet me shkrim dhe nënshkruhet nga përfaqësues të autorizuar të të dyja palëve.',
};

const mk: DocStrings = {
  agencyName: 'Horizonte Digital Group',
  tagline: 'Your Vision. Our Creation.',
  phone1: '070 629 606',
  phone2: '076 224 065',
  date: 'Датум',
  duration: 'Траење',
  months: 'месеци',
  platforms: 'Платформи',
  additionalServices: 'Дополнителни услуги',
  notes: 'Забелешки',
  confidential: 'ДОВЕРЛИВО — ОВОЈ ДОКУМЕНТ Е ПОДГОТВЕН ИСКЛУЧИВО ЗА ИМЕНУВАНИОТ КЛИЕНТ',
  preparedFor: 'Подготвено за',
  currency: 'Валута',
  included: 'Вклучено',
  yes: 'Да',
  no: 'Не',

  offerTitle: 'ПОНУДА',
  packageDetails: 'Детали за пакетот',
  packageName: 'Назив на пакет',
  contentPerMonth: 'Месечна содржина',
  posts: 'Објави',
  reels: 'Риелс',
  stories: 'Сторис',
  photoshoots: 'Фотосесии',
  videoProduction: 'Видео продукција',
  droneShots: 'Дрон снимки',
  pricing: 'Ценовник',
  realPackagePrice: 'Вредност на пакетот',
  offeredPrice: 'Понудена цена',
  discount: 'Попуст',
  boostBudget: 'Месечен буџет за промоција',
  sponsoredContent: 'Спонзорирана содржина',

  offerIntro: 'Ви благодариме што го разгледувате Horizonte Digital Group како ваш партнер за дигитален маркетинг. Оваа понуда претставува прилагоден пакет за управување со социјални мрежи, дизајниран да ја зголеми онлајн присутноста на вашиот бренд, да го зголеми ангажирањето на публиката и да обезбеди мерливи резултати на договорените платформи.',
  purposeHeading: 'ЦЕЛ НА СОРАБОТКАТА',
  purposeBody: 'Целта на оваа понуда е да претстави прилагодено решение за дигитален маркетинг за вашиот бизнис. Нашиот тим ќе управува со создавање на содржина, планирање и објавување на вашите канали за социјални мрежи — обезбедувајќи конзистентна комуникација на брендот и стратегија базирана на податоци и креативност.',
  servicesHeading: 'ВКЛУЧЕНИ УСЛУГИ',
  boostHeading: 'ПРОМОЦИЈА И РЕКЛАМИРАЊЕ',
  boostBody: 'Каде е вклучен месечен буџет за промоција, нашиот тим ќе управува со платените рекламни кампањи во ваше корист — насочувајќи кон најрелевантните сегменти на публиката за да се максимизира досегот и повратот на инвестицијата.',
  validityHeading: 'ВАЖНОСТ НА ПОНУДАТА',
  validityBody: 'Оваа понуда е важечка 14 дена од датумот наведен погоре. Доколку имате прашања или барате измени, ве молиме не двоумете се да не контактирате.',

  agreementTitle: 'ДОГОВОР ЗА УСЛУГИ',
  agreementDate: 'Датум на договорот',
  startDate: 'Датум на почеток на услугата',
  parties: 'СТРАНИ',
  serviceProvider: 'Давател на услуги',
  client: 'Клиент',
  services: 'УСЛУГИ',
  contentPlan: 'Месечен план за содржина',
  perMonthMin: 'Мин. месечно',
  perMonthMax: 'Макс. месечно',
  pricingPayment: 'ЦЕНА И ПЛАЌАЊЕ',
  monthlyPrice: 'Месечен надоместок',
  paymentDue: 'Рок за плаќање',
  daysFromInvoice: 'дена од датумот на фактурата',
  termsConditions: 'УСЛОВИ И ОДРЕДБИ',
  terminationNotice: 'Отказен рок',
  governingLaw: 'Важечко право',
  days: 'дена',
  signatures: 'ПОТПИСИ',
  name: 'Име',
  signature: 'Потпис',

  sec1Heading: '1. ЦЕЛ',
  sec1Body: 'Horizonte Digital Group (понатаму „Агенцијата") се согласува да обезбеди професионални услуги за управување со социјални мрежи и производство на дигитална содржина на Клиентот, како што е детализирано во овој Договор. Целта е да се зајакне дигиталното присуство на Клиентот, да се изгради свесност за брендот и да се максимизира ангажирањето на публиката на договорените платформи.',
  sec2Heading: '2. ПЛАТФОРМИ',
  sec3Heading: '3. МЕСЕЧЕН ПЛАН ЗА СОДРЖИНА',
  sec4Heading: '4. ПРОМОЦИЈА И РЕКЛАМИРАЊЕ',
  sec4Body: 'Каде е договорен месечен буџет за промоција, Агенцијата ќе управува со платените рекламни кампањи во корист на Клиентот. Буџетот за промоција е одделен од месечниот надоместок за услуга и ќе се управува со целосна транспарентност и ќе се известува месечно.',
  sec5Heading: '5. ФЛЕКСИБИЛНОСТ НА СОДРЖИНАТА',
  sec5Body: 'Количините на содржина наведени во овој Договор го претставуваат планираниот месечен обем. Вистинската испорака може да варира до 20% врз основа на перформансите на содржината, стратешките препораки и промените на алгоритмите на платформите, без да претставува кршење на овој Договор.',
  sec6Heading: '6. НАДОМЕСТОК ЗА УСЛУГА',
  sec7Heading: '7. ИЗВЕСТУВАЊЕ ЗА ПЕРФОРМАНСИ',
  sec7Body: 'Агенцијата ќе обезбеди месечен извештај за перформанси кој ги покрива клучните метрики за целата објавена содржина, вклучувајќи досег, импресии, стапка на ангажирање и раст на следбениците. Извештаите ќе бидат доставени во рок на првите 10 дена на следниот месец.',
  sec8Heading: '8. ТРАЕЊЕ',
  sec9Heading: '9. РАСКИНУВАЊЕ',
  sec9Body: 'Секоја страна може да го раскине овој Договор со давање на писмено известување најмалку {days} календарски дена однапред. Услугите веќе извршени и фактурирани остануваат доспеани и платливи без оглед на раскинувањето. Предвремено раскинување од страна на Клиентот не му дава право на Клиентот на поврат на веќе платените надоместоци.',
  legalNote: 'Овој Договор го претставува целото разбирање меѓу страните и ги заменува сите претходни преговори, изјави и договорени аранжмани. Сите измени на овој Договор мораат да бидат договорени писмено и потпишани од овластени претставници на двете страни.',
};

const translations: Record<DocLang, DocStrings> = { en, sq, mk };

export function getDocStrings(lang: DocLang): DocStrings {
  return translations[lang] ?? translations.en;
}

export const DOC_LANG_LABELS: Record<DocLang, string> = {
  en: 'English',
  sq: 'Shqip',
  mk: 'Македонски',
};
