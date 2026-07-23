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
}

export function buildConversationRelayTwiml(
  options:
    ConversationRelayTwimlOptions
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',

    '<Response>',

    `  <Connect action="${escapeXml(
      options.actionUrl
    )}">`,

    (
      `    <ConversationRelay ` +
      `url="${escapeXml(
        options.webSocketUrl
      )}" ` +
      `welcomeGreeting="${escapeXml(
        options.welcomeGreeting
      )}" ` +
      `welcomeGreetingInterruptible="speech" ` +
      `language="multi" ` +
      `ttsLanguage="multi" ` +
      `transcriptionLanguage="multi" ` +
      `ttsProvider="ElevenLabs" ` +
      `transcriptionProvider="Deepgram" ` +
      `speechTimeout="900" ` +
      `interruptible="speech" ` +
      `interruptSensitivity="high" ` +
      `reportInputDuringAgentSpeech="speech" ` +
      `ignoreBackchannel="true" ` +
      `preemptible="true" ` +
      `partialPrompts="false" ` +
      `deepgramSmartFormat="true" ` +
      `events="speaker-events tokens-played">`
    ),

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