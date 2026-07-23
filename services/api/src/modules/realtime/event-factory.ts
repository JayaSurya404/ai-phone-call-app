import {
  randomUUID,
} from 'node:crypto';

import type {
  CallRealtimeEvent,
  CallRealtimeEventType,
} from './contracts.js';

export function createCallRealtimeEvent<
  TPayload
>(
  callSessionId: string,
  type: CallRealtimeEventType,
  payload: TPayload
): CallRealtimeEvent<TPayload> {
  return {
    version: 1,
    eventId:
      randomUUID(),
    callSessionId,
    type,
    occurredAt:
      new Date().toISOString(),
    payload,
  };
}