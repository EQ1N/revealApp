import { Timestamp } from 'firebase/firestore';

export interface TGroup {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp | Date;
  revealDate: Timestamp | Date;
  isPublic: boolean;
  members: string[];
  coverImage?: string;
  ownerId: string;
  revealPerMessage: boolean;
  allowAllToPost: boolean;
  updatedAt?: Timestamp | Date;
} 