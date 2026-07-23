import type { LanguageMode } from './types.js';

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export interface ConversationRelayTwimlOptions {
  webSocketUrl: string;
  callSessionId: string;
  welcomeGreeting: string;
  actionUrl: string;
  languageMode: LanguageMode;
  englishVoice: string;
  tamilVoice: string;
  hindiVoice: string;
}

function languageElement(code: string, voice: string): string {
  return (
    `      <Language ` +
    `code="${escapeXml(code)}" ` +
    `ttsProvider="ElevenLabs" ` +
    `voice="${escapeXml(voice)}" ` +
    `transcriptionProvider="Deepgram" ` +
    `speechModel="flux" />`
  );
}

export function buildConversationRelayTwiml(
  options: ConversationRelayTwimlOptions,
): string {
  const greetingAttribute = options.welcomeGreeting
    ? ` welcomeGreeting="${escapeXml(options.welcomeGreeting)}"`
    : '';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    `  <Connect action="${escapeXml(options.actionUrl)}">`,
    `    <ConversationRelay url="${escapeXml(options.webSocketUrl)}"` +
      greetingAttribute +
      ` welcomeGreetingInterruptible="speech"` +
      ` language="${escapeXml(options.languageMode)}"` +
      ` ttsLanguage="${escapeXml(options.languageMode)}"` +
      ` transcriptionLanguage="${escapeXml(options.languageMode)}"` +
      ` ttsProvider="ElevenLabs"` +
      ` transcriptionProvider="Deepgram"` +
      ` speechModel="flux"` +
      ` speechTimeout="850"` +
      ` interruptible="speech"` +
      ` interruptSensitivity="high"` +
      ` reportInputDuringAgentSpeech="speech"` +
      ` ignoreBackchannel="true"` +
      ` preemptible="true"` +
      ` partialPrompts="false"` +
      ` deepgramSmartFormat="true"` +
      ` events="speaker-events tokens-played">`,
    languageElement('en-IN', options.englishVoice),
    languageElement('ta-IN', options.tamilVoice),
    languageElement('hi-IN', options.hindiVoice),
    `      <Parameter name="callSessionId" value="${escapeXml(
      options.callSessionId,
    )}" />`,
    '    </ConversationRelay>',
    '  </Connect>',
    '</Response>',
  ].join('\n');
}
