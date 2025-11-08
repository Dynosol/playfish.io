import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const CreateGamePage: React.FC = () => {
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !gameName.trim()) return;
    
    setCreating(true);
    
    try {
      const gameData = {
        name: gameName,
        createdBy: user.uid,
        players: [user.uid],
        maxPlayers: maxPlayers,
        status: 'waiting',
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'games'), gameData);
      console.log('Game created with ID:', docRef.id);
      navigate(`/game/${docRef.id}`);
    } catch (error) {
      console.error('Error creating game:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1>Create Game</h1>
      <Link to="/">Back to Home</Link>
      
      <form onSubmit={handleCreateGame}>
        <div>
          <label>
            Game Name:
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              required
              disabled={creating}
            />
          </label>
        </div>
        
        <div>
          <label>
            Max Players:
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              disabled={creating}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6</option>
            </select>
          </label>
        </div>
        
        <button type="submit" disabled={creating || !gameName.trim()}>
          {creating ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    </div>
  );
};

export default CreateGamePage;
