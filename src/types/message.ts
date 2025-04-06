import { Timestamp } from 'firebase/firestore';

export interface TMessage {
  id: string;
  text?: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  createdAt: Timestamp | Date;
  revealDate: Timestamp | Date;
  isRevealed: boolean;
  reactions?: {
    [emoji: string]: string[]; // Array of user IDs who reacted with this emoji
  };
} 