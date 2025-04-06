#!/bin/bash

# Exit script if any command fails
set -e

echo "=== Preparing your app for native builds ==="
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate native projects
echo "Generating native projects..."
npx expo prebuild

# iOS-specific steps
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Running iOS-specific setup..."
  
  echo "Installing CocoaPods dependencies..."
  cd ios
  pod install
  cd ..
  
  echo ""
  echo "iOS preparation complete!"
  echo "Don't forget to add GoogleService-Info.plist to your iOS project"
  echo "Instructions: Open ios/reveal-app.xcworkspace in Xcode and drag the file into your project"
fi

# Android-specific steps
echo "Running Android-specific setup..."
echo "Don't forget to add google-services.json to your Android project at android/app/"

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To run on iOS device:"
echo "npx expo run:ios"
echo ""
echo "To run on Android device:"
echo "npx expo run:android"
echo ""
echo "For complete build instructions, see BUILD_NATIVE.md" 