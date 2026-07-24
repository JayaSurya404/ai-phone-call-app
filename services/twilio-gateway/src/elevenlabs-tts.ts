import {
  randomUUID,
} from 'node:crypto';

import WebSocket
  from 'ws';

import type {
  LanguageProfile,
} from './language-profiles.js';

const twilioChunkBytes =
  320;

export interface TwilioSpeechOptions {
  apiKey: string;
  voiceId: string;
  profile:
    LanguageProfile;
  text: string;
  socket: WebSocket;
  streamSid: string;
  signal:
    AbortSignal;
}

function sendTwilioMedia(
  socket: WebSocket,
  streamSid: string,
  audio:
    Uint8Array
): void {
  if (
    socket.readyState !==
    WebSocket.OPEN
  ) {
    return;
  }

  socket.send(
    JSON.stringify({
      event: 'media',
      streamSid,

      media: {
        payload:
          Buffer.from(audio)
            .toString(
              'base64'
            ),
      },
    })
  );
}

export function sendTwilioClear(
  socket: WebSocket,
  streamSid: string
): void {
  if (
    socket.readyState !==
    WebSocket.OPEN
  ) {
    return;
  }

  socket.send(
    JSON.stringify({
      event: 'clear',
      streamSid,
    })
  );
}

function sendTwilioMark(
  socket: WebSocket,
  streamSid: string,
  name: string
): void {
  if (
    socket.readyState !==
    WebSocket.OPEN
  ) {
    return;
  }

  socket.send(
    JSON.stringify({
      event: 'mark',
      streamSid,

      mark: {
        name,
      },
    })
  );
}

export async function streamSpeechToTwilio(
  options:
    TwilioSpeechOptions
): Promise<string> {
  const url =
    new URL(
      (
        'https://api.elevenlabs.io/v1/text-to-speech/' +
        `${encodeURIComponent(
          options.voiceId
        )}/stream`
      )
    );

  url.searchParams.set(
    'output_format',
    'ulaw_8000'
  );

  url.searchParams.set(
    'optimize_streaming_latency',
    '3'
  );

  const response =
    await fetch(
      url,
      {
        method: 'POST',

        headers: {
          'xi-api-key':
            options.apiKey,

          'content-type':
            'application/json',

          accept:
            'audio/basic',
        },

        signal:
          options.signal,

        body:
          JSON.stringify({
            text:
              options.text,

            model_id:
              options.profile
                .ttsModel,

            voice_settings: {
              stability: 0.48,
              similarity_boost:
                0.78,
              style: 0.18,
              use_speaker_boost:
                true,
            },

            apply_text_normalization:
              'auto',
          }),
      }
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      body ||
      (
        `ElevenLabs TTS returned HTTP ` +
        `${response.status}.`
      )
    );
  }

  if (!response.body) {
    throw new Error(
      'ElevenLabs TTS returned no audio stream.'
    );
  }

  const reader =
    response.body
      .getReader();

  while (true) {
    const result =
      await reader.read();

    if (result.done) {
      break;
    }

    const value =
      result.value;

    for (
      let offset = 0;
      offset < value.length;
      offset +=
        twilioChunkBytes
    ) {
      if (
        options.signal
          .aborted
      ) {
        throw new DOMException(
          'Speech interrupted.',
          'AbortError'
        );
      }

      sendTwilioMedia(
        options.socket,
        options.streamSid,
        value.subarray(
          offset,
          Math.min(
            offset +
              twilioChunkBytes,
            value.length
          )
        )
      );
    }
  }

  const markName =
    `ai-${randomUUID()}`;

  sendTwilioMark(
    options.socket,
    options.streamSid,
    markName
  );

  return markName;
}

export function isAbortError(
  error: unknown
): boolean {
  return (
    error instanceof Error &&
    error.name ===
      'AbortError'
  );
}