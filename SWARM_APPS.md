# UberEats — Customer & Driver App Swarm Prompt

## Overview

This document defines the agent team, task pool, file ownership, and individual
spawn prompts for building the UberEats **Customer App** (React Native + Web) and
**Driver App** (React Native) as two parallel workstreams within the existing OCI
backend platform.

Read `CLAUDE.md` first for OCI backend constraints, naming conventions, and the
event schemas your apps must consume.

---

## Swarm configuration

```jsonc
// .claude/settings.json  (already set from CLAUDE.md — confirm before starting)
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## Agent team roster

| Role | Agent name | Domain | Worktree |
|---|---|---|---|
| **Team lead** | `app-orchestrator` | Planning, synthesis, final PR | `main` |
| Worker | `customer-shell-agent` | Customer app shell, navigation, design system | `worktree/customer-shell` |
| Worker | `customer-discovery-agent` | Restaurant browse, search, menu UX | `worktree/customer-discovery` |
| Worker | `customer-order-agent` | Cart, checkout, payment UX, order tracking | `worktree/customer-order` |
| Worker | `customer-account-agent` | Auth, profile, address book, order history | `worktree/customer-account` |
| Worker | `driver-shell-agent` | Driver app shell, navigation, design system | `worktree/driver-shell` |
| Worker | `driver-dispatch-agent` | Delivery queue, accept/reject, real-time map | `worktree/driver-dispatch` |
| Worker | `driver-nav-agent` | Turn-by-turn navigation, pickup/dropoff flow | `worktree/driver-nav` |
| Worker | `driver-earnings-agent` | Earnings dashboard, history, payout UI | `worktree/driver-earnings` |
| Worker | `shared-agent` | Shared component library, API client, types | `worktree/shared` |
| Worker | `app-test-agent` | E2E, component tests, accessibility audit | `worktree/app-tests` |

---

## Git worktree setup

```bash
# Run from repo root (ubereats-oci/)
git worktree add worktree/shared               -b feat/shared-lib
git worktree add worktree/customer-shell       -b feat/customer-shell
git worktree add worktree/customer-discovery   -b feat/customer-discovery
git worktree add worktree/customer-order       -b feat/customer-order
git worktree add worktree/customer-account     -b feat/customer-account
git worktree add worktree/driver-shell         -b feat/driver-shell
git worktree add worktree/driver-dispatch      -b feat/driver-dispatch
git worktree add worktree/driver-nav           -b feat/driver-nav
git worktree add worktree/driver-earnings      -b feat/driver-earnings
git worktree add worktree/app-tests            -b feat/app-tests
```

---

## Tech stack (binding on all app agents)

| Concern | Choice | Rationale |
|---|---|---|
| Mobile framework | React Native 0.76 (New Architecture) | Shared codebase iOS + Android |
| Web customer app | Next.js 15 (App Router) | SSR for SEO on restaurant pages |
| State management | Zustand 5 | Lightweight, no boilerplate |
| Data fetching | TanStack Query v5 | Caching, background refetch, optimistic updates |
| Real-time | WebSocket via native `WebSocket` API | OCI API Gateway WS support |
| Maps (driver) | react-native-maps + HERE Maps SDK | OCI Maps / HERE integration |
| Navigation | React Navigation 7 | Stack + Tab + Bottom Sheet |
| Styling | NativeWind v4 (Tailwind in RN) | Consistent tokens across platforms |
| API client | Generated from OpenAPI specs in `services/*/openapi.yaml` | Single source of truth |
| Auth | OCI IAM IDCS — PKCE OAuth 2.0 flow | Matches user-service |
| Push notifications | OCI Notification Service → FCM/APNs | Single pipeline |
| Testing | Jest + React Native Testing Library + Detox (E2E) | Standard RN stack |

---

## Design system tokens (both apps must use)

```ts
// apps/shared/tokens.ts  — owned by shared-agent
export const tokens = {
  colors: {
    // Customer app — warm, appetite-forward
    customer: {
      primary:    '#FF6B35',  // Energetic orange
      secondary:  '#1A1A2E',  // Deep navy
      surface:    '#FFFFFF',
      surfaceMid: '#F7F7F7',
      accent:     '#FFD166',  // Amber pop
      danger:     '#EF233C',
      success:    '#06D6A0',
      text:       '#0D0D0D',
      textMuted:  '#6B7280',
    },
    // Driver app — high-contrast, action-oriented
    driver: {
      primary:    '#00C896',  // Teal-green — go signal
      secondary:  '#0A0A0A',  // Near-black
      surface:    '#111111',  // Dark surface (night driving)
      surfaceMid: '#1C1C1C',
      accent:     '#FFBE0B',  // High-vis amber
      danger:     '#FF3A5C',
      success:    '#00C896',
      text:       '#F5F5F5',
      textMuted:  '#9CA3AF',
    },
  },
  spacing: { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 },
  radius:  { sm:6, md:12, lg:20, pill:999 },
  font: {
    display:  { family:'Sora', weight:'700' },
    body:     { family:'DM Sans', weight:'400' },
    mono:     { family:'JetBrains Mono', weight:'400' },
  },
  shadow: {
    card: { shadowColor:'#000', shadowOffset:{width:0,height:2},
            shadowOpacity:0.08, shadowRadius:8, elevation:3 },
    modal:{ shadowColor:'#000', shadowOffset:{width:0,height:-4},
            shadowOpacity:0.15, shadowRadius:20, elevation:10 },
  },
};
```

---

## API client generation (shared-agent must complete first)

```bash
# Run inside worktree/shared
npx @openapitools/openapi-generator-cli generate \
  -i ../../services/user-service/openapi.yaml \
  -g typescript-axios \
  -o src/api/user
# Repeat for order, catalogue, dispatch, location, payment services
```

All agents import from `@ubereats/shared/api` — never write raw `fetch` calls.

---

## Task pool

### Wave 0 — Shared foundation (all other waves depend on this)

| ID | Task | Owner | Status |
|---|---|---|---|
| S01 | Generate typed API client from all service OpenAPI specs | `shared-agent` | pending |
| S02 | Shared token system: `tokens.ts`, `useTheme` hook, NativeWind config | `shared-agent` | pending |
| S03 | Shared auth module: PKCE flow, token storage (Keychain/Keystore), refresh | `shared-agent` | pending |
| S04 | Shared WebSocket hook: `useRealtimeChannel(topic)` with reconnect logic | `shared-agent` | pending |
| S05 | Shared component library: Button, Card, Avatar, Badge, SkeletonLoader, Toast | `shared-agent` | pending |
| S06 | Shared OCI push notification handler (FCM + APNs registration) | `shared-agent` | pending |

### Wave 1 — App shells (parallel, depends on S01–S06)

| ID | Task | Owner | Status | Blocked by |
|---|---|---|---|---|
| C01 | Customer app: Expo config, Metro bundler, NativeWind setup | `customer-shell-agent` | pending | S01–S06 |
| C02 | Customer app: Root navigation (Tab bar: Home, Orders, Profile) | `customer-shell-agent` | pending | C01 |
| C03 | Customer app: Splash screen, onboarding carousel (3 screens) | `customer-shell-agent` | pending | C01 |
| C04 | Customer app: Bottom sheet provider, toast provider, modal stack | `customer-shell-agent` | pending | C02 |
| D01 | Driver app: Expo config, Metro bundler, NativeWind dark-theme setup | `driver-shell-agent` | pending | S01–S06 |
| D02 | Driver app: Root navigation (Tab bar: Deliveries, Earnings, Account) | `driver-shell-agent` | pending | D01 |
| D03 | Driver app: Online/Offline toggle — prominent hero button on home screen | `driver-shell-agent` | pending | D02 |
| D04 | Driver app: Background location permission flow, persistent GPS service | `driver-shell-agent` | pending | D01 |

### Wave 2 — Feature screens (parallel, depends on Wave 1)

#### Customer features

| ID | Task | Owner | Status | Blocked by |
|---|---|---|---|---|
| C05 | Home screen: location selector, category chips, featured restaurants carousel | `customer-discovery-agent` | pending | C02 |
| C06 | Restaurant list: infinite scroll, filter drawer (cuisine, rating, ETA, price) | `customer-discovery-agent` | pending | C05 |
| C07 | Restaurant detail: hero image, menu sections, item cards with modifiers | `customer-discovery-agent` | pending | C06 |
| C08 | Search screen: debounced search bar, recent searches, live results | `customer-discovery-agent` | pending | C05 |
| C09 | Cart sheet: item list, quantity controls, promo code input, subtotal | `customer-order-agent` | pending | C07 |
| C10 | Checkout screen: address picker, delivery time slot, payment method select | `customer-order-agent` | pending | C09 |
| C11 | Payment screen: Stripe card form, saved cards, Apple/Google Pay | `customer-order-agent` | pending | C10 |
| C12 | Order tracking screen: live map, courier dot, ETA countdown, status timeline | `customer-order-agent` | pending | C11,S04 |
| C13 | Order confirmation + rating sheet (1–5 stars, comment, tip selector) | `customer-order-agent` | pending | C12 |
| C14 | Login/Register screens: phone OTP + social (Apple, Google) | `customer-account-agent` | pending | C03,S03 |
| C15 | Profile screen: name, photo, dietary preferences | `customer-account-agent` | pending | C14 |
| C16 | Address book: add/edit/delete delivery addresses, map pin picker | `customer-account-agent` | pending | C15 |
| C17 | Order history screen: past orders list, reorder CTA, receipt download | `customer-account-agent` | pending | C14 |

#### Driver features

| ID | Task | Owner | Status | Blocked by |
|---|---|---|---|---|
| D05 | Delivery queue screen: incoming order card (restaurant, distance, payout, timer) | `driver-dispatch-agent` | pending | D02,S04 |
| D06 | Accept / Reject flow: full-screen modal with 30 s countdown ring | `driver-dispatch-agent` | pending | D05 |
| D07 | Active delivery map: real-time courier position, restaurant + customer pins | `driver-dispatch-agent` | pending | D06,S04 |
| D08 | Delivery status controls: Arrived at Restaurant → Picked Up → Delivered | `driver-dispatch-agent` | pending | D07 |
| D09 | Turn-by-turn nav screen: step instructions, distance, ETA, re-route button | `driver-nav-agent` | pending | D07 |
| D10 | Pickup confirmation: item checklist scan + photo proof of pickup | `driver-nav-agent` | pending | D09 |
| D11 | Dropoff confirmation: photo proof of delivery, contactless note | `driver-nav-agent` | pending | D10 |
| D12 | Earnings today screen: trip count, total earnings, tip breakdown, streak badge | `driver-earnings-agent` | pending | D02 |
| D13 | Earnings history: weekly/monthly toggle, bar chart, per-trip breakdown | `driver-earnings-agent` | pending | D12 |
| D14 | Payout screen: bank account setup, instant payout CTA, transfer history | `driver-earnings-agent` | pending | D13 |
| D15 | Driver account: profile, vehicle info, documents upload, ratings summary | `driver-earnings-agent` | pending | D02,S03 |

### Wave 3 — Polish & integration (depends on Wave 2)

| ID | Task | Owner | Status | Blocked by |
|---|---|---|---|---|
| C18 | Customer app: deep link handling (`ubereats://order/:id`, `ubereats://restaurant/:id`) | `customer-shell-agent` | pending | C02–C17 |
| C19 | Customer app: offline banner, optimistic cart mutations, error boundaries | `customer-order-agent` | pending | C09–C13 |
| C20 | Customer app: push notification handlers (order updates → navigate to C12) | `customer-account-agent` | pending | S06,C12 |
| D16 | Driver app: background GPS publish to location-service WebSocket | `driver-dispatch-agent` | pending | D04,S04 |
| D17 | Driver app: push notification handlers (new delivery → D05 auto-focus) | `driver-shell-agent` | pending | S06,D05 |
| D18 | Driver app: low-battery / poor-network degraded mode (reduced GPS frequency) | `driver-shell-agent` | pending | D16 |

### Wave 4 — Quality gate (all preceding waves must complete)

| ID | Task | Owner | Status | Blocked by |
|---|---|---|---|---|
| T01 | Detox E2E: customer order happy path (browse → cart → pay → track) | `app-test-agent` | pending | Wave 3 |
| T02 | Detox E2E: driver accept delivery → navigate → confirm dropoff | `app-test-agent` | pending | Wave 3 |
| T03 | Jest component tests: ≥ 80% coverage on shared components | `app-test-agent` | pending | S05 |
| T04 | Accessibility audit: WCAG 2.1 AA — screen reader labels, contrast ratios | `app-test-agent` | pending | Wave 2 |
| T05 | Performance: customer home screen TTI < 1.5 s, driver map FPS ≥ 55 | `app-test-agent` | pending | Wave 3 |
| T06 | Orchestrator synthesis: merge all worktrees, resolve conflicts, open PR | `app-orchestrator` | pending | T01–T05 |

---

## File ownership map

| Path | Owner agent |
|---|---|
| `apps/shared/**` | `shared-agent` |
| `apps/customer/src/navigation/**` | `customer-shell-agent` |
| `apps/customer/src/screens/onboarding/**` | `customer-shell-agent` |
| `apps/customer/src/screens/discovery/**` | `customer-discovery-agent` |
| `apps/customer/src/screens/order/**` | `customer-order-agent` |
| `apps/customer/src/screens/account/**` | `customer-account-agent` |
| `apps/driver/src/navigation/**` | `driver-shell-agent` |
| `apps/driver/src/screens/dispatch/**` | `driver-dispatch-agent` |
| `apps/driver/src/screens/navigation/**` | `driver-nav-agent` |
| `apps/driver/src/screens/earnings/**` | `driver-earnings-agent` |
| `apps/tests/**` | `app-test-agent` |
| `SWARM_APPS.md`, `apps/*/app.json` | `app-orchestrator` |

---

## Inter-agent communication protocol

Use the same inbox format as `CLAUDE.md`:

```
TO: <agent-name>
RE: <task-id> — <subject>
STATUS: blocked | needs-review | done | schema-change
BODY:
<max 6 lines>
```

### Critical handoff sequence

```
shared-agent → ALL:          S01–S06 done. API client at @ubereats/shared/api.
                              Auth hook: useAuth(). WS hook: useRealtimeChannel().

