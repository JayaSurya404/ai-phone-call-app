export interface MobileLanguageProfile {
  id: string;
  displayName: string;
  nativeName: string;
  region: string;
  description: string;
  searchTerms:
    readonly string[];
}

export const mobileLanguageProfiles:
readonly MobileLanguageProfile[] = [
  {
    id: 'en-in',
    displayName:
      'English (India)',
    nativeName:
      'English',
    region:
      'India',
    description:
      'Natural Indian English',
    searchTerms: [
      'english',
      'india',
      'indian',
    ],
  },
  {
    id: 'ta-en',
    displayName:
      'Tamil + English',
    nativeName:
      'à®¤à®®à®¿à®´à¯ + English',
    region:
      'India',
    description:
      'Tamil-English mixed conversation',
    searchTerms: [
      'tamil',
      'tamizh',
      'à®¤à®®à®¿à®´à¯',
      'india',
    ],
  },
  {
    id: 'hi-en',
    displayName:
      'Hindi + English',
    nativeName:
      'à¤¹à¤¿à¤¨à¥à¤¦à¥€ + English',
    region:
      'India',
    description:
      'Hindi-English mixed conversation',
    searchTerms: [
      'hindi',
      'à¤¹à¤¿à¤¨à¥à¤¦à¥€',
      'à¤¹à¤¿à¤‚à¤¦à¥€',
      'india',
    ],
  },
  {
    id: 'kn-en',
    displayName:
      'Kannada + English',
    nativeName:
      'à²•à²¨à³à²¨à²¡ + English',
    region:
      'India',
    description:
      'Kannada-English mixed conversation',
    searchTerms: [
      'kannada',
      'à²•à²¨à³à²¨à²¡',
      'india',
    ],
  },
  {
    id: 'te-en',
    displayName:
      'Telugu + English',
    nativeName:
      'à°¤à±†à°²à±à°—à± + English',
    region:
      'India',
    description:
      'Telugu-English mixed conversation',
    searchTerms: [
      'telugu',
      'à°¤à±†à°²à±à°—à±',
      'india',
    ],
  },
  {
    id: 'ml-en',
    displayName:
      'Malayalam + English',
    nativeName:
      'à´®à´²à´¯à´¾à´³à´‚ + English',
    region:
      'India',
    description:
      'Malayalam-English mixed conversation',
    searchTerms: [
      'malayalam',
      'à´®à´²à´¯à´¾à´³à´‚',
      'india',
    ],
  },
  {
    id: 'bn-en',
    displayName:
      'Bengali + English',
    nativeName:
      'à¦¬à¦¾à¦‚à¦²à¦¾ + English',
    region:
      'India / Bangladesh',
    description:
      'Bengali-English mixed conversation',
    searchTerms: [
      'bengali',
      'bangla',
      'à¦¬à¦¾à¦‚à¦²à¦¾',
      'india',
      'bangladesh',
    ],
  },
  {
    id: 'mr-en',
    displayName:
      'Marathi + English',
    nativeName:
      'à¤®à¤°à¤¾à¤ à¥€ + English',
    region:
      'India',
    description:
      'Marathi-English mixed conversation',
    searchTerms: [
      'marathi',
      'à¤®à¤°à¤¾à¤ à¥€',
      'india',
    ],
  },
  {
    id: 'gu-en',
    displayName:
      'Gujarati + English',
    nativeName:
      'àª—à«àªœàª°àª¾àª¤à«€ + English',
    region:
      'India',
    description:
      'Gujarati-English mixed conversation',
    searchTerms: [
      'gujarati',
      'àª—à«àªœàª°àª¾àª¤à«€',
      'india',
    ],
  },
  {
    id: 'pa-en',
    displayName:
      'Punjabi + English',
    nativeName:
      'à¨ªà©°à¨œà¨¾à¨¬à©€ + English',
    region:
      'India / Pakistan',
    description:
      'Punjabi-English mixed conversation',
    searchTerms: [
      'punjabi',
      'à¨ªà©°à¨œà¨¾à¨¬à©€',
      'india',
      'pakistan',
    ],
  },
  {
    id: 'ur-en',
    displayName:
      'Urdu + English',
    nativeName:
      'Ø§Ø±Ø¯Ùˆ + English',
    region:
      'India / Pakistan',
    description:
      'Urdu-English mixed conversation',
    searchTerms: [
      'urdu',
      'Ø§Ø±Ø¯Ùˆ',
      'india',
      'pakistan',
    ],
  },
  {
    id: 'as-en',
    displayName:
      'Assamese + English',
    nativeName:
      'à¦…à¦¸à¦®à§€à¦¯à¦¼à¦¾ + English',
    region:
      'India',
    description:
      'Assamese-English mixed conversation',
    searchTerms: [
      'assamese',
      'à¦…à¦¸à¦®à§€à¦¯à¦¼à¦¾',
      'india',
    ],
  },
  {
    id: 'ne-en',
    displayName:
      'Nepali + English',
    nativeName:
      'à¤¨à¥‡à¤ªà¤¾à¤²à¥€ + English',
    region:
      'Nepal / India',
    description:
      'Nepali-English mixed conversation',
    searchTerms: [
      'nepali',
      'à¤¨à¥‡à¤ªà¤¾à¤²à¥€',
      'nepal',
      'india',
    ],
  },
  {
    id: 'ar-en',
    displayName:
      'Arabic + English',
    nativeName:
      'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© + English',
    region:
      'Middle East / Global',
    description:
      'Arabic-English mixed conversation',
    searchTerms: [
      'arabic',
      'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©',
      'middle east',
    ],
  },
  {
    id: 'es-en',
    displayName:
      'Spanish + English',
    nativeName:
      'EspaÃ±ol + English',
    region:
      'Global',
    description:
      'Spanish-English mixed conversation',
    searchTerms: [
      'spanish',
      'espaÃ±ol',
      'spain',
      'latin america',
    ],
  },
  {
    id: 'fr-en',
    displayName:
      'French + English',
    nativeName:
      'FranÃ§ais + English',
    region:
      'Global',
    description:
      'French-English mixed conversation',
    searchTerms: [
      'french',
      'franÃ§ais',
      'france',
      'canada',
    ],
  },
  {
    id: 'de-en',
    displayName:
      'German + English',
    nativeName:
      'Deutsch + English',
    region:
      'Europe',
    description:
      'German-English mixed conversation',
    searchTerms: [
      'german',
      'deutsch',
      'germany',
    ],
  },
  {
    id: 'pt-en',
    displayName:
      'Portuguese + English',
    nativeName:
      'PortuguÃªs + English',
    region:
      'Brazil / Portugal',
    description:
      'Portuguese-English mixed conversation',
    searchTerms: [
      'portuguese',
      'portuguÃªs',
      'brazil',
      'portugal',
    ],
  },
  {
    id: 'id-en',
    displayName:
      'Indonesian + English',
    nativeName:
      'Bahasa Indonesia + English',
    region:
      'Indonesia',
    description:
      'Indonesian-English mixed conversation',
    searchTerms: [
      'indonesian',
      'bahasa',
      'indonesia',
    ],
  },
  {
    id: 'ja-en',
    displayName:
      'Japanese + English',
    nativeName:
      'æ—¥æœ¬èªž + English',
    region:
      'Japan',
    description:
      'Japanese-English mixed conversation',
    searchTerms: [
      'japanese',
      'æ—¥æœ¬èªž',
      'japan',
    ],
  },
  {
    id: 'ko-en',
    displayName:
      'Korean + English',
    nativeName:
      'í•œêµ­ì–´ + English',
    region:
      'Korea',
    description:
      'Korean-English mixed conversation',
    searchTerms: [
      'korean',
      'í•œêµ­ì–´',
      'korea',
    ],
  },
  {
    id: 'zh-en',
    displayName:
      'Mandarin + English',
    nativeName:
      'ä¸­æ–‡ + English',
    region:
      'Global',
    description:
      'Mandarin-English mixed conversation',
    searchTerms: [
      'mandarin',
      'chinese',
      'ä¸­æ–‡',
      'china',
      'taiwan',
      'singapore',
    ],
  },
];

const profileMap =
  new Map(
    mobileLanguageProfiles
      .map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
  );

const legacyMap:
Readonly<
  Record<
    string,
    string
  >
> = {
  'ta-IN': 'ta-en',
  'hi-IN': 'hi-en',
  'en-IN': 'en-in',
  multi: 'en-in',
};

export function getMobileLanguageProfile(
  id: string
): MobileLanguageProfile {
  const normalized =
    legacyMap[id] ??
    id;

  return (
    profileMap.get(
      normalized
    ) ??
    profileMap.get(
      'en-in'
    )!
  );
}