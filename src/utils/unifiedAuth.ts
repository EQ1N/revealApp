import { isNativeMode, hasNativeFirebase } from './environment';

// Only import FirebaseRecaptchaVerifierModal in non-native mode
let FirebaseRecaptchaVerifierModal: any = null;
let webAuth: any = null;
let nativeAuth: any = null;

// Dynamically load the appropriate auth modules based on environment
if (isNativeMode() && hasNativeFirebase()) {
  try {
    // Only import if we're in native mode
    nativeAuth = require('./nativeAuth');
  } catch (error) {
    console.warn('Native Firebase auth is not available:', error);
  }
} else {
  try {
    // Load web implementation and recaptcha only when needed
    webAuth = require('./auth');
    FirebaseRecaptchaVerifierModal = require('expo-firebase-recaptcha').FirebaseRecaptchaVerifierModal;
  } catch (error) {
    console.warn('Web Firebase auth is not available:', error);
  }
}

/**
 * Set the recaptcha verifier (only needed for web implementation)
 * @param verifier The recaptcha verifier instance
 */
export const setRecaptchaVerifier = (verifier: any) => {
  if (webAuth) {
    webAuth.setRecaptchaVerifier(verifier);
  }
  // Native auth doesn't need recaptcha verifier
};

/**
 * Get the recaptcha verifier (only needed for web implementation)
 * @returns The recaptcha verifier instance
 */
export const getRecaptchaVerifier = () => {
  if (webAuth) {
    return webAuth.getRecaptchaVerifier();
  }
  return null;
};

/**
 * Send phone verification code
 * @param phoneNumber The phone number to send verification to
 * @returns A promise that resolves with the verification ID
 */
export const sendPhoneVerification = async (phoneNumber: string): Promise<string> => {
  if (nativeAuth) {
    return nativeAuth.sendPhoneVerification(phoneNumber);
  } else {
    return webAuth.sendPhoneVerification(phoneNumber);
  }
};

/**
 * Verify phone code
 * @param verificationId The verification ID
 * @param verificationCode The verification code
 * @returns A promise that resolves with the user credential
 */
export const verifyPhoneCode = async (verificationId: string, verificationCode: string) => {
  if (nativeAuth) {
    return nativeAuth.verifyPhoneCode(verificationId, verificationCode);
  } else {
    return webAuth.verifyPhoneCode(verificationId, verificationCode);
  }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  if (nativeAuth) {
    return nativeAuth.signOut();
  } else {
    return webAuth.signOut();
  }
};

/**
 * Check if we're using native auth
 */
export const isUsingNativeAuth = (): boolean => {
  return !!nativeAuth;
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  if (nativeAuth) {
    return nativeAuth.getCurrentUser();
  } else {
    return null; // The web auth doesn't have this function currently
  }
};

/**
 * Register auth state change listener
 */
export const onAuthStateChanged = (callback: (user: any) => void) => {
  if (nativeAuth) {
    return nativeAuth.onAuthStateChanged(callback);
  } else {
    // We'd need to implement this in web auth
    return () => {}; // Empty unsubscribe function
  }
}; 