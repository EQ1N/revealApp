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
  limit, 
  serverTimestamp, 
  Timestamp,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import { TGroup } from '../types/group';
import { TMessage } from '../types/message';

/**
 * Sends a text message to a group
 * @param groupId Group ID to send message to
 * @param text Message text content
 * @param revealDate When the message will be revealed
 * @returns Promise resolving to the message ID
 */
export const sendTextMessage = async (
  groupId: string,
  text: string,
  revealDate: Date | Timestamp
): Promise<string> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be logged in to send a message');
    if (!text.trim()) throw new Error('Message cannot be empty');

    // Verify the group exists and user is a member
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as TGroup;
    if (!group.members.includes(currentUser.uid)) {
      throw new Error('You must be a member of the group to send messages');
    }

    const messageRef = await addDoc(collection(db, 'messages'), {
      text,
      groupId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Anonymous',
      senderPhotoURL: currentUser.photoURL || null,
      createdAt: serverTimestamp(),
      revealDate,
      isRevealed: false
    });

    return messageRef.id;
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw new Error(error.message || 'Failed to send message');
  }
};

/**
 * Sends a media message to a group
 * @param groupId Group ID to send message to
 * @param uri Local URI of the media file
 * @param mediaType Type of media being sent
 * @param revealDate When the message will be revealed
 * @returns Promise resolving to the message ID
 */
export const sendMediaMessage = async (
  groupId: string,
  uri: string,
  mediaType: 'image' | 'video' | 'audio',
  revealDate: Date | Timestamp
): Promise<string> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be logged in to send a message');

    // Verify the group exists and user is a member
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const group = groupDoc.data() as TGroup;
    if (!group.members.includes(currentUser.uid)) {
      throw new Error('You must be a member of the group to send messages');
    }

    // Upload media to Firebase Storage
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const fileExtension = uri.split('.').pop() || '';
    const fileName = `${groupId}/${currentUser.uid}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, blob);
    const mediaUrl = await getDownloadURL(storageRef);

    // Create message with media URL
    const messageRef = await addDoc(collection(db, 'messages'), {
      mediaUrl,
      mediaType,
      groupId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Anonymous',
      senderPhotoURL: currentUser.photoURL || null,
      createdAt: serverTimestamp(),
      revealDate,
      isRevealed: false
    });

    return messageRef.id;
  } catch (error: any) {
    console.error('Error sending media message:', error);
    throw new Error(error.message || 'Failed to send media message');
  }
};

/**
 * Subscribes to messages in a group
 * @param groupId Group ID to listen to
 * @param callback Callback function to receive updates
 * @returns Unsubscribe function
 */
export const subscribeToMessages = (
  groupId: string,
  callback: (messages: TMessage[]) => void
): (() => void) => {
  const messagesQuery = query(
    collection(db, 'messages'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'asc')
  );

  const unsubscribe = onSnapshot(
    messagesQuery,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TMessage));
      callback(messages);
    },
    (error: any) => {
      console.error('Error in messages subscription:', error);
    }
  );

  return unsubscribe;
};

/**
 * Deletes a message
 * @param messageId ID of the message to delete
 */
export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be logged in to delete a message');

    // Check if the user is the sender of the message
    const messageDoc = await getDoc(doc(db, 'messages', messageId));
    if (!messageDoc.exists()) throw new Error('Message not found');
    
    const message = messageDoc.data() as TMessage;
    if (message.senderId !== currentUser.uid) {
      // Check if user is group owner
      const groupDoc = await getDoc(doc(db, 'groups', message.groupId));
      if (!groupDoc.exists()) throw new Error('Group not found');
      
      const group = groupDoc.data() as TGroup;
      if (group.ownerId !== currentUser.uid) {
        throw new Error('You can only delete your own messages');
      }
    }

    await deleteDoc(doc(db, 'messages', messageId));
  } catch (error: any) {
    console.error('Error deleting message:', error);
    throw new Error(error.message || 'Failed to delete message');
  }
};

/**
 * Gets the latest messages for a group
 * @param groupId Group ID to get messages for
 * @param messageLimit Maximum number of messages to fetch
 * @returns Promise resolving to array of messages
 */
export const getLatestMessages = async (
  groupId: string,
  messageLimit: number = 50
): Promise<TMessage[]> => {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
      limit(messageLimit)
    );

    const snapshot = await getDocs(messagesQuery);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as TMessage))
      .reverse(); // Reverse to get chronological order
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    throw new Error(error.message || 'Failed to fetch messages');
  }
};

/**
 * Checks and updates the revealed status of messages based on their group's reveal date
 * @param messages Array of messages to check
 */
export const updateRevealedStatus = async (messages: TMessage[]) => {
  const now = new Date();
  const batch = writeBatch(db);
  let updateCount = 0;

  // Group messages by groupId to avoid redundant group fetches
  const messagesByGroup: { [key: string]: TMessage[] } = {};
  messages.forEach(message => {
    if (!message.groupId) return;
    if (!messagesByGroup[message.groupId]) {
      messagesByGroup[message.groupId] = [];
    }
    messagesByGroup[message.groupId].push(message);
  });

  // Process each group's messages
  for (const groupId in messagesByGroup) {
    try {
      // Get the group's reveal date
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) continue;
      
      const groupData = groupDoc.data();
      const groupRevealDate = groupData.revealDate instanceof Timestamp 
        ? groupData.revealDate.toDate() 
        : groupData.revealDate;
      
      // Check if current time has passed the group reveal date
      const hasPassedRevealDate = groupRevealDate && now.getTime() >= groupRevealDate.getTime();
      
      // If group reveal date has passed, update all unrevealed messages
      if (hasPassedRevealDate) {
        console.log(`Group ${groupId} reveal date has passed, updating all messages`);
        
        messagesByGroup[groupId].forEach(message => {
          // Only update if the message is not already revealed
          if (!message.isRevealed) {
            const messageRef = doc(db, 'messages', message.id);
            batch.update(messageRef, { isRevealed: true });
            updateCount++;
          }
        });
      }
    } catch (error) {
      console.error(`Error updating revealed status for group ${groupId}:`, error);
    }
  }

  // Commit the batch if there are any updates
  if (updateCount > 0) {
    try {
      await batch.commit();
      console.log(`Updated revealed status for ${updateCount} messages`);
    } catch (error) {
      console.error('Error committing batch update:', error);
    }
  }
};

// Export the Message type
export { TMessage }; 