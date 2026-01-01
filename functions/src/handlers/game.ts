import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '../rateLimiter';

const db = admin.firestore();

const corsOrigins = ['https://playfish.io', 'http://localhost:5173', 'http://localhost:3000'];

// Types
interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '9' | '10' | 'J' | 'Q' | 'K';
  halfSuit: string;
}

interface Turn {
  askerId: string;
  targetId: string;
  card: Card;
  success: boolean;
  timestamp: Date;
}

interface Declaration {
  declareeId: string;
  halfSuit: string;
  team: 0 | 1;
  assignments: { [cardKey: string]: string };
  correct: boolean;
  forfeit: boolean; // true if team had all cards but wrong distribution (neither team scores)
  timestamp: Date;
}

interface LeftPlayer {
  odId: string;
  odAt: number;
  reason?: 'left' | 'inactive';
}

interface ChallengePhase {
  active: boolean;
  challengerId: string;
  challengedTeam: 0 | 1;
  selectedHalfSuit: string;
  responses: { [playerId: string]: 'pass' | 'declare' | null };
  declareRaceWinner?: string;
  startedAt: number;
  challengerMustDeclare?: boolean;
}

interface Game {
  id: string;
  uuid: string;
  lobbyUuid: string;
  gameId: string;
  players: string[];
  teams: { [playerId: string]: 0 | 1 };
  playerHands: { [playerId: string]: Card[] };
  currentTurn: string;
  turnOrder: string[];
  turns: Turn[];
  scores: { 0: number; 1: number };
  completedHalfsuits: string[];
  declarations: Declaration[];
  declarePhase: {
    active: boolean;
    declareeId: string | null;
    selectedHalfSuit?: string;
    selectedTeam?: 0 | 1;
  } | null;
  gameOver: { winner: 0 | 1 | null } | null;
  replayVotes: string[];
  leftPlayer: LeftPlayer | null;
  createdAt: Date;
  lastActivityAt: number; // timestamp of last action
  challengeMode: boolean;
  turnActed: boolean; // true after askForCard or startDeclaration
  challengePhase: ChallengePhase | null;
}

const LEAVE_TIMEOUT_SECONDS = 60;
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// Helper functions
const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '9', '10', 'J', 'Q', 'K'];

const getHalfSuitFromCard = (suit: Card['suit'], rank: Card['rank']): string => {
  const lowRanks: Card['rank'][] = ['2', '3', '4', '5', '6', '7'];
  const isLow = lowRanks.includes(rank);
  const prefix = isLow ? 'low' : 'high';
  return `${prefix}-${suit}`;
};

const getAllCardsInHalfSuit = (halfSuit: string): Card[] => {
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

const getCardKey = (card: Card): string => `${card.suit}-${card.rank}`;

const isPlayerAlive = (game: Game, playerId: string): boolean => {
  const hand = game.playerHands[playerId] || [];
  return hand.length > 0;
};

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, halfSuit: getHalfSuitFromCard(suit, rank) });
    }
  }
  return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const distributeCards = (players: string[]): { [playerId: string]: Card[] } => {
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  const playerHands: { [playerId: string]: Card[] } = {};

  const cardsPerPlayer = Math.floor(shuffled.length / players.length);
  const remainder = shuffled.length % players.length;

  let cardIndex = 0;
  for (let i = 0; i < players.length; i++) {
    const playerId = players[i];
    const cardsForThisPlayer = cardsPerPlayer + (i < remainder ? 1 : 0);
    playerHands[playerId] = shuffled.slice(cardIndex, cardIndex + cardsForThisPlayer);
    cardIndex += cardsForThisPlayer;
  }

  return playerHands;
};

const getTeamPlayers = (game: Game, team: 0 | 1): string[] => {
  const teamPlayers: string[] = [];
  for (const playerId of game.players) {
    if (game.teams[playerId] === team) {
      teamPlayers.push(playerId);
    }
  }
  return teamPlayers;
};