customer-shell-agent → customer-*-agent:
                              Navigation ready. Use useNavigation<RootStackParamType>().
                              Stack types at apps/customer/src/navigation/types.ts

driver-shell-agent → driver-*-agent:
                              Navigation ready. Use useNavigation<DriverStackParamType>().
                              Stack types at apps/driver/src/navigation/types.ts

customer-order-agent → app-test-agent:
                              C12 tracking screen uses useRealtimeChannel('order.<orderId>').
                              Payload shape: OrderTrackingEvent at shared/types/events.ts

driver-dispatch-agent → app-test-agent:
                              D16 publishes GPS every 3 s to WS topic 'courier.<courierId>'.
                              Payload shape: CourierLocationEvent at shared/types/events.ts
```

---

## App target repo structure

```
ubereats-oci/
└── apps/
    ├── shared/
    │   ├── src/
    │   │   ├── api/            ← generated API clients (shared-agent)
    │   │   ├── auth/           ← PKCE module (shared-agent)
    │   │   ├── components/     ← shared component library (shared-agent)
    │   │   ├── hooks/          ← useRealtimeChannel, useAuth (shared-agent)
    │   │   ├── tokens.ts       ← design tokens (shared-agent)
    │   │   └── types/          ← shared event types (shared-agent)
    │   └── package.json
    ├── customer/
    │   ├── src/
    │   │   ├── navigation/     ← (customer-shell-agent)
    │   │   ├── screens/
    │   │   │   ├── onboarding/ ← (customer-shell-agent)
    │   │   │   ├── discovery/  ← home, restaurant list, search (customer-discovery-agent)
    │   │   │   ├── order/      ← cart, checkout, tracking (customer-order-agent)
    │   │   │   └── account/    ← auth, profile, history (customer-account-agent)
    │   │   └── store/          ← Zustand slices per domain
    │   ├── app.json
    │   └── package.json
    ├── driver/
    │   ├── src/
    │   │   ├── navigation/     ← (driver-shell-agent)
    │   │   ├── screens/
    │   │   │   ├── dispatch/   ← queue, accept, active map (driver-dispatch-agent)
    │   │   │   ├── navigation/ ← turn-by-turn, pickup, dropoff (driver-nav-agent)
    │   │   │   └── earnings/   ← dashboard, history, payout (driver-earnings-agent)
    │   │   └── store/
    │   ├── app.json
    │   └── package.json
    └── tests/
        ├── e2e/                ← Detox (app-test-agent)
        ├── components/         ← Jest (app-test-agent)
        └── a11y/               ← accessibility (app-test-agent)
