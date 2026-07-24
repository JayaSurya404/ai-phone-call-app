import type {
  LanguageMode,
  SupportedLanguage,
} from './types.js';

export const supportedLanguages:
readonly SupportedLanguage[] = [
  'en-IN',
  'ta-IN',
  'hi-IN',
];

const primaryLanguageMap:
Record<
  string,
  SupportedLanguage
> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
};

export interface CallerLanguageResolution {
  language:
    SupportedLanguage;
  detectedTag:
    string | null;
  detectionWasReliable:
    boolean;
  unexpectedDetection:
    boolean;
  explicitSwitch:
    LanguageMode | null;
}

function primaryTag(
  value:
    string | undefined
): string | null {
  const normalized =
    value
      ?.trim()
      .toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    normalized.split('-')[0] ??
    null
  );
}

export function normalizeLanguageMode(
  value:
    string | undefined
): LanguageMode {
  const normalized =
    value
      ?.trim()
      .toLowerCase();

  if (
    normalized === 'ta' ||
    normalized === 'ta-in' ||
    normalized === 'tamil' ||
    normalized === 'à®¤à®®à®¿à®´à¯'
  ) {
    return 'ta-IN';
  }

  if (
    normalized === 'hi' ||
    normalized === 'hi-in' ||
    normalized === 'hindi' ||
    normalized === 'à¤¹à¤¿à¤‚à¤¦à¥€'
  ) {
    return 'hi-IN';
  }

  if (
    normalized === 'en' ||
    normalized === 'en-in' ||
    normalized === 'en-us' ||
    normalized === 'english'
  ) {
    return 'en-IN';
  }

  return 'multi';
}

export function transcriptionCode(
  language:
    LanguageMode
): string {
  switch (language) {
    case 'ta-IN':
      return 'ta';

    case 'hi-IN':
      return 'hi';

    case 'en-IN':
      return 'en-IN';

    case 'multi':
      return 'multi';
  }
}

export function containsTamilScript(
  text: string
): boolean {
  return /[\u0B80-\u0BFF]/u
    .test(text);
}

export function containsDevanagari(
  text: string
): boolean {
  return /[\u0900-\u097F]/u
    .test(text);
}

function containsLatinLetters(
  text: string
): boolean {
  return /[A-Za-z]/u
    .test(text);
}

export function explicitLanguageRequest(
  text: string
): LanguageMode | null {
  const normalized =
    text
      .toLowerCase()
      .replaceAll(
        /[.,!?;:]/gu,
        ' '
      )
      .replaceAll(
        /\s+/gu,
        ' '
      )
      .trim();

  if (
    normalized.includes(
      'speak tamil'
    ) ||
    normalized.includes(
      'talk in tamil'
    ) ||
    normalized.includes(
      'à®¤à®®à®¿à®´à®¿à®²à¯ à®ªà¯‡à®š'
    ) ||
    normalized.includes(
      'à®¤à®®à®¿à®´à¯ à®ªà¯‡à®š'
    )
  ) {
    return 'ta-IN';
  }

  if (
    normalized.includes(
      'speak hindi'
    ) ||
    normalized.includes(
      'talk in hindi'
    ) ||
    normalized.includes(
      'à¤¹à¤¿à¤‚à¤¦à¥€ à¤®à¥‡à¤‚'
    )
  ) {
    return 'hi-IN';
  }

  if (
    normalized.includes(
      'speak english'
    ) ||
    normalized.includes(
      'talk in english'
    ) ||
    normalized.includes(
      'à®†à®™à¯à®•à®¿à®²à®¤à¯à®¤à®¿à®²à¯'
    )
  ) {
    return 'en-IN';
  }

  if (
    normalized.includes(
      'automatic language'
    ) ||
    normalized.includes(
      'mixed language'
    ) ||
    normalized.includes(
      'switch automatically'
    )
  ) {
    return 'multi';
  }

  return null;
}

export function resolveCallerLanguage(
  text: string,
  detectedLanguage:
    string | undefined,
  lastReliableLanguage:
    SupportedLanguage
): CallerLanguageResolution {
  const explicitSwitch =
    explicitLanguageRequest(
      text
    );

  if (
    explicitSwitch &&
    explicitSwitch !== 'multi'
  ) {
    return {
      language:
        explicitSwitch,

      detectedTag:
        primaryTag(
          detectedLanguage
        ),

      detectionWasReliable:
        true,

      unexpectedDetection:
        false,

      explicitSwitch,
    };
  }

  if (
    containsTamilScript(text)
  ) {
    return {
      language: 'ta-IN',

      detectedTag:
        primaryTag(
          detectedLanguage
        ),

      detectionWasReliable:
        true,

      unexpectedDetection:
        false,

      explicitSwitch,
    };
  }

  if (
    containsDevanagari(text)
  ) {
    return {
      language: 'hi-IN',

      detectedTag:
        primaryTag(
          detectedLanguage
        ),

      detectionWasReliable:
        true,

      unexpectedDetection:
        false,

      explicitSwitch,
    };
  }

  const detectedTag =
    primaryTag(
      detectedLanguage
    );

  if (
    detectedTag &&
    detectedTag in
      primaryLanguageMap
  ) {
    return {
      language:
        primaryLanguageMap[
          detectedTag
        ]!,

      detectedTag,

      detectionWasReliable:
        true,

      unexpectedDetection:
        false,

      explicitSwitch,
    };
  }

  if (
    containsLatinLetters(text) &&
    detectedTag === null
  ) {
    return {
      language: 'en-IN',
      detectedTag,
      detectionWasReliable:
        true,
      unexpectedDetection:
        false,
      explicitSwitch,
    };
  }

  return {
    language:
      lastReliableLanguage,

    detectedTag,

    detectionWasReliable:
      false,

    unexpectedDetection:
      detectedTag !== null,

    explicitSwitch,
  };
}

export function responseLanguage(
  text: string,
  fallback:
    SupportedLanguage
): SupportedLanguage {
  if (
    containsTamilScript(text)
  ) {
    return 'ta-IN';
  }

  if (
    containsDevanagari(text)
  ) {
    return 'hi-IN';
  }

  return fallback;
}

export function languageName(
  language:
    SupportedLanguage
): string {
  switch (language) {
    case 'en-IN':
      return 'English';

    case 'ta-IN':
      return 'Tamil';

    case 'hi-IN':
      return 'Hindi';
  }
}