const getOpponents = (game: Game, playerId: string): string[] => {
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

const belongsToHalfSuit = (hand: Card[], halfSuit: string): boolean => {
  return hand.some(card => card.halfSuit === halfSuit);
};

const hasCard = (hand: Card[], targetCard: Card): boolean => {
  return hand.some(card => card.suit === targetCard.suit && card.rank === targetCard.rank);
};

// Archive functions
const archiveCompletedGame = async (gameDocId: string, gameData: Game): Promise<void> => {
  const archivedGameRef = db.collection('completedGames').doc(gameDocId);
  await archivedGameRef.set({
    ...gameData,
    archivedAt: FieldValue.serverTimestamp()
  });
  await db.collection('games').doc(gameDocId).delete();
};

export const archiveCompletedGameFromLobby = async (gameDocId: string): Promise<void> => {
  const gameSnap = await db.collection('games').doc(gameDocId).get();
  if (gameSnap.exists) {
    await archiveCompletedGame(gameDocId, { id: gameSnap.id, ...gameSnap.data() } as Game);
  }
};

const archiveUnfinishedGame = async (gameDocId: string, gameData: Game, reason: 'forfeit' | 'abandoned'): Promise<void> => {
  const archivedGameRef = db.collection('unfinishedGames').doc(gameDocId);
  await archivedGameRef.set({
    ...gameData,
    archivedAt: FieldValue.serverTimestamp(),
    endReason: reason
  });
  await db.collection('games').doc(gameDocId).delete();
};

// Exported for use by lobby handler
export const createGame = async (
  gameId: string,
  players: string[],
  teamAssignments: { [playerId: string]: 0 | 1 },
  lobbyUuid: string,
  challengeMode: boolean = false
): Promise<string> => {
  const playerHands = distributeCards(players);
  const teams = { ...teamAssignments };

  const randomIndex = Math.floor(Math.random() * players.length);
  const firstPlayer = players[randomIndex];

  const uuid = require('crypto').randomUUID();

  const gameData = {
    uuid,
    lobbyUuid,
    gameId,
    players,
    teams,
    playerHands,
    currentTurn: firstPlayer,
    turnOrder: players,
    turns: [],
    scores: { 0: 0, 1: 0 },
    completedHalfsuits: [],
    declarations: [],
    declarePhase: null,
    gameOver: null,
    replayVotes: [],
    leftPlayer: null,
    createdAt: FieldValue.serverTimestamp(),
    lastActivityAt: Date.now(),
    challengeMode,
    turnActed: false,
    challengePhase: null
  };

  const docRef = await db.collection('games').add(gameData);
  return docRef.id;
};

// Callable functions
interface AskForCardData {
  gameDocId: string;
  targetId: string;
  card: Card;
}

export const askForCard = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const askerId = request.auth.uid;
  const { gameDocId, targetId, card } = request.data as AskForCardData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }
  if (!targetId || typeof targetId !== 'string') {
    throw new HttpsError('invalid-argument', 'targetId is required');
  }
  if (!card || !card.suit || !card.rank) {
    throw new HttpsError('invalid-argument', 'card is required');
  }

  await checkRateLimit(askerId, 'game:askForCard');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (game.declarePhase?.active) {
      throw new HttpsError('failed-precondition', 'Game is paused during declaration phase');
    }
    if (game.challengePhase?.active) {
      throw new HttpsError('failed-precondition', 'Game is paused during challenge phase');
    }
    if (game.leftPlayer) {
      // Allow action if it's the inactive player making a move (clears the pause)
      if (game.leftPlayer.reason !== 'inactive' || game.leftPlayer.odId !== askerId) {
        throw new HttpsError('failed-precondition', 'Game is paused - a player has left');
      }
    }
    if (game.currentTurn !== askerId) {
      throw new HttpsError('failed-precondition', 'It is not your turn');
    }

    const opponents = getOpponents(game, askerId);
    if (!opponents.includes(targetId)) {
      throw new HttpsError('failed-precondition', 'You must ask a player on the opposing team');
    }

    const askerHand = game.playerHands[askerId] || [];
    const targetHand = game.playerHands[targetId] || [];

    if (targetHand.length === 0) {
      throw new HttpsError('failed-precondition', 'You cannot ask a player who has no cards');
    }

    if (hasCard(askerHand, card)) {
      throw new HttpsError('failed-precondition', 'You already have this card');
    }
    if (!belongsToHalfSuit(askerHand, card.halfSuit)) {
      throw new HttpsError('failed-precondition', 'You do not belong to this half-suit');
    }

    const targetHasCard = hasCard(targetHand, card);
    const updatedPlayerHands = { ...game.playerHands };

    if (targetHasCard) {
      updatedPlayerHands[targetId] = targetHand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
      updatedPlayerHands[askerId] = [...askerHand, card];
    }

    const newTurn: Turn = { askerId, targetId, card, success: targetHasCard, timestamp: new Date() };

    // Clear leftPlayer if this was an inactive player resuming
    const shouldClearLeftPlayer = game.leftPlayer?.reason === 'inactive' && game.leftPlayer.odId === askerId;

    transaction.update(gameRef, {
      playerHands: updatedPlayerHands,
      currentTurn: targetHasCard ? askerId : targetId,
      turns: [...game.turns, newTurn],
      lastActivityAt: Date.now(),
      turnActed: true,
      // Reset turnActed when turn passes to opponent
      ...(targetHasCard === false && { turnActed: false }),
      ...(shouldClearLeftPlayer && { leftPlayer: null })
    });

    return { success: true };
  });
});