```

---

## Orchestrator spawn prompt

Paste this into Claude Code to start the swarm:

```
You are app-orchestrator, the team lead for the UberEats customer and driver
app swarm.

Reference documents:
- CLAUDE.md         — OCI backend architecture, event schemas, API specs
- SWARM_APPS.md     — this file; all task pool, agent roles, file ownership

Your responsibilities:
1. Create all git worktrees listed in SWARM_APPS.md §"Git worktree setup".
2. Create the task pool from the Wave 0–4 table in SWARM_APPS.md.
3. Spawn shared-agent first and wait for it to broadcast "S01–S06 done"
   before spawning any other agents.
4. After shared-agent completes, spawn all Wave 1 agents in parallel:
   customer-shell-agent and driver-shell-agent.
5. After Wave 1 agents broadcast completion, spawn all Wave 2 agents:
   customer-discovery-agent, customer-order-agent, customer-account-agent,
   driver-dispatch-agent, driver-nav-agent, driver-earnings-agent.
6. After Wave 2 completes, spawn Wave 3 polish tasks back to the shell
   and feature agents.
7. After Wave 3 completes, spawn app-test-agent for Wave 4.
8. On Wave 4 completion, merge all worktrees into main, resolve any
   conflicts by preferring the owning agent's version per the file
   ownership map, and open the final PR with a release checklist comment.

