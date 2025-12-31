import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUserDocument } from './UserDocumentContext';
import { subscribeToLobby } from '../firebase/lobbyService';
import { subscribeToGame } from '../firebase/gameService';
import type { Lobby } from '../firebase/lobbyService';
import type { Game } from '../firebase/gameService';

interface CurrentSessionContextType {
  currentLobby: Lobby | null;
  currentGame: Game | null;
  loading: boolean;
}

const CurrentSessionContext = createContext<CurrentSessionContextType>({
  currentLobby: null,
  currentGame: null,
  loading: true,
});

export const useCurrentSession = () => useContext(CurrentSessionContext);

export const CurrentSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userDoc, loading: userDocLoading } = useUserDocument();
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [gameLoading, setGameLoading] = useState(false);

  // Subscribe to lobby based on userDoc.currentLobbyId
  useEffect(() => {
    if (!userDoc?.currentLobbyId) {
      setCurrentLobby(null);
      setLobbyLoading(false);
      return;
    }

    setLobbyLoading(true);
    const unsubscribe = subscribeToLobby(userDoc.currentLobbyId, (lobby) => {
      setCurrentLobby(lobby);
      setLobbyLoading(false);
    });

    return unsubscribe;
  }, [userDoc?.currentLobbyId]);

  // Subscribe to game based on currentLobby.onGoingGame
  useEffect(() => {
    if (!currentLobby?.onGoingGame) {
      setCurrentGame(null);
      setGameLoading(false);
      return;
    }

    setGameLoading(true);
    const unsubscribe = subscribeToGame(currentLobby.onGoingGame, (game) => {
      setCurrentGame(game);
      setGameLoading(false);
    });

    return unsubscribe;
  }, [currentLobby?.onGoingGame]);

  const loading = userDocLoading || lobbyLoading || gameLoading;

  return (
    <CurrentSessionContext.Provider value={{ currentLobby, currentGame, loading }}>
      {children}
    </CurrentSessionContext.Provider>
  );
};