interface PassTurnToTeammateData {
  gameDocId: string;
  teammateId: string;
}

export const passTurnToTeammate = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const playerId = request.auth.uid;
  const { gameDocId, teammateId } = request.data as PassTurnToTeammateData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }
  if (!teammateId || typeof teammateId !== 'string') {
    throw new HttpsError('invalid-argument', 'teammateId is required');
  }

  await checkRateLimit(playerId, 'game:passTurnToTeammate');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (game.declarePhase?.active) {
      throw new HttpsError('failed-precondition', 'Cannot pass turn during a declaration');
    }
    if (game.currentTurn !== playerId) {
      throw new HttpsError('failed-precondition', 'It is not your turn');
    }

    const playerHand = game.playerHands[playerId] || [];
    if (playerHand.length > 0) {
      throw new HttpsError('failed-precondition', 'You can only pass the turn if you have no cards');
    }

    // Verify teammate is on the same team
    if (game.teams[teammateId] !== game.teams[playerId]) {
      throw new HttpsError('failed-precondition', 'You can only pass to a teammate');
    }

    // Verify teammate has cards
    const teammateHand = game.playerHands[teammateId] || [];
    if (teammateHand.length === 0) {
      throw new HttpsError('failed-precondition', 'Teammate must have cards to receive the turn');
    }

    transaction.update(gameRef, {
      currentTurn: teammateId,
      lastActivityAt: Date.now()
    });

    return { success: true };
  });
});

interface StartDeclarationData {
  gameDocId: string;
}

export const startDeclaration = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const declareeId = request.auth.uid;
  const { gameDocId } = request.data as StartDeclarationData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }

  await checkRateLimit(declareeId, 'game:startDeclaration');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (game.declarePhase?.active) {
      throw new HttpsError('failed-precondition', 'A declaration is already in progress');
    }
    if (game.challengePhase?.active) {
      throw new HttpsError('failed-precondition', 'A challenge is in progress');
    }
    if (game.leftPlayer) {
      // Allow action if it's the inactive player making a move (clears the pause)
      if (game.leftPlayer.reason !== 'inactive' || game.leftPlayer.odId !== declareeId) {
        throw new HttpsError('failed-precondition', 'Game is paused - a player has left');
      }
    }
    if (!isPlayerAlive(game, declareeId)) {
      throw new HttpsError('failed-precondition', 'You must have cards to declare');
    }
    if (game.currentTurn !== declareeId) {
      throw new HttpsError('failed-precondition', 'You can only declare on your turn');
    }

    // Clear leftPlayer if this was an inactive player resuming
    const shouldClearLeftPlayer = game.leftPlayer?.reason === 'inactive' && game.leftPlayer.odId === declareeId;

    transaction.update(gameRef, {
      declarePhase: { active: true, declareeId },
      lastActivityAt: Date.now(),
      turnActed: true,
      ...(shouldClearLeftPlayer && { leftPlayer: null })
    });

    return { success: true };
  });
});

interface AbortDeclarationData {
  gameDocId: string;
}

export const abortDeclaration = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const declareeId = request.auth.uid;
  const { gameDocId } = request.data as AbortDeclarationData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }

  await checkRateLimit(declareeId, 'game:abortDeclaration');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (!game.declarePhase?.active) {
      throw new HttpsError('failed-precondition', 'No declaration is in progress');
    }
    if (game.declarePhase.declareeId !== declareeId) {
      throw new HttpsError('permission-denied', 'You are not the active declaree');
    }
    if (game.declarePhase.selectedHalfSuit) {
      throw new HttpsError('failed-precondition', 'Cannot abort after selecting a half suit');
    }

    transaction.update(gameRef, {
      declarePhase: null,
      lastActivityAt: Date.now()
    });

    return { success: true };
  });
});

interface SelectDeclarationHalfSuitData {
  gameDocId: string;
  halfSuit: string;
}