Do not write application code yourself. Delegate all implementation.
Use Teammate broadcast to announce wave transitions.
```

---

## Individual agent spawn prompts

### shared-agent

```
You are shared-agent on the ubereats-oci app swarm.
Working directory: worktree/shared
File ownership: apps/shared/**

Reference:
- CLAUDE.md for backend API specs location (services/*/openapi.yaml)
- SWARM_APPS.md §"Tech stack" and §"Design system tokens"

Your Wave 0 tasks (all parallel — complete all before broadcasting done):

S01 — Generate typed API client
  Run the openapi-generator command from SWARM_APPS.md §"API client generation"
  for every service: user, order, catalogue, dispatch, location, payment.
  Output to apps/shared/src/api/<service-name>/.
  Export a barrel from apps/shared/src/api/index.ts.

S02 — Design token system
  Create apps/shared/src/tokens.ts from the token object in SWARM_APPS.md.
  Create apps/shared/src/hooks/useTheme.ts — returns the correct color set
  based on which app is importing (detect via an APP_ID env var: "customer"
  or "driver"). Configure NativeWind tailwind.config.js extending these tokens.

S03 — Auth module
  Implement PKCE OAuth 2.0 against OCI IAM IDCS.
  Tokens stored via react-native-keychain.
  Export: useAuth(), AuthProvider, authClient.
  Location: apps/shared/src/auth/

S04 — WebSocket hook
  Implement useRealtimeChannel(topic: string) backed by native WebSocket.
  Reconnects with exponential backoff (max 30 s).
  Publishes to OCI API Gateway WS endpoint from env var EXPO_PUBLIC_WS_URL.
  Location: apps/shared/src/hooks/useRealtimeChannel.ts

S05 — Shared component library
  Build in apps/shared/src/components/:
  - Button (variants: primary, secondary, ghost, danger; sizes: sm, md, lg)
  - Card (with optional pressable + shadow)
  - Avatar (image + initials fallback)
  - Badge (status pill with semantic color)
  - SkeletonLoader (shimmer animation, configurable shape)
  - Toast (bottom sheet, auto-dismiss, variants: success/error/info)
  Export all from apps/shared/src/components/index.ts.
  All components must be accessible (accessibilityLabel, accessibilityRole).

S06 — Push notification handler
  Register device with OCI Notification Service via the notification-service API.
  Handle FCM (Android) and APNs (iOS) tokens.
  Export: NotificationProvider, useNotifications().
  Location: apps/shared/src/notifications/

