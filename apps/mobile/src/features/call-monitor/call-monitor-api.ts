import {
  apiRequest,
} from '../../api/client';

import type {
  CallSession,
} from '../../api/types';

export function getCallSession(
  callSessionId: string,
  signal?: AbortSignal
): Promise<CallSession> {
  return apiRequest<
    CallSession
  >(
    `/api/v1/calls/${callSessionId}`,

    {
      signal,
    }
  );
}

export function cancelCallSession(
  callSessionId: string
): Promise<CallSession> {
  return apiRequest<
    CallSession
  >(
    `/api/v1/calls/${callSessionId}/cancel`,

    {
      method: 'POST',
      body: {},
    }
  );
}