export const selectDeclarationHalfSuit = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const declareeId = request.auth.uid;
  const { gameDocId, halfSuit } = request.data as SelectDeclarationHalfSuitData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }
  if (!halfSuit || typeof halfSuit !== 'string') {
    throw new HttpsError('invalid-argument', 'halfSuit is required');
  }

  await checkRateLimit(declareeId, 'game:selectDeclarationHalfSuit');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (!game.declarePhase?.active) {
      throw new HttpsError('failed-precondition', 'No declaration is in progress');
    }
    if (game.declarePhase.declareeId !== declareeId) {
      throw new HttpsError('permission-denied', 'You are not the active declaree');
    }
    if (game.declarePhase.selectedHalfSuit) {
      throw new HttpsError('failed-precondition', 'Half suit has already been selected');
    }
    if (game.completedHalfsuits.includes(halfSuit)) {
      throw new HttpsError('failed-precondition', 'This halfsuit has already been completed');
    }

    transaction.update(gameRef, {
      'declarePhase.selectedHalfSuit': halfSuit,
      lastActivityAt: Date.now()
    });

    return { success: true };
  });
});

interface SelectDeclarationTeamData {
  gameDocId: string;
  team: 0 | 1;
}

export const selectDeclarationTeam = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const declareeId = request.auth.uid;
  const { gameDocId, team } = request.data as SelectDeclarationTeamData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }
  if (team !== 0 && team !== 1) {
    throw new HttpsError('invalid-argument', 'team must be 0 or 1');
  }

  await checkRateLimit(declareeId, 'game:selectDeclarationTeam');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (!game.declarePhase?.active) {
      throw new HttpsError('failed-precondition', 'No declaration is in progress');
    }
    if (game.declarePhase.declareeId !== declareeId) {
      throw new HttpsError('permission-denied', 'You are not the active declaree');
    }
    if (!game.declarePhase.selectedHalfSuit) {
      throw new HttpsError('failed-precondition', 'Half suit must be selected first');
    }
    if (game.declarePhase.selectedTeam !== undefined) {
      throw new HttpsError('failed-precondition', 'Team has already been selected');
    }

    transaction.update(gameRef, {
      'declarePhase.selectedTeam': team,
      lastActivityAt: Date.now()
    });

    return { success: true };
  });
});

interface FinishDeclarationData {
  gameDocId: string;
  halfSuit: string;
  team: 0 | 1;
  assignments: { [cardKey: string]: string };
}

export const finishDeclaration = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const declareeId = request.auth.uid;
  const { gameDocId, halfSuit, team, assignments } = request.data as FinishDeclarationData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }
  if (!halfSuit || typeof halfSuit !== 'string') {
    throw new HttpsError('invalid-argument', 'halfSuit is required');
  }
  if (team !== 0 && team !== 1) {
    throw new HttpsError('invalid-argument', 'team must be 0 or 1');
  }
  if (!assignments || typeof assignments !== 'object') {
    throw new HttpsError('invalid-argument', 'assignments is required');
  }

  await checkRateLimit(declareeId, 'game:finishDeclaration');

  const gameRef = db.collection('games').doc(gameDocId);

  const result = await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (!game.declarePhase?.active || game.declarePhase.declareeId !== declareeId) {
      throw new HttpsError('failed-precondition', 'You are not the active declaree');
    }

    if (game.completedHalfsuits.includes(halfSuit)) {
      throw new HttpsError('failed-precondition', 'This halfsuit has already been completed');
    }

    const allCardsInHalfSuit = getAllCardsInHalfSuit(halfSuit);
    const allCardsAssigned = allCardsInHalfSuit.every(c => assignments[getCardKey(c)] !== undefined);

    if (!allCardsAssigned) {
      throw new HttpsError('failed-precondition', 'You must assign all cards in the halfsuit');
    }

    const teamPlayers = getTeamPlayers(game, team);
    for (const card of allCardsInHalfSuit) {
      if (!teamPlayers.includes(assignments[getCardKey(card)])) {
        throw new HttpsError('failed-precondition', 'All cards must be assigned to players on the selected team');
      }
    }

    const updatedPlayerHands = { ...game.playerHands };
    let allCorrect = true;
    let teamHasAllCards = true;

    // Check if the claimed team actually has all cards in this half-suit
    const opposingTeamPlayers = game.players.filter(p => game.teams[p] !== team);
    for (const card of allCardsInHalfSuit) {
      for (const oppPlayer of opposingTeamPlayers) {
        const oppHand = updatedPlayerHands[oppPlayer] || [];
        if (hasCard(oppHand, card)) {
          teamHasAllCards = false;
          break;
        }
      }
      if (!teamHasAllCards) break;
    }

    // Check if the distribution among teammates is correct
    for (const card of allCardsInHalfSuit) {
      const assignedHand = updatedPlayerHands[assignments[getCardKey(card)]] || [];
      if (!hasCard(assignedHand, card)) allCorrect = false;
    }

    for (const playerId of game.players) {
      updatedPlayerHands[playerId] = (updatedPlayerHands[playerId] || []).filter(c => c.halfSuit !== halfSuit);
    }

    const declareeTeam = game.teams[declareeId];
    const oppositeTeam = declareeTeam === 0 ? 1 : 0;
    const updatedScores = { ...game.scores };

    // Scoring logic:
    // - Correct declaration → declaring team wins
    // - Opponent has a card → opposing team wins
    // - Team has all cards but wrong distribution → forfeit (neither scores)
    if (allCorrect) {
      updatedScores[declareeTeam]++;
    } else if (!teamHasAllCards) {
      updatedScores[oppositeTeam]++;
    }
    // If teamHasAllCards but !allCorrect → forfeit, no score change

    let gameOver = game.gameOver;
    const wasGameOver = gameOver !== null;
    if (updatedScores[0] >= 5) gameOver = { winner: 0 };
    else if (updatedScores[1] >= 5) gameOver = { winner: 1 };

    const isForfeit = !allCorrect && teamHasAllCards;

    transaction.update(gameRef, {
      playerHands: updatedPlayerHands,
      scores: updatedScores,
      completedHalfsuits: [...game.completedHalfsuits, halfSuit],
      declarations: [...game.declarations, { declareeId, halfSuit, team, assignments, correct: allCorrect, forfeit: isForfeit, timestamp: new Date() }],
      declarePhase: null,
      challengePhase: null, // Clear challenge phase after declaration completes
      turnActed: false, // Reset for next turn
      gameOver,
      lastActivityAt: Date.now()
    });

    return { success: true, gameOver, wasGameOver, updatedScores, gameId: game.gameId };
  });

  // Update lobby historical scores if game just ended (increment games won, not halfsuits)
  if (result.gameOver && !result.wasGameOver && result.gameOver.winner !== null) {
    const lobbyRef = db.collection('lobbies').doc(result.gameId);
    const lobbySnap = await lobbyRef.get();
    if (lobbySnap.exists) {
      const current = lobbySnap.data()?.historicalScores || { 0: 0, 1: 0 };
      const winningTeam = result.gameOver.winner;
      const updatedHistorical = { ...current };
      updatedHistorical[winningTeam]++;
      await lobbyRef.update({ historicalScores: updatedHistorical });
    }
  }

  return { success: true };
});

