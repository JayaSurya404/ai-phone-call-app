import {
  randomUUID,
} from 'node:crypto';

import {
  createVoiceNexusSignature,
} from './signature.js';

import type {
  ActiveGatewayCall,
  ProviderEvent,
  ProviderEventType,
  ProviderEventValues,
} from './types.js';

const callbackAttempts = 4;
const callbackTimeoutMs = 4_000;

function delay(
  milliseconds: number
): Promise<void> {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function errorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

export async function sendProviderEvent(
  call: ActiveGatewayCall,
  type: ProviderEventType,
  values:
    ProviderEventValues = {}
): Promise<void> {
  const payload:
    ProviderEvent = {
      eventId:
        randomUUID(),

      sessionId:
        call.providerCallId,

      callSessionId:
        call.callSessionId,

      occurredAt:
        new Date()
          .toISOString(),

      type,

      ...values,
    };

  let lastError =
    'Unknown callback error.';

  for (
    let attempt = 1;
    attempt <= callbackAttempts;
    attempt += 1
  ) {
    const timestamp =
      String(
        Math.floor(
          Date.now() /
          1000
        )
      );

    const signature =
      createVoiceNexusSignature(
        call.callback
          .signingSecret,
        timestamp,
        payload
      );

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        callbackTimeoutMs
      );

    try {
      const response =
        await fetch(
          call.callback.url,
          {
            method: 'POST',

            headers: {
              'content-type':
                'application/json',

              'x-voicenexus-timestamp':
                timestamp,

              'x-voicenexus-signature':
                signature,
            },

            body:
              JSON.stringify(
                payload
              ),

            signal:
              controller.signal,
          }
        );

      if (response.ok) {
        return;
      }

      const body =
        await response.text();

      lastError =
        body ||
        (
          `VoiceNexus callback returned ` +
          `HTTP ${response.status}.`
        );
    } catch (error) {
      lastError =
        errorMessage(error);
    } finally {
      clearTimeout(
        timeout
      );
    }

    if (
      attempt <
      callbackAttempts
    ) {
      await delay(
        250 *
        2 **
          (attempt - 1)
      );
    }
  }

  throw new Error(
    lastError
  );
}