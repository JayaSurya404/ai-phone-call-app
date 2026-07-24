function escapeXml(
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

export interface MediaStreamTwimlOptions {
  webSocketUrl: string;
  callSessionId: string;
  languageProfileId: string;
}

export function buildMediaStreamTwiml(
  options:
    MediaStreamTwimlOptions
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',

    '<Response>',

    '  <Connect>',

    (
      `    <Stream url="${escapeXml(
        options.webSocketUrl
      )}">`
    ),

    (
      `      <Parameter ` +
      `name="callSessionId" ` +
      `value="${escapeXml(
        options.callSessionId
      )}" />`
    ),

    (
      `      <Parameter ` +
      `name="languageProfileId" ` +
      `value="${escapeXml(
        options.languageProfileId
      )}" />`
    ),

    '    </Stream>',

    '  </Connect>',

    '</Response>',
  ].join('\n');
}