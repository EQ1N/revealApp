import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from './src/config/firebase';

/**
 * Creates a sample group in Firestore for testing
 * Note: You need to be authenticated to run this
 */
export const createSampleGroup = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('You must be logged in to create a sample group');
      return;
    }

    // Create a sample public group
    const groupData = {
      name: 'Welcome to Reveal',
      description: 'This is a sample public group to demonstrate the app functionality',
      isPublic: true,
      revealDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 1 week from now
      ownerId: currentUser.uid,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      members: [currentUser.uid],
      revealPerMessage: false,
      allowAllToPost: true,
      coverImage: 'https://picsum.photos/800/600'
    };

    const groupRef = await addDoc(collection(db, 'groups'), groupData);
    console.log('Sample group created with ID:', groupRef.id);
    
    return groupRef.id;
  } catch (error) {
    console.error('Error creating sample group:', error);
  }
};

// You can call this function manually where needed
// createSampleGroup(); 