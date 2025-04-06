import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  arrayUnion, 
  arrayRemove, 
  setDoc,
  onSnapshot,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { TGroup } from '../types/group';

/**
 * Creates a new group/reveal
 * @param groupData Group data without id/timestamps
 * @returns Promise resolving to the created group ID
 */
export const createGroup = async (groupData: Omit<TGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be logged in to create a group');

    const groupRef = await addDoc(collection(db, 'groups'), {
      ...groupData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ownerId: currentUser.uid,
      members: [currentUser.uid],
    });

    return groupRef.id;
  } catch (error: any) {
    console.error('Error creating group:', error);
    throw new Error(error.message || 'Failed to create group');
  }
};

/**
 * Updates an existing group
 * @param groupId ID of the group to update
 * @param groupData Partial group data to update
 */
export const updateGroup = async (groupId: string, groupData: Partial<Omit<TGroup, 'id' | 'createdAt' | 'ownerId'>>): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be logged in to update a group');

    // Verify ownership
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as TGroup;
    if (group.ownerId !== currentUser.uid) {
      throw new Error('Only the group owner can update group settings');
    }

    await updateDoc(doc(db, 'groups', groupId), {
      ...groupData,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating group:', error);
    throw new Error(error.message || 'Failed to update group');
  }
};

/**
 * Deletes a group
 * @param groupId ID of the group to delete
 */
export const deleteGroup = async (groupId: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be logged in to delete a group');

    // Verify ownership
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as TGroup;
    if (group.ownerId !== currentUser.uid) {
      throw new Error('Only the group owner can delete this group');
    }

    await deleteDoc(doc(db, 'groups', groupId));
  } catch (error: any) {
    console.error('Error deleting group:', error);
    throw new Error(error.message || 'Failed to delete group');
  }
};

/**
 * Fetches a single group by ID
 * @param groupId Group ID to fetch
 * @returns Promise resolving to the group data
 */
export const getGroupById = async (groupId: string): Promise<TGroup> => {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    return { id: groupDoc.id, ...groupDoc.data() } as TGroup;
  } catch (error: any) {
    console.error('Error fetching group:', error);
    throw new Error(error.message || 'Failed to fetch group');
  }
};

/**
 * Gets all groups the current user is a member of
 * @returns Promise resolving to an array of groups
 */
export const getUserGroups = async (): Promise<TGroup[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('User not authenticated, returning empty array');
      return [];
    }

    // Use a simpler query without complex filters
    const groupsRef = collection(db, 'groups');
    const snapshot = await getDocs(groupsRef);
    
    // Filter client-side for groups the user is a member of
    const userGroups = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as TGroup))
      .filter(group => group.members.includes(currentUser.uid))
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      
    return userGroups;
  } catch (error: any) {
    console.error('Error fetching user groups:', error);
    throw new Error(error.message || 'Failed to fetch groups');
  }
};

/**
 * Gets public groups available for joining
 * @returns Promise resolving to an array of public groups
 */
export const getPublicGroups = async (): Promise<TGroup[]> => {
  try {
    // Wait for authentication to be ready
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('User not authenticated, waiting for auth...');
      // Return empty array rather than throwing an error
      return [];
    }

    // Use a simpler query without the where clause first
    const groupsRef = collection(db, 'groups');
    const snapshot = await getDocs(groupsRef);
    
    // Then filter client-side for public groups
    const publicGroups = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as TGroup))
      .filter(group => group.isPublic === true)
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      
    return publicGroups;
  } catch (error: any) {
    console.error('Error fetching public groups:', error);
    throw new Error(error.message || 'Failed to fetch public groups');
  }
};

/**
 * Joins a group
 * @param groupId ID of the group to join
 */
export const joinGroup = async (groupId: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be logged in to join a group');

    // Verify the group exists and is public
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as TGroup;
    if (!group.isPublic) {
      throw new Error('This group is private and cannot be joined');
    }

    await updateDoc(doc(db, 'groups', groupId), {
      members: arrayUnion(currentUser.uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error joining group:', error);
    throw new Error(error.message || 'Failed to join group');
  }
};

/**
 * Leaves a group
 * @param groupId ID of the group to leave
 */
export const leaveGroup = async (groupId: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be logged in to leave a group');

    // Verify the group exists
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as TGroup;
    if (group.ownerId === currentUser.uid) {
      throw new Error('The owner cannot leave the group. Transfer ownership or delete the group.');
    }

    await updateDoc(doc(db, 'groups', groupId), {
      members: arrayRemove(currentUser.uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error leaving group:', error);
    throw new Error(error.message || 'Failed to leave group');
  }
};

/**
 * Subscribe to the user's groups
 * @param callback Callback function to receive updates
 * @returns Unsubscribe function
 */
export const subscribeToUserGroups = (
  callback: (groups: TGroup[]) => void
): (() => void) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('User not authenticated for subscription, returning empty array');
    callback([]);
    return () => {};
  }

  // Use a simpler query without complex conditions
  const groupsRef = collection(db, 'groups');
  
  const unsubscribe = onSnapshot(
    groupsRef,
    (snapshot: QuerySnapshot<DocumentData>) => {
      // Filter client-side for the user's groups
      const userGroups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as TGroup))
        .filter(group => group.members.includes(currentUser.uid))
        .sort((a, b) => {
          // Sort by createdAt in descending order (newest first)
          const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
          const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
          return dateB - dateA;
        });
      
      callback(userGroups);
    },
    (error: any) => {
      console.error('Error in groups subscription:', error);
      // Return empty array on error
      callback([]);
    }
  );

  return unsubscribe;
}; 