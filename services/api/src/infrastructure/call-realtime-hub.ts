import {
  createClient,
} from 'redis';

import type {
  CallRealtimeEvent,
} from '../modules/realtime/contracts.js';

export type CallRealtimeListener = (
  event: CallRealtimeEvent
) => void;

export interface CallRealtimeHub {
  publish(
    event: CallRealtimeEvent
  ): Promise<void>;

  subscribe(
    callSessionId: string,
    listener:
      CallRealtimeListener
  ): Promise<() => Promise<void>>;

  health(): Promise<{
    ready: boolean;
    detail: string | null;
  }>;

  close(): Promise<void>;
}

export interface CallRealtimeHubOptions {
  redisUrl: string;
  timeoutMs: number;
  channelPrefix: string;
  onError?: (error: Error) => void;
}

function toError(
  value: unknown
): Error {
  return value instanceof Error
    ? value
    : new Error(String(value));
}

export function createCallRealtimeHub(
  options: CallRealtimeHubOptions
): CallRealtimeHub {
  const publisher =
    createClient({
      url: options.redisUrl,

      socket: {
        connectTimeout:
          options.timeoutMs,

        reconnectStrategy:
          false,
      },
    });

  const subscriber =
    publisher.duplicate();

  publisher.on(
    'error',
    (error) => {
      options.onError?.(
        toError(error)
      );
    }
  );

  subscriber.on(
    'error',
    (error) => {
      options.onError?.(
        toError(error)
      );
    }
  );

  const listeners =
    new Map<
      string,
      Set<CallRealtimeListener>
    >();

  let publisherConnection:
    Promise<void> | undefined;

  let subscriberConnection:
    Promise<void> | undefined;

  let patternSubscription:
    Promise<void> | undefined;

  function channel(
    callSessionId: string
  ): string {
    return (
      `${options.channelPrefix}:` +
      callSessionId
    );
  }

  function parseCallSessionId(
    redisChannel: string
  ): string | null {
    const prefix =
      `${options.channelPrefix}:`;

    if (
      !redisChannel.startsWith(
        prefix
      )
    ) {
      return null;
    }

    const id =
      redisChannel.slice(
        prefix.length
      );

    return id || null;
  }

  async function ensurePublisher():
  Promise<void> {
    if (publisher.isReady) {
      return;
    }

    if (!publisherConnection) {
      publisherConnection =
        (async () => {
          if (!publisher.isOpen) {
            await publisher
              .connect();
          }

          if (!publisher.isReady) {
            throw new Error(
              'Realtime Redis publisher is not ready.'
            );
          }
        })().finally(() => {
          publisherConnection =
            undefined;
        });
    }

    await publisherConnection;
  }

  async function ensureSubscriber():
  Promise<void> {
    if (!subscriber.isReady) {
      if (!subscriberConnection) {
        subscriberConnection =
          (async () => {
            if (
              !subscriber.isOpen
            ) {
              await subscriber
                .connect();
            }

            if (
              !subscriber.isReady
            ) {
              throw new Error(
                'Realtime Redis subscriber is not ready.'
              );
            }
          })().finally(() => {
            subscriberConnection =
              undefined;
          });
      }

      await subscriberConnection;
    }

    if (!patternSubscription) {
      patternSubscription =
        subscriber.pSubscribe(
          `${options.channelPrefix}:*`,

          (
            message,
            redisChannel
          ) => {
            const callSessionId =
              parseCallSessionId(
                redisChannel
              );

            if (!callSessionId) {
              return;
            }

            const callListeners =
              listeners.get(
                callSessionId
              );

            if (
              !callListeners ||
              callListeners.size === 0
            ) {
              return;
            }

            let event:
              CallRealtimeEvent;

            try {
              event =
                JSON.parse(
                  message
                ) as CallRealtimeEvent;
            } catch (error) {
              options.onError?.(
                toError(error)
              );

              return;
            }

            for (
              const listener of
              callListeners
            ) {
              try {
                listener(event);
              } catch (error) {
                options.onError?.(
                  toError(error)
                );
              }
            }
          }
        );
    }

    await patternSubscription;
  }

  async function closeClient(
    client:
      typeof publisher
  ): Promise<void> {
    if (!client.isOpen) {
      return;
    }

    try {
      await client.quit();
    } catch {
      client.destroy();
    }
  }

  return {
    async publish(
      event: CallRealtimeEvent
    ): Promise<void> {
      await ensurePublisher();

      await publisher.publish(
        channel(
          event.callSessionId
        ),

        JSON.stringify(event)
      );
    },

    async subscribe(
      callSessionId: string,
      listener:
        CallRealtimeListener
    ): Promise<
      () => Promise<void>
    > {
      await ensureSubscriber();

      let callListeners =
        listeners.get(
          callSessionId
        );

      if (!callListeners) {
        callListeners =
          new Set<
            CallRealtimeListener
          >();

        listeners.set(
          callSessionId,
          callListeners
        );
      }

      callListeners.add(listener);

      let unsubscribed = false;

      return async () => {
        if (unsubscribed) {
          return;
        }

        unsubscribed = true;

        const current =
          listeners.get(
            callSessionId
          );

        current?.delete(
          listener
        );

        if (
          current &&
          current.size === 0
        ) {
          listeners.delete(
            callSessionId
          );
        }
      };
    },

    async health() {
      try {
        await ensurePublisher();

        const result =
          await publisher.ping();

        return {
          ready:
            result === 'PONG',

          detail:
            result === 'PONG'
              ? null
              : `Unexpected Redis response: ${result}`,
        };
      } catch (error) {
        return {
          ready: false,

          detail:
            toError(error)
              .message,
        };
      }
    },

    async close():
    Promise<void> {
      listeners.clear();

      await Promise.all([
        closeClient(
          subscriber
        ),

        closeClient(
          publisher
        ),
      ]);
    },
  };
}