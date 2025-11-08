import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface Game {
  id: string;
  name: string;
  players: string[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
}

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = onSnapshot(doc(db, 'games', gameId), (doc) => {
      if (doc.exists()) {
        setGame({ id: doc.id, ...doc.data() } as Game);
      } else {
        setGame(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [gameId]);

  useEffect(() => {
    if (!user || !game || game.players.includes(user.uid)) return;

    const joinGame = async () => {
      if (game.players.length < game.maxPlayers) {
        await updateDoc(doc(db, 'games', gameId!), {
          players: arrayUnion(user.uid)
        });
      }
    };

    joinGame();
  }, [user, game, gameId]);

  const handleLeaveGame = async () => {
    if (!user || !gameId) return;

    await updateDoc(doc(db, 'games', gameId), {
      players: arrayRemove(user.uid)
    });

    navigate('/join');
  };

  const handleStartGame = async () => {
    if (!gameId || !game || game.createdBy !== user?.uid) return;

    await updateDoc(doc(db, 'games', gameId), {
      status: 'playing'
    });
  };

  if (loading) {
    return <div>Loading game...</div>;
  }

  if (!game) {
    return (
      <div>
        <h1>Game not found</h1>
        <Link to="/join">Find another game</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>{game.name}</h1>
      <Link to="/">Back to Home</Link>
      
      <div>
        <h2>Game Status: {game.status}</h2>
        <h3>Players ({game.players.length}/{game.maxPlayers}):</h3>
        <ul>
          {game.players.map(playerId => (
            <li key={playerId}>
              Player {playerId.slice(0, 8)}
              {playerId === game.createdBy && ' (Host)'}
              {playerId === user?.uid && ' (You)'}
            </li>
          ))}
        </ul>
      </div>

      <div>
        {game.status === 'waiting' && game.createdBy === user?.uid && (
          <button onClick={handleStartGame} disabled={game.players.length < 2}>
            Start Game
          </button>
        )}
        
        <button onClick={handleLeaveGame}>
          Leave Game
        </button>
      </div>

      {game.status === 'playing' && (
        <div>
          <h2>Game in Progress</h2>
          <p>Game logic will be implemented here</p>
        </div>
      )}
    </div>
  );
};

export default GamePage;
