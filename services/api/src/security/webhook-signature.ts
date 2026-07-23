import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

export class WebhookSignatureError
  extends Error {
  readonly statusCode = 401;

  constructor(message: string) {
    super(message);
    this.name =
      'WebhookSignatureError';
  }
}

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
    const entries =
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
        );

    return Object.fromEntries(
      entries
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

export function createWebhookSignature(
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

function equalSignatures(
  expected: string,
  actual: string
): boolean {
  const expectedBuffer =
    Buffer.from(
      expected,
      'utf8'
    );

  const actualBuffer =
    Buffer.from(
      actual,
      'utf8'
    );

  return (
    expectedBuffer.length ===
      actualBuffer.length &&
    timingSafeEqual(
      expectedBuffer,
      actualBuffer
    )
  );
}

export function verifyWebhookSignature(
  secret: string,
  timestamp: string | undefined,
  signature: string | undefined,
  payload: unknown,
  maxAgeSeconds: number,
  nowMilliseconds:
    number = Date.now()
): void {
  if (
    !timestamp ||
    !signature
  ) {
    throw new WebhookSignatureError(
      'Webhook signature headers are required.'
    );
  }

  const timestampSeconds =
    Number(timestamp);

  if (
    !Number.isFinite(
      timestampSeconds
    )
  ) {
    throw new WebhookSignatureError(
      'Webhook timestamp is invalid.'
    );
  }

  const ageMilliseconds =
    Math.abs(
      nowMilliseconds -
      timestampSeconds * 1000
    );

  if (
    ageMilliseconds >
    maxAgeSeconds * 1000
  ) {
    throw new WebhookSignatureError(
      'Webhook timestamp is outside the accepted window.'
    );
  }

  const expected =
    createWebhookSignature(
      secret,
      timestamp,
      payload
    );

  if (
    !equalSignatures(
      expected,
      signature
    )
  ) {
    throw new WebhookSignatureError(
      'Webhook signature is invalid.'
    );
  }
}