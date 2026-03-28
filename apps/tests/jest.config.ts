import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/components/**/*.test.{ts,tsx}'],
  setupFilesAfterSetup: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native' +
      '|@react-native' +
      '|react-native-reanimated' +
      '|@expo' +
      '|expo-.*' +
      '|@react-navigation' +
      '|@gorhom' +
      '|nativewind' +
      '|@foodrush/shared' +
      ')/)',
  ],
  moduleNameMapper: {
    '^@foodrush/shared/(.*)$': '<rootDir>/../../shared/src/$1',
    '^@foodrush/shared$': '<rootDir>/../../shared/src/index.ts',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/e2e/', '/a11y/', '/performance/'],
  collectCoverageFrom: [
    '../../shared/src/components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/index.ts',
  ],
};

export default config;
