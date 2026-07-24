import {
  transcriptionCode,
} from './language.js';

import type {
  LanguageMode,
} from './types.js';

export function escapeXml(
  value: string
): string {
  return value
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&apos;'
    );
}

export interface ConversationRelayTwimlOptions {
  webSocketUrl: string;
  callSessionId: string;
  welcomeGreeting: string;
  actionUrl: string;
  languageMode:
    LanguageMode;
  englishVoice: string;
  tamilVoice: string;
  hindiVoice: string;
}

function languageHint(
  code: string
): string {
  return (
    `      <Language ` +
    `code="${escapeXml(code)}" />`
  );
}

export function buildConversationRelayTwiml(
  options:
    ConversationRelayTwimlOptions
): string {
  const automaticMode =
    options.languageMode ===
    'multi';

  const sttLanguage =
    transcriptionCode(
      options.languageMode
    );

  const speechModel =
    automaticMode
      ? 'flux'
      : 'nova-3-general';

  const attributes = [
    (
      `url="${escapeXml(
        options.webSocketUrl
      )}"`
    ),

    (
      `welcomeGreeting="${escapeXml(
        options.welcomeGreeting
      )}"`
    ),

    'welcomeGreetingInterruptible="speech"',

    // ElevenLabs detects Tamil,
    // English, and mixed output
    // from each text token.
    'ttsLanguage="multi"',

    (
      `transcriptionLanguage="${escapeXml(
        sttLanguage
      )}"`
    ),

    'ttsProvider="ElevenLabs"',
    'transcriptionProvider="Deepgram"',

    (
      `speechModel="${speechModel}"`
    ),

    'speechTimeout="900"',
    'interruptible="speech"',
    'interruptSensitivity="medium"',
    'reportInputDuringAgentSpeech="speech"',
    'preemptible="true"',
    'deepgramSmartFormat="true"',
  ];

  if (automaticMode) {
    attributes.push(
      'partialPrompts="false"'
    );
  }

  // Flux automatic language
  // detection supports English
  // and Hindi, but not Tamil.
  // Tamil uses fixed ta +
  // Nova-3 mode instead.
  const languageHints =
    automaticMode
      ? [
          languageHint('en'),
          languageHint('hi'),
        ]
      : [];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',

    '<Response>',

    (
      `  <Connect action="${escapeXml(
        options.actionUrl
      )}">`
    ),

    (
      `    <ConversationRelay ` +
      `${attributes.join(' ')}>`
    ),

    ...languageHints,

    (
      `      <Parameter ` +
      `name="callSessionId" ` +
      `value="${escapeXml(
        options.callSessionId
      )}" />`
    ),

    '    </ConversationRelay>',

    '  </Connect>',

    '</Response>',
  ].join('\n');
}