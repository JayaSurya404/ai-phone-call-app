export type ElevenLabsTtsModel =
  | 'eleven_flash_v2_5'
  | 'eleven_multilingual_v2'
  | 'eleven_v3';

export interface LanguageProfile {
  id: string;
  displayName: string;
  nativeName: string;
  region: string;
  sttPrimaryLanguage: string;
  sttSecondaryLanguages: readonly string[];
  llmLanguageName: string;
  llmInstruction: string;
  mixedExample: string;
  ttsModel: ElevenLabsTtsModel;
  searchTerms: readonly string[];
}

const multilingualV2Languages = new Set(['ta']);

const flashLanguages = new Set([
  'en',
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
  values: Omit<LanguageProfile, 'ttsModel'>
): LanguageProfile {
  let ttsModel: ElevenLabsTtsModel;

  if (
    multilingualV2Languages.has(
      values.sttPrimaryLanguage
    )
  ) {
    ttsModel = 'eleven_multilingual_v2';
  } else if (
    flashLanguages.has(
      values.sttPrimaryLanguage
    )
  ) {
    ttsModel = 'eleven_flash_v2_5';
  } else {
    ttsModel = 'eleven_v3';
  }

  return {
    ...values,
    ttsModel,
  };
}

export const languageProfiles:
readonly LanguageProfile[] = [
  profile({
    id: 'en-in',
    displayName: 'English (India)',
    nativeName: 'English',
    region: 'India',
    sttPrimaryLanguage: 'en',
    sttSecondaryLanguages: [],
    llmLanguageName: 'natural Indian English',
    llmInstruction:
      'Speak in concise, friendly Indian English. Avoid robotic wording.',
    mixedExample:
      'Yes, Friday at ten works for me.',
    searchTerms: ['english', 'india', 'indian'],
  }),
  profile({
    id: 'ta-en',
    displayName: 'Tamil + English',
    nativeName: 'தமிழ் + English',
    region: 'India',
    sttPrimaryLanguage: 'ta',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural everyday spoken Tamil with English code-switching',
    llmInstruction:
      'Use conversational Tamil as spoken in Tamil Nadu, not formal or literary Tamil. Naturally keep common English words such as appointment, confirm, meeting, time, date, payment, order and delivery. Keep every reply short.',
    mixedExample:
      'Friday appointment confirm பண்ணிடுங்க.',
    searchTerms: ['tamil', 'tamizh', 'தமிழ்', 'india'],
  }),
  profile({
    id: 'hi-en',
    displayName: 'Hindi + English',
    nativeName: 'हिन्दी + English',
    region: 'India',
    sttPrimaryLanguage: 'hi',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Hindi with English code-switching',
    llmInstruction:
      'Use friendly conversational Hindi with natural English business terms. Keep replies short.',
    mixedExample:
      'Mera appointment next Monday shift kar do.',
    searchTerms: ['hindi', 'हिन्दी', 'हिंदी', 'india'],
  }),
  profile({
    id: 'kn-en',
    displayName: 'Kannada + English',
    nativeName: 'ಕನ್ನಡ + English',
    region: 'India',
    sttPrimaryLanguage: 'kn',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Kannada with English code-switching',
    llmInstruction:
      'Use friendly spoken Kannada with natural English business terms. Keep replies short.',
    mixedExample:
      'Tomorrow meeting reschedule ಮಾಡಬಹುದಾ?',
    searchTerms: ['kannada', 'ಕನ್ನಡ', 'india'],
  }),
  profile({
    id: 'te-en',
    displayName: 'Telugu + English',
    nativeName: 'తెలుగు + English',
    region: 'India',
    sttPrimaryLanguage: 'te',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Telugu with English code-switching',
    llmInstruction:
      'Use conversational Telugu with natural English business terms. Keep replies short.',
    mixedExample:
      'Friday appointment confirm చేయండి.',
    searchTerms: ['telugu', 'తెలుగు', 'india'],
  }),
  profile({
    id: 'ml-en',
    displayName: 'Malayalam + English',
    nativeName: 'മലയാളം + English',
    region: 'India',
    sttPrimaryLanguage: 'ml',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Malayalam with English code-switching',
    llmInstruction:
      'Use conversational Malayalam with natural English business terms. Keep replies short.',
    mixedExample:
      'Tomorrow meeting confirm ചെയ്യാമോ?',
    searchTerms: ['malayalam', 'മലയാളം', 'india'],
  }),
  profile({
    id: 'bn-en',
    displayName: 'Bengali + English',
    nativeName: 'বাংলা + English',
    region: 'India / Bangladesh',
    sttPrimaryLanguage: 'bn',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Bengali with English code-switching',
    llmInstruction:
      'Use conversational Bengali with natural English business terms. Keep replies short.',
    mixedExample:
      'Friday appointmentটা confirm করে দিন.',
    searchTerms: ['bengali', 'bangla', 'বাংলা', 'india', 'bangladesh'],
  }),
  profile({
    id: 'mr-en',
    displayName: 'Marathi + English',
    nativeName: 'मराठी + English',
    region: 'India',
    sttPrimaryLanguage: 'mr',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Marathi with English code-switching',
    llmInstruction:
      'Use conversational Marathi with natural English business terms. Keep replies short.',
    mixedExample:
      'Friday चं appointment confirm करा.',
    searchTerms: ['marathi', 'मराठी', 'india'],
  }),
  profile({
    id: 'gu-en',
    displayName: 'Gujarati + English',
    nativeName: 'ગુજરાતી + English',
    region: 'India',
    sttPrimaryLanguage: 'gu',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Gujarati with English code-switching',
    llmInstruction:
      'Use conversational Gujarati with natural English business terms. Keep replies short.',
    mixedExample:
      'Friday appointment confirm કરી દો.',
    searchTerms: ['gujarati', 'ગુજરાતી', 'india'],
  }),
  profile({
    id: 'pa-en',
    displayName: 'Punjabi + English',
    nativeName: 'ਪੰਜਾਬੀ + English',
    region: 'India / Pakistan',
    sttPrimaryLanguage: 'pa',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Punjabi with English code-switching',
    llmInstruction:
      'Use conversational Punjabi with natural English business terms. Keep replies short.',
    mixedExample:
      'Friday appointment confirm ਕਰ ਦਿਓ.',
    searchTerms: ['punjabi', 'ਪੰਜਾਬੀ', 'india', 'pakistan'],
  }),
  profile({
    id: 'ur-en',
    displayName: 'Urdu + English',
    nativeName: 'اردو + English',
    region: 'India / Pakistan',
    sttPrimaryLanguage: 'ur',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Urdu with English code-switching',
    llmInstruction:
      'Use conversational Urdu with natural English business terms. Keep replies short.',
    mixedExample:
      'Friday کا appointment confirm کر دیں.',
    searchTerms: ['urdu', 'اردو', 'india', 'pakistan'],
  }),
  profile({
    id: 'as-en',
    displayName: 'Assamese + English',
    nativeName: 'অসমীয়া + English',
    region: 'India',
    sttPrimaryLanguage: 'as',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Assamese with English code-switching',
    llmInstruction:
      'Use conversational Assamese with natural English business terms. Keep replies short.',
    mixedExample:
      'Friday appointmentটো confirm কৰি দিয়ক.',
    searchTerms: ['assamese', 'অসমীয়া', 'india'],
  }),
  profile({
    id: 'ne-en',
    displayName: 'Nepali + English',
    nativeName: 'नेपाली + English',
    region: 'Nepal / India',
    sttPrimaryLanguage: 'ne',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'everyday spoken Nepali with English code-switching',
    llmInstruction:
      'Use conversational Nepali with natural English business terms. Keep replies short.',
    mixedExample:
      'Friday को appointment confirm गरिदिनुहोस्.',
    searchTerms: ['nepali', 'नेपाली', 'nepal', 'india'],
  }),
  profile({
    id: 'ar-en',
    displayName: 'Arabic + English',
    nativeName: 'العربية + English',
    region: 'Middle East / Global',
    sttPrimaryLanguage: 'ar',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural spoken Arabic with English code-switching',
    llmInstruction:
      'Use conversational Arabic with natural English terms. Keep replies short.',
    mixedExample:
      'ممكن confirm الموعد يوم Friday؟',
    searchTerms: ['arabic', 'العربية', 'middle east'],
  }),
  profile({
    id: 'es-en',
    displayName: 'Spanish + English',
    nativeName: 'Español + English',
    region: 'Global',
    sttPrimaryLanguage: 'es',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural conversational Spanish with English code-switching',
    llmInstruction:
      'Use conversational Spanish with natural English terms. Keep replies short.',
    mixedExample:
      'Por favor, confirma my appointment para Friday.',
    searchTerms: ['spanish', 'español', 'spain', 'latin america'],
  }),
  profile({
    id: 'fr-en',
    displayName: 'French + English',
    nativeName: 'Français + English',
    region: 'Global',
    sttPrimaryLanguage: 'fr',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural conversational French with English code-switching',
    llmInstruction:
      'Use conversational French with natural English terms. Keep replies short.',
    mixedExample:
      'Peux-tu confirm my appointment pour vendredi ?',
    searchTerms: ['french', 'français', 'france', 'canada'],
  }),
  profile({
    id: 'de-en',
    displayName: 'German + English',
    nativeName: 'Deutsch + English',
    region: 'Europe',
    sttPrimaryLanguage: 'de',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural conversational German with English code-switching',
    llmInstruction:
      'Use conversational German with natural English terms. Keep replies short.',
    mixedExample:
      'Bitte confirm den Termin für Friday.',
    searchTerms: ['german', 'deutsch', 'germany'],
  }),
  profile({
    id: 'pt-en',
    displayName: 'Portuguese + English',
    nativeName: 'Português + English',
    region: 'Brazil / Portugal',
    sttPrimaryLanguage: 'pt',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural conversational Portuguese with English code-switching',
    llmInstruction:
      'Use conversational Portuguese with natural English terms. Keep replies short.',
    mixedExample:
      'Pode confirmar my appointment para sexta?',
    searchTerms: ['portuguese', 'português', 'brazil', 'portugal'],
  }),
  profile({
    id: 'id-en',
    displayName: 'Indonesian + English',
    nativeName: 'Bahasa Indonesia + English',
    region: 'Indonesia',
    sttPrimaryLanguage: 'id',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural spoken Indonesian with English code-switching',
    llmInstruction:
      'Use conversational Indonesian with natural English terms. Keep replies short.',
    mixedExample:
      'Tolong confirm appointment saya untuk Friday.',
    searchTerms: ['indonesian', 'bahasa', 'indonesia'],
  }),
  profile({
    id: 'ja-en',
    displayName: 'Japanese + English',
    nativeName: '日本語 + English',
    region: 'Japan',
    sttPrimaryLanguage: 'ja',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural spoken Japanese with English code-switching',
    llmInstruction:
      'Use conversational Japanese with natural English terms. Keep replies short.',
    mixedExample:
      'Friday の appointment を confirm してください。',
    searchTerms: ['japanese', '日本語', 'japan'],
  }),
  profile({
    id: 'ko-en',
    displayName: 'Korean + English',
    nativeName: '한국어 + English',
    region: 'Korea',
    sttPrimaryLanguage: 'ko',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural spoken Korean with English code-switching',
    llmInstruction:
      'Use conversational Korean with natural English terms. Keep replies short.',
    mixedExample:
      'Friday appointment를 confirm해 주세요.',
    searchTerms: ['korean', '한국어', 'korea'],
  }),
  profile({
    id: 'zh-en',
    displayName: 'Mandarin + English',
    nativeName: '中文 + English',
    region: 'Global',
    sttPrimaryLanguage: 'zh',
    sttSecondaryLanguages: ['en'],
    llmLanguageName:
      'natural spoken Mandarin Chinese with English code-switching',
    llmInstruction:
      'Use conversational Mandarin with natural English terms. Keep replies short.',
    mixedExample:
      '请帮我 confirm Friday 的 appointment。',
    searchTerms: ['mandarin', 'chinese', '中文', 'china', 'taiwan', 'singapore'],
  }),
];

const profileMap = new Map(
  languageProfiles.map((item) => [item.id, item])
);

const legacyProfileMap: Readonly<Record<string, string>> = {
  'ta-IN': 'ta-en',
  'hi-IN': 'hi-en',
  'en-IN': 'en-in',
  multi: 'en-in',
};

export function getLanguageProfile(
  id: string | undefined
): LanguageProfile {
  const normalized = id?.trim();

  if (normalized) {
    const direct = profileMap.get(normalized);

    if (direct) {
      return direct;
    }

    const legacyId = legacyProfileMap[normalized];

    if (legacyId) {
      const legacy = profileMap.get(legacyId);

      if (legacy) {
        return legacy;
      }
    }
  }

  return profileMap.get('en-in')!;
}
