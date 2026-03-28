import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { catalogueApi, type Catalogue, type MenuItem } from '@foodrush/shared/api';
import { Card, Badge, SkeletonLoader } from '@foodrush/shared/components';
import { useTheme, type Theme } from '@foodrush/shared/hooks/useTheme';
import type { HomeStackParamList } from '@/navigation/types';

// ── Types ────────────────────────────────────────────────────────────
type SearchNavProp = NativeStackNavigationProp<HomeStackParamList>;

interface SearchResultSection {
  title: string;
  data: Array<RestaurantResult | MenuItemResult>;
  type: 'restaurants' | 'menuItems';
}

interface RestaurantResult {
  kind: 'restaurant';
  id: string;
  name: string;
  imageUrl: string | null;
  cuisineTag: string;
  rating: number;
}

interface MenuItemResult {
  kind: 'menuItem';
  id: string;
  name: string;
  restaurantId: string;
  price: number;
  currency: string;
  imageUrl: string | null;
}

type ResultItem = RestaurantResult | MenuItemResult;

// ── Constants ────────────────────────────────────────────────────────
const DEBOUNCE_MS = 300;
const MAX_RECENT_SEARCHES = 10;
const RECENT_SEARCHES_KEY = 'foodrush_recent_searches';

// ── Helpers ──────────────────────────────────────────────────────────
async function loadRecentSearches(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

async function saveRecentSearch(query: string): Promise<string[]> {
  const existing = await loadRecentSearches();
  const filtered = existing.filter((s) => s !== query);
  const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  return updated;
}

async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
}

function catalogueToResult(c: Catalogue): RestaurantResult {
  return {
    kind: 'restaurant',
    id: c.restaurantId,
    name: c.name,
    imageUrl: c.imageUrl,
    cuisineTag: c.category,
    rating: 4.4,
  };
}

function menuToResult(m: MenuItem): MenuItemResult {
  return {
    kind: 'menuItem',
    id: m.id,
    name: m.name,
    restaurantId: m.restaurantId,
    price: m.price,
    currency: m.currency,
    imageUrl: m.imageUrl,
  };
}

