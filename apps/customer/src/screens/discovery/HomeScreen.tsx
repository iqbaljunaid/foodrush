import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { catalogueApi, type Catalogue } from '@foodrush/shared/api';
import { Card, Badge, SkeletonLoader } from '@foodrush/shared/components';
import { useTheme, type Theme } from '@foodrush/shared/hooks/useTheme';
import type { HomeStackParamList } from '@/navigation/types';

// ── Types ────────────────────────────────────────────────────────────
interface Category {
  id: string;
  label: string;
  emoji: string;
}

interface FeaturedRestaurant {
  id: string;
  name: string;
  imageUrl: string | null;
  rating: number;
  cuisineTag: string;
  etaMinutes: number;
}

interface NearbyRestaurant {
  id: string;
  name: string;
  imageUrl: string | null;
  rating: number;
  cuisineTag: string;
  etaMinutes: number;
  distance: string;
}

// ── Constants ────────────────────────────────────────────────────────
const CATEGORIES: readonly Category[] = [
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'sushi', label: 'Sushi', emoji: '🍣' },
  { id: 'burger', label: 'Burger', emoji: '🍔' },
  { id: 'vegan', label: 'Vegan', emoji: '🥬' },
  { id: 'dessert', label: 'Dessert', emoji: '🍰' },
  { id: 'chinese', label: 'Chinese', emoji: '🥡' },
  { id: 'indian', label: 'Indian', emoji: '🍛' },
  { id: 'mexican', label: 'Mexican', emoji: '🌮' },
  { id: 'thai', label: 'Thai', emoji: '🍜' },
  { id: 'healthy', label: 'Healthy', emoji: '🥗' },
] as const;

const FEATURED_CARD_WIDTH = 260;
const FEATURED_CARD_HEIGHT = 200;

type HomeNavProp = NativeStackNavigationProp<HomeStackParamList>;

// ── Helpers ──────────────────────────────────────────────────────────
function cataloguesToFeatured(catalogues: Catalogue[]): FeaturedRestaurant[] {
  return catalogues.slice(0, 10).map((c) => ({
    id: c.restaurantId,
    name: c.name,
    imageUrl: c.imageUrl,
    rating: 4.5,
    cuisineTag: c.category,
    etaMinutes: 25,
  }));
}

function cataloguesToNearby(catalogues: Catalogue[]): NearbyRestaurant[] {
  return catalogues.slice(0, 4).map((c) => ({
    id: c.restaurantId,
    name: c.name,
    imageUrl: c.imageUrl,
    rating: 4.3,
    cuisineTag: c.category,
    etaMinutes: 20,
    distance: '1.2 km',
  }));
}

