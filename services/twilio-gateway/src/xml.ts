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

  // Retained for compatibility
  // with the existing server
  // configuration. The safe
  // TwiML intentionally lets
  // Twilio select its current
  // default voice per language.
  englishVoice: string;
  tamilVoice: string;
  hindiVoice: string;
}

function languageHint(
  code: string
): string {
  // The parent relay owns the
  // Deepgram Flux and ElevenLabs
  // provider configuration.
  // Child Language elements are
  // only language hints in multi
  // mode. Do not override Flux or
  // voices here because invalid
  // provider/model combinations
  // terminate the relay.
  return (
    `      <Language ` +
    `code="${escapeXml(code)}" />`
  );
}

function commonAttributes(
  options:
    ConversationRelayTwimlOptions
): string[] {
  const attributes = [
    (
      `url="${escapeXml(
        options.webSocketUrl
      )}"`
    ),

    (
      `welcomeGreetingInterruptible="speech"`
    ),

    (
      `language="${escapeXml(
        options.languageMode
      )}"`
    ),

    (
      `ttsLanguage="${escapeXml(
        options.languageMode
      )}"`
    ),

    (
      `transcriptionLanguage="${escapeXml(
        options.languageMode
      )}"`
    ),

    'ttsProvider="ElevenLabs"',
    'transcriptionProvider="Deepgram"',
    'speechTimeout="900"',
    'interruptible="speech"',
    'interruptSensitivity="medium"',
    'reportInputDuringAgentSpeech="speech"',
    'preemptible="true"',
    'deepgramSmartFormat="true"',
  ];

  if (
    options.welcomeGreeting
  ) {
    attributes.push(
      (
        `welcomeGreeting="${escapeXml(
          options.welcomeGreeting
        )}"`
      )
    );
  }

  if (
    options.languageMode ===
    'multi'
  ) {
    attributes.push(
      'speechModel="flux"',
      'partialPrompts="false"'
    );
  }

  return attributes;
}

export function buildConversationRelayTwiml(
  options:
    ConversationRelayTwimlOptions
): string {
  const relayAttributes =
    commonAttributes(options)
      .join(' ');

  const languageHints =
    options.languageMode ===
      'multi'
      ? [
          languageHint(
            'en-IN'
          ),

          languageHint(
            'ta-IN'
          ),

          languageHint(
            'hi-IN'
          ),
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
      `${relayAttributes}>`
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