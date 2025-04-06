import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Checks if the app is running in native mode
 * This means it's running in Expo Dev Client or as a native build
 * @returns boolean indicating if running in native mode
 */
export const isNativeMode = (): boolean => {
  // Check if app is running in Expo Go vs Dev Client or native build
  return Constants.appOwnership !== 'expo';
};

/**
 * Checks if Firebase native modules are available
 * @returns boolean indicating if Firebase native modules are available
 */
export const hasNativeFirebase = (): boolean => {
  try {
    // Dynamic import to prevent crash in Expo Go
    require('@react-native-firebase/app');
    return true;
  } catch (e) {
    return false;
  }
}; 