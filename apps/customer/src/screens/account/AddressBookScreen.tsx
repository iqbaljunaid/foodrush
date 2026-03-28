import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, type Region } from 'react-native-maps';

import { userApi, type Address, type AddAddressInput } from '@foodrush/shared/api';
import { Button, Card, SkeletonLoader } from '@foodrush/shared/components';
import { useTheme } from '@foodrush/shared/hooks/useTheme';
import type { ProfileStackParamList } from '@/navigation/types';

// ── Types ────────────────────────────────────────────────────────────
type AddressNavProp = NativeStackNavigationProp<ProfileStackParamList, 'AddressBook'>;

type AddressLabel = 'Home' | 'Work' | 'Other';

interface AddressFormState {
  label: AddressLabel;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
}

// ── Constants ────────────────────────────────────────────────────────
const LABELS: readonly AddressLabel[] = ['Home', 'Work', 'Other'];

const LABEL_ICONS: Record<AddressLabel, string> = {
  Home: 'home-outline',
  Work: 'briefcase-outline',
  Other: 'location-outline',
};

const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = -80;

// ── Swipeable Row ────────────────────────────────────────────────────
function SwipeableAddressRow({
  address,
  onDelete,
  colors,
  radius,
}: {
  address: Address;
  onDelete: (id: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: ReturnType<typeof useTheme>['radius'];
}): React.JSX.Element {
  const translateX = useRef(new Animated.Value(0)).current;

  const onSwipe = useCallback(() => {
    const currentValue = (translateX as Animated.Value & { _value: number })._value;
    if (currentValue < SWIPE_THRESHOLD) {
      Alert.alert('Delete address', `Remove "${address.label}" address?`, [
        {
          text: 'Cancel',
          onPress: () => {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(address.id),
        },
      ]);
    } else {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [translateX, address, onDelete]);

  const iconName = LABEL_ICONS[address.label as AddressLabel] ?? 'location-outline';

  return (
    <View style={styles.swipeContainer}>
      <View style={[styles.deleteBackground, { borderRadius: radius.md }]}>
        <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
      </View>
      <Animated.View
        style={[
          styles.addressCard,
          {
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            transform: [{ translateX }],
          },
        ]}
        {...{
          onStartShouldSetResponder: () => true,
          onMoveShouldSetResponder: () => true,
          onResponderMove: (e: { nativeEvent: { locationX: number } }) => {
            const dx = e.nativeEvent.locationX - SCREEN_WIDTH / 2;
            if (dx < 0) {
              translateX.setValue(Math.max(dx, -120));
            }
          },
          onResponderRelease: () => onSwipe(),
        }}
      >
        <Ionicons name={iconName as 'home-outline'} size={24} color={colors.primary} />
        <View style={styles.addressInfo}>
          <Text style={[styles.addressLabel, { color: colors.text, fontFamily: 'Sora' }]}>
            {address.label}
          </Text>
          <Text
            style={[styles.addressStreet, { color: colors.textMuted, fontFamily: 'DM Sans' }]}
            numberOfLines={2}
          >
            {address.street}, {address.city}, {address.state} {address.postalCode}
          </Text>
        </View>
        {address.isDefault && (
          <View style={[styles.defaultBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

// ── Component ────────────────────────────────────────────────────────
export function AddressBookScreen(): React.JSX.Element {
  const { colors, spacing, radius } = useTheme();
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddressFormState>({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);

  const addressesQuery = useQuery({
    queryKey: ['addresses'],
    queryFn: () => userApi.getAddresses(),
  });

  const addMutation = useMutation({
    mutationFn: (input: AddAddressInput) => userApi.addAddress(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowAddForm(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.deleteAddress(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const resetForm = useCallback(() => {
    setForm({
      label: 'Home',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      latitude: DEFAULT_REGION.latitude,
      longitude: DEFAULT_REGION.longitude,
    });
    setMapRegion(DEFAULT_REGION);
  }, []);

  const handleMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setForm((prev) => ({ ...prev, latitude, longitude }));
      // Reverse geocode would populate street/city/state here
    },
    [],
  );

  const handleMarkerDrag = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setForm((prev) => ({ ...prev, latitude, longitude }));
    },
    [],
  );

  const handleSaveAddress = useCallback(() => {
    if (!form.street.trim() || !form.city.trim()) {
      Alert.alert('Missing info', 'Please enter at least a street and city.');
      return;
    }
    addMutation.mutate({
      label: form.label,
      street: form.street.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.trim(),
      country: form.country.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
    });
  }, [form, addMutation]);

  const updateFormField = useCallback(<K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const renderAddress = useCallback(
    ({ item }: ListRenderItemInfo<Address>) => (
      <SwipeableAddressRow
        address={item}
        onDelete={(id) => deleteMutation.mutate(id)}
        colors={colors}
        radius={radius}
      />
    ),
    [colors, radius, deleteMutation],
  );

  const inputStyle = [
    styles.formInput,
    {
      backgroundColor: colors.surfaceMid,
      borderRadius: radius.sm,
      color: colors.text,
      fontFamily: 'DM Sans',
    },
  ];

  if (addressesQuery.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, padding: spacing.lg }]}>
        <SkeletonLoader width={SCREEN_WIDTH - 48} height={80} />
        <SkeletonLoader width={SCREEN_WIDTH - 48} height={80} />
        <SkeletonLoader width={SCREEN_WIDTH - 48} height={80} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <FlatList
        data={addressesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderAddress}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
              No addresses yet
            </Text>
          </View>
        }
        ListHeaderComponent={
          showAddForm ? (
            <View style={styles.addForm}>
              {/* Map */}
              <View style={[styles.mapContainer, { borderRadius: radius.md }]}>
                <MapView
                  style={styles.map}
                  region={mapRegion}
                  onRegionChangeComplete={setMapRegion}
                  onPress={handleMapPress}
                  accessibilityLabel="Select address location on map"
                >
                  <Marker
                    coordinate={{
                      latitude: form.latitude,
                      longitude: form.longitude,
                    }}
                    draggable
                    onDragEnd={handleMarkerDrag}
                  />
                </MapView>
              </View>

              {/* Label picker */}
              <Text
                style={[styles.formLabel, { color: colors.text, fontFamily: 'DM Sans' }]}
              >
                Label
              </Text>
              <View style={styles.labelRow}>
                {LABELS.map((label) => (
                  <Pressable
                    key={label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: form.label === label }}
                    accessibilityLabel={label}
                    onPress={() => updateFormField('label', label)}
                    style={[
                      styles.labelChip,
                      {
                        backgroundColor:
                          form.label === label ? `${colors.primary}15` : colors.surfaceMid,
                        borderColor:
                          form.label === label ? colors.primary : 'transparent',
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Ionicons
                      name={LABEL_ICONS[label] as 'home-outline'}
                      size={16}
                      color={form.label === label ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={{
                        color: form.label === label ? colors.primary : colors.text,
                        fontFamily: 'DM Sans',
                        fontSize: 14,
                        fontWeight: '500',
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Street */}
              <Text style={[styles.formLabel, { color: colors.text, fontFamily: 'DM Sans' }]}>
                Street
              </Text>
              <TextInput
                accessibilityLabel="Street address"
                style={inputStyle}
                value={form.street}
                onChangeText={(v) => updateFormField('street', v)}
                placeholder="123 Main Street"
                placeholderTextColor={colors.textMuted}
                autoComplete="street-address"
              />

              {/* City / State row */}
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={[styles.formLabel, { color: colors.text, fontFamily: 'DM Sans' }]}>
                    City
                  </Text>
                  <TextInput
                    accessibilityLabel="City"
                    style={inputStyle}
                    value={form.city}
                    onChangeText={(v) => updateFormField('city', v)}
                    placeholder="San Francisco"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={[styles.formLabel, { color: colors.text, fontFamily: 'DM Sans' }]}>
                    State
                  </Text>
                  <TextInput
                    accessibilityLabel="State"
                    style={inputStyle}
                    value={form.state}
                    onChangeText={(v) => updateFormField('state', v)}
                    placeholder="CA"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Postal / Country row */}
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={[styles.formLabel, { color: colors.text, fontFamily: 'DM Sans' }]}>
                    Postal code
                  </Text>
                  <TextInput
                    accessibilityLabel="Postal code"
                    style={inputStyle}
                    value={form.postalCode}
                    onChangeText={(v) => updateFormField('postalCode', v)}
                    placeholder="94107"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    autoComplete="postal-code"
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={[styles.formLabel, { color: colors.text, fontFamily: 'DM Sans' }]}>
                    Country
                  </Text>
                  <TextInput
                    accessibilityLabel="Country"
                    style={inputStyle}
                    value={form.country}
                    onChangeText={(v) => updateFormField('country', v)}
                    placeholder="US"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Save / Cancel */}
              <View style={styles.formActions}>
                <Button
                  title="Save address"
                  onPress={handleSaveAddress}
                  loading={addMutation.isPending}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : null
        }
      />

      {/* Add button */}
      {!showAddForm && (
        <View style={[styles.addButtonContainer, { backgroundColor: colors.surface }]}>
          <Button
            title="Add new address"
            onPress={() => setShowAddForm(true)}
            style={{ marginHorizontal: spacing.lg }}
          />
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    gap: 12,
    paddingBottom: 100,
  },
  swipeContainer: {
    position: 'relative',
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EF233C',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  addressStreet: {
    fontSize: 14,
    lineHeight: 20,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  addForm: {
    marginBottom: 24,
  },
  mapContainer: {
    height: 200,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
  },
  formInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formHalf: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
});
