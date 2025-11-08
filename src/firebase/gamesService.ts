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
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

export interface Game {
  id: string;
  name: string;
  players: string[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: Date;
}

export interface CreateGameData {
  name: string;
  createdBy: string;
  maxPlayers: number;
}

export const subscribeToActiveGames = (
  callback: (games: Game[]) => void
): (() => void) => {
  const gamesQuery = query(
    collection(db, 'games'),
    where('status', 'in', ['waiting', 'playing'])
  );

  return onSnapshot(gamesQuery, (snapshot) => {
    const gamesList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Game));
    callback(gamesList);
  });
};

export const subscribeToGame = (
  gameId: string,
  callback: (game: Game | null) => void
): (() => void) => {
  return onSnapshot(doc(db, 'games', gameId), (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback({ id: docSnapshot.id, ...docSnapshot.data() } as Game);
    } else {
      callback(null);
    }
  });
};

export const createGame = async (gameData: CreateGameData): Promise<string> => {
  const docRef = await addDoc(collection(db, 'games'), {
    ...gameData,
    players: [gameData.createdBy],
    status: 'waiting',
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const joinGame = async (gameId: string, userId: string): Promise<void> => {
  await updateDoc(doc(db, 'games', gameId), {
    players: arrayUnion(userId)
  });
};

export const leaveGame = async (gameId: string, userId: string): Promise<void> => {
  await updateDoc(doc(db, 'games', gameId), {
    players: arrayRemove(userId)
  });
};

export const startGame = async (gameId: string): Promise<void> => {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'playing'
  });
};

