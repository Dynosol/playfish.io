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

export const GLOBAL_CHAT_ID = 'global';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

const getMessagesRef = (chatId: string) => {
  return collection(db, 'chats', chatId, 'messages');
};

export const sendMessage = async (
  chatId: string,
  userId: string,
  userName: string,
  message: string
): Promise<void> => {
  const messagesRef = getMessagesRef(chatId);
  await addDoc(messagesRef, {
    userId,
    userName,
    message: message.trim(),
    timestamp: serverTimestamp()
  });
};

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 100
): (() => void) => {
  const messagesRef = getMessagesRef(chatId);
  const messagesQuery = query(
    messagesRef,
    orderBy('timestamp', 'asc'),
    limit(messageLimit)
  );

  return onSnapshot(
    messagesQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data({ serverTimestamps: 'estimate' });
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
    }
  );
};
