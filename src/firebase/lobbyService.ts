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
    console.log('Received lobbies snapshot:', snapshot.docs.length, 'lobbies');
    const lobbiesList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lobby));
    console.log('Lobbies list:', lobbiesList);
    callback(lobbiesList);
  });
};

export const subscribeToLobby = (
  lobbyId: string,
  callback: (lobby: Lobby | null) => void
): (() => void) => {
  return onSnapshot(doc(db, 'lobbies', lobbyId), (docSnapshot) => {
    console.log('Received lobby snapshot for', lobbyId, ':', docSnapshot.exists());
    if (docSnapshot.exists()) {
      const lobbyData = { id: docSnapshot.id, ...docSnapshot.data() } as Lobby;
      console.log('Lobby data:', lobbyData);
      callback(lobbyData);
    } else {
      console.log('Lobby does not exist');
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
      const isHost = lobbyData.createdBy === userId;
      
      if (updatedPlayers.length === 0) {
        await moveLobbyToDeleted(doc.id, lobbyData);
      } else {
        const updateData: Partial<Lobby> = {
          players: arrayRemove(userId)
        };
        
        if (isHost && updatedPlayers.length > 0) {
          updateData.createdBy = updatedPlayers[0];
        }
        
        await updateDoc(doc.ref, updateData);
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
  console.log('joinLobby called for user:', userId, 'lobby:', lobbyId);
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) {
    throw new Error('Lobby not found');
  }
  
  const lobbyData = lobbySnap.data() as Lobby;
  
  if (lobbyData.players.includes(userId)) {
    console.log('User already in lobby, skipping join');
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
  console.log('User added to lobby players array');
  
  await updateUserCurrentLobby(userId, lobbyId);
  console.log('User currentLobbyId updated');
};

export const leaveLobby = async (lobbyId: string, userId: string): Promise<void> => {
  console.log('leaveLobby called for user:', userId, 'lobby:', lobbyId);
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (lobbySnap.exists()) {
    const lobbyData = lobbySnap.data() as Lobby;
    const updatedPlayers = lobbyData.players.filter(playerId => playerId !== userId);
    const isHost = lobbyData.createdBy === userId;
    
    if (updatedPlayers.length === 0) {
      await moveLobbyToDeleted(lobbyId, lobbyData);
    } else {
      const updateData: Partial<Lobby> = {
        players: arrayRemove(userId)
      };
      
      if (isHost && updatedPlayers.length > 0) {
        updateData.createdBy = updatedPlayers[0];
      }
      
      await updateDoc(lobbyRef, updateData);
    }
    console.log('User removed from lobby players array');
  }
  
  await updateUserCurrentLobby(userId, null);
  console.log('User currentLobbyId set to null');
};

export const startLobby = async (lobbyId: string): Promise<void> => {
  await updateDoc(doc(db, 'lobbies', lobbyId), {
    status: 'playing'
  });
};

