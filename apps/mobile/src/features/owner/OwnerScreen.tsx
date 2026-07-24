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
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type {
  CallSessionListItem,
  CallStatus,
  PromptTemplate,
  SimulatorScenarioId,
} from '../../api/types';

import {
  createCall,
  listPromptTemplates,
  listRecentCalls,
  startCall,
} from './owner-api';

import {
  defaultPrompt,
  useOwnerFormStore,
} from './owner-store';

import {
  ownerTheme,
} from './owner-theme';

interface ScenarioOption {
  id: SimulatorScenarioId;
  title: string;
  subtitle: string;
  icon:
    keyof typeof Ionicons.glyphMap;
}

const scenarios:
readonly ScenarioOption[] = [
  {
    id:
      'appointment-confirmed',
    title:
      'Confirmed',
    subtitle:
      'Customer accepts',
    icon:
      'checkmark-circle-outline',
  },
  {
    id:
      'appointment-declined',
    title:
      'Declined',
    subtitle:
      'Needs reschedule',
    icon:
      'calendar-outline',
  },
  {
    id:
      'no-answer',
    title:
      'No answer',
    subtitle:
      'Call times out',
    icon:
      'call-outline',
  },
  {
    id: 'busy',
    title: 'Busy',
    subtitle:
      'Line is occupied',
    icon:
      'remove-circle-outline',
  },
  {
    id:
      'provider-failure',
    title:
      'Failure',
    subtitle:
      'Provider error',
    icon:
      'warning-outline',
  },
];

function statusColor(
  status: CallStatus
): string {
  switch (status) {
    case 'COMPLETED':
      return ownerTheme.green;

    case 'FAILED':
    case 'CANCELLED':
      return ownerTheme.red;

    case 'IN_PROGRESS':
    case 'RINGING':
      return ownerTheme.cyan;

    case 'QUEUED':
    case 'STARTING':
      return ownerTheme.orange;

    case 'DRAFT':
      return ownerTheme.textDim;
  }
}

function statusLabel(
  status: CallStatus
): string {
  return status
    .toLowerCase()
    .replace(
      '_',
      ' '
    )
    .replace(
      /^\w/,
      (value) =>
        value.toUpperCase()
    );
}

function formatDate(
  value: string
): string {
  const date =
    new Date(value);

  return new Intl
    .DateTimeFormat(
      undefined,
      {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }
    )
    .format(date);
}

function TemplateChip({
  template,
  selected,
  onPress,
}: {
  template:
    PromptTemplate;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.templateChip,

        selected &&
          styles.templateChipSelected,
      ]}
    >
      <Ionicons
        name={
          template.isDefault
            ? 'sparkles'
            : 'document-text-outline'
        }
        size={16}
        color={
          selected
            ? ownerTheme.purpleLight
            : ownerTheme.textMuted
        }
      />

      <Text
        numberOfLines={1}
        style={[
          styles.templateChipText,

          selected &&
            styles.templateChipTextSelected,
        ]}
      >
        {template.name}
      </Text>
    </Pressable>
  );
}

function RecentCallCard({
  call,
  onPress,
}: {
  call:
    CallSessionListItem;
  onPress(): void;
}) {
  const color =
    statusColor(
      call.status
    );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.callCard}
    >
      <View
        style={styles.callIcon}
      >
        <Ionicons
          name="call"
          size={18}
          color={ownerTheme.purpleLight}
        />
      </View>

      <View
        style={styles.callContent}
      >
        <Text
          numberOfLines={1}
          style={styles.callNumber}
        >
          {call.destinationNumber}
        </Text>

        <Text
          numberOfLines={1}
          style={styles.callTime}
        >
          {formatDate(
            call.createdAt
          )}
        </Text>
      </View>

      <View
        style={[
          styles.statusPill,

          {
            borderColor:
              `${color}55`,

            backgroundColor:
              `${color}18`,
          },
        ]}
      >
        <View
          style={[
            styles.statusDot,

            {
              backgroundColor:
                color,
            },
          ]}
        />

        <Text
          style={[
            styles.statusText,

            {
              color,
            },
          ]}
        >
          {statusLabel(
            call.status
          )}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={ownerTheme.textDim}
      />
    </TouchableOpacity>
  );
}

