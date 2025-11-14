import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leaveLobby, subscribeToLobby, joinLobby, startLobby } from '../firebase/lobbyService';
import type { Lobby } from '../firebase/lobbyService';

const LobbyPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const isLeavingRef = useRef(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = subscribeToLobby(gameId, (lobbyData) => {
      setLobby(lobbyData);
      setLoading(false);
    });

    return () => {
      isLeavingRef.current = false;
      unsubscribe();
    };
  }, [gameId]);

  useEffect(() => {
    if (!user || !lobby || !gameId || hasJoined || isLeavingRef.current) return;
    
    if (lobby.players.includes(user.uid)) {
      setHasJoined(true);
      return;
    }

    const handleJoin = async () => {
      try {
        await joinLobby(gameId, user.uid);
        setHasJoined(true);
      } catch (error) {
        console.error('Failed to join lobby:', error);
      }
    };

    handleJoin();
  }, [user, lobby, gameId, hasJoined]);

  useEffect(() => {
    if (!lobby || !gameId || !user || isLeavingRef.current) return;
    
    if (lobby.status === 'playing' && lobby.onGoingGame && lobby.players.includes(user.uid)) {
      navigate(`/game/${gameId}`);
    }
  }, [lobby, gameId, user, navigate]);

  const handleLeaveLobby = async () => {
    if (!user || !gameId) return;

    try {
      isLeavingRef.current = true;
      await leaveLobby(gameId, user.uid);
      navigate('/join');
    } catch (error) {
      console.error('Failed to leave lobby:', error);
      isLeavingRef.current = false;
    }
  };

  const handleStartLobby = async () => {
    if (!gameId || !lobby || lobby.createdBy !== user?.uid) return;

    try {
      await startLobby(gameId);
    } catch (error) {
      console.error('Failed to start lobby:', error);
    }
  };

  if (loading) {
    return <div>Loading lobby...</div>;
  }

  if (!lobby) {
    return (
      <div>
        <h1>Lobby not found</h1>
        <Link to="/join">Find another lobby</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>{lobby.name}</h1>
      <Link to="/">Back to Home</Link>
      
      <div>
        <h2>Lobby Status: {lobby.status}</h2>
        <h3>Players ({lobby.players.length}/{lobby.maxPlayers}):</h3>
        <ul>
          {lobby.players.map(playerId => (
            <li key={playerId}>
              Player {playerId.slice(0, 8)}
              {playerId === lobby.createdBy && ' (Host)'}
              {playerId === user?.uid && ' (You)'}
            </li>
          ))}
        </ul>
      </div>

      <div>
        {lobby.status === 'waiting' && lobby.createdBy === user?.uid && (
          <button onClick={handleStartLobby} disabled={lobby.players.length < 2}>
            Start Lobby
          </button>
        )}
        
        <button onClick={handleLeaveLobby}>
          Leave Lobby
        </button>
      </div>

      {lobby.status === 'playing' && lobby.onGoingGame && (
        <div>
          <h2>Game in Progress</h2>
          <Link to={`/game/${gameId}`}>Go to Game</Link>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;

