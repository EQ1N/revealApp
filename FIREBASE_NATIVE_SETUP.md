# Migrating to Native Firebase Authentication

This guide will help you transition from web-based reCAPTCHA verification to native Firebase authentication, which provides a much better user experience on mobile devices.

## Why Native Authentication?

The current implementation uses `expo-firebase-recaptcha` which opens a web view to handle reCAPTCHA verification. This happens because:

1. Managed Expo apps don't have direct access to native Firebase SDKs
2. Firebase requires web applications to use reCAPTCHA for phone authentication
3. The web view creates a disruptive experience for users

By migrating to Expo Dev Client with native Firebase SDKs, you'll get:
- No reCAPTCHA web view
- Silent verification on iOS (using APNs)
- SafetyNet verification on Android
- A much smoother user experience

## Migration Steps

### 1. Install Expo Dev Client

```bash
npx expo install expo-dev-client
```

### 2. Install Native Firebase SDKs

```bash
npm install --save @react-native-firebase/app @react-native-firebase/auth
```

### 3. Configure Native Firebase

#### iOS Setup

1. Install CocoaPods if not already installed:
```bash
sudo gem install cocoapods
```

2. Generate iOS files:
```bash
npx expo prebuild --platform ios
```

3. Install the Firebase iOS SDK:
```bash
cd ios && pod install && cd ..
```

4. Download the `GoogleService-Info.plist` from Firebase Console and add it to your iOS project
   - Open Firebase Console
   - Select your project
   - Go to Project Settings > Your apps > iOS app
   - Download the config file
   - Add it to the iOS project using Xcode (open `ios/YourApp.xcworkspace`)

#### Android Setup

1. Generate Android files:
```bash
npx expo prebuild --platform android
```

2. Download the `google-services.json` from Firebase Console and add it to your Android project
   - Open Firebase Console
   - Select your project
   - Go to Project Settings > Your apps > Android app
   - Download the config file
   - Add it to the Android project at `/android/app/google-services.json`

3. Update the Android project build files:
   - In `/android/build.gradle`, add to buildscript dependencies:
     ```gradle
     classpath 'com.google.gms:google-services:4.3.15'
     ```
   - In `/android/app/build.gradle`, add to the bottom:
     ```gradle
     apply plugin: 'com.google.gms.google-services'
     ```

### 4. Update the App Code

1. Replace the web-based Firebase auth with native Firebase auth:
   - Start using `src/utils/nativeAuth.ts` instead of `src/utils/auth.ts`
   - Update all imports in your screens to use the native auth functions

2. Remove reCAPTCHA components:
   - Remove `FirebaseRecaptchaVerifierModal` from your screens
   - Remove the reCAPTCHA setup code

### 5. Build in Development Mode

```bash
npx expo run:ios  # For iOS
npx expo run:android  # For Android
```

## Updating Your Screens

For each screen that uses phone authentication, you'll need to update it:

### Example: PhoneSignupScreen.tsx

```typescript
// Before (web-based with reCAPTCHA):
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { sendPhoneVerification, setRecaptchaVerifier } from '../utils/auth';

// After (native implementation):
import { sendPhoneVerification } from '../utils/nativeAuth';
```

Then remove the reCAPTCHA components and related code:
- Remove the recaptchaVerifier ref
- Remove the FirebaseRecaptchaVerifierModal component
- Remove the setRecaptchaVerifier call
- Update the error handling to match the native implementation

### Example: VerifyCodeScreen.tsx

```typescript
// Before (web-based):
import { verifyPhoneCode } from '../utils/auth';

// After (native implementation):
import { verifyPhoneCode } from '../utils/nativeAuth';
```

## Testing the Native Implementation

1. Test on both iOS and Android devices
2. Verify that no reCAPTCHA appears during phone number verification
3. Check all error handling scenarios
4. Ensure the UX is smooth throughout the flow

## Troubleshooting

### Common Issues:

1. **Firebase initialization errors**: Make sure you've added the configuration files correctly
2. **Pod install fails**: Try `cd ios && pod update && pod install`
3. **Android build errors**: Check that the google-services plugin is applied correctly
4. **Phone verification not working**: Make sure your Firebase project has Phone Authentication enabled

For more detailed help, refer to the official documentation:
- [Expo Dev Client](https://docs.expo.dev/development/development-builds/introduction/)
- [React Native Firebase](https://rnfirebase.io/) 