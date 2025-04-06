/**
 * Native Firebase Authentication for Phone Numbers
 * 
 * This file contains utility functions for phone authentication using the native Firebase SDK.
 * It works with Expo Dev Client and the native Firebase packages.
 */

// Import the native Firebase auth
import auth from '@react-native-firebase/auth';

/**
 * Sends a verification code to the provided phone number
 * @param phoneNumber - The phone number in E.164 format (e.g., +4512345678)
 * @returns A promise that resolves with the verification ID
 */
export const sendPhoneVerification = async (phoneNumber: string): Promise<string> => {
  try {
    // Using native Firebase - this doesn't need reCAPTCHA
    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    if (!confirmation.verificationId) {
      throw new Error('Failed to get verification ID');
    }
    return confirmation.verificationId;
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Please enter a valid phone number');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('Too many attempts. Please try again later');
    } else {
      throw new Error(error.message || 'Could not send verification code');
    }
  }
};

/**
 * Verifies the phone number with the provided code
 * @param verificationId - The verification ID returned from sendPhoneVerification
 * @param verificationCode - The 6-digit verification code entered by the user
 * @returns A promise that resolves with the user credential
 */
export const verifyPhoneCode = async (verificationId: string, verificationCode: string) => {
  try {
    // Sanitize the verification code to ensure it's properly formatted
    const sanitizedCode = verificationCode.trim();
    
    console.log(`Attempting to verify with ID: ${verificationId} and code: ${sanitizedCode}`);
    
    if (!verificationId) {
      throw new Error('Missing verification ID');
    }
    
    if (sanitizedCode.length !== 6 || !/^\d{6}$/.test(sanitizedCode)) {
      throw new Error('Verification code must be 6 digits');
    }
    
    const credential = auth.PhoneAuthProvider.credential(verificationId, sanitizedCode);
    return await auth().signInWithCredential(credential);
  } catch (error: any) {
    console.error('Error verifying code:', error);
    
    // Log detailed error for debugging
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    // Provide user-friendly error messages
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid verification code. Please check and try again');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('Verification code has expired. Please request a new one');
    } else if (error.code === 'auth/missing-verification-id') {
      throw new Error('Verification session expired. Please request a new code');
    } else {
      throw new Error(error.message || 'Could not verify code');
    }
  }
};

/**
 * Signs out the current user
 */
export const signOut = async () => {
  try {
    await auth().signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Gets the current authenticated user
 * @returns The current user or null if not authenticated
 */
export const getCurrentUser = () => {
  return auth().currentUser;
};

/**
 * Listens for changes in authentication state
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const onAuthStateChanged = (callback: (user: any) => void) => {
  return auth().onAuthStateChanged(callback);
}; 