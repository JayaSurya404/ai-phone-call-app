import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useMemo,
  useState,
} from 'react';

import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getMobileLanguageProfile,
  mobileLanguageProfiles,
} from './language-profiles';

import {
  ownerTheme,
} from './owner-theme';

export interface LanguageProfilePickerProps {
  selectedId: string;
  onSelect(
    id: string
  ): void;
}

export function LanguageProfilePicker({
  selectedId,
  onSelect,
}: LanguageProfilePickerProps) {
  const [
    visible,
    setVisible,
  ] =
    useState(false);

  const [
    query,
    setQuery,
  ] =
    useState('');

  const selected =
    getMobileLanguageProfile(
      selectedId
    );

  const filtered =
    useMemo(
      () => {
        const normalized =
          query
            .trim()
            .toLowerCase();

        if (!normalized) {
          return mobileLanguageProfiles;
        }

        return mobileLanguageProfiles
          .filter(
            (profile) => {
              const searchable =
                [
                  profile
                    .displayName,
                  profile
                    .nativeName,
                  profile.region,
                  profile
                    .description,
                  ...profile
                    .searchTerms,
                ]
                  .join(' ')
                  .toLowerCase();

              return searchable
                .includes(
                  normalized
                );
            }
          );
      },
      [query]
    );

  function close(): void {
    setVisible(false);
    setQuery('');
  }

  return (
    <>
      <Pressable
        onPress={() => {
          setVisible(true);
        }}
        style={
          styles.selector
        }
      >
        <View
          style={styles.icon}
        >
          <Ionicons
            color={
              ownerTheme.cyan
            }
            name="language-outline"
            size={18}
          />
        </View>

        <View
          style={styles.content}
        >
          <Text
            numberOfLines={1}
            style={styles.nativeName}
          >
            {selected.nativeName}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.profileName}
          >
            {selected.displayName}
          </Text>
        </View>

        <Ionicons
          color={
            ownerTheme.textDim
          }
          name="chevron-down"
          size={17}
        />
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={close}
        presentationStyle="fullScreen"
        visible={visible}
      >
        <SafeAreaView
          style={styles.modal}
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
                style={styles.title}
              >
                Select call language
              </Text>

              <Text
                style={styles.subtitle}
              >
                Every local-language profile also understands English.
              </Text>
            </View>

            <Pressable
              onPress={close}
              style={
                styles.closeButton
              }
            >
              <Ionicons
                color={
                  ownerTheme.text
                }
                name="close"
                size={22}
              />
            </Pressable>
          </View>

          <View
            style={styles.search}
          >
            <Ionicons
              color={
                ownerTheme.textDim
              }
              name="search-outline"
              size={19}
            />

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={
                setQuery
              }
              placeholder="Search Tamil, Kannada, Spanish..."
              placeholderTextColor={
                ownerTheme.textDim
              }
              style={
                styles.searchInput
              }
              value={query}
            />
          </View>

          <FlatList
            contentContainerStyle={
              styles.list
            }
            data={filtered}
            keyboardShouldPersistTaps="handled"
            keyExtractor={
              (item) =>
                item.id
            }
            renderItem={({
              item,
            }) => {
              const isSelected =
                item.id ===
                selected.id;

              return (
                <Pressable
                  onPress={() => {
                    onSelect(
                      item.id
                    );

                    close();
                  }}
                  style={[
                    styles.item,

                    isSelected &&
                      styles.itemSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.itemIcon,

                      isSelected &&
                        styles.itemIconSelected,
                    ]}
                  >
                    <Ionicons
                      color={
                        isSelected
                          ? ownerTheme
                              .purpleLight
                          : ownerTheme
                              .textMuted
                      }
                      name="chatbubbles-outline"
                      size={20}
                    />
                  </View>

                  <View
                    style={styles.itemContent}
                  >
                    <Text
                      style={[
                        styles.itemNative,

                        isSelected &&
                          styles.itemNativeSelected,
                      ]}
                    >
                      {item.nativeName}
                    </Text>

                    <Text
                      style={styles.itemDescription}
                    >
                      {item.description}
                      {' Â· '}
                      {item.region}
                    </Text>
                  </View>

                  {isSelected ? (
                    <Ionicons
                      color={
                        ownerTheme
                          .purpleLight
                      }
                      name="checkmark-circle"
                      size={22}
                    />
                  ) : (
                    <Ionicons
                      color={
                        ownerTheme
                          .textDim
                      }
                      name="chevron-forward"
                      size={17}
                    />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View
                style={styles.empty}
              >
                <Ionicons
                  color={
                    ownerTheme.textDim
                  }
                  name="language-outline"
                  size={34}
                />

                <Text
                  style={styles.emptyText}
                >
                  No matching language profile.
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    selector: {
      minHeight: 58,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        ownerTheme.border,
      backgroundColor:
        ownerTheme
          .surfaceElevated,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    icon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#0E3441',
    },

    content: {
      flex: 1,
      minWidth: 0,
    },

    nativeName: {
      color:
        ownerTheme.text,
      fontSize: 13,
      fontWeight: '800',
    },

    profileName: {
      marginTop: 2,
      color:
        ownerTheme.textMuted,
      fontSize: 10,
    },

    modal: {
      flex: 1,
      backgroundColor:
        ownerTheme.background,
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      gap: 14,
    },

    eyebrow: {
      color:
        ownerTheme.purpleLight,
      fontSize: 10,
      letterSpacing: 1.8,
      fontWeight: '900',
    },

    title: {
      marginTop: 5,
      color:
        ownerTheme.text,
      fontSize: 24,
      fontWeight: '900',
    },

    subtitle: {
      marginTop: 5,
      maxWidth: 300,
      color:
        ownerTheme.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },

    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent:
        'center',
      borderWidth: 1,
      borderColor:
        ownerTheme.border,
      backgroundColor:
        ownerTheme.surface,
    },

    search: {
      minHeight: 52,
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        ownerTheme.border,
      backgroundColor:
        ownerTheme
          .surfaceElevated,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    searchInput: {
      flex: 1,
      color:
        ownerTheme.text,
      fontSize: 14,
      paddingVertical: 12,
    },

    list: {
      paddingHorizontal: 20,
      paddingBottom: 30,
      gap: 9,
    },

    item: {
      minHeight: 76,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        ownerTheme.border,
      backgroundColor:
        ownerTheme.surface,
      paddingHorizontal: 13,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    itemSelected: {
      borderColor:
        '#8B5CF6AA',
      backgroundColor:
        '#281C4B',
    },

    itemIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#172235',
    },

    itemIconSelected: {
      backgroundColor:
        '#3B255F',
    },

    itemContent: {
      flex: 1,
      minWidth: 0,
    },

    itemNative: {
      color:
        ownerTheme.text,
      fontSize: 15,
      fontWeight: '800',
    },

    itemNativeSelected: {
      color:
        ownerTheme.purpleLight,
    },

    itemDescription: {
      marginTop: 4,
      color:
        ownerTheme.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },

    empty: {
      paddingVertical: 60,
      alignItems: 'center',
      gap: 12,
    },

    emptyText: {
      color:
        ownerTheme.textMuted,
      fontSize: 13,
    },
  });