import {
  doc,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from './config';
import {
  callAskForCard,
  callPassTurnToTeammate,
  callStartDeclaration,
  callAbortDeclaration,
  callSelectDeclarationHalfSuit,
  callSelectDeclarationTeam,
  callFinishDeclaration,
  callVoteForReplay,
  callLeaveGame,
  callReturnToGame,
  callForfeitGame,
  callStartChallenge,
  callAbortChallenge,
  callRespondToChallenge
} from './functionsClient';

export interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '9' | '10' | 'J' | 'Q' | 'K';
  halfSuit: 'low-spades' | 'high-spades' | 'low-hearts' | 'high-hearts' |
            'low-diamonds' | 'high-diamonds' | 'low-clubs' | 'high-clubs';
}

export interface Turn {
  askerId: string;
  targetId: string;
  card: Card;
  success: boolean;
  timestamp: Date;
}

export interface Declaration {
  declareeId: string;
  halfSuit: Card['halfSuit'];
  team: 0 | 1;
  assignments: { [cardKey: string]: string };
  correct: boolean;
  forfeit?: boolean; // true if team had all cards but wrong distribution (neither team scores)
  timestamp: Date;
}

export interface DeclarePhase {
  active: boolean;
  declareeId: string | null;
  selectedHalfSuit?: Card['halfSuit'];
  selectedTeam?: 0 | 1;
}

export interface LeftPlayer {
  odId: string;
  odAt: number; // timestamp when player left
  reason?: 'left' | 'inactive'; // why the player is marked as left
}

export interface ChallengePhase {
  active: boolean;
  challengerId: string;
  challengedTeam: 0 | 1;
  selectedHalfSuit: Card['halfSuit'];
  responses: { [playerId: string]: 'pass' | 'declare' | null };
  declareRaceWinner?: string;
  startedAt: number;
  challengerMustDeclare?: boolean;
}

export interface Game {
  id: string;
  uuid: string; // Unique game identifier (persists in historical collections)
  lobbyUuid: string; // Reference to the lobby's UUID
  gameId: string; // Lobby ID (word-based, can be reused)
  players: string[];
  teams: { [playerId: string]: 0 | 1 };
  playerHands: { [playerId: string]: Card[] };
  currentTurn: string;
  turnOrder: string[];
  turns: Turn[];
  scores: { 0: number; 1: number };
  completedHalfsuits: Card['halfSuit'][];
  declarations: Declaration[];
  declarePhase: DeclarePhase | null;
  challengeMode?: boolean;
  turnActed?: boolean;
  challengePhase?: ChallengePhase | null;
  gameOver: { winner: 0 | 1 | null } | null;
  replayVotes: string[];
  leftPlayer: LeftPlayer | null;
  createdAt: Date;
  lastActivityAt?: number; // timestamp of last action (for inactivity detection)
  bluffQuestions?: boolean; // allow asking for cards you already hold
  declarationMode?: 'own-turn' | 'team-turn' | 'anytime'; // who can declare when
  harshDeclarations?: boolean; // wrong distribution = opponent scores (default true)
  highSuitsDouble?: boolean; // high half-suits worth 2 points
}

// Archive functions are now handled by Cloud Functions
// Game creation and card distribution is handled by Cloud Functions

export const getHalfSuitFromCard = (suit: Card['suit'], rank: Card['rank']): Card['halfSuit'] => {
  const lowRanks: Card['rank'][] = ['2', '3', '4', '5', '6', '7'];
  const isLow = lowRanks.includes(rank);
  const prefix = isLow ? 'low' : 'high';
  return `${prefix}-${suit}` as Card['halfSuit'];
};

export const getAllCardsInHalfSuit = (halfSuit: Card['halfSuit']): Card[] => {
  const [lowOrHigh, suit] = halfSuit.split('-') as [string, Card['suit']];
  const isLow = lowOrHigh === 'low';
  const ranksForHalfSuit: Card['rank'][] = isLow
    ? ['2', '3', '4', '5', '6', '7']
    : ['9', '10', 'J', 'Q', 'K', 'A'];
  
  return ranksForHalfSuit.map(rank => ({
    suit,
    rank,
    halfSuit: getHalfSuitFromCard(suit, rank)
  }));
};

export const getCardKey = (card: Card): string => {
  return `${card.suit}-${card.rank}`;
};

export const isPlayerAlive = (game: Game, playerId: string): boolean => {
  const hand = game.playerHands[playerId] || [];
  return hand.length > 0;
};

// Game creation and card distribution is now handled by Cloud Functions

export const subscribeToGame = (
  gameId: string,
  callback: (game: Game | null) => void
): (() => void) => {
  return onSnapshot(doc(db, 'games', gameId), (docSnapshot) => {
    if (docSnapshot.exists()) {
      const gameData = { id: docSnapshot.id, ...docSnapshot.data() } as Game;
      callback(gameData);
    } else {
      callback(null);
    }
  });
};

export const getGame = async (gameId: string): Promise<Game | null> => {
  const gameSnap = await getDoc(doc(db, 'games', gameId));
  if (gameSnap.exists()) {
    return { id: gameSnap.id, ...gameSnap.data() } as Game;
  }
  return null;
};

