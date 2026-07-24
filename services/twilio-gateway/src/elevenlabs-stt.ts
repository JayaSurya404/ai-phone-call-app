import WebSocket
  from 'ws';

import type {
  LanguageProfile,
} from './language-profiles.js';

export interface RealtimeSttCallbacks {
  onPartial(
    text: string
  ): void;

  onCommitted(
    text: string,
    detectedLanguage:
      string | undefined
  ): void;

  onError(
    error: Error
  ): void;
}

interface ScribeMessage {
  message_type?: string;
  text?: string;
  language_code?: string;
  error?: string;
  message?: string;
}

export function buildRealtimeSttUrl(
  options: {
    modelId: string;
    profile:
      LanguageProfile;
  }
): string {
  const url =
    new URL(
      'wss://api.elevenlabs.io/v1/speech-to-text/realtime'
    );

  url.searchParams.set(
    'model_id',
    options.modelId
  );

  url.searchParams.set(
    'audio_format',
    'ulaw_8000'
  );

  url.searchParams.set(
    'language_code',
    options.profile
      .sttPrimaryLanguage
  );

  for (
    const secondaryLanguage
    of options.profile
      .sttSecondaryLanguages
  ) {
    url.searchParams.append(
      'secondary_languages',
      secondaryLanguage
    );
  }

  url.searchParams.set(
    'commit_strategy',
    'vad'
  );

  url.searchParams.set(
    'vad_threshold',
    '0.35'
  );

  url.searchParams.set(
    'vad_silence_threshold_secs',
    '0.8'
  );

  url.searchParams.set(
    'min_speech_duration_ms',
    '180'
  );

  url.searchParams.set(
    'min_silence_duration_ms',
    '300'
  );

  url.searchParams.set(
    'include_language_detection',
    'true'
  );

  return url.toString();
}

export class ElevenLabsRealtimeStt {
  private socket:
    WebSocket | null =
    null;

  private lastCommittedText =
    '';

  private lastCommittedAt =
    0;

  public constructor(
    private readonly options: {
      apiKey: string;
      modelId: string;
      profile:
        LanguageProfile;
      callbacks:
        RealtimeSttCallbacks;
    }
  ) {}

  public async connect():
  Promise<void> {
    if (this.socket) {
      return;
    }

    const socket =
      new WebSocket(
        buildRealtimeSttUrl({
          modelId:
            this.options
              .modelId,

          profile:
            this.options
              .profile,
        }),

        {
          headers: {
            'xi-api-key':
              this.options
                .apiKey,
          },
        }
      );

    this.socket =
      socket;

    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        const timeout =
          setTimeout(
            () => {
              reject(
                new Error(
                  'ElevenLabs STT WebSocket connection timed out.'
                )
              );
            },
            10_000
          );

        const finish =
          (
            callback:
              () => void
          ) => {
            clearTimeout(
              timeout
            );

            callback();
          };

        socket.once(
          'open',

          () => {
            finish(resolve);
          }
        );

        socket.once(
          'error',

          (error) => {
            finish(
              () => {
                reject(error);
              }
            );
          }
        );
      }
    );

    socket.on(
      'message',

      (data) => {
        this.handleMessage(
          data.toString()
        );
      }
    );

    socket.on(
      'error',

      (error) => {
        this.options
          .callbacks
          .onError(error);
      }
    );

    socket.on(
      'close',

      (
        code,
        reason
      ) => {
        if (
          code !== 1000 &&
          code !== 1005
        ) {
          this.options
            .callbacks
            .onError(
              new Error(
                (
                  `ElevenLabs STT closed with code ${code}: ` +
                  reason.toString()
                )
              )
            );
        }
      }
    );
  }

  private handleMessage(
    raw: string
  ): void {
    let message:
      ScribeMessage;

    try {
      message =
        JSON.parse(
          raw
        ) as ScribeMessage;
    } catch {
      return;
    }

    const text =
      message.text?.trim() ??
      '';

    if (
      message.message_type ===
      'partial_transcript'
    ) {
      if (text) {
        this.options
          .callbacks
          .onPartial(text);
      }

      return;
    }

    if (
      message.message_type ===
        'committed_transcript' ||
      message.message_type ===
        'final_transcript'
    ) {
      if (!text) {
        return;
      }

      const now =
        Date.now();

      if (
        text ===
          this.lastCommittedText &&
        now -
          this.lastCommittedAt <
          2_000
      ) {
        return;
      }

      this.lastCommittedText =
        text;

      this.lastCommittedAt =
        now;

      this.options
        .callbacks
        .onCommitted(
          text,
          message
            .language_code
        );

      return;
    }

    if (
      message.message_type
        ?.includes(
          'error'
        ) ||
      message.error
    ) {
      this.options
        .callbacks
        .onError(
          new Error(
            message.error ||
            message.message ||
            (
              `ElevenLabs STT error: ` +
              message.message_type
            )
          )
        );
    }
  }

  public sendAudio(
    base64Audio: string
  ): void {
    if (
      this.socket
        ?.readyState !==
      WebSocket.OPEN
    ) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        message_type:
          'input_audio_chunk',

        audio_base_64:
          base64Audio,
      })
    );
  }

  public close(): void {
    const socket =
      this.socket;

    this.socket =
      null;

    if (
      socket?.readyState ===
      WebSocket.OPEN
    ) {
      socket.send(
        JSON.stringify({
          message_type:
            'input_audio_chunk',

          audio_base_64:
            '',

          commit: true,
        })
      );

      socket.close(
        1000,
        'Twilio call ended.'
      );
    }
  }
}