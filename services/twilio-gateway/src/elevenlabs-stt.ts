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
  detail?: string | {
    message?: string;
  };
}

interface SingleUseTokenResponse {
  token?: string;
  detail?: string | {
    message?: string;
  };
}

function providerMessage(
  value:
    ScribeMessage |
    SingleUseTokenResponse
): string {
  if (
    typeof value.detail ===
    'string'
  ) {
    return value.detail;
  }

  if (
    typeof value.detail ===
      'object' &&
    value.detail?.message
  ) {
    return value.detail
      .message;
  }

  if (
    'error' in value &&
    value.error
  ) {
    return value.error;
  }

  if (
    'message' in value &&
    value.message
  ) {
    return value.message;
  }

  return (
    'ElevenLabs realtime STT returned an unknown error.'
  );
}

async function createRealtimeScribeToken(
  apiKey: string
): Promise<string> {
  const response =
    await fetch(
      (
        'https://api.elevenlabs.io/' +
        'v1/single-use-token/' +
        'realtime_scribe'
      ),
      {
        method: 'POST',

        headers: {
          'xi-api-key':
            apiKey,
        },
      }
    );

  const raw =
    await response.text();

  let body:
    SingleUseTokenResponse = {};

  if (raw) {
    try {
      body =
        JSON.parse(
          raw
        ) as
        SingleUseTokenResponse;
    } catch {
      body = {
        detail:
          raw,
      };
    }
  }

  if (
    !response.ok ||
    !body.token
  ) {
    throw new Error(
      providerMessage(
        body
      )
    );
  }

  return body.token;
}

export function buildRealtimeSttUrl(
  options: {
    modelId: string;
    profile:
      LanguageProfile;
    token?: string;
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

  if (options.token) {
    url.searchParams.set(
      'token',
      options.token
    );
  }

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

    const token =
      await createRealtimeScribeToken(
        this.options.apiKey
      );

    const socket =
      new WebSocket(
        buildRealtimeSttUrl({
          modelId:
            this.options
              .modelId,

          profile:
            this.options
              .profile,

          token,
        })
      );

    this.socket =
      socket;

    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        let settled =
          false;

        const timeout =
          setTimeout(
            () => {
              if (settled) {
                return;
              }

              settled =
                true;

              reject(
                new Error(
                  (
                    'ElevenLabs STT did not send session_started ' +
                    'within 12 seconds.'
                  )
                )
              );

              socket.close();
            },
            12_000
          );

        const rejectSetup =
          (
            error:
              Error
          ) => {
            if (settled) {
              this.options
                .callbacks
                .onError(
                  error
                );

              return;
            }

            settled =
              true;

            clearTimeout(
              timeout
            );

            reject(
              error
            );
          };

        socket.on(
          'message',

          (data) => {
            const raw =
              data.toString();

            let message:
              ScribeMessage;

            try {
              message =
                JSON.parse(
                  raw
                ) as
                ScribeMessage;
            } catch {
              return;
            }

            if (
              message.message_type ===
              'session_started'
            ) {
              if (!settled) {
                settled =
                  true;

                clearTimeout(
                  timeout
                );

                resolve();
              }

              return;
            }

            const isError =
              (
                message.message_type
                  ?.includes(
                    'error'
                  ) ??
                false
              ) ||
              Boolean(
                message.error
              ) ||
              (
                typeof message.detail ===
                  'string' &&
                message.detail !==
                  ''
              ) ||
              (
                typeof message.detail ===
                  'object' &&
                Boolean(
                  message.detail
                    ?.message
                )
              );

            if (isError) {
              rejectSetup(
                new Error(
                  providerMessage(
                    message
                  )
                )
              );

              return;
            }

            if (!settled) {
              return;
            }

            this.handleMessage(
              message
            );
          }
        );

        socket.on(
          'error',

          (error) => {
            rejectSetup(
              error
            );
          }
        );

        socket.on(
          'close',

          (
            code,
            reason
          ) => {
            this.socket =
              null;

            if (
              code === 1000 ||
              code === 1005
            ) {
              if (!settled) {
                rejectSetup(
                  new Error(
                    (
                      'ElevenLabs STT closed before session_started.'
                    )
                  )
                );
              }

              return;
            }

            rejectSetup(
              new Error(
                (
                  `ElevenLabs STT closed with code ${code}: ` +
                  reason.toString()
                )
              )
            );
          }
        );
      }
    );
  }

  private handleMessage(
    message:
      ScribeMessage
  ): void {
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