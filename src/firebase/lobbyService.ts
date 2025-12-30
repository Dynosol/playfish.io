import {
  collection,
  query,
  where,
  onSnapshot,
  doc
} from 'firebase/firestore';
import { db } from './config';
import {
  callCreateLobby,
  callJoinLobby,
  callLeaveLobby,
  callDeleteLobby,
  callJoinTeam,
  callSwapPlayerTeam,
  callRandomizeTeams,
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

  return onSnapshot(
    lobbiesQuery,
    (snapshot) => {
      console.log('Received lobbies snapshot:', snapshot.docs.length, 'lobbies');
      const lobbiesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lobby));
      console.log('Lobbies list:', lobbiesList);
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

// Helper function kept for areTeamsEven which is used by LobbyPage
// All write operations are now handled by Cloud Functions

export const createLobby = async (lobbyData: CreateLobbyData): Promise<string> => {
  const result = await callCreateLobby({
    name: lobbyData.name,
    maxPlayers: lobbyData.maxPlayers
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

export const startLobby = async (lobbyId: string): Promise<void> => {
  await callStartLobby({ lobbyId });
};

export const returnToLobby = async (lobbyId: string): Promise<void> => {
  await callReturnToLobby({ lobbyId });
};

export const replayGame = startLobby;

