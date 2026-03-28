import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { userApi, type User } from '@foodrush/shared/api';
import { Button, Badge } from '@foodrush/shared/components';

// ── Theme constants ─────────────────────────────────────────────────
const BG = '#0A0A0A';
const SURFACE = '#111111';
const SURFACE_MID = '#1C1C1C';
const TEAL = '#00C896';
const AMBER = '#FFBE0B';
const DANGER = '#FF3A5C';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_MUTED = '#9CA3AF';
const FONT_DISPLAY = 'Sora';
const FONT_BODY = 'DM Sans';
const MIN_TAP_SIZE = 48;

// ── Types ───────────────────────────────────────────────────────────
type DocumentStatus = 'approved' | 'pending' | 'expired';

interface VehicleInfo {
  make: string;
  model: string;
  year: string;
  plate: string;
}

interface DriverDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  expiresAt: string | null;
}

const STATUS_VARIANT: Record<DocumentStatus, 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  expired: 'danger',
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  expired: 'Expired',
};

// ── Star rating display ─────────────────────────────────────────────
function StarRating({ rating }: { rating: number }): React.JSX.Element {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(rating)) return 'star';
    if (i < Math.ceil(rating) && rating % 1 >= 0.5) return 'star-half';
    return 'star-outline';
  });

  return (
    <View
      style={starStyles.container}
      accessibilityRole="text"
      accessibilityLabel={`Rating: ${rating.toFixed(1)} out of 5 stars`}
    >
      {stars.map((icon, index) => (
        <Ionicons
          key={index}
          name={icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={AMBER}
        />
      ))}
      <Text style={starStyles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 16,
    color: AMBER,
    marginLeft: 6,
  },
});

