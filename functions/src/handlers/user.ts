import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '../rateLimiter';
import { generateUsername } from '../utils/usernameGenerator';
import { getRandomUserColor } from '../utils/userColors';

const db = admin.firestore();

export const createOrUpdateUser = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const uid = request.auth.uid;

  // Check rate limit
  await checkRateLimit(uid, 'user:createOrUpdateUser');

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const data = userSnap.data();
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      lastOnline: FieldValue.serverTimestamp()
    };
    // Migrate existing users without color
    if (!data?.color) {
      updates.color = getRandomUserColor();
    }
    await userRef.set(updates, { merge: true });
  } else {
    await userRef.set({
      uid,
      username: generateUsername(),
      color: getRandomUserColor(),
      currentLobbyId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastOnline: FieldValue.serverTimestamp()
    });
  }

  return { success: true };
});

interface UpdateUsernameData {
  username: string;
}

export const updateUsername = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const uid = request.auth.uid;
  const { username } = request.data as UpdateUsernameData;

  // Validate input
  if (!username || typeof username !== 'string') {
    throw new HttpsError('invalid-argument', 'username is required');
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length === 0) {
    throw new HttpsError('invalid-argument', 'Username cannot be empty');
  }
  if (trimmedUsername.length > 50) {
    throw new HttpsError('invalid-argument', 'Username must be 50 characters or less');
  }

  // Check rate limit
  await checkRateLimit(uid, 'user:updateUsername');

  const userRef = db.collection('users').doc(uid);
  await userRef.set({
    username: trimmedUsername,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true };
});

export const updateUserLastOnline = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const uid = request.auth.uid;

  // Check rate limit
  await checkRateLimit(uid, 'user:updateUserLastOnline');

  const userRef = db.collection('users').doc(uid);
  await userRef.set({
    lastOnline: FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true };
});

interface UpdateUserCurrentLobbyData {
  lobbyId: string | null;
}

export const updateUserCurrentLobby = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const uid = request.auth.uid;
  const { lobbyId } = request.data as UpdateUserCurrentLobbyData;

  // This is an internal function, no explicit rate limit but we can add if needed

  const userRef = db.collection('users').doc(uid);
  await userRef.set({
    currentLobbyId: lobbyId,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true };
});
