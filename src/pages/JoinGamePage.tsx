import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToActiveGames } from '../firebase/gamesService';
import type { Game } from '../firebase/gamesService';

const JoinGamePage: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToActiveGames((gamesList) => {
      setGames(gamesList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleJoinGame = (gameId: string) => {
    console.log('Joining game:', gameId);
  };

  return (
    <div>
      <h1>Join Game</h1>
      <Link to="/">Back to Home</Link>
      
      {loading ? (
        <p>Loading games...</p>
      ) : games.length === 0 ? (
        <p>No active games found. <Link to="/create">Create a new game</Link></p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Game Name</th>
              <th>Players</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {games.map(game => (
              <tr key={game.id}>
                <td>{game.name}</td>
                <td>{game.players?.length || 0}/{game.maxPlayers || 4}</td>
                <td>{game.status}</td>
                <td>
                  <button onClick={() => handleJoinGame(game.id)}>
                    Join
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default JoinGamePage;
