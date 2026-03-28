import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { orderApi, dispatchApi } from '@foodrush/shared/api';
import { Button } from '@foodrush/shared/components';
import type { DeliveriesStackParamList } from '@/navigation/types';

// ── Theme constants ─────────────────────────────────────────────────
const BG = '#0A0A0A';
const SURFACE = '#111111';
const SURFACE_MID = '#1C1C1C';
const TEAL = '#00C896';
const AMBER = '#FFBE0B';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_MUTED = '#9CA3AF';
const FONT_DISPLAY = 'Sora';
const FONT_BODY = 'DM Sans';
const MIN_TAP_SIZE = 48;

// ── Types ───────────────────────────────────────────────────────────
type RouteProp = NativeStackScreenProps<DeliveriesStackParamList, 'Dropoff'>['route'];
type NavProp = NativeStackNavigationProp<DeliveriesStackParamList, 'Dropoff'>;

// ── Main screen ─────────────────────────────────────────────────────
export function DropoffScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const routeParams = useRoute<RouteProp>();
  const { deliveryId, orderId } = routeParams.params;

  const [specialInstructions, setSpecialInstructions] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);

  // Fetch order for special instructions
  useEffect(() => {
    let mounted = true;

    async function fetchOrder() {
      try {
        const order = await orderApi.getOrder(orderId);
        if (!mounted) return;
        setSpecialInstructions(order.notes);
      } catch {
        // Non-critical — still allow delivery
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void fetchOrder();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const handleTakePhoto = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission',
          'Camera access is needed for delivery photo proof.',
        );
        return;
      }
    }
    setShowCamera(true);
  }, [cameraPermission, requestCameraPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setShowCamera(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Error', 'Failed to capture photo.');
    }
  }, []);

  const handleConfirmDelivery = useCallback(async () => {
    if (!photoUri) {
      Alert.alert(
        'Photo Required',
        'Please take a photo as delivery proof for contactless delivery.',
      );
      return;
    }

    setConfirming(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await dispatchApi.updateDeliveryStatus(deliveryId, {
        status: 'delivered',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to confirm delivery. Please try again.');
    } finally {
      setConfirming(false);
    }
  }, [photoUri, deliveryId, navigation]);

  if (showCamera) {
    return (
      <View style={styles.screen}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={[styles.cameraOverlay, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              onPress={() => setShowCamera(false)}
              accessibilityRole="button"
              accessibilityLabel="Close camera"
              style={styles.cameraCloseButton}
              hitSlop={8}
            >
              <Ionicons name="close" size={28} color={TEXT_PRIMARY} />
            </Pressable>

            <Text style={styles.cameraHint}>
              Take a photo of the delivery at the door
            </Text>

            <Pressable
              onPress={handleCapture}
              accessibilityRole="button"
              accessibilityLabel="Take delivery proof photo"
              style={styles.captureButton}
            >
              <View style={styles.captureButtonInner} />
            </Pressable>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
          </Pressable>
          <Text style={styles.title}>Confirm Delivery</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Special instructions */}
        {loading ? (
          <ActivityIndicator
            size="small"
            color={TEAL}
            style={styles.loader}
          />
        ) : specialInstructions ? (
          <View style={styles.instructionsCard}>
            <View style={styles.instructionsHeader}>
              <Ionicons name="document-text" size={20} color={AMBER} />
              <Text style={styles.instructionsLabel}>Special Instructions</Text>
            </View>
            <Text style={styles.instructionsText}>{specialInstructions}</Text>
          </View>
        ) : null}

        {/* Contactless delivery notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="shield-checkmark" size={24} color={TEAL} />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Contactless Delivery</Text>
            <Text style={styles.noticeText}>
              Photo proof is required. Place the order at the door and take a
              photo before confirming delivery.
            </Text>
          </View>
        </View>

        {/* Delivery photo */}
        <Text style={styles.sectionTitle}>Delivery Photo Proof</Text>
        {photoUri ? (
          <View style={styles.photoPreview}>
            <Image
              source={{ uri: photoUri }}
              style={styles.photoImage}
              accessibilityLabel="Delivery proof photo preview"
            />
            <Pressable
              onPress={handleTakePhoto}
              accessibilityRole="button"
              accessibilityLabel="Retake delivery photo"
              style={styles.retakeButton}
            >
              <Ionicons name="camera" size={20} color={TEXT_PRIMARY} />
              <Text style={styles.retakeText}>Retake</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleTakePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take delivery proof photo"
            style={styles.takePhotoButton}
          >
            <Ionicons name="camera-outline" size={32} color={TEAL} />
            <Text style={styles.takePhotoText}>Take Photo</Text>
            <Text style={styles.takePhotoHint}>Required for contactless delivery</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Bottom confirm button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title="Confirm Delivery"
          variant="primary"
          size="lg"
          loading={confirming}
          disabled={!photoUri}
          onPress={handleConfirmDelivery}
          style={[
            styles.confirmButton,
            !photoUri && styles.confirmButtonDisabled,
          ]}
        />
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 22,
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  headerSpacer: {
    width: MIN_TAP_SIZE,
  },
  loader: {
    marginVertical: 16,
  },
  instructionsCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: AMBER,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  instructionsLabel: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 14,
    color: AMBER,
  },
  instructionsText: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: `${TEAL}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 14,
    color: TEAL,
    marginBottom: 4,
  },
  noticeText: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 16,
    color: TEXT_PRIMARY,
    marginTop: 8,
    marginBottom: 12,
  },
  takePhotoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TEAL,
    borderStyle: 'dashed',
    padding: 32,
    gap: 8,
    minHeight: MIN_TAP_SIZE,
  },
  takePhotoText: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEAL,
    fontWeight: '600',
  },
  takePhotoHint: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: TEXT_MUTED,
  },
  photoPreview: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: SURFACE,
  },
  photoImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
    minHeight: MIN_TAP_SIZE,
  },
  retakeText: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cameraCloseButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: MIN_TAP_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraHint: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: TEXT_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TEXT_PRIMARY,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: SURFACE_MID,
  },
  confirmButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: TEAL,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
});