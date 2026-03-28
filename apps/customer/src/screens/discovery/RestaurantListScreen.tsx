import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { catalogueApi, type Catalogue } from '@foodrush/shared/api';
import { Card, Badge, Button } from '@foodrush/shared/components';
import { useTheme, type Theme } from '@foodrush/shared/hooks/useTheme';
import type { HomeStackParamList } from '@/navigation/types';

// ── Types ────────────────────────────────────────────────────────────
type SortOption = 'relevance' | 'rating' | 'delivery_time' | 'distance';

interface Filters {
  cuisines: string[];
  minRating: number;
  maxEta: number;
  priceRange: [number, number];
}

interface RestaurantRow {
  id: string;
  name: string;
  imageUrl: string | null;
  rating: number;
  cuisineTag: string;
  etaMinutes: number;
  priceLevel: number;
  distance: string;
}

const ITEM_HEIGHT = 100;
const PAGE_SIZE = 20;

const CUISINE_OPTIONS = [
  'Pizza', 'Sushi', 'Burger', 'Vegan', 'Dessert',
  'Chinese', 'Indian', 'Mexican', 'Thai', 'Healthy',
] as const;

const SORT_OPTIONS: readonly { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Rating' },
  { value: 'delivery_time', label: 'Delivery Time' },
  { value: 'distance', label: 'Distance' },
] as const;

const DEFAULT_FILTERS: Filters = {
  cuisines: [],
  minRating: 0,
  maxEta: 60,
  priceRange: [0, 4],
};

type ListNavProp = NativeStackNavigationProp<HomeStackParamList>;
type ListRouteProp = RouteProp<HomeStackParamList, 'RestaurantList'>;

// ── Helpers ──────────────────────────────────────────────────────────
function catalogueToRow(c: Catalogue, index: number): RestaurantRow {
  return {
    id: c.restaurantId,
    name: c.name,
    imageUrl: c.imageUrl,
    rating: 4.0 + (index % 10) * 0.1,
    cuisineTag: c.category,
    etaMinutes: 15 + (index % 5) * 5,
    priceLevel: 1 + (index % 4),
    distance: `${(0.5 + index * 0.3).toFixed(1)} km`,
  };
}

