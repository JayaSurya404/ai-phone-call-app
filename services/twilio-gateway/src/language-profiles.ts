export type ElevenLabsTtsModel =
  | 'eleven_flash_v2_5'
  | 'eleven_v3';

export interface LanguageProfile {
  id: string;
  displayName: string;
  nativeName: string;
  region: string;
  sttPrimaryLanguage: string;
  sttSecondaryLanguages:
    readonly string[];
  llmLanguageName: string;
  llmInstruction: string;
  mixedExample: string;
  ttsModel:
    ElevenLabsTtsModel;
  searchTerms:
    readonly string[];
}

const flashLanguages =
  new Set([
    'en',
    'ta',
    'hi',
    'ar',
    'es',
    'fr',
    'de',
    'pt',
    'id',
    'ja',
    'ko',
    'zh',
  ]);

function profile(
  values:
    Omit<
      LanguageProfile,
      'ttsModel'
    >
): LanguageProfile {
  return {
    ...values,

    ttsModel:
      flashLanguages.has(
        values
          .sttPrimaryLanguage
      )
        ? 'eleven_flash_v2_5'
        : 'eleven_v3',
  };
}

export const languageProfiles:
readonly LanguageProfile[] = [
  profile({
    id: 'en-in',
    displayName:
      'English (India)',
    nativeName:
      'English',
    region:
      'India',
    sttPrimaryLanguage:
      'en',
    sttSecondaryLanguages:
      [],
    llmLanguageName:
      'natural Indian English',
    llmInstruction:
      (
        'Speak in concise, friendly Indian English. ' +
        'Use familiar business words and avoid robotic phrasing.'
      ),
    mixedExample:
      (
        'Yes, Friday at ten works for me.'
      ),
    searchTerms: [
      'english',
      'india',
      'indian',
    ],
  }),

  profile({
    id: 'ta-en',
    displayName:
      'Tamil + English',
    nativeName:
      'à®¤à®®à®¿à®´à¯ + English',
    region:
      'India',
    sttPrimaryLanguage:
      'ta',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Tamil with natural English code-switching',
    llmInstruction:
      (
        'Use simple everyday spoken Tamil. Keep common English ' +
        'terms such as appointment, meeting, confirm, time, date, ' +
        'payment, order, and delivery in English when natural.'
      ),
    mixedExample:
      (
        'Friday appointment confirm à®ªà®£à¯à®£à®¿à®Ÿà¯à®™à¯à®•.'
      ),
    searchTerms: [
      'tamil',
      'à®¤à®®à®¿à®´à¯',
      'tamizh',
      'india',
    ],
  }),

  profile({
    id: 'hi-en',
    displayName:
      'Hindi + English',
    nativeName:
      'à¤¹à¤¿à¤¨à¥à¤¦à¥€ + English',
    region:
      'India',
    sttPrimaryLanguage:
      'hi',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Hindi with natural English code-switching',
    llmInstruction:
      (
        'Use everyday conversational Hindi and naturally retain ' +
        'common English business words.'
      ),
    mixedExample:
      (
        'Mera appointment next Monday shift kar do.'
      ),
    searchTerms: [
      'hindi',
      'à¤¹à¤¿à¤¨à¥à¤¦à¥€',
      'à¤¹à¤¿à¤‚à¤¦à¥€',
      'india',
    ],
  }),

  profile({
    id: 'kn-en',
    displayName:
      'Kannada + English',
    nativeName:
      'à²•à²¨à³à²¨à²¡ + English',
    region:
      'India',
    sttPrimaryLanguage:
      'kn',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Kannada with natural English code-switching',
    llmInstruction:
      (
        'Use simple everyday Kannada and naturally retain common ' +
        'English business and technology words.'
      ),
    mixedExample:
      (
        'Tomorrow meeting reschedule à²®à²¾à²¡à²¬à²¹à³à²¦à²¾?'
      ),
    searchTerms: [
      'kannada',
      'à²•à²¨à³à²¨à²¡',
      'india',
    ],
  }),

  profile({
    id: 'te-en',
    displayName:
      'Telugu + English',
    nativeName:
      'à°¤à±†à°²à±à°—à± + English',
    region:
      'India',
    sttPrimaryLanguage:
      'te',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Telugu with natural English code-switching',
    llmInstruction:
      (
        'Use friendly everyday Telugu and naturally retain common ' +
        'English business words.'
      ),
    mixedExample:
      (
        'Friday appointment confirm à°šà±‡à°¯à°‚à°¡à°¿.'
      ),
    searchTerms: [
      'telugu',
      'à°¤à±†à°²à±à°—à±',
      'india',
    ],
  }),

  profile({
    id: 'ml-en',
    displayName:
      'Malayalam + English',
    nativeName:
      'à´®à´²à´¯à´¾à´³à´‚ + English',
    region:
      'India',
    sttPrimaryLanguage:
      'ml',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Malayalam with natural English code-switching',
    llmInstruction:
      (
        'Use natural everyday Malayalam and keep familiar English ' +
        'business words when they sound more conversational.'
      ),
    mixedExample:
      (
        'Tomorrow meeting confirm à´šàµ†à´¯àµà´¯à´¾à´®àµ‹?'
      ),
    searchTerms: [
      'malayalam',
      'à´®à´²à´¯à´¾à´³à´‚',
      'india',
    ],
  }),

  profile({
    id: 'bn-en',
    displayName:
      'Bengali + English',
    nativeName:
      'à¦¬à¦¾à¦‚à¦²à¦¾ + English',
    region:
      'India / Bangladesh',
    sttPrimaryLanguage:
      'bn',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Bengali with natural English code-switching',
    llmInstruction:
      (
        'Use conversational Bengali and naturally keep common ' +
        'English business terms.'
      ),
    mixedExample:
      (
        'Friday appointmentà¦Ÿà¦¾ confirm à¦•à¦°à§‡ à¦¦à¦¿à¦¨.'
      ),
    searchTerms: [
      'bengali',
      'bangla',
      'à¦¬à¦¾à¦‚à¦²à¦¾',
      'india',
      'bangladesh',
    ],
  }),

  profile({
    id: 'mr-en',
    displayName:
      'Marathi + English',
    nativeName:
      'à¤®à¤°à¤¾à¤ à¥€ + English',
    region:
      'India',
    sttPrimaryLanguage:
      'mr',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Marathi with natural English code-switching',
    llmInstruction:
      (
        'Use friendly everyday Marathi with natural English ' +
        'business words.'
      ),
    mixedExample:
      (
        'Friday à¤šà¤‚ appointment confirm à¤•à¤°à¤¾.'
      ),
    searchTerms: [
      'marathi',
      'à¤®à¤°à¤¾à¤ à¥€',
      'india',
    ],
  }),

  profile({
    id: 'gu-en',
    displayName:
      'Gujarati + English',
    nativeName:
      'àª—à«àªœàª°àª¾àª¤à«€ + English',
    region:
      'India',
    sttPrimaryLanguage:
      'gu',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Gujarati with natural English code-switching',
    llmInstruction:
      (
        'Use everyday Gujarati and naturally keep common English ' +
        'business terms.'
      ),
    mixedExample:
      (
        'Friday appointment confirm àª•àª°à«€ àª¦à«‹.'
      ),
    searchTerms: [
      'gujarati',
      'àª—à«àªœàª°àª¾àª¤à«€',
      'india',
    ],
  }),

  profile({
    id: 'pa-en',
    displayName:
      'Punjabi + English',
    nativeName:
      'à¨ªà©°à¨œà¨¾à¨¬à©€ + English',
    region:
      'India / Pakistan',
    sttPrimaryLanguage:
      'pa',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Punjabi with natural English code-switching',
    llmInstruction:
      (
        'Use friendly spoken Punjabi and retain common English ' +
        'business words naturally.'
      ),
    mixedExample:
      (
        'Friday appointment confirm à¨•à¨° à¨¦à¨¿à¨“.'
      ),
    searchTerms: [
      'punjabi',
      'à¨ªà©°à¨œà¨¾à¨¬à©€',
      'india',
      'pakistan',
    ],
  }),

  profile({
    id: 'ur-en',
    displayName:
      'Urdu + English',
    nativeName:
      'Ø§Ø±Ø¯Ùˆ + English',
    region:
      'India / Pakistan',
    sttPrimaryLanguage:
      'ur',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Urdu with natural English code-switching',
    llmInstruction:
      (
        'Use polite conversational Urdu and retain familiar ' +
        'English business words naturally.'
      ),
    mixedExample:
      (
        'Friday Ú©Ø§ appointment confirm Ú©Ø± Ø¯ÛŒÚº.'
      ),
    searchTerms: [
      'urdu',
      'Ø§Ø±Ø¯Ùˆ',
      'india',
      'pakistan',
    ],
  }),

  profile({
    id: 'as-en',
    displayName:
      'Assamese + English',
    nativeName:
      'à¦…à¦¸à¦®à§€à¦¯à¦¼à¦¾ + English',
    region:
      'India',
    sttPrimaryLanguage:
      'as',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Assamese with natural English code-switching',
    llmInstruction:
      (
        'Use everyday Assamese and naturally retain common ' +
        'English business terms.'
      ),
    mixedExample:
      (
        'Friday appointmentà¦Ÿà§‹ confirm à¦•à§°à¦¿ à¦¦à¦¿à¦¯à¦¼à¦•.'
      ),
    searchTerms: [
      'assamese',
      'à¦…à¦¸à¦®à§€à¦¯à¦¼à¦¾',
      'india',
    ],
  }),

  profile({
    id: 'ne-en',
    displayName:
      'Nepali + English',
    nativeName:
      'à¤¨à¥‡à¤ªà¤¾à¤²à¥€ + English',
    region:
      'Nepal / India',
    sttPrimaryLanguage:
      'ne',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'spoken Nepali with natural English code-switching',
    llmInstruction:
      (
        'Use friendly spoken Nepali and retain common English ' +
        'business words naturally.'
      ),
    mixedExample:
      (
        'Friday à¤•à¥‹ appointment confirm à¤—à¤°à¤¿à¤¦à¤¿à¤¨à¥à¤¹à¥‹à¤¸à¥.'
      ),
    searchTerms: [
      'nepali',
      'à¤¨à¥‡à¤ªà¤¾à¤²à¥€',
      'nepal',
      'india',
    ],
  }),

  profile({
    id: 'ar-en',
    displayName:
      'Arabic + English',
    nativeName:
      'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© + English',
    region:
      'Middle East / Global',
    sttPrimaryLanguage:
      'ar',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'natural spoken Arabic with English code-switching',
    llmInstruction:
      (
        'Use clear conversational Arabic and naturally preserve ' +
        'common English names, brands, and business terms.'
      ),
    mixedExample:
      (
        'Ù…Ù…ÙƒÙ† confirm Ø§Ù„Ù…ÙˆØ¹Ø¯ ÙŠÙˆÙ… FridayØŸ'
      ),
    searchTerms: [
      'arabic',
      'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©',
      'middle east',
    ],
  }),

  profile({
    id: 'es-en',
    displayName:
      'Spanish + English',
    nativeName:
      'EspaÃ±ol + English',
    region:
      'Global',
    sttPrimaryLanguage:
      'es',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'natural conversational Spanish with English code-switching',
    llmInstruction:
      (
        'Use friendly spoken Spanish and retain common English ' +
        'business or product terms when natural.'
      ),
    mixedExample:
      (
        'Por favor, confirma my appointment para Friday.'
      ),
    searchTerms: [
      'spanish',
      'espaÃ±ol',
      'spain',
      'latin america',
    ],
  }),

  profile({
    id: 'fr-en',
    displayName:
      'French + English',
    nativeName:
      'FranÃ§ais + English',
    region:
      'Global',
    sttPrimaryLanguage:
      'fr',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'natural conversational French with English code-switching',
    llmInstruction:
      (
        'Use friendly spoken French and retain familiar English ' +
        'business and product terms.'
      ),
    mixedExample:
      (
        'Peux-tu confirm my appointment pour vendredi ?'
      ),
    searchTerms: [
      'french',
      'franÃ§ais',
      'france',
      'canada',
    ],
  }),

  profile({
    id: 'de-en',
    displayName:
      'German + English',
    nativeName:
      'Deutsch + English',
    region:
      'Europe',
    sttPrimaryLanguage:
      'de',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'natural conversational German with English code-switching',
    llmInstruction:
      (
        'Use clear spoken German and naturally retain common ' +
        'English business or technology terms.'
      ),
    mixedExample:
      (
        'Bitte confirm den Termin fÃ¼r Friday.'
      ),
    searchTerms: [
      'german',
      'deutsch',
      'germany',
    ],
  }),

  profile({
    id: 'pt-en',
    displayName:
      'Portuguese + English',
    nativeName:
      'PortuguÃªs + English',
    region:
      'Brazil / Portugal',
    sttPrimaryLanguage:
      'pt',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'natural conversational Portuguese with English code-switching',
    llmInstruction:
      (
        'Use friendly spoken Portuguese and naturally retain ' +
        'common English business terms.'
      ),
    mixedExample:
      (
        'Pode confirmar my appointment para sexta?'
      ),
    searchTerms: [
      'portuguese',
      'portuguÃªs',
      'brazil',
      'portugal',
    ],
  }),

  profile({
    id: 'id-en',
    displayName:
      'Indonesian + English',
    nativeName:
      'Bahasa Indonesia + English',
    region:
      'Indonesia',
    sttPrimaryLanguage:
      'id',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'natural spoken Indonesian with English code-switching',
    llmInstruction:
      (
        'Use friendly conversational Indonesian and keep common ' +
        'English business terms naturally.'
      ),
    mixedExample:
      (
        'Tolong confirm appointment saya untuk Friday.'
      ),
    searchTerms: [
      'indonesian',
      'bahasa',
      'indonesia',
    ],
  }),

  profile({
    id: 'ja-en',
    displayName:
      'Japanese + English',
    nativeName:
      'æ—¥æœ¬èªž + English',
    region:
      'Japan',
    sttPrimaryLanguage:
      'ja',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'natural spoken Japanese with English code-switching',
    llmInstruction:
      (
        'Use polite natural spoken Japanese and preserve common ' +
        'English brand, product, and business terms.'
      ),
    mixedExample:
      (
        'Friday ã® appointment ã‚’ confirm ã—ã¦ãã ã•ã„ã€‚'
      ),
    searchTerms: [
      'japanese',
      'æ—¥æœ¬èªž',
      'japan',
    ],
  }),

  profile({
    id: 'ko-en',
    displayName:
      'Korean + English',
    nativeName:
      'í•œêµ­ì–´ + English',
    region:
      'Korea',
    sttPrimaryLanguage:
      'ko',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'natural spoken Korean with English code-switching',
    llmInstruction:
      (
        'Use polite conversational Korean and naturally preserve ' +
        'common English brand, product, and business terms.'
      ),
    mixedExample:
      (
        'Friday appointmentë¥¼ confirmí•´ ì£¼ì„¸ìš”.'
      ),
    searchTerms: [
      'korean',
      'í•œêµ­ì–´',
      'korea',
    ],
  }),

  profile({
    id: 'zh-en',
    displayName:
      'Mandarin + English',
    nativeName:
      'ä¸­æ–‡ + English',
    region:
      'Global',
    sttPrimaryLanguage:
      'zh',
    sttSecondaryLanguages: [
      'en',
    ],
    llmLanguageName:
      'natural spoken Mandarin Chinese with English code-switching',
    llmInstruction:
      (
        'Use clear conversational Mandarin and naturally preserve ' +
        'common English names, brands, and business terms.'
      ),
    mixedExample:
      (
        'è¯·å¸®æˆ‘ confirm Friday çš„ appointmentã€‚'
      ),
    searchTerms: [
      'mandarin',
      'chinese',
      'ä¸­æ–‡',
      'china',
      'taiwan',
      'singapore',
    ],
  }),
];

const profileMap =
  new Map(
    languageProfiles.map(
      (item) => [
        item.id,
        item,
      ]
    )
  );

const legacyProfileMap:
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

export function getLanguageProfile(
  id: string | undefined
): LanguageProfile {
  const normalized =
    id?.trim();

  if (normalized) {
    const direct =
      profileMap.get(
        normalized
      );

    if (direct) {
      return direct;
    }

    const legacyId =
      legacyProfileMap[
        normalized
      ];

    if (legacyId) {
      const legacy =
        profileMap.get(
          legacyId
        );

      if (legacy) {
        return legacy;
      }
    }
  }

  return profileMap.get(
    'en-in'
  )!;
}