// ============== CHALLENGE MODE FUNCTIONS ==============

const CHALLENGE_TIMEOUT_MS = 30 * 1000; // 30 seconds

interface StartChallengeData {
  gameDocId: string;
  halfSuit: string;
}

export const startChallenge = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const challengerId = request.auth.uid;
  const { gameDocId, halfSuit } = request.data as StartChallengeData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }
  if (!halfSuit || typeof halfSuit !== 'string') {
    throw new HttpsError('invalid-argument', 'halfSuit is required');
  }

  await checkRateLimit(challengerId, 'game:startChallenge');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    // Validate challenge conditions
    if (!game.challengeMode) {
      throw new HttpsError('failed-precondition', 'Challenge mode is not enabled');
    }
    if (game.gameOver) {
      throw new HttpsError('failed-precondition', 'Game is already over');
    }
    if (game.declarePhase?.active) {
      throw new HttpsError('failed-precondition', 'A declaration is in progress');
    }
    if (game.challengePhase?.active) {
      throw new HttpsError('failed-precondition', 'A challenge is already in progress');
    }
    if (game.leftPlayer) {
      throw new HttpsError('failed-precondition', 'Game is paused - a player has left');
    }
    if (game.currentTurn === challengerId) {
      throw new HttpsError('failed-precondition', 'You cannot challenge on your own turn');
    }
    if (game.turnActed) {
      throw new HttpsError('failed-precondition', 'Cannot challenge after opponent has acted');
    }
    if (!isPlayerAlive(game, challengerId)) {
      throw new HttpsError('failed-precondition', 'You must have cards to challenge');
    }
    if (game.completedHalfsuits.includes(halfSuit)) {
      throw new HttpsError('failed-precondition', 'This half-suit has already been completed');
    }

    // Get the team being challenged (the team whose turn it is)
    const challengedTeam = game.teams[game.currentTurn];
    const challengedPlayers = getTeamPlayers(game, challengedTeam);

    // Initialize responses for all challenged players
    const responses: { [playerId: string]: 'pass' | 'declare' | null } = {};
    for (const playerId of challengedPlayers) {
      responses[playerId] = null;
    }

    transaction.update(gameRef, {
      challengePhase: {
        active: true,
        challengerId,
        challengedTeam,
        selectedHalfSuit: halfSuit,
        responses,
        startedAt: Date.now()
      },
      lastActivityAt: Date.now()
    });

    return { success: true };
  });
});

interface AbortChallengeData {
  gameDocId: string;
}