export const getPlayerHand = (game: Game, playerId: string): Card[] => {
  return game.playerHands[playerId] || [];
};

export const getTeamPlayers = (game: Game, team: 0 | 1): string[] => {
  const teamPlayers: string[] = [];
  for (const playerId of game.players) {
    if (game.teams[playerId] === team) {
      teamPlayers.push(playerId);
    }
  }
  return teamPlayers;
};

export const getPlayerTeam = (game: Game, playerId: string): 0 | 1 | undefined => {
  return game.teams[playerId];
};

// Get all teammate player IDs for a given player (excluding the player themselves)
export const getTeammates = (game: Game, playerId: string): string[] => {
  const playerTeam = game.teams[playerId];
  if (playerTeam === undefined) return [];

  return game.players.filter(p => p !== playerId && game.teams[p] === playerTeam);
};

export const belongsToHalfSuit = (hand: Card[], halfSuit: Card['halfSuit']): boolean => {
  return hand.some(card => card.halfSuit === halfSuit);
};

// Check if player has a specific card
export const hasCard = (hand: Card[], targetCard: Card): boolean => {
  return hand.some(card => card.suit === targetCard.suit && card.rank === targetCard.rank);
};

// Get all opponent player IDs for a given player
export const getOpponents = (game: Game, playerId: string): string[] => {
  const playerTeam = game.teams[playerId];
  if (playerTeam === undefined) return [];

  const opponents: string[] = [];
  for (const id of game.players) {
    if (id !== playerId && game.teams[id] !== playerTeam) {
      opponents.push(id);
    }
  }
  return opponents;
};

export const askForCard = async (
  gameDocId: string,
  _askerId: string,
  targetId: string,
  card: Card
): Promise<{ success: boolean; error?: string }> => {
  try {
    // askerId is now derived server-side from auth
    return await callAskForCard({ gameDocId, targetId, card });
  } catch (error) {
    console.error('Error in askForCard:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const passTurnToTeammate = async (
  gameDocId: string,
  teammateId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await callPassTurnToTeammate({ gameDocId, teammateId });
  } catch (error) {
    console.error('Error in passTurnToTeammate:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const startDeclaration = async (
  gameDocId: string,
  _declareeId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // declareeId is now derived server-side from auth
    return await callStartDeclaration({ gameDocId });
  } catch (error) {
    console.error('Error in startDeclaration:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const abortDeclaration = async (
  gameDocId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await callAbortDeclaration({ gameDocId });
  } catch (error) {
    console.error('Error in abortDeclaration:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const selectDeclarationHalfSuit = async (
  gameDocId: string,
  halfSuit: Card['halfSuit']
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await callSelectDeclarationHalfSuit({ gameDocId, halfSuit });
  } catch (error) {
    console.error('Error in selectDeclarationHalfSuit:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const selectDeclarationTeam = async (
  gameDocId: string,
  team: 0 | 1
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await callSelectDeclarationTeam({ gameDocId, team });
  } catch (error) {
    console.error('Error in selectDeclarationTeam:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const finishDeclaration = async (
  gameDocId: string,
  _declareeId: string,
  halfSuit: Card['halfSuit'],
  team: 0 | 1,
  assignments: { [cardKey: string]: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    // declareeId is now derived server-side from auth
    return await callFinishDeclaration({ gameDocId, halfSuit, team, assignments });
  } catch (error) {
    console.error('Error in finishDeclaration:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const voteForReplay = async (
  gameDocId: string,
  _playerId: string
): Promise<{ success: boolean; error?: string; shouldReplay?: boolean }> => {
  try {
    // playerId is now derived server-side from auth
    return await callVoteForReplay({ gameDocId });
  } catch (error) {
    console.error('Error in voteForReplay:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const LEAVE_TIMEOUT_SECONDS = 60;

export const leaveGame = async (
  gameDocId: string,
  _playerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // playerId is now derived server-side from auth
    return await callLeaveGame({ gameDocId });
  } catch (error) {
    console.error('Error in leaveGame:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const returnToGame = async (
  gameDocId: string,
  _playerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // playerId is now derived server-side from auth
    return await callReturnToGame({ gameDocId });
  } catch (error) {
    console.error('Error in returnToGame:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const forfeitGame = async (
  gameDocId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await callForfeitGame({ gameDocId });
  } catch (error) {
    console.error('Error in forfeitGame:', error);
    return { success: false, error: 'An error occurred' };
  }
};

// Challenge functions
export const startChallenge = async (
  gameDocId: string,
  halfSuit: Card['halfSuit']
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await callStartChallenge({ gameDocId, halfSuit });
  } catch (error) {
    console.error('Error in startChallenge:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const abortChallenge = async (
  gameDocId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    return await callAbortChallenge({ gameDocId });
  } catch (error) {
    console.error('Error in abortChallenge:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const respondToChallenge = async (
  gameDocId: string,
  response: 'pass' | 'declare'
): Promise<{ success: boolean; error?: string; wonRace?: boolean }> => {
  try {
    return await callRespondToChallenge({ gameDocId, response });
  } catch (error) {
    console.error('Error in respondToChallenge:', error);
    return { success: false, error: 'An error occurred' };
  }
};

