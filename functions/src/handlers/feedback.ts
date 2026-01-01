import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '../rateLimiter';

const db = admin.firestore();

const corsOrigins = ['https://playfish.io', 'http://localhost:5173', 'http://localhost:3000'];

interface SubmitFeedbackData {
  message: string;
}

export const submitFeedback = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { message } = request.data as SubmitFeedbackData;

  // Validate input
  if (!message || typeof message !== 'string') {
    throw new HttpsError('invalid-argument', 'message is required');
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    throw new HttpsError('invalid-argument', 'message cannot be empty');
  }
  if (trimmedMessage.length > 2000) {
    throw new HttpsError('invalid-argument', 'message is too long (max 2000 characters)');
  }

  // Check rate limit (1 per minute)
  await checkRateLimit(userId, 'feedback:submitFeedback');

  // Get IP address from request (x-forwarded-for is most reliable for Cloud Run)
  const forwardedFor = request.rawRequest?.headers?.['x-forwarded-for'];
  let ipAddress = 'unknown';
  if (typeof forwardedFor === 'string' && forwardedFor) {
    // x-forwarded-for can be comma-separated; first IP is the client
    ipAddress = forwardedFor.split(',')[0].trim();
  } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    ipAddress = forwardedFor[0].split(',')[0].trim();
  }

  // Get username for context
  const userDoc = await db.collection('users').doc(userId).get();
  const userName = userDoc.exists
    ? (userDoc.data()?.username || `User ${userId.slice(0, 16)}`)
    : `User ${userId.slice(0, 16)}`;

  // Add feedback document
  await db.collection('feedback').add({
    userId,
    userName,
    ipAddress,
    message: trimmedMessage,
    timestamp: FieldValue.serverTimestamp()
  });

  return { success: true };
});
