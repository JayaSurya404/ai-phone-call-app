import {
  performance,
} from 'node:perf_hooks';

import type {
  LanguageModelProvider,
  LanguageModelRequest,
  LanguageModelResult,
  ProviderHealth,
  SpeechToTextProvider,
  SpeechToTextRequest,
  SpeechToTextResult,
  TextToSpeechProvider,
  TextToSpeechRequest,
  TextToSpeechResult,
} from './contracts.js';

function elapsedMilliseconds(
  startedAt: number
): number {
  return Math.max(
    0,
    Math.round(
      performance.now() -
      startedAt
    )
  );
}

function createWaveAudio(
  text: string
): {
  audioBase64: string;
  sampleRateHz: number;
} {
  const sampleRateHz = 8000;

  const durationSeconds =
    Math.min(
      1.5,
      Math.max(
        0.35,
        text.length * 0.012
      )
    );

  const sampleCount =
    Math.floor(
      sampleRateHz *
      durationSeconds
    );

  const dataSize =
    sampleCount * 2;

  const buffer =
    Buffer.alloc(
      44 + dataSize
    );

  buffer.write(
    'RIFF',
    0,
    'ascii'
  );

  buffer.writeUInt32LE(
    36 + dataSize,
    4
  );

  buffer.write(
    'WAVE',
    8,
    'ascii'
  );

  buffer.write(
    'fmt ',
    12,
    'ascii'
  );

  buffer.writeUInt32LE(
    16,
    16
  );

  buffer.writeUInt16LE(
    1,
    20
  );

  buffer.writeUInt16LE(
    1,
    22
  );

  buffer.writeUInt32LE(
    sampleRateHz,
    24
  );

  buffer.writeUInt32LE(
    sampleRateHz * 2,
    28
  );

  buffer.writeUInt16LE(
    2,
    32
  );

  buffer.writeUInt16LE(
    16,
    34
  );

  buffer.write(
    'data',
    36,
    'ascii'
  );

  buffer.writeUInt32LE(
    dataSize,
    40
  );

  const frequency =
    360 +
    (
      text.length % 8
    ) * 25;

  for (
    let index = 0;
    index < sampleCount;
    index += 1
  ) {
    const envelope =
      Math.min(
        1,
        index / 200
      ) *
      Math.min(
        1,
        (
          sampleCount - index
        ) / 200
      );

    const sample =
      Math.sin(
        (
          2 *
          Math.PI *
          frequency *
          index
        ) /
        sampleRateHz
      ) *
      0.16 *
      envelope;

    buffer.writeInt16LE(
      Math.round(
        sample * 32767
      ),
      44 + index * 2
    );
  }

  return {
    audioBase64:
      buffer.toString(
        'base64'
      ),
    sampleRateHz,
  };
}

function latestUserMessage(
  request:
    LanguageModelRequest
): string {
  for (
    let index =
      request.messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    const message =
      request.messages[index];

    if (
      message?.role === 'user'
    ) {
      return message.content;
    }
  }

  return '';
}

function generateResponse(
  request:
    LanguageModelRequest
): string {
  const latest =
    latestUserMessage(
      request
    ).toLowerCase();

  if (
    latest.includes('yes') ||
    latest.includes('confirm') ||
    latest.includes('attend')
  ) {
    return (
      'Thank you for confirming. ' +
      'Your appointment has been noted.'
    );
  }

  if (
    latest.includes('no') ||
    latest.includes('cannot') ||
    latest.includes('reschedule')
  ) {
    return (
      'I understand. I will record ' +
      'that you need to reschedule.'
    );
  }

  if (
    latest.includes('who') ||
    latest.includes('why')
  ) {
    return (
      'I am the VoiceNexus AI assistant ' +
      'calling on behalf of the business.'
    );
  }

  return (
    'Thank you. Could you please confirm ' +
    'whether you are available for the appointment?'
  );
}

export function createSimulatedSpeechToTextProvider():
SpeechToTextProvider {
  return {
    name: 'simulated-stt',

    async transcribe(
      request:
        SpeechToTextRequest
    ): Promise<SpeechToTextResult> {
      const startedAt =
        performance.now();

      const decoded =
        Buffer.from(
          request.audioBase64,
          'base64'
        )
          .toString('utf8')
          .trim();

      return {
        text:
          decoded ||
          'Yes, I confirm the appointment.',
        confidence: 0.99,
        languageCode:
          request.languageCode,
        latencyMs:
          elapsedMilliseconds(
            startedAt
          ),
      };
    },

    async health():
    Promise<ProviderHealth> {
      return {
        name:
          'simulated-stt',
        ready: true,
        detail: null,
      };
    },

    async close():
    Promise<void> {
      return Promise.resolve();
    },
  };
}

export function createSimulatedLanguageModelProvider():
LanguageModelProvider {
  return {
    name: 'simulated-llm',

    async generate(
      request:
        LanguageModelRequest
    ): Promise<LanguageModelResult> {
      const startedAt =
        performance.now();

      return {
        text:
          generateResponse(
            request
          ),
        latencyMs:
          elapsedMilliseconds(
            startedAt
          ),
        model:
          'voicenexus-simulated-llm',
      };
    },

    async health():
    Promise<ProviderHealth> {
      return {
        name:
          'simulated-llm',
        ready: true,
        detail: null,
      };
    },

    async close():
    Promise<void> {
      return Promise.resolve();
    },
  };
}

export function createSimulatedTextToSpeechProvider():
TextToSpeechProvider {
  return {
    name: 'simulated-tts',

    async synthesize(
      request:
        TextToSpeechRequest
    ): Promise<TextToSpeechResult> {
      const startedAt =
        performance.now();

      const audio =
        createWaveAudio(
          request.text
        );

      return {
        audioBase64:
          audio.audioBase64,
        mimeType:
          'audio/wav',
        sampleRateHz:
          audio.sampleRateHz,
        latencyMs:
          elapsedMilliseconds(
            startedAt
          ),
        voice:
          request.voice ??
          'simulated-neutral',
      };
    },

    async health():
    Promise<ProviderHealth> {
      return {
        name:
          'simulated-tts',
        ready: true,
        detail: null,
      };
    },

    async close():
    Promise<void> {
      return Promise.resolve();
    },
  };
}