// ── Sub-components ───────────────────────────────────────────────────
function RecentSearchItem({
  term,
  colors,
  onPress,
}: {
  term: string;
  colors: Theme['colors'];
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Search for ${term}`}
      onPress={onPress}
      style={styles.recentItem}
    >
      <Ionicons name="time-outline" size={18} color={colors.textMuted} />
      <Text style={[styles.recentText, { color: colors.text }]}>{term}</Text>
    </Pressable>
  );
}

function RestaurantResultCard({
  item,
  colors,
  onPress,
}: {
  item: RestaurantResult;
  colors: Theme['colors'];
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      accessibilityLabel={`${item.name}, ${item.cuisineTag}`}
      onPress={onPress}
      style={styles.resultCard}
    >
      <View style={styles.resultRow}>
        <View style={[styles.resultImage, { backgroundColor: colors.surfaceMid }]}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.resultImageFill}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons name="restaurant" size={24} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.resultInfo}>
          <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.resultMeta}>
            <Ionicons name="star" size={13} color={colors.accent} />
            <Text style={[styles.resultMetaText, { color: colors.text }]}>
              {item.rating.toFixed(1)}
            </Text>
            <Text style={[styles.resultMetaText, { color: colors.textMuted }]}>
              · {item.cuisineTag}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Card>
  );
}

function MenuItemResultCard({
  item,
  colors,
  onPress,
}: {
  item: MenuItemResult;
  colors: Theme['colors'];
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      accessibilityLabel={`${item.name}, $${item.price.toFixed(2)}`}
      onPress={onPress}
      style={styles.resultCard}
    >
      <View style={styles.resultRow}>
        <View style={[styles.resultImage, { backgroundColor: colors.surfaceMid }]}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.resultImageFill}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons name="fast-food-outline" size={24} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.resultInfo}>
          <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.resultPrice, { color: colors.primary }]}>
            ${item.price.toFixed(2)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Card>
  );
}

function EmptyResults({ colors }: { colors: Theme['colors'] }): React.JSX.Element {
  return (
    <View style={styles.emptyContainer} accessibilityLabel="No results found">
      <Ionicons name="search-outline" size={56} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Try a different search term or browse categories
      </Text>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export function SearchScreen(): React.JSX.Element {
  const navigation = useNavigation<SearchNavProp>();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Load recent searches on mount
  useEffect(() => {
    void loadRecentSearches().then(setRecentSearches);
  }, []);

  // Auto-focus search input
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch catalogues matching query
  const { data: catalogues, isLoading: cataloguesLoading } = useQuery({
    queryKey: ['search', 'catalogues', debouncedQuery],
    queryFn: () =>
      catalogueApi.getCatalogues({
        restaurantId: '',
        limit: 10,
      }),
    enabled: debouncedQuery.length >= 2,
  });

  // Fetch menu items matching query
  const { data: menuItems, isLoading: menuItemsLoading } = useQuery({
    queryKey: ['search', 'menus', debouncedQuery],
    queryFn: () =>
      catalogueApi.searchMenus({ q: debouncedQuery, limit: 10 }),
    enabled: debouncedQuery.length >= 2,
  });

  const isSearching = debouncedQuery.length >= 2;
  const isLoading = cataloguesLoading || menuItemsLoading;

  const restaurantResults = useMemo(
    () =>
      (catalogues ?? [])
        .filter((c) => c.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
        .map(catalogueToResult),
    [catalogues, debouncedQuery],
  );

  const menuItemResults = useMemo(
    () => (menuItems ?? []).map(menuToResult),
    [menuItems],
  );

  const hasResults = restaurantResults.length > 0 || menuItemResults.length > 0;

  const sections = useMemo<SearchResultSection[]>(() => {
    const result: SearchResultSection[] = [];
    if (restaurantResults.length > 0) {
      result.push({
        title: 'Restaurants',
        data: restaurantResults,
        type: 'restaurants',
      });
    }
    if (menuItemResults.length > 0) {
      result.push({
        title: 'Menu Items',
        data: menuItemResults,
        type: 'menuItems',
      });
    }
    return result;
  }, [restaurantResults, menuItemResults]);

  const handleSearchSubmit = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const updated = await saveRecentSearch(trimmed);
    setRecentSearches(updated);
  }, [query]);

  const handleRecentPress = useCallback(
    (term: string) => {
      setQuery(term);
      setDebouncedQuery(term);
    },
    [],
  );

  const handleClearRecent = useCallback(async () => {
    await clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const handleRestaurantPress = useCallback(
    (restaurantId: string) => {
      void handleSearchSubmit();
      navigation.navigate('RestaurantDetail', { restaurantId });
    },
    [navigation, handleSearchSubmit],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<ResultItem, SearchResultSection> }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<ResultItem, SearchResultSection>) => {
      if (item.kind === 'restaurant') {
        return (
          <RestaurantResultCard
            item={item}
            colors={colors}
            onPress={() => handleRestaurantPress(item.id)}
          />
        );
      }
      return (
        <MenuItemResultCard
          item={item}
          colors={colors}
          onPress={() => handleRestaurantPress(item.restaurantId)}
        />
      );
    },
    [colors, handleRestaurantPress],
  );

  const keyExtractor = useCallback((item: ResultItem) => `${item.kind}-${item.id}`, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Search input */}
      <View style={styles.searchBar}>
        <View style={[styles.searchInput, { backgroundColor: colors.surfaceMid }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            accessibilityLabel="Search restaurants and food"
            accessibilityHint="Type to search for restaurants or menu items"
            placeholder="Search restaurants & food..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void handleSearchSubmit()}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchTextInput, { color: colors.text }]}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Recent searches (shown when no active search) */}
      {!isSearching && recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: colors.text }]}>Recent Searches</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear recent searches"
              onPress={() => void handleClearRecent()}
            >
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
            </Pressable>
          </View>
          {recentSearches.map((term) => (
            <RecentSearchItem
              key={term}
              term={term}
              colors={colors}
              onPress={() => handleRecentPress(term)}
            />
          ))}
        </View>
      )}

      {/* Loading state */}
      {isSearching && isLoading && (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader
              key={i}
              width={340}
              height={72}
              style={styles.skeletonResult}
            />
          ))}
        </View>
      )}

      {/* Search results */}
      {isSearching && !isLoading && hasResults && (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.resultsList}
          accessibilityRole="list"
          accessibilityLabel="Search results"
        />
      )}

      {/* Empty state */}
      {isSearching && !isLoading && !hasResults && (
        <EmptyResults colors={colors} />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'DM Sans',
    padding: 0,
  },
  recentSection: {
    paddingHorizontal: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  recentTitle: {
    fontSize: 16,
    fontFamily: 'Sora',
    fontWeight: '700',
  },
  clearText: {
    fontSize: 13,
    fontFamily: 'DM Sans',
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  recentText: {
    fontSize: 14,
    fontFamily: 'DM Sans',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  skeletonResult: {
    borderRadius: 12,
  },
  resultsList: {
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Sora',
    fontWeight: '700',
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultImageFill: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontFamily: 'Sora',
    fontWeight: '600',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  resultMetaText: {
    fontSize: 13,
    fontFamily: 'DM Sans',
  },
  resultPrice: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    fontWeight: '700',
    marginTop: 3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Sora',
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    lineHeight: 20,
  },
});
