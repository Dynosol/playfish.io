import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToGame,
  getPlayerHand,
  getTeamPlayers,
  getOpponents,
  askForCard,
  getHalfSuit,
  belongsToHalfSuit,
  type Card
} from '../firebase/gameService';
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

  // State for asking for cards
  const [selectedOpponent, setSelectedOpponent] = useState<string>('');
  const [selectedSuit, setSelectedSuit] = useState<Card['suit']>('spades');
  const [selectedRank, setSelectedRank] = useState<Card['rank']>('A');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAsking, setIsAsking] = useState(false);

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

  const isMyTurn = isPlayer && game.currentTurn === user.uid;
  const currentTurnPlayerName = game.currentTurn === user?.uid
    ? 'You'
    : `Player ${game.currentTurn.slice(0, 8)}`;

  const opponents = isPlayer ? getOpponents(game, user.uid) : [];

  // Available ranks and suits
  const allSuits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const allRanks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '9', '10', 'J', 'Q', 'K'];

  // Get half-suits the player belongs to
  const myHalfSuits = isPlayer
    ? Array.from(new Set(playerHand.map(card => getHalfSuit(card))))
    : [];

  const handleAskForCard = async () => {
    if (!isPlayer || !game) return;

    setErrorMessage('');
    setIsAsking(true);

    const card: Card = { suit: selectedSuit, rank: selectedRank };

    const result = await askForCard(game.id, user.uid, selectedOpponent, card);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    } else {
      // Clear selections on success
      setSelectedOpponent('');
      setErrorMessage('');
    }

    setIsAsking(false);
  };

  // Check if the selected card is valid to ask for
  const canAskForCard = (): boolean => {
    if (!isPlayer || !selectedOpponent) return false;

    const card: Card = { suit: selectedSuit, rank: selectedRank };
    const cardHalfSuit = getHalfSuit(card);

    return belongsToHalfSuit(playerHand, cardHalfSuit) &&
           !playerHand.some(c => c.suit === card.suit && c.rank === card.rank);
  };

  return (
    <div>
      <div>
        <h1>Game: {lobby.name}</h1>
        <Link to="/">Back to Home</Link>

        <div>
          <h2>
            {isMyTurn ? "It's Your Turn!" : `It is ${currentTurnPlayerName}'s turn.`}
          </h2>
        </div>

        {!isPlayer && (
          <div>
            <h2>YOU ARE SPECTATING</h2>
          </div>
        )}

        {isPlayer && isMyTurn && (
          <div>
            <h3>Ask for a Card</h3>

            <div>
              <label>Select Opponent: </label>
              <select
                value={selectedOpponent}
                onChange={(e) => setSelectedOpponent(e.target.value)}
              >
                <option value="">-- Select Opponent --</option>
                {opponents.map(opponentId => (
                  <option key={opponentId} value={opponentId}>
                    Player {opponentId.slice(0, 8)} ({game.playerHands[opponentId]?.length || 0} cards)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Select Suit: </label>
              <select
                value={selectedSuit}
                onChange={(e) => setSelectedSuit(e.target.value as Card['suit'])}
              >
                {allSuits.map(suit => (
                  <option key={suit} value={suit}>{suit}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Select Rank: </label>
              <select
                value={selectedRank}
                onChange={(e) => setSelectedRank(e.target.value as Card['rank'])}
              >
                {allRanks.map(rank => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>

            <div>
              <p>
                Your half-suits: {myHalfSuits.join(', ')}
              </p>
            </div>

            <button
              onClick={handleAskForCard}
              disabled={!canAskForCard() || isAsking}
            >
              {isAsking ? 'Asking...' : 'Ask for Card'}
            </button>

            {errorMessage && (
              <div>
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {isPlayer && (
          <div>
            <h2>Your Hand ({playerHand.length} cards)</h2>
            <div>
              {playerHand.map((card, index) => (
                <div key={index}>
                  {card.rank} of {card.suit} ({getHalfSuit(card)})
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2>Teams</h2>
          <div>
            <div>
              <h3>Team 1</h3>
              <ul>
                {getTeamPlayers(game, 0).map(playerId => {
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
            <div>
              <h3>Team 2</h3>
              <ul>
                {getTeamPlayers(game, 1).map(playerId => {
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
        </div>

        <div>
          <h2>Turn History</h2>
          <div>
            {game.turns.length === 0 ? (
              <p>No turns yet</p>
            ) : (
              game.turns.slice().reverse().map((turn, index) => {
                const askerName = turn.askerId === user?.uid ? 'You' : `Player ${turn.askerId.slice(0, 8)}`;
                const targetName = turn.targetId === user?.uid ? 'You' : `Player ${turn.targetId.slice(0, 8)}`;

                return (
                  <div key={game.turns.length - 1 - index}>
                    {askerName} asked {targetName} for {turn.card.rank} of {turn.card.suit} - {turn.success ? 'Success!' : 'Failed'}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div>
        <ChatBox gameId={game.id} />
      </div>
    </div>
  );
};

export default GamePage;