// ── Filter sheet sub-components ──────────────────────────────────────
function CuisineChip({
  label,
  selected,
  colors,
  onToggle,
}: {
  label: string;
  selected: boolean;
  colors: Theme['colors'];
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onToggle}
      style={[
        styles.cuisineChip,
        {
          backgroundColor: selected ? colors.primary : colors.surfaceMid,
          borderColor: selected ? colors.primary : colors.surfaceMid,
        },
      ]}
    >
      <Text
        style={[styles.cuisineChipText, { color: selected ? '#FFFFFF' : colors.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  suffix,
  colors,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  colors: Theme['colors'];
  onDecrease: () => void;
  onIncrease: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.sliderRow}>
      <Text style={[styles.sliderLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={value <= min}
          onPress={onDecrease}
          style={[styles.stepperBtn, { backgroundColor: colors.surfaceMid }]}
        >
          <Ionicons name="remove" size={18} color={value <= min ? colors.textMuted : colors.text} />
        </Pressable>
        <Text style={[styles.stepperValue, { color: colors.text }]}>
          {value}{suffix}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={value >= max}
          onPress={onIncrease}
          style={[styles.stepperBtn, { backgroundColor: colors.surfaceMid }]}
        >
          <Ionicons name="add" size={18} color={value >= max ? colors.textMuted : colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

// ── Restaurant row component ─────────────────────────────────────────
function RestaurantRowCard({
  item,
  colors,
  onPress,
}: {
  item: RestaurantRow;
  colors: Theme['colors'];
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      accessibilityLabel={`${item.name}, ${item.cuisineTag}, rated ${item.rating}, ${item.etaMinutes} minutes`}
      onPress={onPress}
      style={styles.rowCard}
    >
      <View style={styles.rowInner}>
        <View style={[styles.rowImage, { backgroundColor: colors.surfaceMid }]}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.rowImageFill}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons name="restaurant" size={28} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={colors.accent} />
            <Text style={[styles.rowMeta, { color: colors.text }]}>
              {item.rating.toFixed(1)}
            </Text>
            <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
              · {item.cuisineTag}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Badge label={`${item.etaMinutes} min`} variant="info" />
            <Text style={[styles.rowMeta, { color: colors.textMuted, marginLeft: 8 }]}>
              {item.distance}
            </Text>
            <Text style={[styles.rowMeta, { color: colors.textMuted, marginLeft: 4 }]}>
              · {'$'.repeat(item.priceLevel)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ── Empty state ──────────────────────────────────────────────────────
function EmptyState({ colors }: { colors: Theme['colors'] }): React.JSX.Element {
  return (
    <View style={styles.emptyContainer} accessibilityLabel="No restaurants found">
      <Ionicons name="sad-outline" size={64} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No restaurants found</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Try adjusting your filters or search in a different area
      </Text>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export function RestaurantListScreen(): React.JSX.Element {
  const navigation = useNavigation<ListNavProp>();
  const route = useRoute<ListRouteProp>();
  const { colors } = useTheme();

  const categoryId = route.params?.categoryId;

  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    cuisines: categoryId ? [categoryId] : [],
  }));
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);

  const filterSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%', '85%'], []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['restaurants', sortBy, filters],
    queryFn: ({ pageParam = 0 }) =>
      catalogueApi.getCatalogues({
        restaurantId: '',
        limit: PAGE_SIZE,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  });

  const restaurants = useMemo(() => {
    const all = (data?.pages ?? []).flatMap((page, pageIdx) =>
      page.map((c, i) => catalogueToRow(c, pageIdx * PAGE_SIZE + i)),
    );

    return all.filter((r) => {
      if (filters.cuisines.length > 0) {
        const matchesCuisine = filters.cuisines.some(
          (c) => c.toLowerCase() === r.cuisineTag.toLowerCase(),
        );
        if (!matchesCuisine) return false;
      }
      if (r.rating < filters.minRating) return false;
      if (r.etaMinutes > filters.maxEta) return false;
      if (r.priceLevel < filters.priceRange[0] || r.priceLevel > filters.priceRange[1]) return false;
      return true;
    });
  }, [data, filters]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRestaurantPress = useCallback(
    (restaurantId: string) => {
      navigation.navigate('RestaurantDetail', { restaurantId });
    },
    [navigation],
  );

  const openFilterSheet = useCallback(() => {
    setDraftFilters(filters);
    filterSheetRef.current?.expand();
  }, [filters]);

  const applyFilters = useCallback(() => {
    setFilters(draftFilters);
    filterSheetRef.current?.close();
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
  }, []);

  const toggleCuisine = useCallback((cuisine: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      cuisines: prev.cuisines.includes(cuisine)
        ? prev.cuisines.filter((c) => c !== cuisine)
        : [...prev.cuisines, cuisine],
    }));
  }, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RestaurantRow>) => (
      <RestaurantRowCard
        item={item}
        colors={colors}
        onPress={() => handleRestaurantPress(item.id)}
      />
    ),
    [colors, handleRestaurantPress],
  );

  const keyExtractor = useCallback((item: RestaurantRow) => item.id, []);

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage, colors.primary]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Sort & Filter bar */}
      <View style={styles.toolbar}>
        <ScrollableSort
          sortBy={sortBy}
          onSort={setSortBy}
          colors={colors}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          onPress={openFilterSheet}
          style={[styles.filterBtn, { backgroundColor: colors.surfaceMid }]}
        >
          <Ionicons name="options-outline" size={18} color={colors.text} />
          <Text style={[styles.filterBtnText, { color: colors.text }]}>Filters</Text>
          {filters.cuisines.length > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{filters.cuisines.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Restaurant list */}
      {!isLoading && restaurants.length === 0 ? (
        <EmptyState colors={colors} />
      ) : (
        <FlatList
          data={restaurants}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={ListFooter}
          contentContainerStyle={styles.listContent}
          accessibilityRole="list"
          accessibilityLabel="Restaurant list"
        />
      )}

      {/* Filter Bottom Sheet */}
      <BottomSheet
        ref={filterSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.filterSheetContent}>
          <View style={styles.filterSheetHeader}>
            <Text style={[styles.filterSheetTitle, { color: colors.text }]}>Filters</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
              onPress={resetFilters}
            >
              <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
            </Pressable>
          </View>

          {/* Cuisine multi-select */}
          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Cuisine</Text>
          <View style={styles.cuisineGrid}>
            {CUISINE_OPTIONS.map((cuisine) => (
              <CuisineChip
                key={cuisine}
                label={cuisine}
                selected={draftFilters.cuisines.includes(cuisine)}
                colors={colors}
                onToggle={() => toggleCuisine(cuisine)}
              />
            ))}
          </View>

          {/* Min rating */}
          <SliderRow
            label="Min Rating"
            value={draftFilters.minRating}
            min={0}
            max={5}
            suffix="★"
            colors={colors}
            onDecrease={() =>
              setDraftFilters((p) => ({ ...p, minRating: Math.max(0, p.minRating - 0.5) }))
            }
            onIncrease={() =>
              setDraftFilters((p) => ({ ...p, minRating: Math.min(5, p.minRating + 0.5) }))
            }
          />

          {/* Max ETA */}
          <SliderRow
            label="Max Delivery Time"
            value={draftFilters.maxEta}
            min={10}
            max={90}
            suffix=" min"
            colors={colors}
            onDecrease={() =>
              setDraftFilters((p) => ({ ...p, maxEta: Math.max(10, p.maxEta - 5) }))
            }
            onIncrease={() =>
              setDraftFilters((p) => ({ ...p, maxEta: Math.min(90, p.maxEta + 5) }))
            }
          />

          {/* Price range */}
          <SliderRow
            label="Max Price Level"
            value={draftFilters.priceRange[1]}
            min={1}
            max={4}
            suffix="$"
            colors={colors}
            onDecrease={() =>
              setDraftFilters((p) => ({
                ...p,
                priceRange: [p.priceRange[0], Math.max(1, p.priceRange[1] - 1)],
              }))
            }
            onIncrease={() =>
              setDraftFilters((p) => ({
                ...p,
                priceRange: [p.priceRange[0], Math.min(4, p.priceRange[1] + 1)],
              }))
            }
          />

          <Button
            title="Apply Filters"
            onPress={applyFilters}
            style={styles.applyBtn}
            accessibilityLabel="Apply selected filters"
          />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

// ── Sort Tabs ────────────────────────────────────────────────────────
function ScrollableSort({
  sortBy,
  onSort,
  colors,
}: {
  sortBy: SortOption;
  onSort: (s: SortOption) => void;
  colors: Theme['colors'];
}): React.JSX.Element {
  return (
    <View style={styles.sortRow} accessibilityRole="radiogroup" accessibilityLabel="Sort options">
      {SORT_OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          accessibilityRole="radio"
          accessibilityState={{ selected: sortBy === opt.value }}
          accessibilityLabel={`Sort by ${opt.label}`}
          onPress={() => onSort(opt.value)}
          style={[
            styles.sortChip,
            {
              backgroundColor: sortBy === opt.value ? colors.primary : colors.surfaceMid,
            },
          ]}
        >
          <Text
            style={[
              styles.sortChipText,
              { color: sortBy === opt.value ? '#FFFFFF' : colors.text },
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  sortChipText: {
    fontSize: 12,
    fontFamily: 'DM Sans',
    fontWeight: '600',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 4,
  },
  filterBtnText: {
    fontSize: 12,
    fontFamily: 'DM Sans',
    fontWeight: '600',
  },
  filterBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  rowCard: {
    marginBottom: 10,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowImageFill: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontFamily: 'Sora',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rowMeta: {
    fontSize: 13,
    fontFamily: 'DM Sans',
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
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  filterSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterSheetTitle: {
    fontSize: 20,
    fontFamily: 'Sora',
    fontWeight: '700',
  },
  resetText: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    fontWeight: '600',
  },
  filterSectionTitle: {
    fontSize: 15,
    fontFamily: 'Sora',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 10,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  cuisineChipText: {
    fontSize: 13,
    fontFamily: 'DM Sans',
    fontWeight: '500',
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  sliderLabel: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    fontWeight: '500',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
  },
  applyBtn: {
    marginTop: 28,
  },
});
