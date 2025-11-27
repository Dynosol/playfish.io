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

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

export const sendMessage = async (
  gameId: string,
  userId: string,
  userName: string,
  message: string
): Promise<void> => {
  const messagesRef = collection(db, 'games', gameId, 'messages');
  await addDoc(messagesRef, {
    userId,
    userName,
    message: message.trim(),
    timestamp: serverTimestamp()
  });
};

export const subscribeToMessages = (
  gameId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 100
): (() => void) => {
  const messagesRef = collection(db, 'games', gameId, 'messages');
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

