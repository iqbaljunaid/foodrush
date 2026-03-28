import { by, device, element, expect, waitFor } from 'detox';

/**
 * T01 — Customer order happy-path E2E
 *
 * Flow: Launch → Login (OTP bypass) → Select restaurant → Add item →
 *       Checkout → Payment → Place order → Confirmation → Tracking →
 *       Mock WS delivery event → Status updates
 */

const TEST_PHONE = '+15551234567';
const TEST_OTP_CODE = '123456';
const WS_DELIVERY_COMPLETE_EVENT = JSON.stringify({
  type: 'delivery.status_update',
  payload: {
    status: 'delivered',
    deliveryId: 'test-delivery-001',
    timestamp: new Date().toISOString(),
  },
});

describe('Customer — order happy path', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'always' },
      launchArgs: {
        TEST_OTP_CODE,
        MOCK_PAYMENTS: 'true',
        MOCK_WS: 'true',
      },
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  // ── Step 1: Login ──────────────────────────────────────────────────

  it('should display the login screen', async () => {
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(10_000);
  });

  it('should enter phone number and request OTP', async () => {
    await element(by.id('phone-input')).typeText(TEST_PHONE);
    await element(by.id('request-otp-button')).tap();

    await waitFor(element(by.id('otp-screen')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  it('should enter OTP bypass code and authenticate', async () => {
    await element(by.id('otp-input')).typeText(TEST_OTP_CODE);
    await element(by.id('verify-otp-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10_000);
  });

  // ── Step 2: Select restaurant ──────────────────────────────────────

  it('should display restaurants on the home screen', async () => {
    await waitFor(element(by.id('featured-restaurants-list')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  it('should tap the first restaurant', async () => {
    await element(by.id('restaurant-card-0')).tap();

    await waitFor(element(by.id('restaurant-detail-screen')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  // ── Step 3: Add menu item ──────────────────────────────────────────

  it('should display menu items', async () => {
    await waitFor(element(by.id('menu-items-list')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  it('should add the first menu item to cart', async () => {
    await element(by.id('menu-item-add-0')).tap();

    await waitFor(element(by.id('cart-badge')))
      .toBeVisible()
      .withTimeout(3_000);

    await expect(element(by.id('cart-badge'))).toHaveText('1');
  });

  // ── Step 4: Checkout ───────────────────────────────────────────────

  it('should navigate to cart and proceed to checkout', async () => {
    await element(by.id('cart-button')).tap();

    await waitFor(element(by.id('cart-screen')))
      .toBeVisible()
      .withTimeout(5_000);

    await expect(element(by.id('cart-item-0'))).toBeVisible();
  });

  it('should select saved test address', async () => {
    await element(by.id('checkout-button')).tap();

    await waitFor(element(by.id('checkout-screen')))
      .toBeVisible()
      .withTimeout(5_000);

    await element(by.id('address-selector')).tap();

    await waitFor(element(by.id('saved-address-0')))
      .toBeVisible()
      .withTimeout(3_000);

    await element(by.id('saved-address-0')).tap();

    await expect(element(by.id('selected-address'))).toBeVisible();
  });

  // ── Step 5: Payment ────────────────────────────────────────────────

  it('should select test card (4242)', async () => {
    await element(by.id('payment-method-selector')).tap();

    await waitFor(element(by.id('saved-card-visa-4242')))
      .toBeVisible()
      .withTimeout(3_000);

    await element(by.id('saved-card-visa-4242')).tap();

    await expect(element(by.id('selected-payment'))).toHaveText(
      expect.stringContaining('4242'),
    );
  });

  // ── Step 6: Place order ────────────────────────────────────────────

  it('should place the order', async () => {
    await element(by.id('place-order-button')).tap();

    await waitFor(element(by.id('confirmation-screen')))
      .toBeVisible()
      .withTimeout(15_000);
  });

  // ── Step 7: Confirmation screen ────────────────────────────────────

  it('should display order confirmation with order ID', async () => {
    await expect(element(by.id('order-confirmation-check'))).toBeVisible();
    await expect(element(by.id('order-id-label'))).toBeVisible();
  });

  it('should navigate to tracking screen', async () => {
    await element(by.id('track-order-button')).tap();

    await waitFor(element(by.id('tracking-screen')))
      .toBeVisible()
      .withTimeout(5_000);
  });

  // ── Step 8: Tracking map ───────────────────────────────────────────

  it('should display tracking map with courier dot', async () => {
    await waitFor(element(by.id('tracking-map')))
      .toBeVisible()
      .withTimeout(5_000);

    await waitFor(element(by.id('courier-marker')))
      .toBeVisible()
      .withTimeout(10_000);
  });

  // ── Step 9: Mock WS delivery event ─────────────────────────────────

  it('should receive delivery status updates via WebSocket', async () => {
    // Inject mock WS event through Detox launch args handler
    await device.sendUserNotification({
      trigger: { type: 'push' },
      title: 'ws-mock',
      body: WS_DELIVERY_COMPLETE_EVENT,
    });

    await waitFor(element(by.id('status-label')))
      .toHaveText('Delivered')
      .withTimeout(10_000);
  });

  // ── Step 10: Final assertions ──────────────────────────────────────

  it('should show delivered status and rating prompt', async () => {
    await expect(element(by.id('delivery-complete-banner'))).toBeVisible();
    await expect(element(by.id('rate-order-prompt'))).toBeVisible();
  });
});
import { by, device, element, expect, waitFor } from 'detox';

const TEST_PHONE = '+15551234567';
const TEST_OTP_CODE = '123456';
const TIMEOUT = 10_000;

describe('Customer Order Happy Path', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { location: 'always' },
      launchArgs: {
        TEST_OTP_CODE,
        API_BASE_URL: 'http://localhost:3000',
      },
    });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should complete a full order from login to delivery confirmation', async () => {
    // ── Step 1: Skip onboarding ────────────────────────────────────
    await waitFor(element(by.text('Get Started')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.text('Get Started')).tap();

    // ── Step 2: Login with test phone & OTP bypass ─────────────────
    await waitFor(element(by.id('phone-input')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('phone-input')).typeText(TEST_PHONE);
    await element(by.id('continue-button')).tap();

    // OTP screen
    await waitFor(element(by.id('otp-input')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('otp-input')).typeText(TEST_OTP_CODE);
    await element(by.id('verify-button')).tap();

    // ── Step 3: Assert home screen loaded ──────────────────────────
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    // ── Step 4: Select first restaurant ────────────────────────────
    await waitFor(element(by.id('restaurant-card-0')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('restaurant-card-0')).tap();

    // ── Step 5: Assert restaurant detail screen ────────────────────
    await waitFor(element(by.id('restaurant-detail-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    // ── Step 6: Add first menu item to cart ─────────────────────────
    await waitFor(element(by.id('menu-item-0')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('menu-item-0-add')).tap();

    // ── Step 7: Go to cart ──────────────────────────────────────────
    await waitFor(element(by.id('view-cart-button')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('view-cart-button')).tap();

    // ── Step 8: Assert cart screen with item ────────────────────────
    await waitFor(element(by.id('cart-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await expect(element(by.id('cart-item-0'))).toBeVisible();

    // ── Step 9: Proceed to checkout ─────────────────────────────────
    await element(by.id('checkout-button')).tap();

    // ── Step 10: Select saved test address ──────────────────────────
    await waitFor(element(by.id('checkout-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await waitFor(element(by.id('saved-address-0')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('saved-address-0')).tap();

    // ── Step 11: Select test card (4242...) ─────────────────────────
    await waitFor(element(by.id('payment-method-card-4242')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('payment-method-card-4242')).tap();

    // ── Step 12: Place order ────────────────────────────────────────
    await element(by.id('place-order-button')).tap();

    // ── Step 13: Assert confirmation screen ─────────────────────────
    await waitFor(element(by.id('confirmation-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await expect(element(by.id('order-id-text'))).toBeVisible();
    await expect(element(by.text('Order Confirmed'))).toBeVisible();

    // ── Step 14: Navigate to tracking ───────────────────────────────
    await element(by.id('track-order-button')).tap();

    // ── Step 15: Assert tracking map with courier dot ───────────────
    await waitFor(element(by.id('tracking-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await waitFor(element(by.id('tracking-map')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await waitFor(element(by.id('courier-marker')))
      .toExist()
      .withTimeout(TIMEOUT);

    // ── Step 16: Mock WS delivery events for status updates ─────────
    // Simulate courier assignment
    await device.sendUserNotification({
      trigger: { type: 'push' },
      title: 'Courier Assigned',
      body: 'Your courier is on the way to the restaurant.',
      payload: {
        type: 'ORDER_STATUS_UPDATE',
        status: 'courier_assigned',
      },
    });

    await waitFor(element(by.text('Courier Assigned')))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    // Simulate courier picked up
    await device.sendUserNotification({
      trigger: { type: 'push' },
      title: 'Order Picked Up',
      body: 'Your courier has picked up your order.',
      payload: {
        type: 'ORDER_STATUS_UPDATE',
        status: 'picked_up',
      },
    });

    await waitFor(element(by.text('Order Picked Up')))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    // Simulate delivery completed
    await device.sendUserNotification({
      trigger: { type: 'push' },
      title: 'Delivered',
      body: 'Your order has been delivered!',
      payload: {
        type: 'ORDER_STATUS_UPDATE',
        status: 'delivered',
      },
    });

    await waitFor(element(by.text('Delivered')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
  });
});
