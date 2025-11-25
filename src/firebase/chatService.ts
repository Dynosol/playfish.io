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
  gameId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  createdAt: Date;
}

export const sendMessage = async (
  gameId: string,
  userId: string,
  userName: string,
  message: string
): Promise<void> => {
  const messagesRef = collection(db, 'games', gameId, 'messages');
  await addDoc(messagesRef, {
    gameId,
    userId,
    userName,
    message: message.trim(),
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp()
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
      let timestamp: Date;
      let createdAt: Date;

      if (data.timestamp instanceof Timestamp) {
        timestamp = data.timestamp.toDate();
      } else if (data.timestamp?.toDate) {
        timestamp = data.timestamp.toDate();
      } else {
        timestamp = new Date();
      }

      if (data.createdAt instanceof Timestamp) {
        createdAt = data.createdAt.toDate();
      } else if (data.createdAt?.toDate) {
        createdAt = data.createdAt.toDate();
      } else {
        createdAt = new Date();
      }

      return {
        id: doc.id,
        gameId: data.gameId,
        userId: data.userId,
        userName: data.userName || `User ${data.userId.slice(0, 16)}`,
        message: data.message,
        timestamp,
        createdAt
      } as ChatMessage;
    });

    callback(messages);
  });
};

