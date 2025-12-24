import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from './config';

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
  timestamp: Date;
}

export interface DeclarePhase {
  active: boolean;
  declareeId: string | null;
}

export interface LeftPlayer {
  odId: string;
  odAt: number; // timestamp when player left
}

export interface Game {
  id: string;
  gameId: string;
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
  gameOver: { winner: 0 | 1 | null } | null;
  replayVotes: string[];
  leftPlayer: LeftPlayer | null;
  createdAt: Date;
}

const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '9', '10', 'J', 'Q', 'K'];

export const getHalfSuitFromCard = (suit: Card['suit'], rank: Card['rank']): Card['halfSuit'] => {
  const lowRanks: Card['rank'][] = ['A', '2', '3', '4', '5', '6'];
  const isLow = lowRanks.includes(rank);
  const prefix = isLow ? 'low' : 'high';
  return `${prefix}-${suit}` as Card['halfSuit'];
};

export const getAllCardsInHalfSuit = (halfSuit: Card['halfSuit']): Card[] => {
  const [lowOrHigh, suit] = halfSuit.split('-') as [string, Card['suit']];
  const isLow = lowOrHigh === 'low';
  const ranksForHalfSuit: Card['rank'][] = isLow 
    ? ['A', '2', '3', '4', '5', '6']
    : ['7', '9', '10', 'J', 'Q', 'K'];
  
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

const assignTeams = (players: string[], teamAssignments: { [playerId: string]: 0 | 1 }): { [playerId: string]: 0 | 1 } => {
  const teams: { [playerId: string]: 0 | 1 } = {};
  
  for (let i = 0; i < players.length; i++) {
    const playerId = players[i];
    if (teamAssignments[playerId] !== undefined) {
      teams[playerId] = teamAssignments[playerId];
    } else {
      teams[playerId] = (i % 2) as 0 | 1;
    }
  }
  
  return teams;
};

export const createGame = async (gameId: string, players: string[], teamAssignments: { [playerId: string]: 0 | 1 }): Promise<string> => {
  const playerHands = distributeCards(players);
  const teams = assignTeams(players, teamAssignments);

  // Randomly select first player
  const randomIndex = Math.floor(Math.random() * players.length);
  const firstPlayer = players[randomIndex];

  const gameData = {
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
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'games'), gameData);
  return docRef.id;
};

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
  askerId: string,
  targetId: string,
  card: Card
): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameRef = doc(db, 'games', gameDocId);

    return await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) return { success: false, error: 'Game not found' };

      const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

      if (game.declarePhase?.active) return { success: false, error: 'Game is paused during declaration phase' };
      if (game.leftPlayer) return { success: false, error: 'Game is paused - a player has left' };
      if (game.currentTurn !== askerId) return { success: false, error: 'It is not your turn' };

      const opponents = getOpponents(game, askerId);
      if (!opponents.includes(targetId)) return { success: false, error: 'You must ask a player on the opposing team' };

      const askerHand = game.playerHands[askerId] || [];
      const targetHand = game.playerHands[targetId] || [];

      if (hasCard(askerHand, card)) return { success: false, error: 'You already have this card' };
      if (!belongsToHalfSuit(askerHand, card.halfSuit)) return { success: false, error: 'You do not belong to this half-suit' };

      const targetHasCard = hasCard(targetHand, card);
      const updatedPlayerHands = { ...game.playerHands };

      if (targetHasCard) {
        updatedPlayerHands[targetId] = targetHand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
        updatedPlayerHands[askerId] = [...askerHand, card];
      }

      const newTurn: Turn = { askerId, targetId, card, success: targetHasCard, timestamp: new Date() };

      transaction.update(gameRef, {
        playerHands: updatedPlayerHands,
        currentTurn: targetHasCard ? askerId : targetId,
        turns: [...game.turns, newTurn]
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error in askForCard:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const startDeclaration = async (
  gameDocId: string,
  declareeId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameRef = doc(db, 'games', gameDocId);

    return await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) return { success: false, error: 'Game not found' };

      const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

      if (game.declarePhase?.active) return { success: false, error: 'A declaration is already in progress' };
      if (game.leftPlayer) return { success: false, error: 'Game is paused - a player has left' };
      if (!isPlayerAlive(game, declareeId)) return { success: false, error: 'You must have cards to declare' };

      transaction.update(gameRef, { declarePhase: { active: true, declareeId } });

      return { success: true };
    });
  } catch (error) {
    console.error('Error in startDeclaration:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const finishDeclaration = async (
  gameDocId: string,
  declareeId: string,
  halfSuit: Card['halfSuit'],
  team: 0 | 1,
  assignments: { [cardKey: string]: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameRef = doc(db, 'games', gameDocId);

    const result = await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) return { success: false, error: 'Game not found' } as const;

      const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

      if (!game.declarePhase?.active || game.declarePhase.declareeId !== declareeId) {
        return { success: false, error: 'You are not the active declaree' } as const;
      }

      if (game.completedHalfsuits.includes(halfSuit)) {
        return { success: false, error: 'This halfsuit has already been completed' } as const;
      }

      const allCardsInHalfSuit = getAllCardsInHalfSuit(halfSuit);
      const allCardsAssigned = allCardsInHalfSuit.every(c => assignments[getCardKey(c)] !== undefined);

      if (!allCardsAssigned) return { success: false, error: 'You must assign all cards in the halfsuit' } as const;

      const teamPlayers = getTeamPlayers(game, team);
      for (const card of allCardsInHalfSuit) {
        if (!teamPlayers.includes(assignments[getCardKey(card)])) {
          return { success: false, error: 'All cards must be assigned to players on the selected team' } as const;
        }
      }

      const updatedPlayerHands = { ...game.playerHands };
      let allCorrect = true;

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
      updatedScores[allCorrect ? declareeTeam : oppositeTeam]++;

      let gameOver = game.gameOver;
      const wasGameOver = gameOver !== null;
      if (updatedScores[0] >= 5) gameOver = { winner: 0 };
      else if (updatedScores[1] >= 5) gameOver = { winner: 1 };

      transaction.update(gameRef, {
        playerHands: updatedPlayerHands,
        scores: updatedScores,
        completedHalfsuits: [...game.completedHalfsuits, halfSuit],
        declarations: [...game.declarations, { declareeId, halfSuit, team, assignments, correct: allCorrect, timestamp: new Date() }],
        declarePhase: null,
        gameOver
      });

      return { success: true, gameOver, wasGameOver, updatedScores, gameId: game.gameId } as const;
    });

    if (!result.success) return result;

    if (result.gameOver && !result.wasGameOver) {
      const lobbyRef = doc(db, 'lobbies', result.gameId);
      const lobbySnap = await getDoc(lobbyRef);
      if (lobbySnap.exists()) {
        const current = lobbySnap.data()?.historicalScores || { 0: 0, 1: 0 };
        await updateDoc(lobbyRef, {
          historicalScores: { 0: current[0] + result.updatedScores[0], 1: current[1] + result.updatedScores[1] }
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in finishDeclaration:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const voteForReplay = async (
  gameDocId: string,
  playerId: string
): Promise<{ success: boolean; error?: string; shouldReplay?: boolean }> => {
  try {
    const gameRef = doc(db, 'games', gameDocId);

    const result = await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) return { success: false, error: 'Game not found' } as const;

      const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

      if (!game.gameOver) return { success: false, error: 'Game is not over' } as const;
      if (game.replayVotes.includes(playerId)) return { success: false, error: 'You have already voted for replay' } as const;

      const lobbyRef = doc(db, 'lobbies', game.gameId);
      const lobbySnap = await transaction.get(lobbyRef);

      if (!lobbySnap.exists()) return { success: false, error: 'Lobby not found' } as const;

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
      } as const;
    });

    if (!result.success) return result;

    if (result.allNonHostVoted) {
      const teamAssignments: { [pid: string]: 0 | 1 } = {};
      result.game.players.forEach(pid => { teamAssignments[pid] = result.game.teams[pid]; });

      const newGameDocId = await createGame(result.game.gameId, result.game.players, teamAssignments);

      await updateDoc(result.lobbyRef, {
        status: 'playing',
        onGoingGame: newGameDocId,
        historicalScores: result.historicalScores
      });

      return { success: true, shouldReplay: true };
    }

    return { success: true, shouldReplay: false };
  } catch (error) {
    console.error('Error in voteForReplay:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const LEAVE_TIMEOUT_SECONDS = 60;

export const leaveGame = async (
  gameDocId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameRef = doc(db, 'games', gameDocId);

    return await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) return { success: false, error: 'Game not found' };

      const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

      if (!game.players.includes(playerId)) return { success: false, error: 'You are not in this game' };
      if (game.gameOver) return { success: false, error: 'Game is already over' };
      if (game.leftPlayer) return { success: false, error: 'A player has already left' };

      transaction.update(gameRef, {
        leftPlayer: {
          odId: playerId,
          odAt: Date.now()
        }
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error in leaveGame:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const returnToGame = async (
  gameDocId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameRef = doc(db, 'games', gameDocId);

    return await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) return { success: false, error: 'Game not found' };

      const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

      if (!game.leftPlayer) return { success: false, error: 'No player has left' };
      if (game.leftPlayer.odId !== playerId) return { success: false, error: 'You are not the player who left' };
      if (game.gameOver) return { success: false, error: 'Game is already over' };

      // Check if timeout has expired
      const elapsed = Date.now() - game.leftPlayer.odAt;
      if (elapsed >= LEAVE_TIMEOUT_SECONDS * 1000) {
        return { success: false, error: 'Return timeout has expired' };
      }

      transaction.update(gameRef, {
        leftPlayer: null
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error in returnToGame:', error);
    return { success: false, error: 'An error occurred' };
  }
};

export const forfeitGame = async (
  gameDocId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameRef = doc(db, 'games', gameDocId);

    const result = await runTransaction(db, async (transaction) => {
      const gameSnap = await transaction.get(gameRef);

      if (!gameSnap.exists()) return { success: false, error: 'Game not found' } as const;

      const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

      if (game.gameOver) return { success: false, error: 'Game is already over' } as const;
      if (!game.leftPlayer) return { success: false, error: 'No player has left' } as const;

      // The team of the player who left loses
      const leftPlayerTeam = game.teams[game.leftPlayer.odId];
      const winningTeam = leftPlayerTeam === 0 ? 1 : 0;

      transaction.update(gameRef, {
        gameOver: { winner: winningTeam },
        leftPlayer: null
      });

      return { success: true, gameId: game.gameId, winningTeam } as const;
    });

    if (!result.success) return result;

    // Update lobby historical scores
    const lobbyRef = doc(db, 'lobbies', result.gameId);
    const lobbySnap = await getDoc(lobbyRef);
    if (lobbySnap.exists()) {
      const current = lobbySnap.data()?.historicalScores || { 0: 0, 1: 0 };
      const updatedScores = { ...current };
      updatedScores[result.winningTeam]++;
      await updateDoc(lobbyRef, { historicalScores: updatedScores });
    }

    return { success: true };
  } catch (error) {
    console.error('Error in forfeitGame:', error);
    return { success: false, error: 'An error occurred' };
  }
};

