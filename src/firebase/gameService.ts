import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  // setDoc
} from 'firebase/firestore';
import { db } from './config';

export interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '9' | '10' | 'J' | 'Q' | 'K';
}

export interface Game {
  id: string;
  gameId: string;
  players: string[];
  playerHands: { [playerId: string]: Card[] };
  turns: any[];
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

export const createGame = async (gameId: string, players: string[]): Promise<string> => {
  const playerHands = distributeCards(players);
  
  const gameData = {
    gameId,
    players,
    playerHands,
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

