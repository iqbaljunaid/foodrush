import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { DriverTabParamList } from './types';
import { DeliveriesStack } from './DeliveriesStack';
import { EarningsStack } from './EarningsStack';
import { AccountStack } from './AccountStack';

const Tab = createBottomTabNavigator<DriverTabParamList>();

const ACTIVE_COLOR = '#00C896';
const INACTIVE_COLOR = '#6B7280';
const TAB_BAR_BG = '#111111';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof DriverTabParamList, { focused: IoniconsName; default: IoniconsName }> = {
  DeliveriesTab: { focused: 'bicycle', default: 'bicycle-outline' },
  EarningsTab: { focused: 'wallet', default: 'wallet-outline' },
  AccountTab: { focused: 'person-circle', default: 'person-circle-outline' },
};

export function MainTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
          borderTopWidth: 0,
          elevation: 0,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          minHeight: 48,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.default;
          return <Ionicons name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DeliveriesTab"
        component={DeliveriesStack}
        options={{ tabBarAccessibilityLabel: 'Deliveries' }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={EarningsStack}
        options={{ tabBarAccessibilityLabel: 'Earnings' }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={{ tabBarAccessibilityLabel: 'Account' }}
      />
    </Tab.Navigator>
  );
}