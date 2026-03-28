import { by, device, element, expect, waitFor } from 'detox';

/**
 * T02 — Driver delivery flow E2E
 *
 * Flow: Launch driver app → Login as test courier → Toggle online →
 *       Assert GPS task → Mock incoming order offer via WS → Accept →
 *       Map with route → Arrived at restaurant → Pickup screen →
 *       Check items + mock camera + confirm → Map to customer →
 *       Arrived at customer → Dropoff → Mock camera + confirm → Earnings
 */

const TEST_DRIVER_PHONE = '+15559876543';
const TEST_OTP_CODE = '123456';

const MOCK_ORDER_OFFER = JSON.stringify({
  type: 'order.offer',
  payload: {
    offerId: 'offer-test-001',
    restaurantName: 'Test Burger Joint',
    restaurantLocation: { latitude: 40.7128, longitude: -74.006 },
    deliveryLocation: { latitude: 40.72, longitude: -74.0 },
    routePolyline: [
      { latitude: 40.7128, longitude: -74.006 },
      { latitude: 40.716, longitude: -74.003 },
      { latitude: 40.72, longitude: -74.0 },
    ],
    baseFare: 5.5,
    distanceFee: 2.0,
    estimatedTip: 3.0,
    total: 10.5,
    distanceKm: 1.8,
    deliveryEtaMinutes: 12,
    expiresAt: new Date(Date.now() + 30_000).toISOString(),
  },
});

describe('Driver — delivery flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'always', camera: 'YES' },
      launchArgs: {
        TEST_OTP_CODE,
        MOCK_WS: 'true',
        MOCK_CAMERA: 'true',
        APP_ID: 'driver',
      },
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  // ── Step 1: Login ──────────────────────────────────────────────────

  it('should display the driver login screen', async () => {
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(10_000);
  });

  it('should enter phone and OTP to authenticate as courier', async () => {
    await element(by.id('phone-input')).typeText(TEST_DRIVER_PHONE);
    await element(by.id('request-otp-button')).tap();

    await waitFor(element(by.id('otp-screen')))
      .toBeVisible()
      .withTimeout(5_000);

    await element(by.id('otp-input')).typeText(TEST_OTP_CODE);
    await element(by.id('verify-otp-button')).tap();

    await waitFor(element(by.id('online-toggle-screen')))
      .toBeVisible()
      .withTimeout(10_000);
  });

  // ── Step 2: Toggle online ──────────────────────────────────────────

  it('should toggle online status', async () => {
    await expect(element(by.id('online-toggle-button'))).toBeVisible();
    await element(by.id('online-toggle-button')).tap();

    await waitFor(element(by.text('You\'re Online')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  it('should confirm GPS background task is active', async () => {
    await waitFor(element(by.id('gps-status-indicator')))
      .toBeVisible()
      .withTimeout(5_000);

    await expect(element(by.id('gps-status-indicator'))).toHaveText('GPS Active');
  });

  // ── Step 3: Mock incoming order offer via WS ───────────────────────

  it('should receive and display an order offer', async () => {
    await device.sendUserNotification({
      trigger: { type: 'push' },
      title: 'ws-mock',
      body: MOCK_ORDER_OFFER,
    });

    await waitFor(element(by.id('order-offer-screen')))
      .toBeVisible()
      .withTimeout(10_000);
  });

  it('should display offer details: fare, distance, ETA', async () => {
    await expect(element(by.id('offer-restaurant-name'))).toHaveText(
      'Test Burger Joint',
    );
    await expect(element(by.id('offer-total'))).toHaveText('$10.50');
    await expect(element(by.id('offer-distance'))).toHaveText('1.8 km');
    await expect(element(by.id('offer-eta'))).toHaveText('12 min');
  });

  it('should display countdown timer', async () => {
    await expect(element(by.id('offer-countdown'))).toBeVisible();
  });

  // ── Step 4: Accept offer ───────────────────────────────────────────

  it('should accept the order offer', async () => {
    await element(by.id('accept-offer-button')).tap();

    await waitFor(element(by.id('active-delivery-screen')))
      .toBeVisible()
      .withTimeout(10_000);
  });

  it('should show map with route to restaurant', async () => {
    await expect(element(by.id('delivery-map'))).toBeVisible();
    await expect(element(by.id('route-polyline'))).toBeVisible();
    await expect(element(by.id('restaurant-marker'))).toBeVisible();
  });

  // ── Step 5: Arrived at restaurant ──────────────────────────────────

  it('should tap "Arrived at Restaurant"', async () => {
    await element(by.id('status-action-button')).tap();
    // en_route_to_restaurant → arrived_at_restaurant
    await element(by.id('status-action-button')).tap();

    await waitFor(element(by.id('pickup-screen')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  // ── Step 6: Pickup screen ──────────────────────────────────────────

  it('should display order items for verification', async () => {
    await expect(element(by.id('pickup-items-list'))).toBeVisible();
    await expect(element(by.id('pickup-item-0'))).toBeVisible();
  });

  it('should take pickup confirmation photo (mocked camera)', async () => {
    await element(by.id('pickup-camera-button')).tap();

    // Mock camera returns a test image automatically
    await waitFor(element(by.id('pickup-photo-preview')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  it('should confirm pickup', async () => {
    await element(by.id('confirm-pickup-button')).tap();

    await waitFor(element(by.id('active-delivery-screen')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  // ── Step 7: Navigate to customer ───────────────────────────────────

  it('should show map with route to customer after pickup', async () => {
    await expect(element(by.id('delivery-map'))).toBeVisible();
    await expect(element(by.id('customer-marker'))).toBeVisible();
  });

  // ── Step 8: Arrived at customer ────────────────────────────────────

  it('should tap "Arrived at Customer"', async () => {
    // picked_up → en_route_to_customer
    await element(by.id('status-action-button')).tap();
    // en_route_to_customer → arrived_at_customer
    await element(by.id('status-action-button')).tap();

    await waitFor(element(by.id('dropoff-screen')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  // ── Step 9: Dropoff ────────────────────────────────────────────────

  it('should take dropoff photo (mocked camera)', async () => {
    await element(by.id('dropoff-camera-button')).tap();

    await waitFor(element(by.id('dropoff-photo-preview')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  it('should confirm delivery', async () => {
    await element(by.id('confirm-dropoff-button')).tap();

    await waitFor(element(by.id('delivery-complete-screen')))
      .toBeVisible()
      .withTimeout(10_000);
  });

  // ── Step 10: Earnings ──────────────────────────────────────────────

  it('should display delivery earnings summary', async () => {
    await expect(element(by.id('earnings-total'))).toBeVisible();
    await expect(element(by.id('earnings-base-fare'))).toHaveText('$5.50');
    await expect(element(by.id('earnings-distance-fee'))).toHaveText('$2.00');
  });

  it('should return to online toggle after dismissing earnings', async () => {
    await element(by.id('dismiss-earnings-button')).tap();

    await waitFor(element(by.id('online-toggle-screen')))
      .toBeVisible()
      .withTimeout(5_000);

    await expect(element(by.id('today-earnings'))).toBeVisible();
    await expect(element(by.id('trip-count'))).toHaveText('1');
  });
});
