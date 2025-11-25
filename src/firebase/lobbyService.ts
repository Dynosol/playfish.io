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
import { createGame } from './gameService';

export interface Lobby {
  id: string;
  name: string;
  players: string[];
  teams: { [playerId: string]: 0 | 1 | null };
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: Date;
  onGoingGame: string | null;
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
        const updatedTeams = { ...lobbyData.teams };
        delete updatedTeams[userId];
        
        const updateData = {
          players: arrayRemove(userId),
          teams: updatedTeams,
          ...(isHost && updatedPlayers.length > 0 ? { createdBy: updatedPlayers[0] } : {})
        };
        
        await updateDoc(doc.ref, updateData as never);
      }
    });
  
  await Promise.all(updatePromises);
};

export const createLobby = async (lobbyData: CreateLobbyData): Promise<string> => {
  await leaveAllOtherLobbies(lobbyData.createdBy);
  
  const docRef = await addDoc(collection(db, 'lobbies'), {
    ...lobbyData,
    players: [lobbyData.createdBy],
    teams: { [lobbyData.createdBy]: null },
    status: 'waiting',
    onGoingGame: null,
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
  
  const lobbyDoc = await getDoc(lobbyRef);
  const currentLobbyData = lobbyDoc.data() as Lobby;
  const updatedTeams = { ...currentLobbyData.teams, [userId]: null };
  
  await updateDoc(lobbyRef, {
    players: arrayUnion(userId),
    teams: updatedTeams
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
      const updatedTeams = { ...lobbyData.teams };
      delete updatedTeams[userId];
      
      const updateData = {
        players: arrayRemove(userId),
        teams: updatedTeams,
        ...(isHost && updatedPlayers.length > 0 ? { createdBy: updatedPlayers[0] } : {})
      };
      
      await updateDoc(lobbyRef, updateData as never);
    }
    console.log('User removed from lobby players array');
  }
  
  await updateUserCurrentLobby(userId, null);
  console.log('User currentLobbyId set to null');
};

export const joinTeam = async (lobbyId: string, userId: string, team: 0 | 1): Promise<void> => {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) {
    throw new Error('Lobby not found');
  }
  
  const lobbyData = lobbySnap.data() as Lobby;
  
  if (!lobbyData.players.includes(userId)) {
    throw new Error('User is not in this lobby');
  }
  
  if (lobbyData.status !== 'waiting') {
    throw new Error('Lobby is not accepting team changes');
  }
  
  const updatedTeams = { ...lobbyData.teams, [userId]: team };
  
  await updateDoc(lobbyRef, {
    teams: updatedTeams
  });
};

export const swapPlayerTeam = async (lobbyId: string, playerId: string): Promise<void> => {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) {
    throw new Error('Lobby not found');
  }
  
  const lobbyData = lobbySnap.data() as Lobby;
  
  if (lobbyData.status !== 'waiting') {
    throw new Error('Lobby is not accepting team changes');
  }
  
  const currentTeam = lobbyData.teams[playerId];
  if (currentTeam === null) {
    throw new Error('Player must be assigned to a team before swapping');
  }
  
  const newTeam = currentTeam === 0 ? 1 : 0;
  
  const updatedTeams = { ...lobbyData.teams, [playerId]: newTeam };
  
  await updateDoc(lobbyRef, {
    teams: updatedTeams
  });
};

export const areTeamsEven = (lobby: Lobby): boolean => {
  const team0Count = lobby.players.filter(playerId => lobby.teams[playerId] === 0).length;
  const team1Count = lobby.players.filter(playerId => lobby.teams[playerId] === 1).length;
  return team0Count === team1Count && team0Count > 0;
};

export const randomizeTeams = async (lobbyId: string, playerId: string): Promise<void> => { 
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) {
    throw new Error('Lobby not found');
  }
  
  const lobbyData = lobbySnap.data() as Lobby;
  
  if (lobbyData.status !== 'waiting') {
    throw new Error('Lobby is not accepting team changes');
  }

  const playerList = lobbyData.players;

  const shuffledPlayers = [...playerList];
  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
  }

  const newTeams: { [playerId: string]: 0 | 1 | null } = {};
  const playerCount = shuffledPlayers.length;
  const teamSize = Math.ceil(playerCount / 2);

  for (let i = 0; i < playerCount; i++) {
    const player = shuffledPlayers[i];
    const team = i < teamSize ? 0 : 1;
    newTeams[player] = team;
  }

  await updateDoc(lobbyRef, {
    teams: newTeams
  });
}

export const startLobby = async (lobbyId: string): Promise<void> => {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) {
    throw new Error('Lobby not found');
  }
  
  const lobbyData = lobbySnap.data() as Lobby;
  
  if (!areTeamsEven(lobbyData)) {
    throw new Error('Teams must be even to start the game');
  }
  
  const teamAssignments: { [playerId: string]: 0 | 1 } = {};
  for (const playerId of lobbyData.players) {
    const team = lobbyData.teams[playerId];
    if (team === null) {
      throw new Error('All players must be assigned to a team');
    }
    teamAssignments[playerId] = team;
  }
  
  const gameDocId = await createGame(lobbyId, lobbyData.players, teamAssignments);
  
  await updateDoc(lobbyRef, {
    status: 'playing',
    onGoingGame: gameDocId
  });
};

