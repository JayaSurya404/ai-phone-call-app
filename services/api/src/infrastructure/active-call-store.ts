import {
  createClient,
} from 'redis';

import type {
  CallStatus,
} from '../generated/prisma/client.ts';

export interface ActiveCallState {
  callSessionId: string;
  sessionId: string | null;
  status: CallStatus;
  destinationNumber: string;
  provider: string | null;
  updatedAt: string;
}

export interface ActiveCallStore {
  set(
    state: ActiveCallState
  ): Promise<void>;

  get(
    callSessionId: string
  ): Promise<ActiveCallState | null>;

  remove(
    callSessionId: string
  ): Promise<void>;

  ping(): Promise<void>;

  close(): Promise<void>;
}

export interface ActiveCallStoreOptions {
  redisUrl: string;
  timeoutMs: number;
  ttlSeconds: number;
  onError?: (error: Error) => void;
}

export function createActiveCallStore(
  options: ActiveCallStoreOptions
): ActiveCallStore {
  const client = createClient({
    url: options.redisUrl,

    socket: {
      connectTimeout:
        options.timeoutMs,
      reconnectStrategy: false,
    },
  });

  client.on(
    'error',
    (error) => {
      options.onError?.(
        error instanceof Error
          ? error
          : new Error(String(error))
      );
    }
  );

  let connectionPromise:
    | Promise<void>
    | undefined;

  function key(
    callSessionId: string
  ): string {
    return (
      'voicenexus:active-call:' +
      callSessionId
    );
  }

  async function ensureConnected():
  Promise<void> {
    if (client.isReady) {
      return;
    }

    if (!connectionPromise) {
      connectionPromise =
        (async () => {
          if (!client.isOpen) {
            await client.connect();
          }

          if (!client.isReady) {
            throw new Error(
              'Redis active-call client is not ready.'
            );
          }
        })().finally(() => {
          connectionPromise =
            undefined;
        });
    }

    await connectionPromise;
  }

  return {
    async set(
      state: ActiveCallState
    ): Promise<void> {
      await ensureConnected();

      await client.set(
        key(state.callSessionId),
        JSON.stringify(state),
        {
          EX: options.ttlSeconds,
        }
      );
    },

    async get(
      callSessionId: string
    ): Promise<ActiveCallState | null> {
      await ensureConnected();

      const value =
        await client.get(
          key(callSessionId)
        );

      if (!value) {
        return null;
      }

      return JSON.parse(
        value
      ) as ActiveCallState;
    },

    async remove(
      callSessionId: string
    ): Promise<void> {
      await ensureConnected();

      await client.del(
        key(callSessionId)
      );
    },

    async ping(): Promise<void> {
      await ensureConnected();

      const response =
        await client.ping();

      if (response !== 'PONG') {
        throw new Error(
          `Unexpected Redis response: ${response}`
        );
      }
    },

    async close(): Promise<void> {
      if (!client.isOpen) {
        return;
      }

      try {
        await client.quit();
      } catch {
        client.destroy();
      }
    },
  };
}