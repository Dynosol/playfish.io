import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

export type ChatCollection = 'lobby' | 'game';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

const getMessagesRef = (id: string, type: ChatCollection) => {
  const parentCollection = type === 'lobby' ? 'lobbies' : 'games';
  return collection(db, parentCollection, id, 'messages');
};

export const sendMessage = async (
  id: string,
  userId: string,
  userName: string,
  message: string,
  type: ChatCollection = 'game'
): Promise<void> => {
  const messagesRef = getMessagesRef(id, type);
  await addDoc(messagesRef, {
    userId,
    userName,
    message: message.trim(),
    timestamp: serverTimestamp()
  });
};

export const subscribeToMessages = (
  id: string,
  callback: (messages: ChatMessage[]) => void,
  type: ChatCollection = 'game',
  messageLimit: number = 100
): (() => void) => {
  const messagesRef = getMessagesRef(id, type);
  const messagesQuery = query(
    messagesRef,
    orderBy('timestamp', 'asc'),
    limit(messageLimit)
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      const timestamp = data.timestamp instanceof Timestamp 
        ? data.timestamp.toDate() 
        : data.timestamp?.toDate?.() ?? new Date();

      return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName || `User ${data.userId?.slice(0, 16) ?? 'Unknown'}`,
        message: data.message,
        timestamp
      } as ChatMessage;
    });

    callback(messages);
  });
};

