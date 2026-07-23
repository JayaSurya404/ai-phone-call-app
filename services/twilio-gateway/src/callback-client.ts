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
} from './types.js';

export async function sendProviderEvent(
  call: ActiveGatewayCall,
  type: ProviderEventType,
  values: Omit<
    ProviderEvent,
    | 'eventId'
    | 'sessionId'
    | 'callSessionId'
    | 'occurredAt'
    | 'type'
  > = {}
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
      }
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      body ||
      `VoiceNexus callback returned HTTP ${response.status}.`
    );
  }
}