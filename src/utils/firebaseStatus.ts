import { db } from '../config/firebase';
import { getDocs, collection, query, limit, enableNetwork, disableNetwork } from 'firebase/firestore';
import { isNativeMode } from './environment';
import NetInfo from '@react-native-community/netinfo';

/**
 * Checks if the device has internet connectivity
 * @returns Promise that resolves to a boolean indicating internet connectivity
 */
export const checkInternetConnection = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected !== null && netInfo.isConnected;
};

/**
 * Tests if Firebase Firestore is accessible by attempting to fetch a small amount of data
 * @returns Promise that resolves to a boolean indicating Firebase connectivity
 */
export const testFirestoreConnection = async (): Promise<boolean> => {
  try {
    // Try to get a single document from any collection
    // This is a lightweight operation to test connectivity
    const testQuery = query(collection(db, 'usernames'), limit(1));
    await getDocs(testQuery);
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};

/**
 * Enables Firestore offline persistence if supported
 */
export const enableOfflinePersistence = () => {
  // Only needed for web, as native SDKs have persistence enabled by default
  if (!isNativeMode()) {
    try {
      // Note: This would require importing enableIndexedDbPersistence
      // and is only available in web environments
      // Implementation would depend on your Firebase version
    } catch (error) {
      console.warn('Failed to enable offline persistence:', error);
    }
  }
};

/**
 * Attempts to reconnect to Firebase by enabling the network
 */
export const reconnectToFirebase = async (): Promise<void> => {
  try {
    await enableNetwork(db);
    console.log('Reconnected to Firebase');
  } catch (error) {
    console.error('Failed to reconnect to Firebase:', error);
  }
};

/**
 * Manually disconnects from Firebase (useful for testing)
 */
export const disconnectFromFirebase = async (): Promise<void> => {
  try {
    await disableNetwork(db);
    console.log('Disconnected from Firebase');
  } catch (error) {
    console.error('Failed to disconnect from Firebase:', error);
  }
}; 