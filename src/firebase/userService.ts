import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from './config';
import { generateUsername } from '../utils/usernameGenerator';

export interface UserDocument {
  uid: string;
  username: string;
  currentLobbyId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastOnline: Date;
}

const ONLINE_SENTINEL = Timestamp.fromMillis(0);

export const createOrUpdateUser = async (uid: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const existingData = userSnap.data();
    await setDoc(userRef, {
      updatedAt: serverTimestamp(),
      ...(existingData?.lastOnline === undefined ? { lastOnline: ONLINE_SENTINEL } : {})
    }, { merge: true });
  } else {
    const username = generateUsername();
    await setDoc(userRef, {
      uid,
      username,
      currentLobbyId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastOnline: ONLINE_SENTINEL
    });
  }
};

export const updateUserCurrentLobby = async (
  uid: string, 
  lobbyId: string | null
): Promise<void> => {
  console.log('Updating user currentLobbyId:', { uid, lobbyId });
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    currentLobbyId: lobbyId,
    updatedAt: serverTimestamp()
  }, { merge: true });
  console.log('Successfully updated user currentLobbyId');
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

export const getUser = async (uid: string): Promise<UserDocument | null> => {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists()) {
    return { ...userSnap.data() } as UserDocument;
  }
  return null;
};

export const updateUserLogoffTime = async (uid: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    lastOnline: serverTimestamp()
  }, { merge: true });
};

export const updateUsername = async (uid: string, username: string): Promise<void> => {
  if (!username || username.trim().length === 0) {
    throw new Error('Username cannot be empty');
  }
  if (username.trim().length > 50) {
    throw new Error('Username must be 50 characters or less');
  }
  
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    username: username.trim(),
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getOnlineUsers = async (onlineThresholdMinutes: number = 2): Promise<UserDocument[]> => {
  const thresholdTime = Timestamp.fromMillis(Date.now() - onlineThresholdMinutes * 60 * 1000);
  const usersQuery = query(
    collection(db, 'users'),
    where('lastOnline', '<', thresholdTime)
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
    where('lastOnline', '<', thresholdTime)
  );
  
  return onSnapshot(usersQuery, (snapshot) => {
    const usersList = snapshot.docs.map(doc => ({
      ...doc.data()
    } as UserDocument));
    
    callback(usersList);
  });
};

