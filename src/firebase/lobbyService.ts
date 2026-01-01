import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | Date | undefined): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return timestamp;
};
import {
  callCreateLobby,
  callJoinLobby,
  callLeaveLobby,
  callDeleteLobby,
  callJoinTeam,
  callLeaveTeam,
  callSwapPlayerTeam,
  callRandomizeTeams,
  callUpdateLobbySettings,
  callStartLobby,
  callReturnToLobby
} from './functionsClient';

export interface Lobby {
  id: string;
  uuid: string; // Permanent unique identifier (persists in historical collections)
  name: string;
  players: string[];
  teams: { [playerId: string]: 0 | 1 | null };
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: Date;
  onGoingGame: string | null;
  historicalScores: { 0: number; 1: number };
  lastActivityAt?: number; // timestamp of last action (for inactivity detection)
  stale?: boolean; // whether the lobby is stale due to inactivity
  isPrivate?: boolean; // private lobbies don't appear in public list but can be joined via direct link
  challengeMode?: boolean; // whether challenges are enabled for games in this lobby
}

export interface CreateLobbyData {
  name: string;
  createdBy: string;
  maxPlayers: number;
  isPrivate?: boolean;
  challengeMode?: boolean;
}

export const subscribeToActiveLobbies = (
  callback: (lobbies: Lobby[]) => void
): (() => void) => {
  const lobbiesQuery = query(
    collection(db, 'lobbies'),
    where('status', 'in', ['waiting', 'playing'])
  );

  return onSnapshot(
    lobbiesQuery,
    (snapshot) => {
      const lobbiesList = snapshot.docs
        .map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: toDate(data.createdAt)
          } as Lobby;
        })
        .filter(lobby => !lobby.isPrivate); // Filter out private lobbies
      callback(lobbiesList);
    },
    (error) => {
      console.error('Error subscribing to lobbies:', error);
      // Still call callback with empty array so loading state clears
      callback([]);
    }
  );
};

export const subscribeToLobby = (
  lobbyId: string,
  callback: (lobby: Lobby | null) => void
): (() => void) => {
  return onSnapshot(doc(db, 'lobbies', lobbyId), (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      const lobbyData = {
        id: docSnapshot.id,
        ...data,
        createdAt: toDate(data.createdAt)
      } as Lobby;
      callback(lobbyData);
    } else {
      callback(null);
    }
  });
};

// Helper function kept for areTeamsEven which is used by LobbyPage
// All write operations are now handled by Cloud Functions

export const createLobby = async (lobbyData: CreateLobbyData): Promise<string> => {
  const result = await callCreateLobby({
    name: lobbyData.name,
    maxPlayers: lobbyData.maxPlayers,
    isPrivate: lobbyData.isPrivate,
    challengeMode: lobbyData.challengeMode
  });
  return result.lobbyId;
};

export const joinLobby = async (lobbyId: string, _userId: string): Promise<void> => {
  await callJoinLobby({ lobbyId });
};

export const leaveLobby = async (lobbyId: string, _userId: string): Promise<void> => {
  await callLeaveLobby({ lobbyId });
};

export const deleteLobby = async (lobbyId: string, _userId: string): Promise<void> => {
  await callDeleteLobby({ lobbyId });
};

export const joinTeam = async (lobbyId: string, _userId: string, team: 0 | 1): Promise<void> => {
  await callJoinTeam({ lobbyId, team });
};

export const leaveTeam = async (lobbyId: string): Promise<void> => {
  await callLeaveTeam({ lobbyId });
};

export const swapPlayerTeam = async (lobbyId: string, playerId: string): Promise<void> => {
  await callSwapPlayerTeam({ lobbyId, playerId });
};

export const areTeamsEven = (lobby: Lobby): boolean => {
  let team0Count = 0;
  let team1Count = 0;

  for (const playerId of lobby.players) {
    const team = lobby.teams[playerId];
    // Use == to handle potential type coercion from Firestore
    if (team == 0) {
      team0Count++;
    } else if (team == 1) {
      team1Count++;
    }
  }

  // Check: equal teams, at least one per team, and no unassigned players
  const totalAssigned = team0Count + team1Count;
  return team0Count === team1Count && team0Count > 0 && totalAssigned === lobby.players.length;
};

export const randomizeTeams = async (lobbyId: string, _playerId: string): Promise<void> => {
  await callRandomizeTeams({ lobbyId });
};

export const updateLobbySettings = async (lobbyId: string, settings: { challengeMode?: boolean }): Promise<void> => {
  await callUpdateLobbySettings({ lobbyId, ...settings });
};

export const startLobby = async (lobbyId: string): Promise<void> => {
  await callStartLobby({ lobbyId });
};

export const returnToLobby = async (lobbyId: string): Promise<void> => {
  await callReturnToLobby({ lobbyId });
};

export const replayGame = startLobby;

