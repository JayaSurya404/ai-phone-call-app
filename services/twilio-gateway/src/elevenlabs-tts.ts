import {
  randomUUID,
} from 'node:crypto';

import WebSocket from 'ws';

import type {
  LanguageProfile,
} from './language-profiles.js';

const twilioChunkBytes = 320;

export interface TwilioSpeechOptions {
  apiKey: string;
  voiceId: string;
  profile: LanguageProfile;
  text: string;
  socket: WebSocket;
  streamSid: string;
  signal: AbortSignal;
}

function resolveVoiceId(
  defaultVoiceId: string,
  profile: LanguageProfile
): string {
  const environmentKey =
    'ELEVENLABS_VOICE_ID_' +
    profile.id
      .replace(/-/g, '_')
      .toUpperCase();

  const profileVoiceId =
    process.env[environmentKey]?.trim();

  return profileVoiceId || defaultVoiceId;
}

function sendTwilioMedia(
  socket: WebSocket,
  streamSid: string,
  audio: Uint8Array
): void {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(
    JSON.stringify({
      event: 'media',
      streamSid,
      media: {
        payload: Buffer
          .from(audio)
          .toString('base64'),
      },
    })
  );
}

export function sendTwilioClear(
  socket: WebSocket,
  streamSid: string
): void {
  if (socket.readyState !== WebSocket.OPEN) {
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
  if (socket.readyState !== WebSocket.OPEN) {
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
  options: TwilioSpeechOptions
): Promise<string> {
  const voiceId = resolveVoiceId(
    options.voiceId,
    options.profile
  );

  const url = new URL(
    'https://api.elevenlabs.io/v1/text-to-speech/' +
    `${encodeURIComponent(voiceId)}/stream`
  );

  url.searchParams.set(
    'output_format',
    'ulaw_8000'
  );

  url.searchParams.set(
    'optimize_streaming_latency',
    '1'
  );

  const requestBody: {
    text: string;
    model_id: string;
    language_code?: string;
    voice_settings: {
      stability: number;
      similarity_boost: number;
      style: number;
      use_speaker_boost: boolean;
    };
    apply_text_normalization: 'auto';
  } = {
    text: options.text,
    model_id: options.profile.ttsModel,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    },
    apply_text_normalization: 'auto',
  };

  if (
    options.profile.ttsModel !==
    'eleven_multilingual_v2'
  ) {
    requestBody.language_code =
      options.profile.sttPrimaryLanguage;
  }

  const response = await fetch(
    url,
    {
      method: 'POST',
      headers: {
        'xi-api-key': options.apiKey,
        'content-type': 'application/json',
        accept: 'audio/basic',
      },
      signal: options.signal,
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      body ||
      `ElevenLabs TTS returned HTTP ${response.status}.`
    );
  }

  if (!response.body) {
    throw new Error(
      'ElevenLabs TTS returned no audio stream.'
    );
  }

  const reader = response.body.getReader();

  while (true) {
    const result = await reader.read();

    if (result.done) {
      break;
    }

    const value = result.value;

    for (
      let offset = 0;
      offset < value.length;
      offset += twilioChunkBytes
    ) {
      if (options.signal.aborted) {
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
            offset + twilioChunkBytes,
            value.length
          )
        )
      );
    }
  }

  const markName = `ai-${randomUUID()}`;

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
    error.name === 'AbortError'
  );
}
