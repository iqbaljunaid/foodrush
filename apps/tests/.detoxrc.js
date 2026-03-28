/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.release': {
      type: 'ios.app',
      binaryPath:
        '../customer/ios/build/Build/Products/Release-iphonesimulator/FoodRush.app',
      build:
        'cd ../customer && xcodebuild -workspace ios/FoodRush.xcworkspace -scheme FoodRush -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: '../customer/android/app/build/outputs/apk/release/app-release.apk',
      build:
        'cd ../customer/android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
    'ios.driver.release': {
      type: 'ios.app',
      binaryPath:
        '../driver/ios/build/Build/Products/Release-iphonesimulator/FoodRushDriver.app',
      build:
        'cd ../driver && xcodebuild -workspace ios/FoodRushDriver.xcworkspace -scheme FoodRushDriver -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.driver.release': {
      type: 'android.apk',
      binaryPath: '../driver/android/app/build/outputs/apk/release/app-release.apk',
      build:
        'cd ../driver/android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15 Pro' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_7_API_34' },
    },
  },
  configurations: {
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    'ios.driver.sim.release': {
      device: 'simulator',
      app: 'ios.driver.release',
    },
    'android.driver.emu.release': {
      device: 'emulator',
      app: 'android.driver.release',
    },
  },
};
