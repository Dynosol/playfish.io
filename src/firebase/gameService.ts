import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './config';

export interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '9' | '10' | 'J' | 'Q' | 'K';
}

export type HalfSuit = 'low-spades' | 'high-spades' | 'low-hearts' | 'high-hearts' |
                       'low-diamonds' | 'high-diamonds' | 'low-clubs' | 'high-clubs';

export interface Turn {
  askerId: string;
  targetId: string;
  card: Card;
  success: boolean;
  timestamp: Date;
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
  createdAt: Date;
}

const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '9', '10', 'J', 'Q', 'K'];

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
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
  return game.players.filter(playerId => game.teams[playerId] === team);
};

export const getPlayerTeam = (game: Game, playerId: string): 0 | 1 | undefined => {
  return game.teams[playerId];
};

// Helper function to determine which half-suit a card belongs to
export const getHalfSuit = (card: Card): HalfSuit => {
  const lowRanks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7'];
  const highRanks: Card['rank'][] = ['9', '10', 'J', 'Q', 'K'];

  const isLow = lowRanks.includes(card.rank);
  const prefix = isLow ? 'low' : 'high';

  return `${prefix}-${card.suit}` as HalfSuit;
};

// Check if a player belongs to a half-suit (has at least one card in it)
export const belongsToHalfSuit = (hand: Card[], halfSuit: HalfSuit): boolean => {
  return hand.some(card => getHalfSuit(card) === halfSuit);
};

// Check if player has a specific card
export const hasCard = (hand: Card[], targetCard: Card): boolean => {
  return hand.some(card => card.suit === targetCard.suit && card.rank === targetCard.rank);
};

// Get all opponent player IDs for a given player
export const getOpponents = (game: Game, playerId: string): string[] => {
  const playerTeam = game.teams[playerId];
  if (playerTeam === undefined) return [];

  return game.players.filter(id => id !== playerId && game.teams[id] !== playerTeam);
};

// Main function to ask for a card
export const askForCard = async (
  gameDocId: string,
  askerId: string,
  targetId: string,
  card: Card
): Promise<{ success: boolean; error?: string }> => {
  try {
    const gameRef = doc(db, 'games', gameDocId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      return { success: false, error: 'Game not found' };
    }

    const game = { id: gameSnap.id, ...gameSnap.data() } as Game;

    // Validation 1: Is it the asker's turn?
    if (game.currentTurn !== askerId) {
      return { success: false, error: 'It is not your turn' };
    }

    // Validation 2: Is the target an opponent?
    const opponents = getOpponents(game, askerId);
    if (!opponents.includes(targetId)) {
      return { success: false, error: 'You must ask a player on the opposing team' };
    }

    const askerHand = game.playerHands[askerId] || [];
    const targetHand = game.playerHands[targetId] || [];

    // Validation 3: Does the asker already have this card?
    if (hasCard(askerHand, card)) {
      return { success: false, error: 'You already have this card' };
    }

    // Validation 4: Does the asker belong to this half-suit?
    const cardHalfSuit = getHalfSuit(card);
    if (!belongsToHalfSuit(askerHand, cardHalfSuit)) {
      return { success: false, error: 'You do not belong to this half-suit' };
    }

    // Check if target has the card
    const targetHasCard = hasCard(targetHand, card);

    // Update game state
    const updatedPlayerHands = { ...game.playerHands };
    let newCurrentTurn = game.currentTurn;

    if (targetHasCard) {
      // Transfer card from target to asker
      updatedPlayerHands[targetId] = targetHand.filter(
        c => !(c.suit === card.suit && c.rank === card.rank)
      );
      updatedPlayerHands[askerId] = [...askerHand, card];
      // Asker gets another turn
      newCurrentTurn = askerId;
    } else {
      // Turn passes to the target
      newCurrentTurn = targetId;
    }

    // Record the turn
    const newTurn: Turn = {
      askerId,
      targetId,
      card,
      success: targetHasCard,
      timestamp: new Date()
    };

    // Update Firestore
    await updateDoc(gameRef, {
      playerHands: updatedPlayerHands,
      currentTurn: newCurrentTurn,
      turns: [...game.turns, newTurn]
    });

    return { success: true };
  } catch (error) {
    console.error('Error in askForCard:', error);
    return { success: false, error: 'An error occurred' };
  }
};

