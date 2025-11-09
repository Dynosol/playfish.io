import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

export interface UserDocument {
  uid: string;
  currentLobbyId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createOrUpdateUser = async (uid: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    await setDoc(userRef, {
      updatedAt: serverTimestamp()
    }, { merge: true });
  } else {
    await setDoc(userRef, {
      uid,
      currentLobbyId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
};

export const updateUserCurrentLobby = async (
  uid: string, 
  lobbyId: string | null
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    currentLobbyId: lobbyId,
    updatedAt: serverTimestamp()
  }, { merge: true });
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

