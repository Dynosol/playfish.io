import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '../rateLimiter';

const db = admin.firestore();

const corsOrigins = ['https://playfish.io', 'http://localhost:5173', 'http://localhost:3000'];

interface SendMessageData {
  chatId: string;
  message: string;
}

export const sendMessage = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { chatId, message } = request.data as SendMessageData;

  // Validate input
  if (!chatId || typeof chatId !== 'string') {
    throw new HttpsError('invalid-argument', 'chatId is required');
  }
  if (!message || typeof message !== 'string') {
    throw new HttpsError('invalid-argument', 'message is required');
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    throw new HttpsError('invalid-argument', 'message cannot be empty');
  }
  if (trimmedMessage.length > 500) {
    throw new HttpsError('invalid-argument', 'message is too long (max 500 characters)');
  }

  // Check rate limit
  await checkRateLimit(userId, 'chat:sendMessage');

  // Get user's display name
  const userDoc = await db.collection('users').doc(userId).get();
  const userName = userDoc.exists
    ? (userDoc.data()?.username || `User ${userId.slice(0, 16)}`)
    : `User ${userId.slice(0, 16)}`;

  // Add message
  const messagesRef = db.collection('chats').doc(chatId).collection('messages');
  await messagesRef.add({
    userId,
    userName,
    message: trimmedMessage,
    timestamp: FieldValue.serverTimestamp()
  });

  return { success: true };
});
