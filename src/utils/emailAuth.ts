import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Sign in with email and password
 * @param email User email address
 * @param password User password
 * @returns User credential
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    // Provide user-friendly error messages
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later');
    } else {
      throw new Error(error.message || 'Failed to sign in');
    }
  }
};

/**
 * Create a new user with email and password
 * @param email User email address
 * @param password User password
 * @param username Username
 * @returns User credential
 */
export const createUserWithEmail = async (email: string, password: string, username: string) => {
  try {
    // First check if username is available
    const isAvailable = await isUsernameAvailable(username);
    if (!isAvailable) {
      throw new Error('Username is already taken');
    }

    // Create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: username
    });

    // Create user document
    await setDoc(doc(db, 'users', user.uid), {
      email,
      username,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Reserve the username
    await setDoc(doc(db, 'usernames', username.toLowerCase()), {
      uid: user.uid
    });

    return userCredential;
  } catch (error: any) {
    if (error.message === 'Username is already taken') {
      throw error;
    } else if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email address is already in use');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak');
    } else {
      console.error('Error creating user:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  return await firebaseSignOut(auth);
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Check if username is available
 * @param username Username to check
 * @returns True if username is available
 */
export const isUsernameAvailable = async (username: string) => {
  if (!username || username.trim().length === 0) {
    throw new Error('Username cannot be empty');
  }

  try {
    const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    return !usernameDoc.exists();
  } catch (error: any) {
    console.error('Error checking username:', error);
    if (error.code === 'permission-denied') {
      throw new Error('Unable to check username availability. Please try again.');
    }
    throw new Error('Failed to check username availability. Please try again.');
  }
}; 