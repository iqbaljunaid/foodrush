import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

const PREFIXES = ['foodrush://', 'https://foodrush.app'];

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: PREFIXES,

  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: {
            screens: {
              Discovery: {
                path: 'promo/:code',
                parse: {
                  code: String,
                },
              },
              RestaurantDetail: {
                path: 'restaurant/:restaurantId',
                parse: {
                  restaurantId: String,
                },
              },
            },
          },
          OrdersTab: {
            screens: {
              OrderTracking: {
                path: 'order/:orderId',
                parse: {
                  orderId: String,
                },
              },
            },
          },
        },
      },
    },
  },
};
