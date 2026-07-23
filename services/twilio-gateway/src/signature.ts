import {
  createHmac,
} from 'node:crypto';

function canonicalValue(
  value: unknown
): unknown {
  if (Array.isArray(value)) {
    return value.map(
      canonicalValue
    );
  }

  if (
    typeof value === 'object' &&
    value !== null
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(
          (
            first,
            second
          ) =>
            first[0].localeCompare(
              second[0]
            )
        )
        .map(
          ([key, item]) => [
            key,
            canonicalValue(item),
          ]
        )
    );
  }

  return value;
}

export function canonicalJson(
  value: unknown
): string {
  return JSON.stringify(
    canonicalValue(value)
  );
}

export function createVoiceNexusSignature(
  secret: string,
  timestamp: string,
  payload: unknown
): string {
  const digest =
    createHmac(
      'sha256',
      secret
    )
      .update(timestamp)
      .update('.')
      .update(
        canonicalJson(payload)
      )
      .digest('hex');

  return `sha256=${digest}`;
}