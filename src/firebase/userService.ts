import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  Timestamp,
  getDocs,
  documentId
} from 'firebase/firestore';
import { db } from './config';
import {
  callCreateOrUpdateUser,
  callUpdateUsername,
  callUpdateUserLastOnline,
  callUpdateUserCurrentLobby
} from './functionsClient';
import { type UserColorName } from '../utils/userColors';

export interface UserDocument {
  uid: string;
  username: string;
  color: UserColorName;
  currentLobbyId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastOnline: Date;
}

export const createOrUpdateUser = async (_uid: string): Promise<void> => {
  // uid is now derived server-side from auth
  await callCreateOrUpdateUser({});
};

export const updateUserCurrentLobby = async (
  _uid: string,
  lobbyId: string | null
): Promise<void> => {
  // uid is now derived server-side from auth
  await callUpdateUserCurrentLobby({ lobbyId });
};

export const subscribeToUser = (
  uid: string,
  callback: (user: UserDocument | null) => void
): (() => void) => {
  return onSnapshot(doc(db, 'users', uid), (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback({ ...docSnapshot.data() } as UserDocument);
    } else {
      callback(null);
    }
  });
};

export const subscribeToUsers = (
  uids: string[],
  callback: (users: UserDocument[]) => void
): (() => void) => {
  if (uids.length === 0) {
    callback([]);
    return () => {};
  }

  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += 30) {
    chunks.push(uids.slice(i, i + 30));
  }

  const results = new Map<string, UserDocument>();
  const unsubscribes: (() => void)[] = [];

  chunks.forEach((chunk) => {
    const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(d => {
        results.set(d.id, { uid: d.id, ...d.data() } as UserDocument);
      });
      callback(Array.from(results.values()));
    });
    unsubscribes.push(unsub);
  });

  return () => unsubscribes.forEach(u => u());
};

export const getUser = async (uid: string): Promise<UserDocument | null> => {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists()) {
    return { ...userSnap.data() } as UserDocument;
  }
  return null;
};

export const updateUserLastOnline = async (_uid: string): Promise<void> => {
  // uid is now derived server-side from auth
  await callUpdateUserLastOnline({});
};

export const updateUserLogoffTime = updateUserLastOnline;

export const updateUsername = async (_uid: string, username: string): Promise<void> => {
  // Validation is now done server-side
  // uid is now derived server-side from auth
  await callUpdateUsername({ username });
};

export const getOnlineUsers = async (onlineThresholdMinutes: number = 2): Promise<UserDocument[]> => {
  const thresholdTime = Timestamp.fromMillis(Date.now() - onlineThresholdMinutes * 60 * 1000);
  const usersQuery = query(
    collection(db, 'users'),
    where('lastOnline', '>=', thresholdTime)
  );
  
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map(doc => ({
    ...doc.data()
  } as UserDocument));
};

export const subscribeToOnlineUsers = (
  callback: (users: UserDocument[]) => void,
  onlineThresholdMinutes: number = 2
): (() => void) => {
  const thresholdTime = Timestamp.fromMillis(Date.now() - onlineThresholdMinutes * 60 * 1000);
  const usersQuery = query(
    collection(db, 'users'),
    where('lastOnline', '>=', thresholdTime)
  );
  
  return onSnapshot(usersQuery, (snapshot) => {
    const usersList = snapshot.docs.map(doc => ({
      ...doc.data()
    } as UserDocument));
    
    callback(usersList);
  });
};

