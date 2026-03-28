import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Dimensions,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { catalogueApi, type MenuItem } from '@foodrush/shared/api';
import { Card, Badge, Button, SkeletonLoader } from '@foodrush/shared/components';
import { useTheme, type Theme } from '@foodrush/shared/hooks/useTheme';
import type { HomeStackParamList } from '@/navigation/types';
import { useCartStore, type CartItemModifier } from '@/store/cart';

// ── Types ────────────────────────────────────────────────────────────
interface MenuSection {
  title: string;
  data: MenuItem[];
}

interface SizeOption {
  id: string;
  label: string;
  priceModifier: number;
}

interface ExtraOption {
  id: string;
  name: string;
  price: number;
}

type DetailRouteProp = RouteProp<HomeStackParamList, 'RestaurantDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 240;

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<MenuItem, MenuSection>,
);

const SIZE_OPTIONS: readonly SizeOption[] = [
  { id: 'small', label: 'Small', priceModifier: 0 },
  { id: 'medium', label: 'Medium', priceModifier: 2 },
  { id: 'large', label: 'Large', priceModifier: 4 },
] as const;

const EXTRA_OPTIONS: readonly ExtraOption[] = [
  { id: 'cheese', name: 'Extra Cheese', price: 1.5 },
  { id: 'sauce', name: 'Extra Sauce', price: 0.75 },
  { id: 'bacon', name: 'Bacon', price: 2.0 },
  { id: 'avocado', name: 'Avocado', price: 1.75 },
] as const;