export function OwnerScreen() {
  const router =
    useRouter();

  const queryClient =
    useQueryClient();

  const [
    promptExpanded,
    setPromptExpanded,
  ] = useState(false);

  const {
    destinationNumber,
    promptText,
    selectedTemplateId,
    languageCode,
    scenarioId,
    setDestinationNumber,
    setPromptText,
    selectTemplate,
    setLanguageCode,
    setScenarioId,
  } = useOwnerFormStore();

  const templatesQuery =
    useQuery({
      queryKey: [
        'prompt-templates',
      ],

      queryFn:
        listPromptTemplates,
    });

  const recentCallsQuery =
    useQuery({
      queryKey: [
        'recent-calls',
      ],

      queryFn:
        listRecentCalls,

      refetchInterval:
        4_000,
    });

  const selectedScenario =
    useMemo(
      () =>
        scenarios.find(
          (scenario) =>
            scenario.id ===
            scenarioId
        ) ??
        scenarios[0],

      [scenarioId]
    );

  const startMutation =
    useMutation({
      mutationFn:
        async () => {
          const number =
            destinationNumber
              .trim();

          const prompt =
            promptText.trim();

          if (
            number.length < 3
          ) {
            throw new Error(
              'Enter a valid destination number.'
            );
          }

          if (!prompt) {
            throw new Error(
              'Enter the AI calling prompt.'
            );
          }

          const draft =
            await createCall({
              destinationNumber:
                number,

              promptTemplateId:
                selectedTemplateId,

              promptText:
                prompt,

              languageCode:
                languageCode
                  .trim() ||
                'en-IN',
            });

          return startCall(
            draft.id,
            scenarioId
          );
        },

      onSuccess:
        async (call) => {
          await queryClient
            .invalidateQueries({
              queryKey: [
                'recent-calls',
              ],
            });

          router.push({
            pathname:
              '/call-monitor/[id]' as const,

            params: {
              id: call.id,
            },
          });
        },

      onError(error) {
        Alert.alert(
          'Could not start call',

          error instanceof Error
            ? error.message
            : 'Unexpected error.'
        );
      },
    });

  const activeCall =
    recentCallsQuery.data
      ?.find(
        (call) =>
          call.status ===
            'QUEUED' ||
          call.status ===
            'STARTING' ||
          call.status ===
            'RINGING' ||
          call.status ===
            'IN_PROGRESS'
      );

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
                recentCallsQuery
                  .isRefetching
              }
              onRefresh={() => {
                void Promise.all([
                  templatesQuery
                    .refetch(),

                  recentCallsQuery
                    .refetch(),
                ]);
              }}
            />
          }
        >
          <View
            style={styles.header}
          >
            <View>
              <Text
                style={styles.eyebrow}
              >
                VOICENEXUS
              </Text>

              <Text
                style={styles.heading}
              >
                AI Phone Agent
              </Text>

              <Text
                style={styles.headerSubtitle}
              >
                Launch and monitor
                intelligent calls.
              </Text>
            </View>

            <View
              style={styles.logo}
            >
              <LinearGradient
                colors={[
                  '#8B5CF6',
                  '#4F46E5',
                ]}
                style={
                  styles.logoGradient
                }
              >
                <Ionicons
                  name="call"
                  size={23}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </View>
          </View>

          {activeCall ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                router.push({
                  pathname:
                    '/call-monitor/[id]' as const,

                  params: {
                    id:
                      activeCall.id,
                  },
                });
              }}
            >
              <LinearGradient
                colors={[
                  '#172554',
                  '#241B4B',
                ]}
                style={
                  styles.activeCallCard
                }
              >
                <View
                  style={
                    styles.activePulse
                  }
                >
                  <View
                    style={
                      styles.activePulseDot
                    }
                  />
                </View>

                <View
                  style={styles.flex}
                >
                  <Text
                    style={
                      styles.activeLabel
                    }
                  >
                    ACTIVE CALL
                  </Text>

                  <Text
                    style={
                      styles.activeNumber
                    }
                  >
                    {
                      activeCall
                        .destinationNumber
                    }
                  </Text>

                  <Text
                    style={
                      styles.activeStatus
                    }
                  >
                    {statusLabel(
                      activeCall.status
                    )}
                  </Text>
                </View>

                <Ionicons
                  name="arrow-forward"
                  size={22}
                  color={
                    ownerTheme
                      .purpleLight
                  }
                />
              </LinearGradient>
            </TouchableOpacity>
          ) : null}

          <View
            style={styles.heroCard}
          >
            <View
              style={
                styles.heroGlowOne
              }
            />

            <View
              style={
                styles.heroGlowTwo
              }
            />

            <View
              style={styles.heroTop}
            >
              <View
                style={
                  styles.heroIcon
                }
              >
                <Ionicons
                  name="sparkles"
                  size={20}
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
                  style={
                    styles.heroTitle
                  }
                >
                  Start an AI call
                </Text>

                <Text
                  style={
                    styles.heroSubtitle
                  }
                >
                  Configure one call
                  and launch it instantly.
                </Text>
              </View>
            </View>

            <Text
              style={styles.label}
            >
              DESTINATION NUMBER
            </Text>

            <View
              style={styles.inputShell}
            >
              <Ionicons
                name="call-outline"
                size={20}
                color={
                  ownerTheme.textMuted
                }
              />

              <TextInput
                autoComplete="tel"
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
                placeholderTextColor={
                  ownerTheme.textDim
                }
                value={
                  destinationNumber
                }
                onChangeText={
                  setDestinationNumber
                }
                style={styles.input}
              />
            </View>

            <View
              style={styles.rowBetween}
            >
              <Text
                style={styles.label}
              >
                AI CALLING PROMPT
              </Text>

              <TouchableOpacity
                onPress={() => {
                  selectTemplate(
                    null,
                    defaultPrompt
                  );
                }}
              >
                <Text
                  style={styles.resetText}
                >
                  Reset
                </Text>
              </TouchableOpacity>
            </View>

            {templatesQuery
              .isLoading ? (
              <ActivityIndicator
                color={
                  ownerTheme.purple
                }
                style={
                  styles.templateLoader
                }
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.templateRow
                }
              >
                <TemplateChip
                  template={{
                    id: 'custom',
                    name: 'Custom',
                    description: null,
                    promptText,
                    isDefault: false,
                    createdAt: '',
                    updatedAt: '',
                  }}
                  selected={
                    selectedTemplateId ===
                    null
                  }
                  onPress={() => {
                    selectTemplate(
                      null,
                      promptText
                    );
                  }}
                />

                {templatesQuery.data
                  ?.map(
                    (template) => (
                      <TemplateChip
                        key={
                          template.id
                        }
                        template={
                          template
                        }
                        selected={
                          selectedTemplateId ===
                          template.id
                        }
                        onPress={() => {
                          selectTemplate(
                            template.id,
                            template
                              .promptText
                          );
                        }}
                      />
                    )
                  )}
              </ScrollView>
            )}

            <View
              style={
                styles.promptShell
              }
            >
              <TextInput
                multiline
                numberOfLines={
                  promptExpanded
                    ? 10
                    : 5
                }
                placeholder="Tell the AI what to achieve during this call."
                placeholderTextColor={
                  ownerTheme.textDim
                }
                textAlignVertical="top"
                value={promptText}
                onChangeText={
                  setPromptText
                }
                style={[
                  styles.promptInput,

                  promptExpanded &&
                    styles
                      .promptInputExpanded,
                ]}
              />

              <TouchableOpacity
                onPress={() => {
                  setPromptExpanded(
                    (value) =>
                      !value
                  );
                }}
                style={
                  styles.expandButton
                }
              >
                <Ionicons
                  name={
                    promptExpanded
                      ? 'contract-outline'
                      : 'expand-outline'
                  }
                  size={18}
                  color={
                    ownerTheme
                      .textMuted
                  }
                />
              </TouchableOpacity>
            </View>

            <View
              style={styles.grid}
            >
              <View
                style={styles.gridItem}
              >
                <Text
                  style={styles.label}
                >
                  LANGUAGE
                </Text>

                <View
                  style={
                    styles.smallInputShell
                  }
                >
                  <Ionicons
                    name="language-outline"
                    size={18}
                    color={
                      ownerTheme
                        .textMuted
                    }
                  />

                  <TextInput
                    autoCapitalize="none"
                    placeholder="ta-IN"
                    placeholderTextColor={
                      ownerTheme.textDim
                    }
                    value={
                      languageCode
                    }
                    onChangeText={
                      setLanguageCode
                    }
                    style={
                      styles.smallInput
                    }
                  />
                </View>

                <Text
                  style={
                    styles.scenarioSubtitle
                  }
                >
                  Tamil: ta-IN
                  {'  '}English: en-IN
                  {'  '}Hindi: hi-IN
                  {'  '}Auto EN/HI: multi
                </Text>
              </View>

              <View
                style={styles.gridItem}
              >
                <Text
                  style={styles.label}
                >
                  SCENARIO
                </Text>

                <View
                  style={
                    styles.selectedScenario
                  }
                >
                  <Ionicons
                    name={
                      selectedScenario
                        ?.icon ??
                      'layers-outline'
                    }
                    size={18}
                    color={
                      ownerTheme
                        .purpleLight
                    }
                  />

                  <Text
                    numberOfLines={1}
                    style={
                      styles.selectedScenarioText
                    }
                  >
                    {
                      selectedScenario
                        ?.title
                    }
                  </Text>
                </View>
              </View>
            </View>

            <Text
              style={[
                styles.label,
                styles.scenarioLabel,
              ]}
            >
              SIMULATION RESULT
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.scenarioRow
              }
            >
              {scenarios.map(
                (scenario) => {
                  const selected =
                    scenario.id ===
                    scenarioId;

                  return (
                    <Pressable
                      key={
                        scenario.id
                      }
                      onPress={() => {
                        setScenarioId(
                          scenario.id
                        );
                      }}
                      style={[
                        styles
                          .scenarioCard,

                        selected &&
                          styles
                            .scenarioCardSelected,
                      ]}
                    >
                      <Ionicons
                        name={
                          scenario.icon
                        }
                        size={21}
                        color={
                          selected
                            ? ownerTheme
                                .purpleLight
                            : ownerTheme
                                .textMuted
                        }
                      />

                      <Text
                        style={[
                          styles
                            .scenarioTitle,

                          selected &&
                            styles
                              .scenarioTitleSelected,
                        ]}
                      >
                        {
                          scenario.title
                        }
                      </Text>

                      <Text
                        style={
                          styles
                            .scenarioSubtitle
                        }
                      >
                        {
                          scenario.subtitle
                        }
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.88}
              disabled={
                startMutation
                  .isPending
              }
              onPress={() => {
                startMutation
                  .mutate();
              }}
              style={
                styles.startButtonShell
              }
            >
              <LinearGradient
                colors={[
                  '#8B5CF6',
                  '#5B4BE8',
                ]}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 1,
                }}
                style={
                  styles.startButton
                }
              >
                {startMutation
                  .isPending ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="call"
                      size={21}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.startText
                      }
                    >
                      Start AI Call
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text
                style={styles.sectionTitle}
              >
                Recent calls
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Latest activity
                from this device.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                void recentCallsQuery
                  .refetch();
              }}
              style={
                styles.refreshButton
              }
            >
              <Ionicons
                name="refresh"
                size={19}
                color={
                  ownerTheme
                    .purpleLight
                }
              />
            </TouchableOpacity>
          </View>

          {recentCallsQuery
            .isLoading ? (
            <ActivityIndicator
              color={
                ownerTheme.purple
              }
              style={
                styles.listLoader
              }
            />
          ) : recentCallsQuery
              .isError ? (
            <View
              style={styles.emptyCard}
            >
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={
                  ownerTheme.red
                }
              />

              <Text
                style={
                  styles.emptyTitle
                }
              >
                API unavailable
              </Text>

              <Text
                style={
                  styles.emptySubtitle
                }
              >
                Start the backend
                API on port 3000.
              </Text>
            </View>
          ) : (
            <FlatList
              data={
                recentCallsQuery.data ??
                []
              }
              keyExtractor={(
                item
              ) => item.id}
              renderItem={({
                item,
              }) => (
                <RecentCallCard
                  call={item}
                  onPress={() => {
                    router.push({
                      pathname:
                        '/call-monitor/[id]',

                      params: {
                        id:
                          item.id,
                      },
                    });
                  }}
                />
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    height: 10,
                  }}
                />
              )}
              ListEmptyComponent={
                <View
                  style={
                    styles.emptyCard
                  }
                >
                  <Ionicons
                    name="call-outline"
                    size={28}
                    color={
                      ownerTheme
                        .textMuted
                    }
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No calls yet
                  </Text>

                  <Text
                    style={
                      styles.emptySubtitle
                    }
                  >
                    Your first AI
                    call will appear
                    here.
                  </Text>
                </View>
              }
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 12,
    paddingBottom: 42,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 22,
  },

  eyebrow: {
    color:
      ownerTheme.purpleLight,
    fontSize: 11,
    letterSpacing: 2.1,
    fontWeight: '800',
  },

  heading: {
    marginTop: 4,
    color: ownerTheme.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  headerSubtitle: {
    marginTop: 5,
    color:
      ownerTheme.textMuted,
    fontSize: 14,
  },

  logo: {
    borderRadius: 18,
    shadowColor:
      ownerTheme.purple,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 7,
  },

  logoGradient: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeCallCard: {
    minHeight: 88,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#354369',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },

  activePulse: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      '#082F49',
  },

  activePulseDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor:
      ownerTheme.cyan,
  },

  activeLabel: {
    color: ownerTheme.cyan,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '900',
  },

  activeNumber: {
    marginTop: 3,
    color: ownerTheme.text,
    fontSize: 16,
    fontWeight: '800',
  },

  activeStatus: {
    marginTop: 2,
    color:
      ownerTheme.textMuted,
    fontSize: 12,
  },

  heroCard: {
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme.surface,
    padding: 18,
  },

  heroGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor:
      '#4C1D9555',
    top: -110,
    right: -70,
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor:
      '#0E749033',
    bottom: -90,
    left: -50,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 22,
  },

  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor:
      '#261A49',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroTitle: {
    color: ownerTheme.text,
    fontSize: 20,
    fontWeight: '800',
  },

  heroSubtitle: {
    marginTop: 3,
    color:
      ownerTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },

  label: {
    color:
      ownerTheme.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  inputShell: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme
        .surfaceElevated,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },

  input: {
    flex: 1,
    color: ownerTheme.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 13,
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  resetText: {
    marginBottom: 8,
    color:
      ownerTheme.purpleLight,
    fontSize: 12,
    fontWeight: '700',
  },

  templateLoader: {
    alignSelf: 'flex-start',
    marginVertical: 10,
  },

  templateRow: {
    gap: 8,
    paddingBottom: 10,
  },

  templateChip: {
    maxWidth: 160,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme
        .surfaceElevated,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  templateChipSelected: {
    borderColor:
      '#8B5CF699',
    backgroundColor:
      '#2A1E4D',
  },

  templateChipText: {
    flexShrink: 1,
    color:
      ownerTheme.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  templateChipTextSelected: {
    color:
      ownerTheme.purpleLight,
  },

  promptShell: {
    position: 'relative',
    borderRadius: 17,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme
        .surfaceElevated,
    marginBottom: 19,
  },

  promptInput: {
    minHeight: 126,
    color: ownerTheme.text,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 15,
    paddingVertical: 14,
    paddingRight: 46,
  },

  promptInputExpanded: {
    minHeight: 230,
  },

  expandButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      '#182236',
  },

  grid: {
    flexDirection: 'row',
    gap: 10,
  },

  gridItem: {
    flex: 1,
  },

  smallInputShell: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme
        .surfaceElevated,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  smallInput: {
    flex: 1,
    color: ownerTheme.text,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 10,
  },

  selectedScenario: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme
        .surfaceElevated,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  selectedScenarioText: {
    flex: 1,
    color: ownerTheme.text,
    fontSize: 13,
    fontWeight: '700',
  },

  scenarioLabel: {
    marginTop: 20,
  },

  scenarioRow: {
    gap: 9,
    paddingBottom: 4,
  },

  scenarioCard: {
    width: 118,
    minHeight: 92,
    borderRadius: 17,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme
        .surfaceElevated,
    padding: 12,
  },

  scenarioCardSelected: {
    borderColor:
      '#8B5CF699',
    backgroundColor:
      '#281C4B',
  },

  scenarioTitle: {
    marginTop: 9,
    color: ownerTheme.text,
    fontSize: 13,
    fontWeight: '800',
  },

  scenarioTitleSelected: {
    color:
      ownerTheme.purpleLight,
  },

  scenarioSubtitle: {
    marginTop: 3,
    color:
      ownerTheme.textDim,
    fontSize: 10,
    lineHeight: 14,
  },

  startButtonShell: {
    marginTop: 22,
    borderRadius: 18,
    shadowColor:
      ownerTheme.purple,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 9,
    },
    elevation: 8,
  },

  startButton: {
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  startText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  sectionHeader: {
    marginTop: 30,
    marginBottom: 14,
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
    fontSize: 13,
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listLoader: {
    marginVertical: 28,
  },

  callCard: {
    minHeight: 76,
    borderRadius: 19,
    borderWidth: 1,
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      '#251A47',
  },

  callContent: {
    flex: 1,
  },

  callNumber: {
    color: ownerTheme.text,
    fontSize: 14,
    fontWeight: '800',
  },

  callTime: {
    marginTop: 4,
    color:
      ownerTheme.textDim,
    fontSize: 11,
  },

  statusPill: {
    minHeight: 28,
    maxWidth: 108,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor:
      ownerTheme.border,
    backgroundColor:
      ownerTheme.surface,
    padding: 26,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 10,
    color: ownerTheme.text,
    fontSize: 15,
    fontWeight: '800',
  },

  emptySubtitle: {
    marginTop: 5,
    color:
      ownerTheme.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});