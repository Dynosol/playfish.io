import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToGame, getPlayerHand } from '../firebase/gameService';
import { subscribeToLobby } from '../firebase/lobbyService';
import type { Game } from '../firebase/gameService';
import type { Lobby } from '../firebase/lobbyService';
import ChatBox from '../components/ChatBox';

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!gameId) return;

    let gameUnsubscribe: (() => void) | null = null;

    const lobbyUnsubscribe = subscribeToLobby(gameId, (lobbyData) => {
      setLobby(lobbyData);
      
      if (gameUnsubscribe) {
        gameUnsubscribe();
        gameUnsubscribe = null;
      }
      
      if (lobbyData?.onGoingGame) {
        gameUnsubscribe = subscribeToGame(lobbyData.onGoingGame, (gameData) => {
          setGame(gameData);
          setLoading(false);
        });
      } else {
        setGame(null);
        setLoading(false);
      }
    });

    return () => {
      lobbyUnsubscribe();
      if (gameUnsubscribe) {
        gameUnsubscribe();
      }
    };
  }, [gameId]);

  if (loading) {
    return <div>Loading game...</div>;
  }

  if (!lobby) {
    return (
      <div>
        <h1>Lobby not found</h1>
        <Link to="/join">Find another lobby</Link>
      </div>
    );
  }

  if (!lobby.onGoingGame || !game) {
    return (
      <div>
        <h1>Game not started</h1>
        <Link to={`/lobby/${gameId}`}>Back to Lobby</Link>
      </div>
    );
  }

  const isPlayer = user && game.players.includes(user.uid);
  const playerHand = isPlayer ? getPlayerHand(game, user.uid) : [];

  return (
    <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 40px)', padding: '20px' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <h1>Game: {lobby.name}</h1>
        <Link to="/">Back to Home</Link>
        
        {!isPlayer && (
          <div>
            <h2>YOU ARE SPECTATING</h2>
          </div>
        )}

        {isPlayer && (
          <div>
            <h2>Your Hand ({playerHand.length} cards)</h2>
            <div>
              {playerHand.map((card, index) => (
                <div key={index}>
                  {card.rank} of {card.suit}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2>Players</h2>
          <ul>
            {game.players.map(playerId => {
              const playerHandSize = game.playerHands[playerId]?.length || 0;
              const isCurrentUser = playerId === user?.uid;
              return (
                <li key={playerId}>
                  {isCurrentUser ? 'You' : `Player ${playerId.slice(0, 8)}`} - {playerHandSize} cards
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div style={{ width: '350px', height: '50%', flexShrink: 0 }}>
        <ChatBox gameId={game.id} />
      </div>
    </div>
  );
};

export default GamePage;

