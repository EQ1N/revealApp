import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth } from '../config/firebase';
import { PhoneAuthProvider, signInWithCredential, PhoneAuthCredential } from 'firebase/auth';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

let recaptchaVerifier: FirebaseRecaptchaVerifierModal | null = null;

// Set up the recaptcha verifier
export const setRecaptchaVerifier = (verifier: FirebaseRecaptchaVerifierModal) => {
  recaptchaVerifier = verifier;
};

// Get the recaptcha verifier
export const getRecaptchaVerifier = () => {
  return recaptchaVerifier;
};

/**
 * Send phone verification code 
 * Uses reCAPTCHA in a more optimized way
 */
export const sendPhoneVerification = async (phoneNumber: string) => {
  if (!recaptchaVerifier) {
    throw new Error('reCAPTCHA verifier not initialized');
  }

  try {
    const provider = new PhoneAuthProvider(auth);
    
    // In production, you might disable recaptcha for test phone numbers
    // This would normally be done server-side, but for now
    // we'll include a simple client-side check
    if (Constants.appOwnership === 'expo' && 
        (phoneNumber.includes('+11111111111') || 
         phoneNumber.includes('+12223334444'))) {
      // For testing in Expo Go, we'd skip the reCAPTCHA
      // But this is just a placeholder - not a real production solution
      console.log('Using test phone number, would bypass reCAPTCHA in a proper implementation');
    }
    
    // Proceed with regular verification
    return await provider.verifyPhoneNumber(phoneNumber, recaptchaVerifier);
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    
    // Provide more user-friendly error messages
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Please enter a valid phone number');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('Too many attempts. Please try again later');
    } else if (error.code === 'auth/captcha-check-failed') {
      throw new Error('reCAPTCHA verification failed. Please try again');
    } else {
      throw new Error(error.message || 'Could not send verification code');
    }
  }
};

/**
 * Verify phone number with code
 */
export const verifyPhoneCode = async (verificationId: string, verificationCode: string) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    return await signInWithCredential(auth, credential);
  } catch (error: any) {
    console.error('Error verifying code:', error);
    
    // Provide more user-friendly error messages
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid verification code. Please check and try again');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('Verification code has expired. Please request a new one');
    } else {
      throw new Error(error.message || 'Could not verify code');
    }
  }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}; 