export const abortChallenge = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const challengerId = request.auth.uid;
  const { gameDocId } = request.data as AbortChallengeData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }

  await checkRateLimit(challengerId, 'game:abortChallenge');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (!game.challengePhase?.active) {
      throw new HttpsError('failed-precondition', 'No challenge is in progress');
    }
    if (game.challengePhase.challengerId !== challengerId) {
      throw new HttpsError('permission-denied', 'You are not the challenger');
    }

    // Can only abort if no one has responded yet
    const hasAnyResponse = Object.values(game.challengePhase.responses).some(r => r !== null);
    if (hasAnyResponse) {
      throw new HttpsError('failed-precondition', 'Cannot abort after someone has responded');
    }

    transaction.update(gameRef, {
      challengePhase: null,
      lastActivityAt: Date.now()
    });

    return { success: true };
  });
});

interface RespondToChallengeData {
  gameDocId: string;
  response: 'pass' | 'declare';
}

export const respondToChallenge = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const playerId = request.auth.uid;
  const { gameDocId, response } = request.data as RespondToChallengeData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }
  if (response !== 'pass' && response !== 'declare') {
    throw new HttpsError('invalid-argument', 'response must be "pass" or "declare"');
  }

  await checkRateLimit(playerId, 'game:respondToChallenge');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (!game.challengePhase?.active) {
      throw new HttpsError('failed-precondition', 'No challenge is in progress');
    }
    if (game.teams[playerId] !== game.challengePhase.challengedTeam) {
      throw new HttpsError('permission-denied', 'You are not on the challenged team');
    }
    if (game.challengePhase.responses[playerId] !== null) {
      throw new HttpsError('failed-precondition', 'You have already responded');
    }

    const updatedResponses = { ...game.challengePhase.responses };

    if (response === 'declare') {
      // Check if someone already won the race to declare
      if (game.challengePhase.declareRaceWinner) {
        throw new HttpsError('failed-precondition', 'Another player is already declaring');
      }
      // Must have cards to declare
      if (!isPlayerAlive(game, playerId)) {
        throw new HttpsError('failed-precondition', 'You must have cards to declare');
      }

      // This player wins the race to declare
      updatedResponses[playerId] = 'declare';

      transaction.update(gameRef, {
        'challengePhase.responses': updatedResponses,
        'challengePhase.declareRaceWinner': playerId,
        // Set up declare phase for this player
        declarePhase: {
          active: true,
          declareeId: playerId,
          selectedHalfSuit: game.challengePhase.selectedHalfSuit,
          selectedTeam: game.challengePhase.challengedTeam
        },
        lastActivityAt: Date.now()
      });

    } else {
      // Player passes
      updatedResponses[playerId] = 'pass';

      // Check if all challenged players have passed
      const challengedPlayers = getTeamPlayers(game, game.challengePhase.challengedTeam);
      const allPassed = challengedPlayers.every(p => updatedResponses[p] === 'pass');

      if (allPassed) {
        // Challenger must now declare the opposing team's cards
        transaction.update(gameRef, {
          'challengePhase.responses': updatedResponses,
          'challengePhase.challengerMustDeclare': true,
          // Set up declare phase for challenger to declare opponent's cards
          declarePhase: {
            active: true,
            declareeId: game.challengePhase.challengerId,
            selectedHalfSuit: game.challengePhase.selectedHalfSuit,
            selectedTeam: game.challengePhase.challengedTeam // Challenger declares for the opposing team
          },
          lastActivityAt: Date.now()
        });
      } else {
        transaction.update(gameRef, {
          'challengePhase.responses': updatedResponses,
          lastActivityAt: Date.now()
        });
      }
    }

    return { success: true };
  });
});

interface VoteForReplayData {
  gameDocId: string;
}

