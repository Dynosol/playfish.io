import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUser } from '../firebase/userService';
import { subscribeToLobby, subscribeToActiveLobbies, createLobby, joinLobby } from '../firebase/lobbyService';
import type { UserDocument } from '../firebase/userService';
import type { Lobby } from '../firebase/lobbyService';

const StartPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUser(user.uid, (userData) => {
      setUserDoc(userData);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!userDoc?.currentLobbyId) {
      setCurrentLobby(null);
      return;
    }

    const unsubscribe = subscribeToLobby(userDoc.currentLobbyId, (lobby) => {
      setCurrentLobby(lobby);
    });

    return unsubscribe;
  }, [userDoc?.currentLobbyId]);

  useEffect(() => {
    const unsubscribe = subscribeToActiveLobbies((lobbiesList) => {
      setLobbies(lobbiesList);
      setLoadingLobbies(false);
    });

    return unsubscribe;
  }, []);

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !lobbyName.trim()) return;

    setCreating(true);
    
    try {
      const lobbyId = await createLobby({
        name: lobbyName,
        createdBy: user.uid,
        maxPlayers: maxPlayers
      });
      navigate(`/lobby/${lobbyId}`);
    } catch (error) {
      console.error('Error creating lobby:', error);
    } finally {
      setCreating(false);
    }
  };

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

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Fish</h1>
      <p>Welcome, {userDoc?.username ?? 'Loading username...'}</p>
      <nav>
        <ul>
          <li><Link to="/settings">Settings</Link></li>
        </ul>
      </nav>

      {currentLobby && (
        <div>
          <p>
            {currentLobby.status === 'playing' 
              ? `You are currently playing in the game "${currentLobby.name}"`
              : `You are currently waiting in game "${currentLobby.name}"`}
          </p>
          {currentLobby.status === 'playing' ? (
            <Link to={`/game/${currentLobby.id}`}>Go to Game</Link>
          ) : (
            <Link to={`/lobby/${currentLobby.id}`}>Go to Lobby</Link>
          )}
        </div>
      )}

      <div>
        <h2>Create Lobby</h2>
        <form onSubmit={handleCreateLobby}>
          <div>
            <label>
              Lobby Name:
              <input
                type="text"
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                required
                disabled={creating}
              />
            </label>
          </div>
          
          <div>
            <label>
              Number of Players:
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                disabled={creating}
              >
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
              </select>
            </label>
          </div>
          
          <button type="submit" disabled={creating || !lobbyName.trim()}>
            {creating ? 'Creating...' : 'Create Lobby'}
          </button>
        </form>
      </div>

      <div>
        <h2>Join Lobby</h2>
        {loadingLobbies ? (
          <p>Loading lobbies...</p>
        ) : lobbies.length === 0 ? (
          <p>No active lobbies found.</p>
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
    </div>
  );
};

export default StartPage;
