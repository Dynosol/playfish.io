import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc,
  deleteDoc,
  setDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from './config';
import { updateUserCurrentLobby } from './userService';
import { createGame } from './gameService';
import { generateLobbyId } from '../utils/lobbyIdGenerator';

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
  historicalScores: { 0: number; 1: number };
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

const leaveCurrentLobby = async (userId: string, excludeLobbyId?: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return;
  }
  
  const userData = userSnap.data();
  const currentLobbyId = userData?.currentLobbyId;
  
  if (!currentLobbyId || currentLobbyId === excludeLobbyId) {
    return;
  }
  
  const lobbyRef = doc(db, 'lobbies', currentLobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) {
    await updateUserCurrentLobby(userId, null);
    return;
  }
  
  const lobbyData = lobbySnap.data() as Lobby;
  const updatedPlayers = lobbyData.players.filter(playerId => playerId !== userId);
  const isHost = lobbyData.createdBy === userId;
  
  if (updatedPlayers.length === 0) {
    await moveLobbyToDeleted(currentLobbyId, lobbyData);
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
  
  await updateUserCurrentLobby(userId, null);
};

export const createLobby = async (lobbyData: CreateLobbyData): Promise<string> => {
  await leaveCurrentLobby(lobbyData.createdBy);

  // Generate a unique word-based lobby ID
  let lobbyId = generateLobbyId();
  let attempts = 0;
  const maxAttempts = 10;

  // Check for collisions and regenerate if necessary
  while (attempts < maxAttempts) {
    const existingDoc = await getDoc(doc(db, 'lobbies', lobbyId));
    if (!existingDoc.exists()) {
      break;
    }
    lobbyId = generateLobbyId();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique lobby ID');
  }

  const lobbyRef = doc(db, 'lobbies', lobbyId);
  await setDoc(lobbyRef, {
    ...lobbyData,
    players: [lobbyData.createdBy],
    teams: { [lobbyData.createdBy]: null },
    status: 'waiting',
    onGoingGame: null,
    historicalScores: { 0: 0, 1: 0 },
    createdAt: serverTimestamp()
  });

  await updateUserCurrentLobby(lobbyData.createdBy, lobbyId);

  return lobbyId;
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
  
  await leaveCurrentLobby(userId, lobbyId);
  
  const updatedTeams = { ...lobbyData.teams, [userId]: null };
  
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
  
  await runTransaction(db, async (transaction) => {
    const lobbySnap = await transaction.get(lobbyRef);
    
    if (!lobbySnap.exists()) throw new Error('Lobby not found');
    
    const lobbyData = lobbySnap.data() as Lobby;
    
    if (!lobbyData.players.includes(userId)) throw new Error('User is not in this lobby');
    if (lobbyData.status !== 'waiting') throw new Error('Lobby is not accepting team changes');
    
    transaction.update(lobbyRef, {
      teams: { ...lobbyData.teams, [userId]: team }
    });
  });
};

export const swapPlayerTeam = async (lobbyId: string, playerId: string): Promise<void> => {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  
  await runTransaction(db, async (transaction) => {
    const lobbySnap = await transaction.get(lobbyRef);
    
    if (!lobbySnap.exists()) throw new Error('Lobby not found');
    
    const lobbyData = lobbySnap.data() as Lobby;
    
    if (lobbyData.status !== 'waiting') throw new Error('Lobby is not accepting team changes');
    
    const currentTeam = lobbyData.teams[playerId];
    if (currentTeam === null) throw new Error('Player must be assigned to a team before swapping');
    
    transaction.update(lobbyRef, {
      teams: { ...lobbyData.teams, [playerId]: currentTeam === 0 ? 1 : 0 }
    });
  });
};

export const areTeamsEven = (lobby: Lobby): boolean => {
  let team0Count = 0;
  let team1Count = 0;
  
  for (const playerId of lobby.players) {
    const team = lobby.teams[playerId];
    if (team === 0) {
      team0Count++;
    } else if (team === 1) {
      team1Count++;
    }
  }
  
  return team0Count === team1Count && team0Count > 0;
};

export const randomizeTeams = async (lobbyId: string, _playerId: string): Promise<void> => { 
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  
  await runTransaction(db, async (transaction) => {
    const lobbySnap = await transaction.get(lobbyRef);
    
    if (!lobbySnap.exists()) throw new Error('Lobby not found');
    
    const lobbyData = lobbySnap.data() as Lobby;
    
    if (lobbyData.status !== 'waiting') throw new Error('Lobby is not accepting team changes');

    const shuffledPlayers = [...lobbyData.players];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }

    const newTeams: { [playerId: string]: 0 | 1 | null } = {};
    const teamSize = Math.ceil(shuffledPlayers.length / 2);

    shuffledPlayers.forEach((player, i) => {
      newTeams[player] = i < teamSize ? 0 : 1;
    });

    transaction.update(lobbyRef, { teams: newTeams });
  });
}

const startGameFromLobby = async (lobbyId: string): Promise<void> => {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) throw new Error('Lobby not found');
  
  const lobbyData = lobbySnap.data() as Lobby;
  
  if (!areTeamsEven(lobbyData)) throw new Error('Teams must be even to start the game');
  
  const teamAssignments: { [playerId: string]: 0 | 1 } = {};
  for (const playerId of lobbyData.players) {
    const team = lobbyData.teams[playerId];
    if (team === null) throw new Error('All players must be assigned to a team');
    teamAssignments[playerId] = team;
  }
  
  const gameDocId = await createGame(lobbyId, lobbyData.players, teamAssignments);
  
  await updateDoc(lobbyRef, {
    status: 'playing',
    onGoingGame: gameDocId,
    historicalScores: lobbyData.historicalScores || { 0: 0, 1: 0 }
  });
};

export const startLobby = startGameFromLobby;

export const returnToLobby = async (lobbyId: string): Promise<void> => {
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  
  await runTransaction(db, async (transaction) => {
    const lobbySnap = await transaction.get(lobbyRef);
    if (!lobbySnap.exists()) throw new Error('Lobby not found');
    
    transaction.update(lobbyRef, { status: 'waiting', onGoingGame: null });
  });
};

export const replayGame = startGameFromLobby;

