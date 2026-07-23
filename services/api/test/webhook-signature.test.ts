import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWebhookSignature,
  verifyWebhookSignature,
  WebhookSignatureError,
} from '../src/security/webhook-signature.js';

const secret =
  'test-webhook-secret';

const payload = {
  eventId: 'event-1',
  type: 'ringing',
  nested: {
    beta: 2,
    alpha: 1,
  },
};

void test(
  'webhook signature validates canonical payloads',
  () => {
    const timestamp =
      '1784780000';

    const signature =
      createWebhookSignature(
        secret,
        timestamp,
        payload
      );

    assert.doesNotThrow(
      () => {
        verifyWebhookSignature(
          secret,
          timestamp,
          signature,
          {
            nested: {
              alpha: 1,
              beta: 2,
            },
            type: 'ringing',
            eventId: 'event-1',
          },
          300,
          1784780000 * 1000
        );
      }
    );
  }
);

void test(
  'webhook signature rejects tampering',
  () => {
    const timestamp =
      '1784780000';

    assert.throws(
      () => {
        verifyWebhookSignature(
          secret,
          timestamp,
          'sha256=invalid',
          payload,
          300,
          1784780000 * 1000
        );
      },
      WebhookSignatureError
    );
  }
);

void test(
  'webhook signature rejects stale timestamps',
  () => {
    const timestamp =
      '1784770000';

    const signature =
      createWebhookSignature(
        secret,
        timestamp,
        payload
      );

    assert.throws(
      () => {
        verifyWebhookSignature(
          secret,
          timestamp,
          signature,
          payload,
          300,
          1784780000 * 1000
        );
      },
      /outside the accepted window/
    );
  }
);