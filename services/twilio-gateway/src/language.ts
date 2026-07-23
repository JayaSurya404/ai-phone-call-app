import type {
  LanguageMode,
  SupportedLanguage,
} from './types.js';

export const supportedLanguages: readonly SupportedLanguage[] = [
  'en-IN',
  'ta-IN',
  'hi-IN',
];

const primaryLanguageMap: Record<string, SupportedLanguage> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
};

export interface CallerLanguageResolution {
  language: SupportedLanguage;
  detectedTag: string | null;
  detectionWasReliable: boolean;
  unexpectedDetection: boolean;
  explicitSwitch: LanguageMode | null;
}

function primaryTag(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return normalized.split('-')[0] ?? null;
}

export function normalizeLanguageMode(
  value: string | undefined,
): LanguageMode {
  const normalized = value?.trim().toLowerCase();

  if (normalized === 'ta' || normalized === 'ta-in') return 'ta-IN';
  if (normalized === 'hi' || normalized === 'hi-in') return 'hi-IN';
  if (
    normalized === 'en' ||
    normalized === 'en-in' ||
    normalized === 'en-us'
  ) {
    return 'en-IN';
  }

  return 'multi';
}

export function containsTamilScript(text: string): boolean {
  return /[\u0B80-\u0BFF]/u.test(text);
}

export function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/u.test(text);
}

function containsLatinLetters(text: string): boolean {
  return /[A-Za-z]/u.test(text);
}

export function explicitLanguageRequest(
  text: string,
): LanguageMode | null {
  const normalized = text
    .toLowerCase()
    .replaceAll(/[.,!?;:]/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();

  if (
    normalized.includes('speak tamil') ||
    normalized.includes('talk in tamil') ||
    normalized.includes('தமிழில் பேச') ||
    normalized.includes('தமிழ் பேச')
  ) {
    return 'ta-IN';
  }

  if (
    normalized.includes('speak hindi') ||
    normalized.includes('talk in hindi') ||
    normalized.includes('हिंदी में')
  ) {
    return 'hi-IN';
  }

  if (
    normalized.includes('speak english') ||
    normalized.includes('talk in english') ||
    normalized.includes('ஆங்கிலத்தில்')
  ) {
    return 'en-IN';
  }

  if (
    normalized.includes('automatic language') ||
    normalized.includes('mixed language') ||
    normalized.includes('switch automatically') ||
    normalized.includes('code switch')
  ) {
    return 'multi';
  }

  return null;
}

export function resolveCallerLanguage(
  text: string,
  detectedLanguage: string | undefined,
  lastReliableLanguage: SupportedLanguage,
): CallerLanguageResolution {
  const explicitSwitch = explicitLanguageRequest(text);

  if (explicitSwitch && explicitSwitch !== 'multi') {
    return {
      language: explicitSwitch,
      detectedTag: primaryTag(detectedLanguage),
      detectionWasReliable: true,
      unexpectedDetection: false,
      explicitSwitch,
    };
  }

  if (containsTamilScript(text)) {
    return {
      language: 'ta-IN',
      detectedTag: primaryTag(detectedLanguage),
      detectionWasReliable: true,
      unexpectedDetection: false,
      explicitSwitch,
    };
  }

  if (containsDevanagari(text)) {
    return {
      language: 'hi-IN',
      detectedTag: primaryTag(detectedLanguage),
      detectionWasReliable: true,
      unexpectedDetection: false,
      explicitSwitch,
    };
  }

  const detectedTag = primaryTag(detectedLanguage);

  if (detectedTag && detectedTag in primaryLanguageMap) {
    return {
      language: primaryLanguageMap[detectedTag]!,
      detectedTag,
      detectionWasReliable: true,
      unexpectedDetection: false,
      explicitSwitch,
    };
  }

  const unexpectedDetection = detectedTag !== null;

  if (containsLatinLetters(text) && !unexpectedDetection) {
    return {
      language: 'en-IN',
      detectedTag,
      detectionWasReliable: true,
      unexpectedDetection: false,
      explicitSwitch,
    };
  }

  return {
    language: lastReliableLanguage,
    detectedTag,
    detectionWasReliable: false,
    unexpectedDetection,
    explicitSwitch,
  };
}

export function responseLanguage(
  text: string,
  fallback: SupportedLanguage,
): SupportedLanguage {
  if (containsTamilScript(text)) return 'ta-IN';
  if (containsDevanagari(text)) return 'hi-IN';
  return fallback;
}

export function languageName(language: SupportedLanguage): string {
  switch (language) {
    case 'en-IN':
      return 'English';
    case 'ta-IN':
      return 'Tamil';
    case 'hi-IN':
      return 'Hindi';
  }
}
