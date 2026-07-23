import {
  mobileEnvironment,
} from '../../config/environment';

import type {
  CallSession,
  CallStatus,
  TranscriptSegment,
} from '../../api/types';

export type RealtimeConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export type CallRealtimeEventType =
  | 'call.snapshot'
  | 'call.status'
  | 'transcript.added'
  | 'ai.turn.completed'
  | 'call.completed'
  | 'call.failed'
  | 'call.cancelled'
  | 'heartbeat';

export interface CallRealtimeEvent {
  version: 1;
  eventId: string;
  callSessionId: string;
  type: CallRealtimeEventType;
  occurredAt: string;
  payload: unknown;
}

export interface CallPayload {
  call: CallSession;
  source?:
    | 'api'
    | 'telephony'
    | 'recovery';
}

export interface TranscriptPayload {
  segment:
    TranscriptSegment;
  callStatus:
    CallStatus;
}

export interface AiTurnCompletedPayload {
  remoteText: string;
  assistantText: string;
  assistantAudioMimeType:
    string;
  assistantSampleRateHz:
    number;
  providerNames: {
    speechToText: string;
    languageModel: string;
    textToSpeech: string;
  };
  metrics: {
    speechToTextLatencyMs:
      number | null;
    languageModelLatencyMs:
      number;
    textToSpeechLatencyMs:
      number;
    totalLatencyMs: number;
  };
}

export interface CallRealtimeClientOptions {
  callSessionId: string;

  onEvent(
    event: CallRealtimeEvent
  ): void;

  onConnectionState(
    state:
      RealtimeConnectionState
  ): void;

  onError?(
    error: Error
  ): void;
}

export interface CallRealtimeClient {
  connect(): void;
  requestResync(): void;
  disconnect(): void;
}

function toWebSocketUrl(
  callSessionId: string
): string {
  const baseUrl =
    mobileEnvironment
      .apiBaseUrl
      .replace(
        /^http:/,
        'ws:'
      )
      .replace(
        /^https:/,
        'wss:'
      );

  const token =
    encodeURIComponent(
      mobileEnvironment
        .realtimeToken
    );

  return (
    `${baseUrl}/api/v1/realtime/calls/` +
    `${encodeURIComponent(
      callSessionId
    )}?token=${token}`
  );
}

function parseEvent(
  value: unknown
): CallRealtimeEvent | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    !('callSessionId' in value)
  ) {
    return null;
  }

  if (
    typeof value.type !==
      'string' ||
    typeof value.callSessionId !==
      'string'
  ) {
    return null;
  }

  return value as
    CallRealtimeEvent;
}

function getMessageText(
  data: unknown
): string | null {
  if (
    typeof data === 'string'
  ) {
    return data;
  }

  if (
    data instanceof
    ArrayBuffer
  ) {
    return new TextDecoder()
      .decode(data);
  }

  return null;
}

export function createCallRealtimeClient(
  options:
    CallRealtimeClientOptions
): CallRealtimeClient {
  let socket:
    WebSocket | null = null;

  let reconnectTimer:
    ReturnType<
      typeof setTimeout
    > | null = null;

  let heartbeatTimer:
    ReturnType<
      typeof setInterval
    > | null = null;

  let manuallyClosed =
    false;

  let reconnectAttempt =
    0;

  function clearTimers(): void {
    if (reconnectTimer) {
      clearTimeout(
        reconnectTimer
      );

      reconnectTimer = null;
    }

    if (heartbeatTimer) {
      clearInterval(
        heartbeatTimer
      );

      heartbeatTimer = null;
    }
  }

  function scheduleReconnect():
  void {
    if (manuallyClosed) {
      return;
    }

    reconnectAttempt += 1;

    const delay =
      Math.min(
        12_000,
        800 *
          2 **
            Math.min(
              reconnectAttempt,
              4
            )
      );

    options.onConnectionState(
      'reconnecting'
    );

    reconnectTimer =
      setTimeout(
        connect,
        delay
      );
  }

  function connect(): void {
    if (
      manuallyClosed ||
      socket?.readyState ===
        WebSocket.OPEN ||
      socket?.readyState ===
        WebSocket.CONNECTING
    ) {
      return;
    }

    options.onConnectionState(
      reconnectAttempt > 0
        ? 'reconnecting'
        : 'connecting'
    );

    try {
      socket =
        new WebSocket(
          toWebSocketUrl(
            options.callSessionId
          )
        );
    } catch (error) {
      options.onError?.(
        error instanceof Error
          ? error
          : new Error(
              String(error)
            )
      );

      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      reconnectAttempt = 0;

      options.onConnectionState(
        'connected'
      );

      socket?.send(
        JSON.stringify({
          type: 'resync',
        })
      );

      heartbeatTimer =
        setInterval(
          () => {
            if (
              socket?.readyState ===
              WebSocket.OPEN
            ) {
              socket.send(
                JSON.stringify({
                  type: 'ping',
                })
              );
            }
          },
          10_000
        );
    };

    socket.onmessage = (
      message
    ) => {
      const text =
        getMessageText(
          message.data
        );

      if (!text) {
        return;
      }

      try {
        const event =
          parseEvent(
            JSON.parse(
              text
            ) as unknown
          );

        if (event) {
          options.onEvent(
            event
          );
        }
      } catch (error) {
        options.onError?.(
          error instanceof Error
            ? error
            : new Error(
                String(error)
              )
        );
      }
    };

    socket.onerror = () => {
      options.onConnectionState(
        'error'
      );
    };

    socket.onclose = () => {
      clearTimers();
      socket = null;

      if (manuallyClosed) {
        options.onConnectionState(
          'disconnected'
        );

        return;
      }

      scheduleReconnect();
    };
  }

  return {
    connect,

    requestResync() {
      if (
        socket?.readyState ===
        WebSocket.OPEN
      ) {
        socket.send(
          JSON.stringify({
            type: 'resync',
          })
        );
      }
    },

    disconnect() {
      manuallyClosed = true;
      clearTimers();

      if (
        socket &&
        socket.readyState !==
          WebSocket.CLOSED
      ) {
        socket.close(
          1000,
          'Monitor closed.'
        );
      }

      socket = null;

      options.onConnectionState(
        'disconnected'
      );
    },
  };
}

export function isCallPayload(
  payload: unknown
): payload is CallPayload {
  return (
    typeof payload ===
      'object' &&
    payload !== null &&
    'call' in payload &&
    typeof payload.call ===
      'object' &&
    payload.call !== null
  );
}

export function isTranscriptPayload(
  payload: unknown
): payload is TranscriptPayload {
  return (
    typeof payload ===
      'object' &&
    payload !== null &&
    'segment' in payload &&
    typeof payload.segment ===
      'object' &&
    payload.segment !== null
  );
}

export function isAiTurnPayload(
  payload: unknown
): payload is AiTurnCompletedPayload {
  return (
    typeof payload ===
      'object' &&
    payload !== null &&
    'metrics' in payload &&
    typeof payload.metrics ===
      'object' &&
    payload.metrics !== null
  );
}