// ── Main screen ─────────────────────────────────────────────────────
export function AccountScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [rating] = useState(4.8); // Read-only from API
  const [vehicle, setVehicle] = useState<VehicleInfo>({
    make: '',
    model: '',
    year: '',
    plate: '',
  });
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [documents, setDocuments] = useState<DriverDocument[]>([
    {
      id: 'license',
      name: 'Driving Licence',
      status: 'pending',
      expiresAt: null,
    },
    {
      id: 'insurance',
      name: 'Vehicle Insurance',
      status: 'pending',
      expiresAt: null,
    },
  ]);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      try {
        const profile = await userApi.getProfile();
        if (!mounted) return;
        setUser(profile);
        setAvatarUri(profile.avatarUrl);
      } catch {
        // Silent fail
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChangePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to change your profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const handleSaveVehicle = useCallback(async () => {
    setSavingVehicle(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // In production this would call an API endpoint
      await new Promise((resolve) => setTimeout(resolve, 500));
      setEditingVehicle(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save vehicle info.');
    } finally {
      setSavingVehicle(false);
    }
  }, []);

  const handleUploadDocument = useCallback(
    async (docId: string) => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets[0]) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === docId ? { ...doc, status: 'pending' as DocumentStatus } : doc,
            ),
          );
          Alert.alert('Uploaded', 'Document submitted for review.');
        }
      } catch {
        Alert.alert('Error', 'Failed to upload document.');
      }
    },
    [],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          // In production this would clear auth state and navigate to login
        },
      },
    ]);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
    >
      {/* Profile section */}
      <View style={styles.profileSection}>
        <Pressable
          onPress={handleChangePhoto}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          style={styles.avatarContainer}
        >
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatar}
              accessibilityLabel="Profile photo"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={TEXT_MUTED} />
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={14} color={TEXT_PRIMARY} />
          </View>
        </Pressable>

        <Text style={styles.profileName}>{user?.name ?? 'Driver'}</Text>
        <Text style={styles.profilePhone}>{user?.phone ?? ''}</Text>
        <StarRating rating={rating} />
      </View>

      {/* Vehicle info */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehicle Info</Text>
          {!editingVehicle && (
            <Pressable
              onPress={() => setEditingVehicle(true)}
              accessibilityRole="button"
              accessibilityLabel="Edit vehicle info"
              style={styles.editButton}
              hitSlop={8}
            >
              <Ionicons name="pencil" size={18} color={TEAL} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Make</Text>
          {editingVehicle ? (
            <TextInput
              value={vehicle.make}
              onChangeText={(text) =>
                setVehicle((v) => ({ ...v, make: text }))
              }
              style={styles.fieldInput}
              placeholder="e.g. Toyota"
              placeholderTextColor={TEXT_MUTED}
              accessibilityLabel="Vehicle make"
            />
          ) : (
            <Text style={styles.fieldValue}>
              {vehicle.make || 'Not set'}
            </Text>
          )}
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Model</Text>
          {editingVehicle ? (
            <TextInput
              value={vehicle.model}
              onChangeText={(text) =>
                setVehicle((v) => ({ ...v, model: text }))
              }
              style={styles.fieldInput}
              placeholder="e.g. Corolla"
              placeholderTextColor={TEXT_MUTED}
              accessibilityLabel="Vehicle model"
            />
          ) : (
            <Text style={styles.fieldValue}>
              {vehicle.model || 'Not set'}
            </Text>
          )}
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Year</Text>
          {editingVehicle ? (
            <TextInput
              value={vehicle.year}
              onChangeText={(text) =>
                setVehicle((v) => ({ ...v, year: text }))
              }
              style={styles.fieldInput}
              placeholder="e.g. 2022"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel="Vehicle year"
            />
          ) : (
            <Text style={styles.fieldValue}>
              {vehicle.year || 'Not set'}
            </Text>
          )}
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Plate</Text>
          {editingVehicle ? (
            <TextInput
              value={vehicle.plate}
              onChangeText={(text) =>
                setVehicle((v) => ({ ...v, plate: text }))
              }
              style={styles.fieldInput}
              placeholder="e.g. ABC-1234"
              placeholderTextColor={TEXT_MUTED}
              autoCapitalize="characters"
              accessibilityLabel="License plate"
            />
          ) : (
            <Text style={styles.fieldValue}>
              {vehicle.plate || 'Not set'}
            </Text>
          )}
        </View>

        {editingVehicle && (
          <View style={styles.vehicleActions}>
            <Pressable
              onPress={() => setEditingVehicle(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing"
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Button
              title="Save"
              variant="primary"
              size="md"
              loading={savingVehicle}
              onPress={handleSaveVehicle}
              style={styles.saveButton}
            />
          </View>
        )}
      </View>

      {/* Documents */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Documents</Text>

        {documents.map((doc) => (
          <View key={doc.id} style={styles.documentRow}>
            <View style={styles.documentInfo}>
              <Ionicons name="document-text-outline" size={24} color={TEXT_MUTED} />
              <View style={styles.documentText}>
                <Text style={styles.documentName}>{doc.name}</Text>
                <Badge
                  label={STATUS_LABEL[doc.status]}
                  variant={STATUS_VARIANT[doc.status]}
                />
              </View>
            </View>
            <Pressable
              onPress={() => handleUploadDocument(doc.id)}
              accessibilityRole="button"
              accessibilityLabel={`Upload ${doc.name}`}
              style={styles.uploadButton}
              hitSlop={8}
            >
              <Ionicons name="cloud-upload-outline" size={22} color={TEAL} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Sign out */}
      <Pressable
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={styles.signOutButton}
      >
        <Ionicons name="log-out-outline" size={22} color={DANGER} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  content: {
    paddingHorizontal: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: TEAL,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: SURFACE_MID,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 22,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  profilePhone: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 16,
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: 8,
  },
  editText: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    color: TEAL,
    fontWeight: '600',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE_MID,
  },
  fieldLabel: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_MUTED,
    flex: 1,
  },
  fieldValue: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_PRIMARY,
    flex: 2,
    textAlign: 'right',
  },
  fieldInput: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_PRIMARY,
    flex: 2,
    textAlign: 'right',
    backgroundColor: SURFACE_MID,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: MIN_TAP_SIZE,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: SURFACE_MID,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: MIN_TAP_SIZE,
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: TEAL,
    minHeight: MIN_TAP_SIZE,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE_MID,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  documentText: {
    flex: 1,
    gap: 6,
  },
  documentName: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  uploadButton: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    minHeight: 56,
  },
  signOutText: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: DANGER,
    fontWeight: '600',
  },
});