// ── Sub-components ───────────────────────────────────────────────────
function LocationHeader({ colors }: { colors: Theme['colors'] }): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Change delivery address"
      accessibilityHint="Opens address picker"
      style={[styles.locationPill, { backgroundColor: colors.surfaceMid }]}
    >
      <Ionicons name="location-sharp" size={18} color={colors.primary} />
      <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
        Current Location
      </Text>
      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function CategoryChips({
  colors,
  onSelect,
}: {
  colors: Theme['colors'];
  onSelect: (id: string) => void;
}): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipContainer}
      accessibilityRole="menu"
      accessibilityLabel="Food categories"
    >
      {CATEGORIES.map((cat) => (
        <Pressable
          key={cat.id}
          accessibilityRole="menuitem"
          accessibilityLabel={cat.label}
          onPress={() => onSelect(cat.id)}
          style={[styles.chip, { backgroundColor: colors.surfaceMid }]}
        >
          <Text style={styles.chipEmoji}>{cat.emoji}</Text>
          <Text style={[styles.chipLabel, { color: colors.text }]}>{cat.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function DeliveryEstimate({
  colors,
}: {
  colors: Theme['colors'];
}): React.JSX.Element {
  return (
    <View style={styles.estimateRow}>
      <Ionicons name="time-outline" size={16} color={colors.primary} />
      <Text style={[styles.estimateText, { color: colors.textMuted }]}>
        Delivering now · Est. 20–35 min
      </Text>
    </View>
  );
}

function FeaturedCard({
  item,
  colors,
  onPress,
}: {
  item: FeaturedRestaurant;
  colors: Theme['colors'];
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      accessibilityLabel={`${item.name}, ${item.cuisineTag}, rated ${item.rating}`}
      onPress={onPress}
      style={[styles.featuredCard, { width: FEATURED_CARD_WIDTH }]}
    >
      <View style={[styles.featuredImageWrap, { backgroundColor: colors.surfaceMid }]}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.featuredImage}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Ionicons name="restaurant" size={48} color={colors.textMuted} />
        )}
        <Badge
          label={`${item.etaMinutes} min`}
          variant="info"
          style={styles.etaBadge}
        />
      </View>
      <Text style={[styles.restaurantName, { color: colors.text }]} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={styles.metaRow}>
        <Ionicons name="star" size={14} color={colors.accent} />
        <Text style={[styles.ratingText, { color: colors.text }]}>
          {item.rating.toFixed(1)}
        </Text>
        <Text style={[styles.cuisineTag, { color: colors.textMuted }]}>
          · {item.cuisineTag}
        </Text>
      </View>
    </Card>
  );
}

function NearbyCard({
  item,
  colors,
  onPress,
}: {
  item: NearbyRestaurant;
  colors: Theme['colors'];
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      accessibilityLabel={`${item.name}, ${item.distance} away, ${item.etaMinutes} minutes`}
      onPress={onPress}
      style={styles.nearbyCard}
    >
      <View style={styles.nearbyRow}>
        <View style={[styles.nearbyImageWrap, { backgroundColor: colors.surfaceMid }]}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.nearbyImage}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons name="restaurant" size={28} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.nearbyInfo}>
          <Text style={[styles.restaurantName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={14} color={colors.accent} />
            <Text style={[styles.ratingText, { color: colors.text }]}>
              {item.rating.toFixed(1)}
            </Text>
            <Text style={[styles.cuisineTag, { color: colors.textMuted }]}>
              · {item.cuisineTag}
            </Text>
          </View>
          <Text style={[styles.distanceText, { color: colors.textMuted }]}>
            {item.distance} · {item.etaMinutes} min
          </Text>
        </View>
      </View>
    </Card>
  );
}

function HomeSkeleton({ colors }: { colors: Theme['colors'] }): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityLabel="Loading home screen">
      <SkeletonLoader width={200} height={36} style={styles.skeletonPill} />
      <View style={styles.chipContainer}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoader key={i} width={80} height={36} shape="rect" style={styles.skeletonChip} />
        ))}
      </View>
      <SkeletonLoader width={300} height={FEATURED_CARD_HEIGHT} style={styles.skeletonFeatured} />
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonLoader key={i} width={340} height={80} style={styles.skeletonNearby} />
      ))}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<HomeNavProp>();
  const { colors } = useTheme();

  const {
    data: catalogues,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['catalogues', 'home'],
    queryFn: () =>
      catalogueApi.getCatalogues({ restaurantId: '', limit: 20 }),
  });

  const featured = useMemo(
    () => cataloguesToFeatured(catalogues ?? []),
    [catalogues],
  );

  const nearby = useMemo(
    () => cataloguesToNearby(catalogues ?? []),
    [catalogues],
  );

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      navigation.navigate('RestaurantList', { categoryId });
    },
    [navigation],
  );

  const handleRestaurantPress = useCallback(
    (restaurantId: string) => {
      navigation.navigate('RestaurantDetail', { restaurantId });
    },
    [navigation],
  );

  const handleSeeAll = useCallback(() => {
    navigation.navigate('RestaurantList', {});
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  const renderFeaturedItem = useCallback(
    ({ item }: ListRenderItemInfo<FeaturedRestaurant>) => (
      <FeaturedCard
        item={item}
        colors={colors}
        onPress={() => handleRestaurantPress(item.id)}
      />
    ),
    [colors, handleRestaurantPress],
  );

  const featuredKeyExtractor = useCallback(
    (item: FeaturedRestaurant) => item.id,
    [],
  );

  if (isLoading) {
    return <HomeSkeleton colors={colors} />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Location header */}
      <View style={styles.headerRow}>
        <LocationHeader colors={colors} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search restaurants and food"
          onPress={handleSearchPress}
          style={styles.searchBtn}
        >
          <Ionicons name="search" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Category chips */}
      <CategoryChips colors={colors} onSelect={handleCategorySelect} />

      {/* Delivery estimate */}
      <DeliveryEstimate colors={colors} />

      {/* Featured restaurants carousel */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Featured Restaurants
        </Text>
      </View>
      <FlatList
        data={featured}
        renderItem={renderFeaturedItem}
        keyExtractor={featuredKeyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredList}
        accessibilityRole="list"
        accessibilityLabel="Featured restaurants"
      />

      {/* Near you */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Near You</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all nearby restaurants"
          onPress={handleSeeAll}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
        </Pressable>
      </View>
      {nearby.map((restaurant) => (
        <NearbyCard
          key={restaurant.id}
          item={restaurant}
          colors={colors}
          onPress={() => handleRestaurantPress(restaurant.id)}
        />
      ))}
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    fontWeight: '500',
    flex: 1,
  },
  searchBtn: {
    padding: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    gap: 6,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: 'DM Sans',
    fontWeight: '500',
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  estimateText: {
    fontSize: 13,
    fontFamily: 'DM Sans',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Sora',
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    fontWeight: '600',
  },
  featuredList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredCard: {
    marginRight: 0,
  },
  featuredImageWrap: {
    width: '100%',
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  etaBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  restaurantName: {
    fontSize: 15,
    fontFamily: 'Sora',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'DM Sans',
    fontWeight: '600',
  },
  cuisineTag: {
    fontSize: 13,
    fontFamily: 'DM Sans',
  },
  nearbyCard: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nearbyImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  nearbyInfo: {
    flex: 1,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: 'DM Sans',
    marginTop: 2,
  },
  skeletonPill: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  skeletonChip: {
    marginRight: 8,
  },
  skeletonFeatured: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  skeletonNearby: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
});