// ── Menu Item Card ───────────────────────────────────────────────────
function MenuItemCard({
  item,
  colors,
  onAdd,
}: {
  item: MenuItem;
  colors: Theme['colors'];
  onAdd: (item: MenuItem) => void;
}): React.JSX.Element {
  return (
    <Card
      accessibilityLabel={`${item.name}, ${item.price} ${item.currency}`}
      style={styles.menuCard}
    >
      <View style={styles.menuCardRow}>
        <View style={styles.menuCardInfo}>
          <Text style={[styles.menuItemName, { color: colors.text }]}>{item.name}</Text>
          <Text
            style={[styles.menuItemDesc, { color: colors.textMuted }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
          <View style={styles.menuCardMeta}>
            <Text style={[styles.menuItemPrice, { color: colors.primary }]}>
              ${item.price.toFixed(2)}
            </Text>
            {item.dietaryTags.length > 0 && (
              <View style={styles.allergyBadges}>
                {item.dietaryTags.map((tag) => (
                  <Badge key={tag} label={tag} variant="neutral" />
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.menuCardRight}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={[styles.menuItemImage, { backgroundColor: colors.surfaceMid }]}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.menuItemImage, { backgroundColor: colors.surfaceMid }]}>
              <Ionicons name="fast-food-outline" size={24} color={colors.textMuted} />
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.name} to cart`}
            onPress={() => onAdd(item)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

// ── Modifier Bottom Sheet Content ────────────────────────────────────
function ModifierSheet({
  item,
  colors,
  onConfirm,
  onClose,
}: {
  item: MenuItem;
  colors: Theme['colors'];
  onConfirm: (size: string, extras: CartItemModifier[], qty: number) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [selectedSize, setSelectedSize] = useState<string>('small');
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);

  const sizeOption = SIZE_OPTIONS.find((s) => s.id === selectedSize);
  const extrasTotal = EXTRA_OPTIONS.filter((e) => selectedExtras.has(e.id)).reduce(
    (sum, e) => sum + e.price,
    0,
  );
  const unitPrice = item.price + (sizeOption?.priceModifier ?? 0) + extrasTotal;
  const totalPrice = unitPrice * quantity;

  const toggleExtra = useCallback((extraId: string) => {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(extraId)) {
        next.delete(extraId);
      } else {
        next.add(extraId);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const extras: CartItemModifier[] = EXTRA_OPTIONS
      .filter((e) => selectedExtras.has(e.id))
      .map((e) => ({ id: e.id, name: e.name, price: e.price }));
    onConfirm(selectedSize, extras, quantity);
  }, [selectedSize, selectedExtras, quantity, onConfirm]);

  return (
    <BottomSheetView style={styles.modifierContent}>
      <View style={styles.modifierHeader}>
        <Text style={[styles.modifierTitle, { color: colors.text }]}>{item.name}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close modifier sheet"
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Size selector */}
      <Text style={[styles.modifierSectionTitle, { color: colors.text }]}>Size</Text>
      <View style={styles.sizeRow} accessibilityRole="radiogroup" accessibilityLabel="Size options">
        {SIZE_OPTIONS.map((size) => (
          <Pressable
            key={size.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedSize === size.id }}
            accessibilityLabel={`${size.label}${size.priceModifier > 0 ? `, plus $${size.priceModifier.toFixed(2)}` : ''}`}
            onPress={() => setSelectedSize(size.id)}
            style={[
              styles.sizeChip,
              {
                backgroundColor:
                  selectedSize === size.id ? colors.primary : colors.surfaceMid,
                borderColor:
                  selectedSize === size.id ? colors.primary : colors.surfaceMid,
              },
            ]}
          >
            <Text
              style={[
                styles.sizeChipText,
                { color: selectedSize === size.id ? '#FFFFFF' : colors.text },
              ]}
            >
              {size.label}
              {size.priceModifier > 0 ? ` +$${size.priceModifier.toFixed(2)}` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Extras checkboxes */}
      <Text style={[styles.modifierSectionTitle, { color: colors.text }]}>Extras</Text>
      {EXTRA_OPTIONS.map((extra) => {
        const checked = selectedExtras.has(extra.id);
        return (
          <Pressable
            key={extra.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={`${extra.name}, $${extra.price.toFixed(2)}`}
            onPress={() => toggleExtra(extra.id)}
            style={styles.extraRow}
          >
            <Ionicons
              name={checked ? 'checkbox' : 'square-outline'}
              size={22}
              color={checked ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.extraLabel, { color: colors.text }]}>{extra.name}</Text>
            <Text style={[styles.extraPrice, { color: colors.textMuted }]}>
              +${extra.price.toFixed(2)}
            </Text>
          </Pressable>
        );
      })}

      {/* Quantity stepper */}
      <Text style={[styles.modifierSectionTitle, { color: colors.text }]}>Quantity</Text>
      <View style={styles.quantityStepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease quantity"
          disabled={quantity <= 1}
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          style={[styles.qtyBtn, { backgroundColor: colors.surfaceMid }]}
        >
          <Ionicons
            name="remove"
            size={20}
            color={quantity <= 1 ? colors.textMuted : colors.text}
          />
        </Pressable>
        <Text
          style={[styles.qtyValue, { color: colors.text }]}
          accessibilityLabel={`Quantity: ${quantity}`}
        >
          {quantity}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase quantity"
          onPress={() => setQuantity((q) => q + 1)}
          style={[styles.qtyBtn, { backgroundColor: colors.surfaceMid }]}
        >
          <Ionicons name="add" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Confirm button */}
      <Button
        title={`Add to Cart · $${totalPrice.toFixed(2)}`}
        onPress={handleConfirm}
        style={styles.confirmBtn}
        accessibilityLabel={`Add ${quantity} ${item.name} to cart for $${totalPrice.toFixed(2)}`}
      />
    </BottomSheetView>
  );
}

// ── Detail Skeleton ──────────────────────────────────────────────────
function DetailSkeleton({ colors }: { colors: Theme['colors'] }): React.JSX.Element {
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <SkeletonLoader width={SCREEN_WIDTH} height={HERO_HEIGHT} />
      <View style={styles.skeletonBody}>
        <SkeletonLoader width={200} height={24} />
        <SkeletonLoader width={120} height={16} style={{ marginTop: 8 }} />
        <SkeletonLoader width={SCREEN_WIDTH - 32} height={80} style={{ marginTop: 16 }} />
        <SkeletonLoader width={SCREEN_WIDTH - 32} height={80} style={{ marginTop: 12 }} />
        <SkeletonLoader width={SCREEN_WIDTH - 32} height={80} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export function RestaurantDetailScreen(): React.JSX.Element {
  const route = useRoute<DetailRouteProp>();
  const { colors } = useTheme();
  const { restaurantId } = route.params;

  const addItem = useCartStore((s) => s.addItem);

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const modifierSheetRef = useRef<BottomSheet>(null);
  const modifierSnapPoints = useMemo(() => ['65%', '85%'], []);

  const scrollY = useSharedValue(0);

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menus', restaurantId],
    queryFn: () => catalogueApi.getMenus({ restaurantId }),
  });

  const sections = useMemo<MenuSection[]>(() => {
    if (!menuItems) return [];
    const grouped = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      const category = item.category || 'Other';
      const existing = grouped.get(category);
      if (existing) {
        existing.push(item);
      } else {
        grouped.set(category, [item]);
      }
    }
    return Array.from(grouped.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [menuItems]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-HERO_HEIGHT, 0, HERO_HEIGHT],
      [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.75],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-HERO_HEIGHT, 0],
      [2, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const headerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HERO_HEIGHT - 100, HERO_HEIGHT - 40],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const handleAddPress = useCallback((item: MenuItem) => {
    setSelectedItem(item);
    modifierSheetRef.current?.expand();
  }, []);

  const handleModifierConfirm = useCallback(
    (size: string, extras: CartItemModifier[], qty: number) => {
      if (!selectedItem) return;
      addItem({
        menuItemId: selectedItem.id,
        restaurantId: selectedItem.restaurantId,
        name: selectedItem.name,
        price: selectedItem.price + (SIZE_OPTIONS.find((s) => s.id === size)?.priceModifier ?? 0),
        quantity: qty,
        size,
        extras,
        imageUrl: selectedItem.imageUrl,
      });
      modifierSheetRef.current?.close();
      setSelectedItem(null);
    },
    [selectedItem, addItem],
  );

  const handleModifierClose = useCallback(() => {
    modifierSheetRef.current?.close();
    setSelectedItem(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<MenuItem, MenuSection>) => (
      <MenuItemCard item={item} colors={colors} onAdd={handleAddPress} />
    ),
    [colors, handleAddPress],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<MenuItem, MenuSection> }) => (
      <View style={[styles.sectionHeaderBar, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionHeaderText, { color: colors.text }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors],
  );

  const keyExtractor = useCallback((item: MenuItem) => item.id, []);

  if (isLoading) {
    return <DetailSkeleton colors={colors} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Sticky hero image with parallax */}
      <Animated.View style={[styles.heroContainer, heroStyle]}>
        <Image
          source={{ uri: `https://placehold.co/600x400/FF6B35/FFFFFF?text=Restaurant` }}
          style={styles.heroImage}
          accessibilityIgnoresInvertColors
          accessibilityLabel="Restaurant cover image"
        />
      </Animated.View>

      {/* Overlay header that appears on scroll */}
      <Animated.View
        style={[styles.stickyHeader, { backgroundColor: colors.surface }, headerOpacity]}
      >
        <Text style={[styles.stickyHeaderText, { color: colors.text }]} numberOfLines={1}>
          Restaurant
        </Text>
      </Animated.View>

      {/* Menu SectionList */}
      <AnimatedSectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        stickySectionHeadersEnabled
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.menuListContent, { paddingTop: HERO_HEIGHT }]}
        ListHeaderComponent={
          <View style={styles.restaurantInfo}>
            <Text style={[styles.restaurantName, { color: colors.text }]}>
              Restaurant
            </Text>
            <View style={styles.restaurantMeta}>
              <Ionicons name="star" size={16} color={colors.accent} />
              <Text style={[styles.restaurantRating, { color: colors.text }]}>4.5</Text>
              <Text style={[styles.restaurantDetail, { color: colors.textMuted }]}>
                · 20–30 min · $$
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyMenu}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyMenuText, { color: colors.textMuted }]}>
              No menu items available
            </Text>
          </View>
        }
        accessibilityRole="list"
        accessibilityLabel="Menu items"
      />

      {/* Modifier Bottom Sheet */}
      <BottomSheet
        ref={modifierSheetRef}
        index={-1}
        snapPoints={modifierSnapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        {selectedItem && (
          <ModifierSheet
            item={selectedItem}
            colors={colors}
            onConfirm={handleModifierConfirm}
            onClose={handleModifierClose}
          />
        )}
      </BottomSheet>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    zIndex: 0,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    zIndex: 10,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  stickyHeaderText: {
    fontSize: 17,
    fontFamily: 'Sora',
    fontWeight: '700',
  },
  menuListContent: {
    paddingBottom: 40,
  },
  restaurantInfo: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  restaurantName: {
    fontSize: 22,
    fontFamily: 'Sora',
    fontWeight: '700',
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  restaurantRating: {
    fontSize: 15,
    fontFamily: 'DM Sans',
    fontWeight: '600',
  },
  restaurantDetail: {
    fontSize: 14,
    fontFamily: 'DM Sans',
  },
  sectionHeaderBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionHeaderText: {
    fontSize: 17,
    fontFamily: 'Sora',
    fontWeight: '700',
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  menuCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  menuCardInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 15,
    fontFamily: 'Sora',
    fontWeight: '600',
  },
  menuItemDesc: {
    fontSize: 13,
    fontFamily: 'DM Sans',
    marginTop: 4,
    lineHeight: 18,
  },
  menuCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  menuItemPrice: {
    fontSize: 15,
    fontFamily: 'DM Sans',
    fontWeight: '700',
  },
  allergyBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  menuCardRight: {
    alignItems: 'center',
    gap: 8,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMenu: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 12,
  },
  emptyMenuText: {
    fontSize: 15,
    fontFamily: 'DM Sans',
  },
  modifierContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modifierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modifierTitle: {
    fontSize: 20,
    fontFamily: 'Sora',
    fontWeight: '700',
  },
  modifierSectionTitle: {
    fontSize: 15,
    fontFamily: 'Sora',
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 10,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
  },
  sizeChipText: {
    fontSize: 13,
    fontFamily: 'DM Sans',
    fontWeight: '600',
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  extraLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DM Sans',
  },
  extraPrice: {
    fontSize: 13,
    fontFamily: 'DM Sans',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    alignSelf: 'center',
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 20,
    fontFamily: 'Sora',
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  confirmBtn: {
    marginTop: 24,
  },
  skeletonBody: {
    padding: 16,
  },
});
