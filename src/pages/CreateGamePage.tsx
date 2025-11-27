import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createLobby } from '../firebase/lobbyService';
import { useAuth } from '../contexts/AuthContext';

const CreateGamePage: React.FC = () => {
  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !lobbyName.trim()) return;
    
    const allowed = [4,6,8];
    const sanitizedMax = allowed.includes(maxPlayers) ? maxPlayers : 4;

    setCreating(true);
    
    try {
      const lobbyId = await createLobby({
        name: lobbyName,
        createdBy: user.uid,
        maxPlayers: maxPlayers
      });
      console.log('Lobby created with ID:', lobbyId);
      navigate(`/lobby/${lobbyId}`);
    } catch (error) {
      console.error('Error creating lobby:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1>Create Lobby</h1>
      <Link to="/">Back to Home</Link>
      
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
  );
};

export default CreateGamePage;
