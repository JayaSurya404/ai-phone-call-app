import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  useRouter,
} from 'expo-router';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type {
  AppStateStatus,
} from 'react-native';

import type {
  CallSession,
  TranscriptSegment,
} from '../../api/types';

import {
  cancelCallSession,
  getCallSession,
} from './call-monitor-api';

import {
  createCallRealtimeClient,
  isAiTurnPayload,
  isCallPayload,
  isTranscriptPayload,
} from './call-monitor-realtime';

import type {
  AiTurnCompletedPayload,
  RealtimeConnectionState,
} from './call-monitor-realtime';

import {
  averageConfidence,
  averageLatencyMs,
  callDurationMs,
  formatClockTime,
  formatDuration,
  isTerminalStatus,
  mergeTranscriptSegment,
  sentimentColor,
  statusColor,
  statusLabel,
} from './call-monitor-utils';

import {
  ownerTheme,
} from '../owner/owner-theme';

interface CallMonitorScreenProps {
  callSessionId: string;
}

interface MetricCardProps {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  accent: string;
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  accent,
}: MetricCardProps) {
  return (
    <View
      style={styles.metricCard}
    >
      <View
        style={[
          styles.metricIcon,

          {
            backgroundColor:
              `${accent}1A`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={accent}
        />
      </View>

      <Text
        style={styles.metricLabel}
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        style={styles.metricValue}
      >
        {value}
      </Text>

      <Text
        numberOfLines={1}
        style={styles.metricDetail}
      >
        {detail}
      </Text>
    </View>
  );
}

function connectionColor(
  state:
    RealtimeConnectionState
): string {
  switch (state) {
    case 'connected':
      return ownerTheme.green;

    case 'connecting':
    case 'reconnecting':
      return ownerTheme.orange;

    case 'error':
      return ownerTheme.red;

    case 'disconnected':
      return ownerTheme.textDim;
  }
}

function connectionLabel(
  state:
    RealtimeConnectionState
): string {
  switch (state) {
    case 'connected':
      return 'Live';

    case 'connecting':
      return 'Connecting';

    case 'reconnecting':
      return 'Reconnecting';

    case 'error':
      return 'Connection error';

    case 'disconnected':
      return 'Offline';
  }
}

function speakerLabel(
  segment:
    TranscriptSegment
): string {
  switch (segment.speaker) {
    case 'AI_AGENT':
      return 'AI Agent';

    case 'REMOTE_PARTY':
      return 'Customer';

    case 'SYSTEM':
      return 'System';
  }
}

function TranscriptBubble({
  segment,
}: {
  segment:
    TranscriptSegment;
}) {
  const isAgent =
    segment.speaker ===
    'AI_AGENT';

  const isSystem =
    segment.speaker ===
    'SYSTEM';

  const accent =
    isAgent
      ? ownerTheme.purpleLight
      : isSystem
        ? ownerTheme.orange
        : ownerTheme.cyan;

  return (
    <View
      style={[
        styles.transcriptRow,

        isAgent &&
          styles.transcriptRowAgent,

        isSystem &&
          styles.transcriptRowSystem,
      ]}
    >
      <View
        style={[
          styles.avatar,

          {
            backgroundColor:
              `${accent}1C`,
          },
        ]}
      >
        <Ionicons
          name={
            isAgent
              ? 'sparkles'
              : isSystem
                ? 'information-circle'
                : 'person'
          }
          size={18}
          color={accent}
        />
      </View>

      <View
        style={[
          styles.transcriptBubble,

          isAgent &&
            styles.transcriptBubbleAgent,

          isSystem &&
            styles.transcriptBubbleSystem,
        ]}
      >
        <View
          style={styles.bubbleHeader}
        >
          <Text
            style={[
              styles.speakerName,

              {
                color: accent,
              },
            ]}
          >
            {speakerLabel(
              segment
            )}
          </Text>

          <Text
            style={styles.segmentTime}
          >
            {formatClockTime(
              segment.createdAt
            )}
          </Text>
        </View>

        <Text
          selectable
          style={styles.transcriptText}
        >
          {segment.content}
        </Text>

        <View
          style={styles.segmentMeta}
        >
          {segment.confidence !==
          null ? (
            <Text
              style={
                styles.segmentMetaText
              }
            >
              Confidence{' '}
              {Math.round(
                segment.confidence *
                  100
              )}
              %
            </Text>
          ) : null}

          {segment.latencyMs !==
          null ? (
            <Text
              style={
                styles.segmentMetaText
              }
            >
              {segment.latencyMs} ms
            </Text>
          ) : null}

          <Text
            style={[
              styles.segmentMetaText,

              {
                color:
                  sentimentColor(
                    segment.sentiment
                  ),
              },
            ]}
          >
            {
              segment.sentiment
            }
          </Text>
        </View>
      </View>
    </View>
  );
}

function SummaryCard({
  call,
}: {
  call: CallSession;
}) {
  const failed =
    call.status ===
      'FAILED' ||
    call.status ===
      'CANCELLED';

  const title =
    failed
      ? call.status ===
          'FAILED'
        ? 'Call failed'
        : 'Call cancelled'
      : 'Call summary';

  const body =
    call.summary ??
    call.failureReason ??
    (
      failed
        ? 'The call ended without a generated summary.'
        : 'The call completed successfully.'
    );

  return (
    <LinearGradient
      colors={
        failed
          ? [
              '#3B1118',
              '#18111A',
            ]
          : [
              '#132D25',
              '#111A22',
            ]
      }
      style={styles.summaryCard}
    >
      <View
        style={[
          styles.summaryIcon,

          {
            backgroundColor:
              failed
                ? '#EF444422'
                : '#22C55E22',
          },
        ]}
      >
        <Ionicons
          name={
            failed
              ? 'warning-outline'
              : 'checkmark-circle-outline'
          }
          size={24}
          color={
            failed
              ? ownerTheme.red
              : ownerTheme.green
          }
        />
      </View>

      <View
        style={styles.flex}
      >
        <Text
          style={styles.summaryTitle}
        >
          {title}
        </Text>

        <Text
          selectable
          style={styles.summaryText}
        >
          {body}
        </Text>
      </View>
    </LinearGradient>
  );
}

export function CallMonitorScreen({
  callSessionId,
}: CallMonitorScreenProps) {
  const router =
    useRouter();

  const queryClient =
    useQueryClient();

  const scrollViewRef =
    useRef<ScrollView>(
      null
    );

  const [
    connectionState,
    setConnectionState,
  ] = useState<
    RealtimeConnectionState
  >('connecting');

  const [
    lastRealtimeAt,
    setLastRealtimeAt,
  ] = useState<
    string | null
  >(null);

  const [
    aiMetrics,
    setAiMetrics,
  ] = useState<
    AiTurnCompletedPayload[
      'metrics'
    ] | null
  >(null);

  const [
    now,
    setNow,
  ] = useState(0);

  const callQuery =
    useQuery({
      queryKey: [
        'call-session',
        callSessionId,
      ],

      queryFn: ({
        signal,
      }) =>
        getCallSession(
          callSessionId,
          signal
        ),

      enabled:
        callSessionId
          .length > 0,

      refetchInterval:
        (query) => {
          const call =
            query.state.data;

          if (
            call &&
            isTerminalStatus(
              call.status
            )
          ) {
            return false;
          }

          return 5_000;
        },
    });

  useEffect(() => {
    const interval =
      setInterval(
        () => {
          setNow(
            Date.now()
          );
        },
        1_000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, []);

  useEffect(() => {
    const client =
      createCallRealtimeClient({
        callSessionId,

        onConnectionState:
          setConnectionState,

        onError(error) {
          console.warn(
            'Call realtime error:',
            error.message
          );
        },

        onEvent(event) {
          setLastRealtimeAt(
            event.occurredAt
          );

          if (
            event.type ===
              'call.snapshot' ||
            event.type ===
              'call.status' ||
            event.type ===
              'call.completed' ||
            event.type ===
              'call.failed' ||
            event.type ===
              'call.cancelled'
          ) {
            if (
              isCallPayload(
                event.payload
              )
            ) {
              queryClient
                .setQueryData(
                  [
                    'call-session',
                    callSessionId,
                  ],

                  event.payload.call
                );
            }

            return;
          }

          if (
            event.type ===
              'transcript.added' &&
            isTranscriptPayload(
              event.payload
            )
          ) {
            const payload =
              event.payload;

            queryClient
              .setQueryData<
                CallSession
              >(
                [
                  'call-session',
                  callSessionId,
                ],

                (current) =>
                  current
                    ? mergeTranscriptSegment(
                        current,

                        payload.segment,

                        payload.callStatus
                      )
                    : current
              );

            requestAnimationFrame(
              () => {
                scrollViewRef.current
                  ?.scrollToEnd({
                    animated: true,
                  });
              }
            );

            return;
          }

          if (
            event.type ===
              'ai.turn.completed' &&
            isAiTurnPayload(
              event.payload
            )
          ) {
            setAiMetrics(
              event.payload.metrics
            );
          }
        },
      });

    client.connect();

    const subscription =
      AppState.addEventListener(
        'change',

        (
          state:
            AppStateStatus
        ) => {
          if (
            state === 'active'
          ) {
            client.connect();
            client.requestResync();

            void queryClient
              .invalidateQueries({
                queryKey: [
                  'call-session',
                  callSessionId,
                ],
              });
          }
        }
      );

    return () => {
      subscription.remove();
      client.disconnect();
    };
  }, [
    callSessionId,
    queryClient,
  ]);

  const cancelMutation =
    useMutation({
      mutationFn:
        () =>
          cancelCallSession(
            callSessionId
          ),

      onSuccess(call) {
        queryClient.setQueryData(
          [
            'call-session',
            callSessionId,
          ],
          call
        );
      },

      onError(error) {
        Alert.alert(
          'Could not end call',

          error instanceof Error
            ? error.message
            : 'Unexpected error.'
        );
      },
    });

  const call =
    callQuery.data;

  const confidence =
    useMemo(
      () =>
        call
          ? averageConfidence(
              call.transcriptSegments
            )
          : null,
      [call]
    );

  const transcriptLatency =
    useMemo(
      () =>
        call
          ? averageLatencyMs(
              call.transcriptSegments
            )
          : null,
      [call]
    );

  const latency =
    aiMetrics
      ?.totalLatencyMs ??
    transcriptLatency;

  const durationNow =
    call && now === 0
      ? new Date(
          call.startedAt ??
          call.createdAt
        ).getTime()
      : now;

  const duration =
    call
      ? formatDuration(
          callDurationMs(
            call,
            durationNow
          )
        )
      : '00:00';

  function confirmCancel():
  void {
    Alert.alert(
      'End this call?',

      'The active call will be cancelled immediately.',

      [
        {
          text: 'Keep call',
          style: 'cancel',
        },

        {
          text: 'End call',
          style:
            'destructive',

          onPress() {
            cancelMutation
              .mutate();
          },
        },
      ]
    );
  }

  if (
    callQuery.isLoading
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={
            styles.centerState
          }
        >
          <ActivityIndicator
            size="large"
            color={
              ownerTheme.purple
            }
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Connecting to callâ€¦
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    callQuery.isError ||
    !call
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={
            styles.centerState
          }
        >
          <Ionicons
            name="cloud-offline-outline"
            size={42}
            color={
              ownerTheme.red
            }
          />

          <Text
            style={styles.errorTitle}
          >
            Call unavailable
          </Text>

          <Text
            style={styles.errorText}
          >
            Check that the API is
            running and try again.
          </Text>

          <TouchableOpacity
            onPress={() => {
              void callQuery
                .refetch();
            }}
            style={
              styles.retryButton
            }
          >
            <Text
              style={
                styles.retryText
              }
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const terminal =
    isTerminalStatus(
      call.status
    );

  const currentStatusColor =
    statusColor(
      call.status
    );

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            tintColor={
              ownerTheme
                .purpleLight
            }
            refreshing={
              callQuery
                .isRefetching
            }
            onRefresh={() => {
              void callQuery
                .refetch();
            }}
          />
        }
      >
        <View
          style={styles.header}
        >
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              router.back();
            }}
            style={
              styles.headerButton
            }
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={
                ownerTheme.text
              }
            />
          </TouchableOpacity>

          <View
            style={styles.headerText}
          >
            <Text
              style={styles.eyebrow}
            >
              LIVE MONITOR
            </Text>

            <Text
              style={styles.title}
            >
              AI Call
            </Text>
          </View>

          <Pressable
            onPress={() => {
              void callQuery
                .refetch();
            }}
            style={
              styles.headerButton
            }
          >
            <Ionicons
              name="refresh"
              size={20}
              color={
                ownerTheme
                  .purpleLight
              }
            />
          </Pressable>
        </View>

        <LinearGradient
          colors={[
            '#151B35',
            '#101725',
            '#0D1321',
          ]}
          style={styles.heroCard}
        >
          <View
            style={styles.heroGlow}
          />

          <View
            style={styles.heroTop}
          >
            <View
              style={styles.numberIcon}
            >
              <Ionicons
                name="call"
                size={23}
                color={
                  ownerTheme
                    .purpleLight
                }
              />
            </View>

            <View
              style={styles.flex}
            >
              <Text
                style={styles.numberLabel}
              >
                DESTINATION
              </Text>

              <Text
                selectable
                style={styles.number}
              >
                {
                  call.destinationNumber
                }
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,

                {
                  borderColor:
                    `${currentStatusColor}55`,

                  backgroundColor:
                    `${currentStatusColor}18`,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,

                  {
                    backgroundColor:
                      currentStatusColor,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusBadgeText,

                  {
                    color:
                      currentStatusColor,
                  },
                ]}
              >
                {statusLabel(
                  call.status
                )}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.heroDivider
            }
          />

          <View
            style={styles.heroBottom}
          >
            <View>
              <Text
                style={
                  styles.durationLabel
                }
              >
                CALL DURATION
              </Text>

              <Text
                style={styles.duration}
              >
                {duration}
              </Text>
            </View>

            <View
              style={
                styles.connectionPill
              }
            >
              <View
                style={[
                  styles.connectionDot,

                  {
                    backgroundColor:
                      connectionColor(
                        connectionState
                      ),
                  },
                ]}
              />

              <Text
                style={
                  styles.connectionText
                }
              >
                {connectionLabel(
                  connectionState
                )}
              </Text>
            </View>
          </View>

          {!terminal ? (
            <TouchableOpacity
              disabled={
                cancelMutation
                  .isPending
              }
              onPress={
                confirmCancel
              }
              style={
                styles.endCallButton
              }
            >
              {cancelMutation
                .isPending ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="call"
                    size={18}
                    color="#FFFFFF"
                    style={{
                      transform: [
                        {
                          rotate:
                            '135deg',
                        },
                      ],
                    }}
                  />

                  <Text
                    style={
                      styles.endCallText
                    }
                  >
                    End call
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </LinearGradient>

        <View
          style={styles.metricsRow}
        >
          <MetricCard
            icon="timer-outline"
            label="LATENCY"
            value={
              latency === null
                ? 'â€”'
                : `${latency} ms`
            }
            detail={
              aiMetrics
                ? 'Latest AI turn'
                : 'Transcript average'
            }
            accent={
              ownerTheme.cyan
            }
          />

          <MetricCard
            icon="happy-outline"
            label="SENTIMENT"
            value={
              call.sentiment
            }
            detail="Current outcome"
            accent={
              sentimentColor(
                call.sentiment
              )
            }
          />

          <MetricCard
            icon="analytics-outline"
            label="CONFIDENCE"
            value={
              confidence === null
                ? 'â€”'
                : `${Math.round(
                    confidence *
                      100
                  )}%`
            }
            detail="Speech average"
            accent={
              ownerTheme
                .purpleLight
            }
          />
        </View>

        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              Live transcript
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {
                call
                  .transcriptSegments
                  .length
              }{' '}
              messages
              {lastRealtimeAt
                ? ` Â· ${formatClockTime(
                    lastRealtimeAt
                  )}`
                : ''}
            </Text>
          </View>

          <View
            style={
              styles.liveIndicator
            }
          >
            <View
              style={
                styles.liveIndicatorDot
              }
            />

            <Text
              style={
                styles.liveIndicatorText
              }
            >
              LIVE
            </Text>
          </View>
        </View>

        <View
          style={
            styles.transcriptPanel
          }
        >
          {call
            .transcriptSegments
            .length === 0 ? (
            <View
              style={
                styles.emptyTranscript
              }
            >
              <Ionicons
                name="chatbubbles-outline"
                size={34}
                color={
                  ownerTheme
                    .textDim
                }
              />

              <Text
                style={
                  styles.emptyTranscriptTitle
                }
              >
                Waiting for speech
              </Text>

              <Text
                style={
                  styles.emptyTranscriptText
                }
              >
                Transcript messages
                will appear here in
                real time.
              </Text>
            </View>
          ) : (
            call.transcriptSegments
              .map(
                (segment) => (
                  <TranscriptBubble
                    key={
                      segment.id
                    }
                    segment={
                      segment
                    }
                  />
                )
              )
          )}
        </View>

        {terminal ? (
          <SummaryCard
            call={call}
          />
        ) : null}

        <View
          style={styles.detailCard}
        >
          <View
            style={styles.detailRow}
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              Provider
            </Text>

            <Text
              style={
                styles.detailValue
              }
            >
              {call.provider ??
                'Pending'}
            </Text>
          </View>

          <View
            style={styles.detailDivider}
          />

          <View
            style={styles.detailRow}
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              Language
            </Text>

            <Text
              style={
                styles.detailValue
              }
            >
              {call.languageCode}
            </Text>
          </View>

          <View
            style={styles.detailDivider}
          />

          <View
            style={styles.detailRow}
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              Session ID
            </Text>

            <Text
              numberOfLines={1}
              selectable
              style={[
                styles.detailValue,
                styles.sessionValue,
              ]}
            >
              {call.id}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor:
      ownerTheme.background,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 42,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  loadingText: {
    marginTop: 16,
    color:
      ownerTheme.textMuted,
    fontSize: 14,
  },

  errorTitle: {
    marginTop: 16,
    color: ownerTheme.text,
    fontSize: 20,
    fontWeight: '800',
  },

  errorText: {
    marginTop: 8,
    color:
      ownerTheme.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 20,
    minWidth: 120,
    minHeight: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      ownerTheme.purple,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
    alignItems: 'center',
  },

  eyebrow: {
    color:
      ownerTheme.purpleLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  title: {
    marginTop: 3,
    color: ownerTheme.text,
    fontSize: 20,
    fontWeight: '800',
  },

  heroCard: {
    overflow: 'hidden',
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#2B3851',
    padding: 18,
  },

  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -80,
    top: -100,
    backgroundColor:
      '#7C3AED44',
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  numberIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor:
      '#271B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  numberLabel: {
    color:
      ownerTheme.textDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  number: {
    marginTop: 4,
    color: ownerTheme.text,
    fontSize: 16,
    fontWeight: '800',
  },

  statusBadge: {
    minHeight: 30,
    maxWidth: 112,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },

  heroDivider: {
    height: 1,
    marginVertical: 17,
    backgroundColor:
      '#FFFFFF12',
  },

  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  durationLabel: {
    color:
      ownerTheme.textDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  duration: {
    marginTop: 4,
    color: ownerTheme.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  connectionPill: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      '#0B1120',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  connectionText: {
    color:
      ownerTheme.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  endCallButton: {
    marginTop: 17,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor:
      ownerTheme.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  endCallText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },

  metricCard: {
    flex: 1,
    minHeight: 125,
    borderRadius: 19,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme.surface,
    padding: 11,
  },

  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricLabel: {
    marginTop: 10,
    color:
      ownerTheme.textDim,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },

  metricValue: {
    marginTop: 4,
    color: ownerTheme.text,
    fontSize: 14,
    fontWeight: '800',
  },

  metricDetail: {
    marginTop: 4,
    color:
      ownerTheme.textDim,
    fontSize: 9,
  },

  sectionHeader: {
    marginTop: 27,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  sectionTitle: {
    color: ownerTheme.text,
    fontSize: 20,
    fontWeight: '800',
  },

  sectionSubtitle: {
    marginTop: 4,
    color:
      ownerTheme.textMuted,
    fontSize: 12,
  },

  liveIndicator: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor:
      '#052E2B',
  },

  liveIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      ownerTheme.green,
  },

  liveIndicatorText: {
    color:
      ownerTheme.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  transcriptPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme.surface,
    padding: 13,
  },

  emptyTranscript: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  emptyTranscriptTitle: {
    marginTop: 12,
    color: ownerTheme.text,
    fontSize: 15,
    fontWeight: '800',
  },

  emptyTranscriptText: {
    marginTop: 6,
    color:
      ownerTheme.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  transcriptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 13,
  },

  transcriptRowAgent: {
    flexDirection:
      'row-reverse',
  },

  transcriptRowSystem: {
    opacity: 0.9,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  transcriptBubble: {
    flex: 1,
    maxWidth: '84%',
    borderRadius: 17,
    borderTopLeftRadius: 5,
    borderWidth: 1,
    borderColor: '#183847',
    backgroundColor:
      '#0B202A',
    padding: 12,
  },

  transcriptBubbleAgent: {
    borderTopLeftRadius: 17,
    borderTopRightRadius: 5,
    borderColor: '#403063',
    backgroundColor:
      '#241C3A',
  },

  transcriptBubbleSystem: {
    borderColor: '#47351D',
    backgroundColor:
      '#2A2115',
  },

  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 8,
  },

  speakerName: {
    fontSize: 11,
    fontWeight: '800',
  },

  segmentTime: {
    color:
      ownerTheme.textDim,
    fontSize: 9,
  },

  transcriptText: {
    marginTop: 8,
    color: ownerTheme.text,
    fontSize: 14,
    lineHeight: 21,
  },

  segmentMeta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
  },

  segmentMetaText: {
    color:
      ownerTheme.textDim,
    fontSize: 9,
    fontWeight: '700',
  },

  summaryCard: {
    marginTop: 16,
    borderRadius: 21,
    borderWidth: 1,
    borderColor:
      '#FFFFFF16',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryTitle: {
    color: ownerTheme.text,
    fontSize: 16,
    fontWeight: '800',
  },

  summaryText: {
    marginTop: 6,
    color:
      ownerTheme.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  detailCard: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme.surface,
    paddingHorizontal: 15,
  },

  detailRow: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 14,
  },

  detailDivider: {
    height: 1,
    backgroundColor:
      '#FFFFFF0C',
  },

  detailLabel: {
    color:
      ownerTheme.textMuted,
    fontSize: 12,
  },

  detailValue: {
    flexShrink: 1,
    color: ownerTheme.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },

  sessionValue: {
    maxWidth: '62%',
    color:
      ownerTheme.purpleLight,
    fontSize: 10,
  },
});