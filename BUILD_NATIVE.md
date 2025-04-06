# Building Native Apps with Expo Dev Client

This guide provides step-by-step instructions for building your app for iOS and Android using Expo Dev Client.

## Prerequisites

- Expo CLI is installed globally: `npm install -g expo-cli`
- For iOS: macOS with Xcode installed
- For Android: Android Studio with SDK tools installed

## Build Steps

### 1. Generate Native Projects

Run this command to generate native iOS and Android projects:

```bash
npx expo prebuild
```

### 2. Configure Firebase for iOS

1. Download `GoogleService-Info.plist` from Firebase Console
2. Copy it to the `ios/reveal-app/` directory
3. Open Xcode:
   ```bash
   open ios/reveal-app.xcworkspace
   ```
4. Drag the `GoogleService-Info.plist` file into your project (make sure "Copy items if needed" is checked)

### 3. Configure Firebase for Android

1. Download `google-services.json` from Firebase Console
2. Copy it to the `android/app/` directory

### 4. Install Native Dependencies

For iOS:
```bash
cd ios
pod install
cd ..
```

### 5. Run in Development Mode

For iOS:
```bash
npx expo run:ios
```

For Android:
```bash
npx expo run:android
```

### 6. Building for Production

#### iOS:

1. Open Xcode:
   ```bash
   open ios/reveal-app.xcworkspace
   ```
2. Select "Generic iOS Device" as the build target
3. Choose Product > Archive from the menu
4. Follow the steps in the Organizer to distribute your app

#### Android:

1. Build a release APK or AAB:
   ```bash
   cd android
   ./gradlew assembleRelease  # For APK
   # OR
   ./gradlew bundleRelease    # For AAB (recommended for Play Store)
   ```
2. The output will be in:
   - APK: `android/app/build/outputs/apk/release/app-release.apk`
   - AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## Troubleshooting

If you encounter any build issues:

1. Make sure all native dependencies are properly installed:
   ```bash
   npx expo doctor
   ```

2. Try cleaning the build:
   ```bash
   # For iOS
   cd ios
   pod deintegrate
   pod install
   cd ..
   
   # For Android
   cd android
   ./gradlew clean
   cd ..
   ```

3. Check Firebase configuration files are in the correct locations

4. Ensure your app.json contains the correct bundle identifiers and package names 