export const voteForReplay = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const playerId = request.auth.uid;
  const { gameDocId } = request.data as VoteForReplayData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }

  await checkRateLimit(playerId, 'game:voteForReplay');

  const gameRef = db.collection('games').doc(gameDocId);

  const result = await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (!game.gameOver) {
      throw new HttpsError('failed-precondition', 'Game is not over');
    }
    if (game.replayVotes.includes(playerId)) {
      throw new HttpsError('failed-precondition', 'You have already voted for replay');
    }

    const lobbyRef = db.collection('lobbies').doc(game.gameId);
    const lobbySnap = await transaction.get(lobbyRef);

    if (!lobbySnap.exists) {
      throw new HttpsError('not-found', 'Lobby not found');
    }

    const lobbyData = lobbySnap.data() as { createdBy: string; historicalScores?: { 0: number; 1: number } };
    const nonHostPlayers = game.players.filter(p => p !== lobbyData.createdBy);
    const updatedReplayVotes = [...game.replayVotes, playerId];
    const allNonHostVoted = nonHostPlayers.every(p => updatedReplayVotes.includes(p));

    transaction.update(gameRef, { replayVotes: updatedReplayVotes });

    return {
      success: true,
      allNonHostVoted,
      game,
      lobbyRef,
      historicalScores: lobbyData.historicalScores || { 0: 0, 1: 0 }
    };
  });

  if (result.allNonHostVoted) {
    const teamAssignments: { [pid: string]: 0 | 1 } = {};
    result.game.players.forEach(pid => { teamAssignments[pid] = result.game.teams[pid]; });

    const newGameDocId = await createGame(result.game.gameId, result.game.players, teamAssignments, result.game.lobbyUuid, result.game.challengeMode || false);

    await result.lobbyRef.update({
      status: 'playing',
      onGoingGame: newGameDocId,
      historicalScores: result.historicalScores
    });

    await archiveCompletedGame(result.game.id, result.game);

    return { success: true, shouldReplay: true };
  }

  return { success: true, shouldReplay: false };
});

interface LeaveGameData {
  gameDocId: string;
}

export const leaveGame = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const playerId = request.auth.uid;
  const { gameDocId } = request.data as LeaveGameData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }

  await checkRateLimit(playerId, 'game:leaveGame');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (!game.players.includes(playerId)) {
      throw new HttpsError('permission-denied', 'You are not in this game');
    }
    if (game.gameOver) {
      throw new HttpsError('failed-precondition', 'Game is already over');
    }
    if (game.leftPlayer) {
      throw new HttpsError('failed-precondition', 'A player has already left');
    }

    transaction.update(gameRef, {
      leftPlayer: {
        odId: playerId,
        odAt: Date.now(),
        reason: 'left'
      }
    });

    return { success: true };
  });
});

interface ReturnToGameData {
  gameDocId: string;
}

export const returnToGame = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const playerId = request.auth.uid;
  const { gameDocId } = request.data as ReturnToGameData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }

  await checkRateLimit(playerId, 'game:returnToGame');

  const gameRef = db.collection('games').doc(gameDocId);

  return await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    if (!game.leftPlayer) {
      throw new HttpsError('failed-precondition', 'No player has left');
    }
    if (game.leftPlayer.odId !== playerId) {
      throw new HttpsError('permission-denied', 'You are not the player who left');
    }
    if (game.gameOver) {
      throw new HttpsError('failed-precondition', 'Game is already over');
    }

    const elapsed = Date.now() - game.leftPlayer.odAt;
    if (elapsed >= LEAVE_TIMEOUT_SECONDS * 1000) {
      throw new HttpsError('failed-precondition', 'Return timeout has expired');
    }

    transaction.update(gameRef, {
      leftPlayer: null,
      lastActivityAt: Date.now()
    });

    return { success: true };
  });
});

interface ForfeitGameData {
  gameDocId: string;
}

export const forfeitGame = onCall({ cors: corsOrigins, invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = request.auth.uid;
  const { gameDocId } = request.data as ForfeitGameData;

  if (!gameDocId || typeof gameDocId !== 'string') {
    throw new HttpsError('invalid-argument', 'gameDocId is required');
  }

  await checkRateLimit(userId, 'game:forfeitGame');

  const gameRef = db.collection('games').doc(gameDocId);

  const result = await db.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    // Verify user is in the game
    if (!game.players.includes(userId)) {
      throw new HttpsError('permission-denied', 'You are not in this game');
    }

    if (game.gameOver) {
      throw new HttpsError('failed-precondition', 'Game is already over');
    }
    if (!game.leftPlayer) {
      throw new HttpsError('failed-precondition', 'No player has left');
    }

    const leftPlayerTeam = game.teams[game.leftPlayer.odId];
    const winningTeam = leftPlayerTeam === 0 ? 1 : 0;

    const updatedGame: Game = {
      ...game,
      gameOver: { winner: winningTeam },
      leftPlayer: null
    };

    transaction.update(gameRef, {
      gameOver: { winner: winningTeam },
      leftPlayer: null
    });

    return { success: true, gameId: game.gameId, winningTeam, game: updatedGame };
  });

  // Update lobby historical scores
  const lobbyRef = db.collection('lobbies').doc(result.gameId);
  const lobbySnap = await lobbyRef.get();
  if (lobbySnap.exists) {
    const current = lobbySnap.data()?.historicalScores || { 0: 0, 1: 0 };
    const updatedScores = { ...current };
    updatedScores[result.winningTeam]++;
    await lobbyRef.update({ historicalScores: updatedScores });
  }

  // Archive the forfeited game
  await archiveUnfinishedGame(gameDocId, result.game, 'forfeit');

  return { success: true };
});

