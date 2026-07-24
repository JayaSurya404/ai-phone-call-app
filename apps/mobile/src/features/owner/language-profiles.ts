export interface MobileLanguageProfile {
  id: string;
  displayName: string;
  nativeName: string;
  region: string;
  description: string;
  searchTerms: readonly string[];
}

export const mobileLanguageProfiles:
readonly MobileLanguageProfile[] = [
  {
    id: 'en-in',
    displayName: 'English (India)',
    nativeName: 'English',
    region: 'India',
    description: 'Natural Indian English',
    searchTerms: ['english', 'india', 'indian'],
  },
  {
    id: 'ta-en',
    displayName: 'Tamil + English',
    nativeName: 'தமிழ் + English',
    region: 'India',
    description: 'Tamil-English mixed conversation',
    searchTerms: ['tamil', 'tamizh', 'தமிழ்', 'india'],
  },
  {
    id: 'hi-en',
    displayName: 'Hindi + English',
    nativeName: 'हिन्दी + English',
    region: 'India',
    description: 'Hindi-English mixed conversation',
    searchTerms: ['hindi', 'हिन्दी', 'हिंदी', 'india'],
  },
  {
    id: 'kn-en',
    displayName: 'Kannada + English',
    nativeName: 'ಕನ್ನಡ + English',
    region: 'India',
    description: 'Kannada-English mixed conversation',
    searchTerms: ['kannada', 'ಕನ್ನಡ', 'india'],
  },
  {
    id: 'te-en',
    displayName: 'Telugu + English',
    nativeName: 'తెలుగు + English',
    region: 'India',
    description: 'Telugu-English mixed conversation',
    searchTerms: ['telugu', 'తెలుగు', 'india'],
  },
  {
    id: 'ml-en',
    displayName: 'Malayalam + English',
    nativeName: 'മലയാളം + English',
    region: 'India',
    description: 'Malayalam-English mixed conversation',
    searchTerms: ['malayalam', 'മലയാളം', 'india'],
  },
  {
    id: 'bn-en',
    displayName: 'Bengali + English',
    nativeName: 'বাংলা + English',
    region: 'India / Bangladesh',
    description: 'Bengali-English mixed conversation',
    searchTerms: ['bengali', 'bangla', 'বাংলা', 'india', 'bangladesh'],
  },
  {
    id: 'mr-en',
    displayName: 'Marathi + English',
    nativeName: 'मराठी + English',
    region: 'India',
    description: 'Marathi-English mixed conversation',
    searchTerms: ['marathi', 'मराठी', 'india'],
  },
  {
    id: 'gu-en',
    displayName: 'Gujarati + English',
    nativeName: 'ગુજરાતી + English',
    region: 'India',
    description: 'Gujarati-English mixed conversation',
    searchTerms: ['gujarati', 'ગુજરાતી', 'india'],
  },
  {
    id: 'pa-en',
    displayName: 'Punjabi + English',
    nativeName: 'ਪੰਜਾਬੀ + English',
    region: 'India / Pakistan',
    description: 'Punjabi-English mixed conversation',
    searchTerms: ['punjabi', 'ਪੰਜਾਬੀ', 'india', 'pakistan'],
  },
  {
    id: 'ur-en',
    displayName: 'Urdu + English',
    nativeName: 'اردو + English',
    region: 'India / Pakistan',
    description: 'Urdu-English mixed conversation',
    searchTerms: ['urdu', 'اردو', 'india', 'pakistan'],
  },
  {
    id: 'as-en',
    displayName: 'Assamese + English',
    nativeName: 'অসমীয়া + English',
    region: 'India',
    description: 'Assamese-English mixed conversation',
    searchTerms: ['assamese', 'অসমীয়া', 'india'],
  },
  {
    id: 'ne-en',
    displayName: 'Nepali + English',
    nativeName: 'नेपाली + English',
    region: 'Nepal / India',
    description: 'Nepali-English mixed conversation',
    searchTerms: ['nepali', 'नेपाली', 'nepal', 'india'],
  },
  {
    id: 'ar-en',
    displayName: 'Arabic + English',
    nativeName: 'العربية + English',
    region: 'Middle East / Global',
    description: 'Arabic-English mixed conversation',
    searchTerms: ['arabic', 'العربية', 'middle east'],
  },
  {
    id: 'es-en',
    displayName: 'Spanish + English',
    nativeName: 'Español + English',
    region: 'Global',
    description: 'Spanish-English mixed conversation',
    searchTerms: ['spanish', 'español', 'spain', 'latin america'],
  },
  {
    id: 'fr-en',
    displayName: 'French + English',
    nativeName: 'Français + English',
    region: 'Global',
    description: 'French-English mixed conversation',
    searchTerms: ['french', 'français', 'france', 'canada'],
  },
  {
    id: 'de-en',
    displayName: 'German + English',
    nativeName: 'Deutsch + English',
    region: 'Europe',
    description: 'German-English mixed conversation',
    searchTerms: ['german', 'deutsch', 'germany'],
  },
  {
    id: 'pt-en',
    displayName: 'Portuguese + English',
    nativeName: 'Português + English',
    region: 'Brazil / Portugal',
    description: 'Portuguese-English mixed conversation',
    searchTerms: ['portuguese', 'português', 'brazil', 'portugal'],
  },
  {
    id: 'id-en',
    displayName: 'Indonesian + English',
    nativeName: 'Bahasa Indonesia + English',
    region: 'Indonesia',
    description: 'Indonesian-English mixed conversation',
    searchTerms: ['indonesian', 'bahasa', 'indonesia'],
  },
  {
    id: 'ja-en',
    displayName: 'Japanese + English',
    nativeName: '日本語 + English',
    region: 'Japan',
    description: 'Japanese-English mixed conversation',
    searchTerms: ['japanese', '日本語', 'japan'],
  },
  {
    id: 'ko-en',
    displayName: 'Korean + English',
    nativeName: '한국어 + English',
    region: 'Korea',
    description: 'Korean-English mixed conversation',
    searchTerms: ['korean', '한국어', 'korea'],
  },
  {
    id: 'zh-en',
    displayName: 'Mandarin + English',
    nativeName: '中文 + English',
    region: 'Global',
    description: 'Mandarin-English mixed conversation',
    searchTerms: ['mandarin', 'chinese', '中文', 'china', 'taiwan', 'singapore'],
  },
];

const profileMap = new Map(
  mobileLanguageProfiles.map((profile) => [profile.id, profile])
);

const legacyMap: Readonly<Record<string, string>> = {
  'ta-IN': 'ta-en',
  'hi-IN': 'hi-en',
  'en-IN': 'en-in',
  multi: 'en-in',
};

export function getMobileLanguageProfile(
  id: string
): MobileLanguageProfile {
  const normalized = legacyMap[id] ?? id;

  return (
    profileMap.get(normalized) ??
    profileMap.get('en-in')!
  );
}
