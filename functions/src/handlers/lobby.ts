import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '../rateLimiter';
import { createGame, archiveCompletedGameFromLobby } from './game';
import { generateUsername } from '../utils/usernameGenerator';
import { getRandomUserColor } from '../utils/userColors';

const db = admin.firestore();

const corsOrigins = ['https://playfish.io', 'http://localhost:5173', 'http://localhost:3000'];

// Validation constants
export const MAX_LOBBY_NAME_LENGTH = 30;

interface Lobby {
  id: string;
  uuid: string;
  name: string;
  players: string[];
  teams: { [playerId: string]: 0 | 1 | null };
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: Date;
  onGoingGame: string | null;
  historicalScores: { 0: number; 1: number };
  lastActivityAt?: number;
  stale?: boolean;
}

// Word lists for lobby ID generation
const adjectives = ['red', 'blue', 'green', 'gold', 'swift', 'calm', 'bold', 'wise'];
const nouns = ['fox', 'owl', 'wolf', 'bear', 'hawk', 'deer', 'lion', 'eagle'];

const generateLobbyId = (): string => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${noun}-${num}`;
};

const updateUserCurrentLobby = async (uid: string, lobbyId: string | null): Promise<void> => {
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  // If user document doesn't exist or is missing username, create a proper one
  if (!userSnap.exists || !userSnap.data()?.username) {
    await userRef.set({
      uid,
      username: generateUsername(),
      color: getRandomUserColor(),
      currentLobbyId: lobbyId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastOnline: FieldValue.serverTimestamp()
    }, { merge: true });
  } else {
    await userRef.set({
      currentLobbyId: lobbyId,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }
};

const moveLobbyToDeleted = async (lobbyId: string, lobbyData: Lobby): Promise<void> => {
  const deletedLobbyRef = db.collection('deletedLobbies').doc(lobbyId);
  await deletedLobbyRef.set({
    ...lobbyData,
    deletedAt: FieldValue.serverTimestamp()
  });
  await db.collection('lobbies').doc(lobbyId).delete();
};

const leaveCurrentLobby = async (userId: string, excludeLobbyId?: string): Promise<void> => {
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) return;

  const userData = userSnap.data();
  const currentLobbyId = userData?.currentLobbyId;

  if (!currentLobbyId || currentLobbyId === excludeLobbyId) return;

  const lobbyRef = db.collection('lobbies').doc(currentLobbyId);
  const lobbySnap = await lobbyRef.get();

  if (!lobbySnap.exists) {
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

    const updateData: Record<string, unknown> = {
      players: FieldValue.arrayRemove(userId),
      teams: updatedTeams
    };

    if (isHost && updatedPlayers.length > 0) {
      updateData.createdBy = updatedPlayers[0];
    }

    await lobbyRef.update(updateData);
  }

  await updateUserCurrentLobby(userId, null);
};

const areTeamsEven = (lobby: Lobby): boolean => {
  let team0Count = 0;
  let team1Count = 0;

  for (const playerId of lobby.players) {
    const team = lobby.teams[playerId];
    if (team === 0) team0Count++;
    else if (team === 1) team1Count++;
  }

  const totalAssigned = team0Count + team1Count;
  return team0Count === team1Count && team0Count > 0 && totalAssigned === lobby.players.length;
};

interface CreateLobbyData {
  name: string;
  maxPlayers: number;
}

export const createLobby = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { name, maxPlayers } = request.data as CreateLobbyData;

  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Lobby name is required');
  }
  if (name.trim().length > MAX_LOBBY_NAME_LENGTH) {
    throw new HttpsError('invalid-argument', `Lobby name must be ${MAX_LOBBY_NAME_LENGTH} characters or less`);
  }
  if (!maxPlayers || typeof maxPlayers !== 'number' || maxPlayers < 2 || maxPlayers > 6) {
    throw new HttpsError('invalid-argument', 'maxPlayers must be between 2 and 6');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:createLobby');

  // Leave any current lobby
  await leaveCurrentLobby(userId);

  // Generate unique lobby ID
  let lobbyId = generateLobbyId();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existingDoc = await db.collection('lobbies').doc(lobbyId).get();
    if (!existingDoc.exists) break;
    lobbyId = generateLobbyId();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new HttpsError('internal', 'Failed to generate unique lobby ID');
  }

  const uuid = require('crypto').randomUUID();

  const lobbyRef = db.collection('lobbies').doc(lobbyId);
  await lobbyRef.set({
    name: name.trim(),
    createdBy: userId,
    maxPlayers,
    uuid,
    players: [userId],
    teams: { [userId]: null },
    status: 'waiting',
    onGoingGame: null,
    historicalScores: { 0: 0, 1: 0 },
    createdAt: FieldValue.serverTimestamp(),
    lastActivityAt: Date.now(),
    stale: false
  });

  await updateUserCurrentLobby(userId, lobbyId);

  return { success: true, lobbyId };
});

interface JoinLobbyData {
  lobbyId: string;
}

export const joinLobby = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { lobbyId } = request.data as JoinLobbyData;

  if (!lobbyId || typeof lobbyId !== 'string') {
    throw new HttpsError('invalid-argument', 'lobbyId is required');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:joinLobby');

  const lobbyRef = db.collection('lobbies').doc(lobbyId);
  const lobbySnap = await lobbyRef.get();

  if (!lobbySnap.exists) {
    throw new HttpsError('not-found', 'Lobby not found');
  }

  const lobbyData = lobbySnap.data() as Lobby;

  if (lobbyData.players.includes(userId)) {
    return { success: true }; // Already in lobby
  }

  if (lobbyData.players.length >= lobbyData.maxPlayers) {
    throw new HttpsError('failed-precondition', 'Lobby is full');
  }

  if (lobbyData.status !== 'waiting') {
    throw new HttpsError('failed-precondition', 'Lobby is not accepting new players');
  }

  await leaveCurrentLobby(userId, lobbyId);

  const updatedTeams = { ...lobbyData.teams, [userId]: null };

  await lobbyRef.update({
    players: FieldValue.arrayUnion(userId),
    teams: updatedTeams,
    lastActivityAt: Date.now(),
    stale: false
  });

  await updateUserCurrentLobby(userId, lobbyId);

  return { success: true };
});

interface LeaveLobbyData {
  lobbyId: string;
}

export const leaveLobby = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { lobbyId } = request.data as LeaveLobbyData;

  if (!lobbyId || typeof lobbyId !== 'string') {
    throw new HttpsError('invalid-argument', 'lobbyId is required');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:leaveLobby');

  const lobbyRef = db.collection('lobbies').doc(lobbyId);
  const lobbySnap = await lobbyRef.get();

  if (lobbySnap.exists) {
    const lobbyData = lobbySnap.data() as Lobby;
    const updatedPlayers = lobbyData.players.filter(playerId => playerId !== userId);
    const isHost = lobbyData.createdBy === userId;

    if (updatedPlayers.length === 0) {
      await moveLobbyToDeleted(lobbyId, lobbyData);
    } else {
      const updatedTeams = { ...lobbyData.teams };
      delete updatedTeams[userId];

      const updateData: Record<string, unknown> = {
        players: FieldValue.arrayRemove(userId),
        teams: updatedTeams,
        lastActivityAt: Date.now(),
        stale: false
      };

      if (isHost && updatedPlayers.length > 0) {
        updateData.createdBy = updatedPlayers[0];
      }

      await lobbyRef.update(updateData);
    }
  }

  await updateUserCurrentLobby(userId, null);

  return { success: true };
});

interface DeleteLobbyData {
  lobbyId: string;
}

export const deleteLobby = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { lobbyId } = request.data as DeleteLobbyData;

  if (!lobbyId || typeof lobbyId !== 'string') {
    throw new HttpsError('invalid-argument', 'lobbyId is required');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:deleteLobby');

  const lobbyRef = db.collection('lobbies').doc(lobbyId);
  const lobbySnap = await lobbyRef.get();

  if (!lobbySnap.exists) {
    throw new HttpsError('not-found', 'Lobby not found');
  }

  const lobbyData = lobbySnap.data() as Lobby;

  if (lobbyData.createdBy !== userId) {
    throw new HttpsError('permission-denied', 'Only the host can delete the lobby');
  }

  // Clear currentLobbyId for all players
  for (const playerId of lobbyData.players) {
    await updateUserCurrentLobby(playerId, null);
  }

  await moveLobbyToDeleted(lobbyId, lobbyData);

  return { success: true };
});

interface JoinTeamData {
  lobbyId: string;
  team: 0 | 1;
}

export const joinTeam = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { lobbyId, team } = request.data as JoinTeamData;

  if (!lobbyId || typeof lobbyId !== 'string') {
    throw new HttpsError('invalid-argument', 'lobbyId is required');
  }
  if (team !== 0 && team !== 1) {
    throw new HttpsError('invalid-argument', 'team must be 0 or 1');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:joinTeam');

  const lobbyRef = db.collection('lobbies').doc(lobbyId);

  await db.runTransaction(async (transaction) => {
    const lobbySnap = await transaction.get(lobbyRef);

    if (!lobbySnap.exists) {
      throw new HttpsError('not-found', 'Lobby not found');
    }

    const lobbyData = lobbySnap.data() as Lobby;

    if (!lobbyData.players.includes(userId)) {
      throw new HttpsError('permission-denied', 'User is not in this lobby');
    }
    if (lobbyData.status !== 'waiting') {
      throw new HttpsError('failed-precondition', 'Lobby is not accepting team changes');
    }

    transaction.update(lobbyRef, {
      teams: { ...lobbyData.teams, [userId]: team },
      lastActivityAt: Date.now(),
      stale: false
    });
  });

  return { success: true };
});

interface LeaveTeamData {
  lobbyId: string;
}

export const leaveTeam = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { lobbyId } = request.data as LeaveTeamData;

  if (!lobbyId || typeof lobbyId !== 'string') {
    throw new HttpsError('invalid-argument', 'lobbyId is required');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:leaveTeam');

  const lobbyRef = db.collection('lobbies').doc(lobbyId);

  await db.runTransaction(async (transaction) => {
    const lobbySnap = await transaction.get(lobbyRef);

    if (!lobbySnap.exists) {
      throw new HttpsError('not-found', 'Lobby not found');
    }

    const lobbyData = lobbySnap.data() as Lobby;

    if (!lobbyData.players.includes(userId)) {
      throw new HttpsError('permission-denied', 'User is not in this lobby');
    }
    if (lobbyData.status !== 'waiting') {
      throw new HttpsError('failed-precondition', 'Lobby is not accepting team changes');
    }

    transaction.update(lobbyRef, {
      teams: { ...lobbyData.teams, [userId]: null },
      lastActivityAt: Date.now(),
      stale: false
    });
  });

  return { success: true };
});

interface SwapPlayerTeamData {
  lobbyId: string;
  playerId: string;
}

export const swapPlayerTeam = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { lobbyId, playerId } = request.data as SwapPlayerTeamData;

  if (!lobbyId || typeof lobbyId !== 'string') {
    throw new HttpsError('invalid-argument', 'lobbyId is required');
  }
  if (!playerId || typeof playerId !== 'string') {
    throw new HttpsError('invalid-argument', 'playerId is required');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:swapPlayerTeam');

  const lobbyRef = db.collection('lobbies').doc(lobbyId);

  await db.runTransaction(async (transaction) => {
    const lobbySnap = await transaction.get(lobbyRef);

    if (!lobbySnap.exists) {
      throw new HttpsError('not-found', 'Lobby not found');
    }

    const lobbyData = lobbySnap.data() as Lobby;

    // Only host can swap other players
    if (lobbyData.createdBy !== userId && playerId !== userId) {
      throw new HttpsError('permission-denied', 'Only the host can swap other players');
    }

    if (lobbyData.status !== 'waiting') {
      throw new HttpsError('failed-precondition', 'Lobby is not accepting team changes');
    }

    const currentTeam = lobbyData.teams[playerId];
    if (currentTeam === null || currentTeam === undefined) {
      throw new HttpsError('failed-precondition', 'Player must be assigned to a team before swapping');
    }

    transaction.update(lobbyRef, {
      teams: { ...lobbyData.teams, [playerId]: currentTeam === 0 ? 1 : 0 },
      lastActivityAt: Date.now(),
      stale: false
    });
  });

  return { success: true };
});

interface RandomizeTeamsData {
  lobbyId: string;
}

export const randomizeTeams = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { lobbyId } = request.data as RandomizeTeamsData;

  if (!lobbyId || typeof lobbyId !== 'string') {
    throw new HttpsError('invalid-argument', 'lobbyId is required');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:randomizeTeams');

  const lobbyRef = db.collection('lobbies').doc(lobbyId);

  await db.runTransaction(async (transaction) => {
    const lobbySnap = await transaction.get(lobbyRef);

    if (!lobbySnap.exists) {
      throw new HttpsError('not-found', 'Lobby not found');
    }

    const lobbyData = lobbySnap.data() as Lobby;

    // Only host can randomize
    if (lobbyData.createdBy !== userId) {
      throw new HttpsError('permission-denied', 'Only the host can randomize teams');
    }

    if (lobbyData.status !== 'waiting') {
      throw new HttpsError('failed-precondition', 'Lobby is not accepting team changes');
    }

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

    transaction.update(lobbyRef, {
      teams: newTeams,
      lastActivityAt: Date.now(),
      stale: false
    });
  });

  return { success: true };
});

interface StartLobbyData {
  lobbyId: string;
}

export const startLobby = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { lobbyId } = request.data as StartLobbyData;

  if (!lobbyId || typeof lobbyId !== 'string') {
    throw new HttpsError('invalid-argument', 'lobbyId is required');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:startLobby');

  const lobbyRef = db.collection('lobbies').doc(lobbyId);
  const lobbySnap = await lobbyRef.get();

  if (!lobbySnap.exists) {
    throw new HttpsError('not-found', 'Lobby not found');
  }

  const lobbyData = lobbySnap.data() as Lobby;

  // Only host can start
  if (lobbyData.createdBy !== userId) {
    throw new HttpsError('permission-denied', 'Only the host can start the game');
  }

  if (!areTeamsEven(lobbyData)) {
    throw new HttpsError('failed-precondition', 'Teams must be even to start the game');
  }

  const teamAssignments: { [playerId: string]: 0 | 1 } = {};
  for (const playerId of lobbyData.players) {
    const team = lobbyData.teams[playerId];
    if (team === null) {
      throw new HttpsError('failed-precondition', 'All players must be assigned to a team');
    }
    teamAssignments[playerId] = team;
  }

  const gameDocId = await createGame(lobbyId, lobbyData.players, teamAssignments, lobbyData.uuid || lobbyId);

  await lobbyRef.update({
    status: 'playing',
    onGoingGame: gameDocId,
    historicalScores: lobbyData.historicalScores || { 0: 0, 1: 0 },
    lastActivityAt: Date.now(),
    stale: false
  });

  return { success: true, gameDocId };
});

interface ReturnToLobbyData {
  lobbyId: string;
}

export const returnToLobby = onCall({ cors: corsOrigins }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { lobbyId } = request.data as ReturnToLobbyData;

  if (!lobbyId || typeof lobbyId !== 'string') {
    throw new HttpsError('invalid-argument', 'lobbyId is required');
  }

  // Check rate limit
  await checkRateLimit(userId, 'lobby:returnToLobby');

  const lobbyRef = db.collection('lobbies').doc(lobbyId);

  const gameDocId = await db.runTransaction(async (transaction) => {
    const lobbySnap = await transaction.get(lobbyRef);
    if (!lobbySnap.exists) {
      throw new HttpsError('not-found', 'Lobby not found');
    }

    const lobbyData = lobbySnap.data() as Lobby;

    // Only allow players in the lobby or the host to return
    if (!lobbyData.players.includes(userId)) {
      throw new HttpsError('permission-denied', 'You are not in this lobby');
    }

    const onGoingGame = lobbyData.onGoingGame;

    transaction.update(lobbyRef, {
      status: 'waiting',
      onGoingGame: null,
      lastActivityAt: Date.now(),
      stale: false
    });

    return onGoingGame;
  });

  // Archive the completed game if one exists
  if (gameDocId) {
    await archiveCompletedGameFromLobby(gameDocId);
  }

  return { success: true };
});

// Scheduled function to check for stale lobbies
// Runs every 5 minutes to mark lobbies as stale if inactive for 30 minutes
const LOBBY_STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export const checkInactiveLobbies = onSchedule('every 5 minutes', async () => {
  const now = Date.now();
  const staleThreshold = now - LOBBY_STALE_THRESHOLD_MS;

  // Find waiting lobbies that haven't been marked stale yet
  const lobbiesSnapshot = await db.collection('lobbies')
    .where('status', '==', 'waiting')
    .where('stale', '!=', true)
    .get();

  for (const lobbyDoc of lobbiesSnapshot.docs) {
    const lobby = lobbyDoc.data() as Lobby;
    const lastActivity = lobby.lastActivityAt ||
      (lobby.createdAt as unknown as { _seconds: number })?._seconds * 1000;

    if (lastActivity && lastActivity <= staleThreshold) {
      await lobbyDoc.ref.update({ stale: true });
      console.log(`Lobby ${lobbyDoc.id} marked as stale`);
    }
  }
});
