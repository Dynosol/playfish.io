import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from './config';
import { updateUserCurrentLobby } from './userService';

export interface Lobby {
  id: string;
  name: string;
  players: string[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: Date;
}

export interface CreateLobbyData {
  name: string;
  createdBy: string;
  maxPlayers: number;
}

export const subscribeToActiveLobbies = (
  callback: (lobbies: Lobby[]) => void
): (() => void) => {
  const lobbiesQuery = query(
    collection(db, 'lobbies'),
    where('status', 'in', ['waiting', 'playing'])
  );

  return onSnapshot(lobbiesQuery, (snapshot) => {
    const lobbiesList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lobby));
    callback(lobbiesList);
  });
};

export const subscribeToLobby = (
  lobbyId: string,
  callback: (lobby: Lobby | null) => void
): (() => void) => {
  return onSnapshot(doc(db, 'lobbies', lobbyId), (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback({ id: docSnapshot.id, ...docSnapshot.data() } as Lobby);
    } else {
      callback(null);
    }
  });
};

const moveLobbyToDeleted = async (lobbyId: string, lobbyData: Lobby): Promise<void> => {
  const deletedLobbyRef = doc(db, 'deletedLobbies', lobbyId);
  await setDoc(deletedLobbyRef, {
    ...lobbyData,
    deletedAt: serverTimestamp()
  });
  await deleteDoc(doc(db, 'lobbies', lobbyId));
};

const leaveAllOtherLobbies = async (userId: string, excludeLobbyId?: string): Promise<void> => {
  const lobbiesQuery = query(
    collection(db, 'lobbies'),
    where('players', 'array-contains', userId)
  );
  
  const snapshot = await getDocs(lobbiesQuery);
  const updatePromises = snapshot.docs
    .filter(doc => doc.id !== excludeLobbyId)
    .map(async (doc) => {
      const lobbyData = doc.data() as Lobby;
      const updatedPlayers = lobbyData.players.filter(playerId => playerId !== userId);
      
      if (updatedPlayers.length === 0) {
        await moveLobbyToDeleted(doc.id, lobbyData);
      } else {
        await updateDoc(doc.ref, {
          players: arrayRemove(userId)
        });
      }
    });
  
  await Promise.all(updatePromises);
};

export const createLobby = async (lobbyData: CreateLobbyData): Promise<string> => {
  await leaveAllOtherLobbies(lobbyData.createdBy);
  
  const docRef = await addDoc(collection(db, 'lobbies'), {
    ...lobbyData,
    players: [lobbyData.createdBy],
    status: 'waiting',
    createdAt: serverTimestamp()
  });
  
  await updateUserCurrentLobby(lobbyData.createdBy, docRef.id);
  
  return docRef.id;
};

export const joinLobby = async (lobbyId: string, userId: string): Promise<void> => {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) {
    throw new Error('Lobby not found');
  }
  
  const lobbyData = lobbySnap.data() as Lobby;
  
  if (lobbyData.players.includes(userId)) {
    return;
  }
  
  if (lobbyData.players.length >= lobbyData.maxPlayers) {
    throw new Error('Lobby is full');
  }
  
  if (lobbyData.status !== 'waiting') {
    throw new Error('Lobby is not accepting new players');
  }
  
  await leaveAllOtherLobbies(userId, lobbyId);
  
  await updateDoc(lobbyRef, {
    players: arrayUnion(userId)
  });
  
  await updateUserCurrentLobby(userId, lobbyId);
};

export const leaveLobby = async (lobbyId: string, userId: string): Promise<void> => {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) {
    return;
  }
  
  const lobbyData = lobbySnap.data() as Lobby;
  const updatedPlayers = lobbyData.players.filter(playerId => playerId !== userId);
  
  if (updatedPlayers.length === 0) {
    await moveLobbyToDeleted(lobbyId, lobbyData);
  } else {
    await updateDoc(lobbyRef, {
      players: arrayRemove(userId)
    });
  }
  
  await updateUserCurrentLobby(userId, null);
};

export const startLobby = async (lobbyId: string): Promise<void> => {
  await updateDoc(doc(db, 'lobbies', lobbyId), {
    status: 'playing'
  });
};

