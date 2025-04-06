# Reveal - Time-Based Group Chat App

Reveal is a native iOS and Android group chat app where all messages submitted are only revealed on a chosen date. Groups can be private (invitation or QR-code only) or public (where anyone can join). Depending on the group settings, either all members or only the owner can send text, images, videos, and audio clips, which are all revealed simultaneously or individually based on the group configuration.

## Features

✅ Native iOS and Android app (React Native)  
✅ Creation of private and public groups  
✅ Group owner sets a reveal date for all messages or per message  
✅ Members can send text, images, videos, and audio clips  
✅ Group owner can only postpone the reveal date, never move it earlier  
✅ Access via invitation or QR code  
✅ For public groups: Settings for who can post  

## Tech Stack

| Function | Technology |
|----------|------------|
| Platforms | iOS & Android (React Native) |
| Frontend | React Native + Expo |
| Backend | Firebase Firestore (real-time database) |
| Auth | Firebase Authentication |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Storage | Firebase Cloud Storage (for images) |
| E2EE Encryption | Libsodium / WebCrypto API (prepared) |
| UI Components | Material 3 for Android and Human Interface for iOS |
| Animations | Framer Motion |

## Development Setup

1. Clone the repository:
```
git clone https://your-repository-url/reveal.git
cd reveal
```

2. Install dependencies:
```
npm install
```

3. Create a Firebase project and configure it:
   - Create a project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Enable Storage
   - Add your app in Project Settings > Your Apps
   - Copy the Firebase config and paste it in `src/services/firebaseConfig.ts`

4. Run the app:
```
npm run ios     # For iOS simulator
npm run android # For Android emulator
```

## Project Structure

```
/reveal-app
│── /src
│   │── /components            # Reusable UI components
│   │   │── Button.tsx
│   │   │── TextInput.tsx
│   │   └── Avatar.tsx
│   │── /screens               # App screens
│   │   │── HomeScreen.tsx
│   │   │── ChatScreen.tsx
│   │   │── GroupSettingsScreen.tsx
│   │   └── ProfileScreen.tsx
│   │── /navigation            # Navigation structure
│   │   └── AppNavigator.tsx
│   │── /context               # Context Providers
│   │   └── AuthContext.tsx
│   │── /hooks                 # Custom Hooks
│   │   └── useAuth.ts
│   │── /services              # Firebase and API functions
│   │   │── firebaseConfig.ts
│   │   │── auth.ts
│   │   │── firestore.ts
│   │   └── storage.ts
│   │── /utils                 # Utility functions
│   │   │── crypto.ts          # E2EE encryption (Libsodium / WebCrypto API)
│   │   └── helpers.ts
│   └── /assets                # Icons, images, fonts
│── /ios                       # Native iOS code
│── /android                   # Native Android code
│── App.tsx                    # Main component
│── package.json               # Dependencies
└── README.md                  # Project description
``` 