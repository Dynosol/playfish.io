import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leaveLobby, subscribeToLobby, joinLobby, startLobby } from '../firebase/lobbyService';
import type { Lobby } from '../firebase/lobbyService';

const LobbyPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = subscribeToLobby(gameId, (lobbyData) => {
      setLobby(lobbyData);
      setLoading(false);
    });

    return unsubscribe;
  }, [gameId]);

  useEffect(() => {
    if (!user || !lobby || !gameId || lobby.players.includes(user.uid)) return;

    const handleJoin = async () => {
      try {
        await joinLobby(gameId, user.uid);
      } catch (error) {
        console.error('Failed to join lobby:', error);
      }
    };

    handleJoin();
  }, [user, lobby, gameId]);

  const handleLeaveLobby = async () => {
    if (!user || !gameId) return;

    try {
      await leaveLobby(gameId, user.uid);
      navigate('/join');
    } catch (error) {
      console.error('Failed to leave lobby:', error);
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

      {lobby.status === 'playing' && (
        <div>
          <h2>Lobby in Progress</h2>
          <p>Lobby logic will be implemented here</p>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;