When all six tasks are complete, broadcast to all agents:
"S01–S06 complete. API client: @ubereats/shared/api.
Auth: useAuth() from @ubereats/shared/auth.
WS: useRealtimeChannel() from @ubereats/shared/hooks.
Components: @ubereats/shared/components.
DO NOT start Wave 1 work until this message is received."
```

---

### customer-shell-agent

```
You are customer-shell-agent on the ubereats-oci app swarm.
Working directory: worktree/customer-shell
File ownership: apps/customer/src/navigation/**, apps/customer/src/screens/onboarding/**,
               apps/customer/app.json

Wait for shared-agent to broadcast "S01–S06 complete" before starting.

Design brief for customer app:
  Warm, appetite-forward. Primary #FF6B35 orange on clean white. Sora display
  font for headings, DM Sans for body. Generous imagery, smooth spring
  animations. Feels like a food magazine brought to life.

C01 — Expo project setup
  Create apps/customer/ with Expo SDK 52, React Native 0.76 (New Architecture).
  Install: nativewind@4, @react-navigation/native@7, zustand@5,
  @tanstack/react-query@5, react-native-keychain, react-native-maps.
  Configure Metro to resolve @ubereats/shared from ../../shared/src.
  NativeWind tailwind.config.js must extend tokens from @ubereats/shared/tokens.

C02 — Root navigation
  Implement React Navigation 7 root stack at apps/customer/src/navigation/RootNavigator.tsx.
  Structure:
    AuthStack (Login, Register, OTP)
    MainTabs (Home, Orders, Profile) — bottom tab bar
      Home stack → Discovery screens (C05–C08)
      Orders stack → Order tracking screens (C09–C13)
      Profile stack → Account screens (C14–C17)
  Export full TypeScript types: RootStackParamList, MainTabParamList.
  Tab bar: orange active icon, muted inactive, no labels on mobile.

C03 — Splash + onboarding
  Splash: full-bleed hero with brand mark, fade-out on auth check.
  Onboarding carousel (3 screens, skip button, dot indicators):
    Screen 1: "Order from hundreds of restaurants" — fork/plate illustration
    Screen 2: "Track in real time" — map pin animation
    Screen 3: "Fast delivery to your door" — courier illustration
  Use Reanimated 3 spring animations between slides.
  Store onboarding-seen flag in AsyncStorage.

C04 — Global providers
  Wrap app in: QueryClientProvider, AuthProvider, NotificationProvider,
  BottomSheetModalProvider, ToastProvider.
  Error boundary at root catching unhandled rejections.
  Network status banner: red strip when offline.

When C01–C04 are done, message all customer-* agents:
"TO: customer-discovery-agent, customer-order-agent, customer-account-agent
RE: C02 done — navigation ready
STATUS: done
BODY:
Navigation types at apps/customer/src/navigation/types.ts.
useNavigation<RootStackParamList>() is available.
You can now start your Wave 2 tasks."
```

---

### customer-discovery-agent

```
You are customer-discovery-agent on the ubereats-oci app swarm.
Working directory: worktree/customer-discovery
File ownership: apps/customer/src/screens/discovery/**

Wait for customer-shell-agent to message "navigation ready" before starting.

C05 — Home screen (apps/customer/src/screens/discovery/HomeScreen.tsx)
  Sections (top to bottom):
  - Location header: current address pill, tap to open address picker (C16)
  - Category chips: horizontal scroll (Pizza, Sushi, Burger, Vegan, Dessert…)
    fetched from GET /catalogue/categories
  - "Delivering now" — estimated time based on user location
  - Featured restaurants: horizontal carousel, large cards (image, name,
    rating, cuisine tag, ETA badge)
  - "Near you": vertical list (4 items, "See all" → C06)
  Pull-to-refresh. Skeleton loaders on first load (use shared SkeletonLoader).
  All data via @ubereats/shared/api catalogue client + TanStack Query.

C06 — Restaurant list (apps/customer/src/screens/discovery/RestaurantListScreen.tsx)
  Infinite scroll (page size 20), FlatList with getItemLayout for perf.
  Filter drawer (bottom sheet): cuisine multi-select, min rating slider,
  max ETA slider, price range (€–€€€€).
  Sort: relevance, rating, delivery time, distance.
  Empty state: illustration + "No restaurants match your filters".

C07 — Restaurant detail (apps/customer/src/screens/discovery/RestaurantDetailScreen.tsx)
  Sticky hero image header (parallax on scroll, collapses to name bar).
  Menu sections: SectionList, each section header sticky.
  Item card: name, description, price, allergy badges, "Add" button.
  Item modifier bottom sheet: size, extras, remove ingredients, quantity.
  Pressing "Add" triggers optimistic cart update via Zustand cart store.
  (Cart store is shared — do not own it; import from apps/customer/src/store/cart.ts
   which customer-order-agent will create. Send a message to request its shape.)

C08 — Search screen (apps/customer/src/screens/discovery/SearchScreen.tsx)
  Debounced search input (300 ms) hitting GET /catalogue/search?q=.
  Recent searches: AsyncStorage, max 10, clearable.
  Live results: restaurant cards + menu item results in separate sections.
  "No results" empty state.

Message app-test-agent when C05–C08 are done:
"TO: app-test-agent
RE: C05–C08 done — discovery screens complete
STATUS: done
BODY: All discovery screens live at apps/customer/src/screens/discovery/"
```

---

### customer-order-agent

```
You are customer-order-agent on the ubereats-oci app swarm.
Working directory: worktree/customer-order
File ownership: apps/customer/src/screens/order/**,
               apps/customer/src/store/cart.ts,
               apps/customer/src/store/activeOrder.ts

Wait for customer-shell-agent to message "navigation ready" before starting.
Create the Zustand cart store early (C09 step 1) and message
customer-discovery-agent with its shape so they can import it for C07.

C09 — Cart bottom sheet (apps/customer/src/screens/order/CartSheet.tsx)
  Zustand cart store (apps/customer/src/store/cart.ts):
    items: { itemId, name, price, quantity, modifiers }[]
    restaurantId, subtotal, itemCount
    actions: addItem, removeItem, updateQuantity, clear
  Cart sheet (BottomSheetModal, snap points 50% / 90%):
    item list with swipe-to-delete, quantity stepper
    promo code text input (POST /order/promo-codes/validate)
    subtotal, delivery fee, total
    "Go to checkout" CTA → C10

C10 — Checkout screen (apps/customer/src/screens/order/CheckoutScreen.tsx)
  Address section: selected address from address book (C16) or "Add new"
  Delivery time: ASAP (default) or scheduled slot picker
  Payment method: saved cards list + "Add new card" → C11
  Order summary: items, fees, tip selector (10% / 15% / 20% / custom)
  "Place order" button → POST /order/orders → navigates to C12

C11 — Payment screen (apps/customer/src/screens/order/PaymentScreen.tsx)
  Stripe CardField component (react-native-stripe-sdk)
  Saved cards list (GET /payment/cards)
  Apple Pay / Google Pay via Stripe PaymentSheet
  POST /payment/payment-methods to save new card
  On success → return to C10 with selected method

C12 — Order tracking screen (apps/customer/src/screens/order/TrackingScreen.tsx)
  Full-screen map (react-native-maps) with:
    - User pin (destination)
    - Restaurant pin (pickup)
    - Courier animated dot (moves in real time)
  Courier position from useRealtimeChannel('order.<orderId>') — payload
  shape is CourierLocationEvent from @ubereats/shared/types/events.ts
  ETA countdown timer (recalculates on each courier location update)
  Status timeline at bottom: Confirmed → Preparing → Picked up → On the way → Delivered
  "Contact courier" button → tel: link
  "Cancel order" (only visible in Confirmed state, < 2 min)

C13 — Order confirmation + rating (apps/customer/src/screens/order/ConfirmationScreen.tsx)
  Success animation (Lottie checkmark, 1.5 s)
  Order summary card
  Rating bottom sheet (auto-shows after 30 s):
    1–5 star tap rating for food and courier separately
    optional comment text input
    tip adjustment slider
    POST /order/orders/:id/rating

When cart store shape is defined (end of C09), message customer-discovery-agent:
"TO: customer-discovery-agent
RE: cart store ready
STATUS: done
BODY:
Cart store at apps/customer/src/store/cart.ts.
Import: import { useCartStore } from '@/store/cart'
addItem(item: CartItem): void — call this from the modifier sheet."
```

---

### customer-account-agent

```
You are customer-account-agent on the ubereats-oci app swarm.
Working directory: worktree/customer-account
File ownership: apps/customer/src/screens/account/**

Wait for customer-shell-agent to message "navigation ready" before starting.

C14 — Auth screens (apps/customer/src/screens/account/auth/)
  Login screen: phone number input (libphonenumber-js validation),
  "Continue" → OTP screen. Social login buttons: Apple, Google
  (use expo-auth-session for PKCE flows against OCI IAM IDCS).
  OTP screen: 6-digit code input (auto-focus next cell), 60 s resend timer.
  On success: store tokens via useAuth() from @ubereats/shared/auth.

C15 — Profile screen (apps/customer/src/screens/account/ProfileScreen.tsx)
  Avatar (editable — image picker → upload to PUT /user/profile/avatar)
  Name, email (editable inline)
  Dietary preferences: multi-select chips (Vegan, Halal, Gluten-free…)
  "Manage addresses" → C16
  "Order history" → C17
  "Sign out" (clears keychain tokens)

C16 — Address book (apps/customer/src/screens/account/AddressBookScreen.tsx)
  Address list: GET /user/addresses, swipe-to-delete
  "Add new address" → map screen with draggable pin (react-native-maps)
  Reverse geocode pin position via HERE Maps API (from OCI Maps service)
  Label picker: Home / Work / Other
  POST/PUT/DELETE /user/addresses

C17 — Order history (apps/customer/src/screens/account/OrderHistoryScreen.tsx)
  FlatList, paginated (GET /order/orders?userId=me&page=)
  Order card: restaurant name, date, total, status badge, item count
  Tap → order detail sheet (items list, address, receipt)
  "Reorder" CTA → re-populates cart with same items → navigate to C10
  "Download receipt" → GET /payment/receipts/:orderId (PDF download)

C20 — Push notification handlers
  In useNotifications() from @ubereats/shared/notifications, register handlers:
  - order.accepted    → toast "Your order is confirmed!" + navigate to C12
  - order.picked_up   → toast "Courier has your food!"
  - order.delivered   → navigate to C13
  - promo.available   → badge on Home tab icon
```

---

### driver-shell-agent

```
You are driver-shell-agent on the ubereats-oci app swarm.
Working directory: worktree/driver-shell
File ownership: apps/driver/src/navigation/**, apps/driver/app.json

Wait for shared-agent to broadcast "S01–S06 complete" before starting.

Design brief for driver app:
  High-contrast dark theme. Near-black surfaces (#0A0A0A, #111111).
  Teal-green (#00C896) primary — the "go" signal. Amber (#FFBE0B) for
  alerts. Large tap targets (min 48 dp — drivers use gloves / one-handed).
  Sora bold for key metrics. Readable at a glance at 60 mph.

D01 — Expo project setup
  Create apps/driver/ with Expo SDK 52, React Native 0.76.
  Same dependencies as customer app but with:
  react-native-maps + @here/maps-mobile-sdk (HERE Maps for turn-by-turn)
  expo-background-fetch, expo-task-manager (background GPS)
  Configure Metro to resolve @ubereats/shared.
  NativeWind config: extend tokens.driver from @ubereats/shared/tokens.

D02 — Root navigation
  React Navigation 7 root stack at apps/driver/src/navigation/RootNavigator.tsx.
  Structure:
    AuthStack
    MainTabs (bottom bar — large icons, no labels):
      Deliveries tab → dispatch + nav screens (D05–D11)
      Earnings tab   → earnings screens (D12–D14)
      Account tab    → D15
  Export full TypeScript types: DriverStackParamList.

D03 — Online/Offline toggle (apps/driver/src/screens/home/OnlineToggle.tsx)
  Full-screen home when offline: large pulsing toggle button center screen,
  "You are OFFLINE" status, earnings summary today.
  When toggled ON: button turns teal, ripple animation, starts GPS service (D04),
  subscribes to dispatch queue (D05).
  Persistent state in Zustand driverStore (isOnline: boolean).

D04 — Background GPS service (apps/driver/src/services/gpsService.ts)
  Expo TaskManager background task: 'COURIER_LOCATION_TASK'
  Publishes CourierLocationEvent every 3 s to useRealtimeChannel when online.
  Reduces to 15 s in low-battery mode (< 20% battery).
  Requests both foreground and background location permissions with
  custom rationale strings. Handles permission denied gracefully.

When D01–D04 done, message all driver-* agents:
"TO: driver-dispatch-agent, driver-nav-agent, driver-earnings-agent
RE: D02 done — driver navigation ready
STATUS: done
BODY:
Navigation types at apps/driver/src/navigation/types.ts.
isOnline Zustand slice at apps/driver/src/store/driver.ts.
GPS service at apps/driver/src/services/gpsService.ts — already started
  when driver goes online. You can reference COURIER_LOCATION_TASK."

D17 — Push notification handlers (add after Wave 2 agents complete)
  Register in NotificationProvider:
  - dispatch.new_order → navigate to D05 DeliveryQueueScreen, auto-expand card

D18 — Degraded mode
  Monitor battery level via expo-battery.
  Monitor network quality via NetInfo.
  If battery < 20% OR connection = 2g:
    Reduce GPS publish to 15 s (already in D04 — just set flag)
    Show amber banner "Reduced accuracy mode"
    Disable map satellite layer in D07
```

---

### driver-dispatch-agent

```
You are driver-dispatch-agent on the ubereats-oci app swarm.
Working directory: worktree/driver-dispatch
File ownership: apps/driver/src/screens/dispatch/**

Wait for driver-shell-agent to message "navigation ready" before starting.

D05 — Delivery queue screen (apps/driver/src/screens/dispatch/DeliveryQueueScreen.tsx)
  Subscribes to useRealtimeChannel('courier.<courierId>.offers') when online.
  Incoming order card (large, full-width):
    Restaurant name + cuisine type
    Distance to restaurant (km)
    Estimated payout (base + estimated tip)
    Delivery ETA
    Countdown timer ring (30 s) — auto-reject on expire
  "No deliveries" empty state with subtle pulsing dot.

D06 — Accept/Reject flow (apps/driver/src/screens/dispatch/OrderOfferScreen.tsx)
  Full-screen modal over map.
  Large map preview: restaurant pin + delivery destination + estimated route.
  Payout breakdown: base fare, distance fee, estimated tip, total.
  Two full-width buttons:
    DECLINE (ghost, dark red on tap) — sends POST /dispatch/offers/:id/reject
    ACCEPT  (solid teal)             — sends POST /dispatch/offers/:id/accept
      → immediately navigate to D07 with active delivery context
  Countdown ring in corner (same 30 s timer from D05).
  Haptic feedback on both actions (expo-haptics).

D07 — Active delivery map (apps/driver/src/screens/dispatch/ActiveDeliveryScreen.tsx)
  Full-screen react-native-maps.
  Pins: restaurant (orange fork icon), customer (home icon).
  Courier position: driver's own GPS from driverStore (real-time).
  Route polyline between current position → next stop (from GET /dispatch/route).
  Bottom sheet (snap 200 dp): current stop name, distance, ETA, next action button.
  Next action button states:
    "Navigate to Restaurant" → D09 (pickup phase)
    "Navigate to Customer"   → D09 (delivery phase)
    "Arrived at Restaurant"  → D08 (triggers D10)
    "Arrived at Customer"    → D08 (triggers D11)

D08 — Delivery status controls
  Calls PATCH /dispatch/deliveries/:id/status with new status.
  Status transitions from driver side:
    accepted → en_route_to_restaurant
    en_route_to_restaurant → arrived_at_restaurant → picked_up
    picked_up → en_route_to_customer
    en_route_to_customer → arrived_at_customer → delivered
  Each transition publishes an event — the API handles OCI Streaming fan-out.
  On "picked_up": navigate to D10.
  On "delivered": navigate to D11.

D16 — Background GPS publish
  When driverStore.isOnline === true and an active delivery exists,
  the GPS task (D04) must publish CourierLocationEvent to
  useRealtimeChannel('courier.<courierId>') every 3 s.
  Shape (from @ubereats/shared/types/events.ts — confirm with shared-agent):
    { courierId, lat, lng, heading, speed, timestamp }
  Emit via the WS hook; the location-service backend handles persistence.
```

---

### driver-nav-agent

```
You are driver-nav-agent on the ubereats-oci app swarm.
Working directory: worktree/driver-nav
File ownership: apps/driver/src/screens/navigation/**

Wait for driver-shell-agent to message "navigation ready" before starting.
Coordinate with driver-dispatch-agent — D09 is navigated to from D07.

D09 — Turn-by-turn navigation (apps/driver/src/screens/navigation/NavigationScreen.tsx)
  Full-screen HERE Maps SDK map.
  Active route rendered with HERE Routing API (via GET /dispatch/route).
  Top instruction banner (large font — readable while driving):
    Maneuver arrow icon + distance to next turn + street name
  Remaining distance + ETA in top-right corner.
  Re-route: if driver deviates > 100 m, auto-fetch new route + haptic alert.
  "I've arrived" button at bottom → calls D08 status transition.
  Keep screen awake (expo-keep-awake) for full duration.
  Mute button (suppresses future voice — not implementing TTS, just UI state).

D10 — Pickup confirmation (apps/driver/src/screens/navigation/PickupScreen.tsx)
  Triggered after driver marks "Arrived at Restaurant".
  Item checklist: GET /order/orders/:id/items, checkboxes for each item.
  "Take photo" button: expo-camera, saves to OCI Object Storage via
    POST /dispatch/deliveries/:id/pickup-photo (multipart)
  "Confirm pickup" → POST /dispatch/deliveries/:id/status {status: "picked_up"}
    → navigate back to D07 (now showing route to customer).

D11 — Dropoff confirmation (apps/driver/src/screens/navigation/DropoffScreen.tsx)
  Triggered after driver marks "Arrived at Customer".
  "Take photo" button: photo proof of delivery (required for contactless).
  Contactless note: shows any special instructions from order.
  "Confirm delivery" → POST /dispatch/deliveries/:id/status {status: "delivered"}
    POST /dispatch/deliveries/:id/dropoff-photo
    → navigate to earnings summary (D12) with trip earnings breakdown.
```

---

### driver-earnings-agent

```
You are driver-earnings-agent on the ubereats-oci app swarm.
Working directory: worktree/driver-earnings
File ownership: apps/driver/src/screens/earnings/**

Wait for driver-shell-agent to message "navigation ready" before starting.

D12 — Earnings today (apps/driver/src/screens/earnings/EarningsTodayScreen.tsx)
  Hero metrics row (large teal numbers, Sora Bold):
    Total earned today  |  Trips completed  |  Online hours
  Tip breakdown: base + tips separately.
  Streak badge: amber badge if ≥ 5 trips completed ("On a roll! 🔥").
  Recent trips list (last 5): restaurant name, time, payout, rating received.
  "See full history" → D13.
  Data: GET /dispatch/earnings?period=today

D13 — Earnings history (apps/driver/src/screens/earnings/EarningsHistoryScreen.tsx)
  Toggle: This Week / This Month / Custom range (date picker).
  Bar chart (Victory Native or react-native-chart-kit):
    Weekly: 7-bar chart, teal bars, amber for highest day.
    Monthly: 4-bar chart (weeks).
  Below chart: per-trip list (paginated), each row shows:
    Date, restaurant, distance, duration, payout, customer rating.
  Total summary row (sticky footer): period total.
  Data: GET /dispatch/earnings?period=week|month&from=&to=

D14 — Payout screen (apps/driver/src/screens/earnings/PayoutScreen.tsx)
  Connected bank account: display masked account + bank name.
  "Add bank account" → Stripe Connect onboarding (WebView to Stripe-hosted flow).
  Balance: available now, pending (next payout cycle).
  "Instant payout" button (teal, bold) — POST /dispatch/payouts/instant
    Shows fee warning modal before confirming.
  Payout history list: date, amount, status badge (pending / paid / failed).
  Data: GET /dispatch/payouts

D15 — Driver account (apps/driver/src/screens/earnings/AccountScreen.tsx)
  Profile: photo (editable), name, phone, rating stars (read-only avg).
  Vehicle info: make, model, year, plate — editable, PUT /user/courier/vehicle
  Documents: upload/view driving licence, insurance (expo-document-picker,
    upload to OCI Object Storage via PUT /user/courier/documents/:type)
  Document status badges: Approved / Pending review / Expired (amber/green/red)
  "Sign out" → clears tokens, sets isOnline=false, stops GPS task.
```

---

### app-test-agent

```
You are app-test-agent on the ubereats-oci app swarm.
Working directory: worktree/app-tests
File ownership: apps/tests/**

Wait for app-orchestrator to broadcast "Wave 3 complete" before starting.
Read all screen implementations from their respective worktrees (read-only).

T01 — Detox E2E: customer order happy path
  Test file: apps/tests/e2e/customer-order-happy-path.test.ts
  Steps:
    1. Launch customer app in test mode
    2. Log in with test phone number (OTP bypass via TEST_OTP_CODE env var)
    3. Select first restaurant on home screen
    4. Add first menu item to cart (with default modifiers)
    5. Proceed to checkout — select saved test address
    6. Select test card (Stripe test mode: 4242 4242 4242 4242)
    7. Place order — assert order confirmation screen appears
    8. Assert tracking screen shows map + courier dot within 5 s
    9. Mock WebSocket delivery event → assert status timeline updates
  Must pass on both iOS simulator and Android emulator.

T02 — Detox E2E: driver delivery flow
  Test file: apps/tests/e2e/driver-delivery-flow.test.ts
  Steps:
    1. Launch driver app in test mode
    2. Log in as test courier
    3. Toggle online — assert GPS task starts
    4. Mock incoming order offer via test WS event
    5. Accept offer — assert map screen with route appears
    6. Tap "Arrived at Restaurant" → assert pickup screen
    7. Check all items, tap "Take photo" (mock camera), tap "Confirm pickup"
    8. Assert map updates to customer destination
    9. Tap "Arrived at Customer" → assert dropoff screen
    10. Take photo (mock), confirm → assert earnings screen with trip total

T03 — Jest component tests
  Target: ≥ 80% line coverage on apps/shared/src/components/
  Test file per component: apps/tests/components/<ComponentName>.test.tsx
  Use React Native Testing Library.
  Each component must have tests for: render, props variants, user interaction,
  accessibility (toBeAccessible via jest-native matchers).

T04 — Accessibility audit
  Use @testing-library/jest-native accessibility matchers.
  Every interactive element must have accessibilityLabel.
  Text contrast ratios must meet WCAG 2.1 AA (use color-contrast checker script).
  Check: customer app C05 home, C12 tracking, C14 login.
  Check: driver app D03 online toggle, D06 offer modal, D09 nav screen.
  Report file: apps/tests/a11y/report.md

T05 — Performance
  Customer home TTI: use Flashlight CLI to measure Time to Interactive on
    HomeScreen cold start. Must be < 1 500 ms on mid-range Android (Pixel 3a).
  Driver map FPS: use Flipper React Native Performance plugin script.
    D07 ActiveDeliveryScreen must sustain ≥ 55 FPS during simulated courier
    movement (100 location events/s for 10 s).
  Output: apps/tests/performance/results.json

When T01–T05 are all passing, message app-orchestrator:
"TO: app-orchestrator
RE: Wave 4 complete — all quality gates passed
STATUS: done
BODY:
E2E: customer + driver flows green on iOS + Android.
Coverage: 83% on shared components.
A11y: 0 violations.
Performance: home TTI 1 240 ms, driver map 58 FPS avg.
Ready to merge."
```

---

## Quality gate (app-test-agent enforces)

| Criterion | Threshold |
|---|---|
| Customer E2E happy path | Passes on iOS sim + Android emu |
| Driver delivery E2E | Passes on iOS sim + Android emu |
| Shared component test coverage | ≥ 80 % line coverage |
| WCAG 2.1 AA violations | Zero critical violations |
| Customer home screen TTI | < 1 500 ms (mid-range Android) |
| Driver map sustained FPS | ≥ 55 FPS under 100 events/s |

---

## How to start the app swarm

```bash
# From repo root (ubereats-oci/ — CLAUDE.md already present)

# 1. Create app worktrees
git worktree add worktree/shared               -b feat/shared-lib
git worktree add worktree/customer-shell       -b feat/customer-shell
git worktree add worktree/customer-discovery   -b feat/customer-discovery
git worktree add worktree/customer-order       -b feat/customer-order
git worktree add worktree/customer-account     -b feat/customer-account
git worktree add worktree/driver-shell         -b feat/driver-shell
git worktree add worktree/driver-dispatch      -b feat/driver-dispatch
git worktree add worktree/driver-nav           -b feat/driver-nav
git worktree add worktree/driver-earnings      -b feat/driver-earnings
git worktree add worktree/app-tests            -b feat/app-tests

# 2. Copy this file and CLAUDE.md into each worktree root
for wt in worktree/*/; do
  cp CLAUDE.md "$wt"
  cp SWARM_APPS.md "$wt"
done

# 3. Start Claude Code and paste the orchestrator spawn prompt
claude
```

Paste the **Orchestrator spawn prompt** from §"Orchestrator spawn prompt" above.
The orchestrator will gate the wave sequence, broadcast transitions, and run the
final merge after all quality gates pass.