// Scheduled function to check for inactive games and auto-forfeit them
// Runs every 5 minutes - only queries games idle for 30+ seconds to reduce reads
export const checkInactiveGames = onSchedule('every 5 minutes', async () => {
  const now = Date.now();
  const inactivityThreshold = now - INACTIVITY_TIMEOUT_MS;
  const leaveTimeoutThreshold = now - (LEAVE_TIMEOUT_SECONDS * 1000);
  // Only check games that have been idle for at least 30 seconds
  const idleThreshold = now - 30000;

  // Find active games that have been idle for 30+ seconds (reduces reads significantly)
  const gamesSnapshot = await db.collection('games')
    .where('gameOver', '==', null)
    .where('lastActivityAt', '<', idleThreshold)
    .get();

  for (const gameDoc of gamesSnapshot.docs) {
    const game = { id: gameDoc.id, ...gameDoc.data() } as Game;

    // Handle challenge timeout (30 seconds)
    if (game.challengePhase?.active && !game.declarePhase?.active) {
      const challengeElapsed = now - game.challengePhase.startedAt;
      if (challengeElapsed >= CHALLENGE_TIMEOUT_MS) {
        // Auto-pass for any players who haven't responded
        const updatedResponses = { ...game.challengePhase.responses };
        let changed = false;

        for (const playerId of Object.keys(updatedResponses)) {
          if (updatedResponses[playerId] === null) {
            updatedResponses[playerId] = 'pass';
            changed = true;
          }
        }

        if (changed) {
          // Check if all have now passed
          const allPassed = Object.values(updatedResponses).every(r => r === 'pass');

          if (allPassed) {
            // Challenger must now declare
            await gameDoc.ref.update({
              'challengePhase.responses': updatedResponses,
              'challengePhase.challengerMustDeclare': true,
              declarePhase: {
                active: true,
                declareeId: game.challengePhase.challengerId,
                selectedHalfSuit: game.challengePhase.selectedHalfSuit,
                selectedTeam: game.challengePhase.challengedTeam
              },
              lastActivityAt: now
            });
            console.log(`Challenge timeout in game ${game.id} - all players auto-passed, challenger must declare`);
          } else {
            await gameDoc.ref.update({
              'challengePhase.responses': updatedResponses,
              lastActivityAt: now
            });
            console.log(`Challenge timeout in game ${game.id} - some players auto-passed`);
          }
        }
        continue;
      }
    }

    // Skip if game is in declare phase (declaree is working on declaration)
    if (game.declarePhase?.active) {
      continue;
    }

    // Skip if game already has a left player (countdown already in progress)
    if (game.leftPlayer) {
      // Check if the leave timeout has expired - auto-forfeit
      if (game.leftPlayer.odAt <= leaveTimeoutThreshold) {
        const leftPlayerTeam = game.teams[game.leftPlayer.odId];
        const winningTeam = leftPlayerTeam === 0 ? 1 : 0;

        // Update game to forfeit
        await gameDoc.ref.update({
          gameOver: { winner: winningTeam },
          leftPlayer: null
        });

        // Update lobby historical scores
        const lobbyRef = db.collection('lobbies').doc(game.gameId);
        const lobbySnap = await lobbyRef.get();
        if (lobbySnap.exists) {
          const current = lobbySnap.data()?.historicalScores || { 0: 0, 1: 0 };
          const updatedScores = { ...current };
          updatedScores[winningTeam]++;
          await lobbyRef.update({ historicalScores: updatedScores });
        }

        // Archive the abandoned game
        const updatedGame: Game = {
          ...game,
          gameOver: { winner: winningTeam },
          leftPlayer: null
        };
        await archiveUnfinishedGame(game.id, updatedGame, 'abandoned');

        console.log(`Auto-forfeited game ${game.id} due to player ${game.leftPlayer.odId} timeout`);
      }
      continue;
    }

    // Check if game has been inactive for 1 hour
    const lastActivity = game.lastActivityAt || (game.createdAt as unknown as { _seconds: number })?._seconds * 1000;
    if (lastActivity && lastActivity <= inactivityThreshold) {
      // Set leftPlayer to current turn player to start the 60s countdown
      await gameDoc.ref.update({
        leftPlayer: {
          odId: game.currentTurn,
          odAt: now,
          reason: 'inactive'
        }
      });

      console.log(`Game ${game.id} marked inactive, starting 60s countdown for player ${game.currentTurn}`);
    }
  }
});
