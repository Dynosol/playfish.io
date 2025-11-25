import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { subscribeToActiveLobbies, joinLobby } from '../firebase/lobbyService';
import type { Lobby } from '../firebase/lobbyService';
import { useAuth } from '../contexts/AuthContext';

const JoinGamePage: React.FC = () => {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = subscribeToActiveLobbies((lobbiesList) => {
      setLobbies(lobbiesList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleJoinGame = async (lobbyId: string) => {
    if (!user) return;
    
    setJoining(lobbyId);
    try {
      await joinLobby(lobbyId, user.uid);
      navigate(`/lobby/${lobbyId}`);
    } catch (error) {
      console.error('Failed to join lobby:', error);
      setJoining(null);
    }
  };

  const handleSpectate = (lobbyId: string, status: string) => {
    if (status === 'playing') {
      navigate(`/game/${lobbyId}`);
    } else {
      navigate(`/lobby/${lobbyId}`);
    }
  };

  return (
    <div>
      <h1>Join Lobby</h1>
      <Link to="/">Back to Home</Link>
      
      {loading ? (
        <p>Loading lobbies...</p>
      ) : lobbies.length === 0 ? (
        <p>No active lobbies found. <Link to="/create">Create a new lobby</Link></p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Lobby Name</th>
              <th>Players</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lobbies.map(lobby => {
              const isFull = (lobby.players?.length || 0) >= (lobby.maxPlayers || 4);
              const canJoin = !isFull && lobby.status === 'waiting';
              
              return (
                <tr key={lobby.id}>
                  <td>{lobby.name}</td>
                  <td>{lobby.players?.length || 0}/{lobby.maxPlayers || 4}</td>
                  <td>{lobby.status}</td>
                  <td>
                    {canJoin ? (
                      <button 
                        onClick={() => handleJoinGame(lobby.id)}
                        disabled={joining === lobby.id}
                      >
                        {joining === lobby.id ? 'Joining...' : 'Join'}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSpectate(lobby.id, lobby.status)}
                      >
                        Spectate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default JoinGamePage;
