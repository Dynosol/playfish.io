import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToGame,
  getPlayerHand,
  getTeamPlayers,
  getOpponents,
  askForCard,
  belongsToHalfSuit,
  getHalfSuitFromCard,
  getAllCardsInHalfSuit,
  getCardKey,
  isPlayerAlive,
  startDeclaration,
  finishDeclaration,
  voteForReplay,
  type Card
} from '../firebase/gameService';
import { subscribeToLobby, returnToLobby, replayGame } from '../firebase/lobbyService';
import type { Game } from '../firebase/gameService';
import type { Lobby } from '../firebase/lobbyService';
import ChatBox from '../components/ChatBox';
import { useUsernames } from '../hooks/useUsername';

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [selectedOpponent, setSelectedOpponent] = useState<string>('');
  const [selectedSuit, setSelectedSuit] = useState<Card['suit']>('spades');
  const [selectedRank, setSelectedRank] = useState<Card['rank']>('A');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAsking, setIsAsking] = useState(false);
  const [declareError, setDeclareError] = useState<string>('');
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [declarationHalfSuit, setDeclarationHalfSuit] = useState<Card['halfSuit'] | null>(null);
  const [declarationTeam, setDeclarationTeam] = useState<0 | 1 | null>(null);
  const [declarationAssignments, setDeclarationAssignments] = useState<{ [cardKey: string]: string }>({});

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

  useEffect(() => {
    if (game && !game.declarePhase?.active) {
      setDeclarationHalfSuit(null);
      setDeclarationTeam(null);
      setDeclarationAssignments({});
      setDeclareError('');
    }
  }, [game]);

  const playersArray = useMemo(() => game?.players || [], [game?.players]);
  const usernames = useUsernames(playersArray);

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
  const currentTurnUsername = usernames.get(game.currentTurn) || `Player ${game.currentTurn.slice(0, 16)}`;
  const isMyTurn = isPlayer && game.currentTurn === user.uid;
  const currentTurnPlayerName = game.currentTurn === user?.uid
    ? 'You'
    : currentTurnUsername;

  const opponents = isPlayer ? getOpponents(game, user.uid) : [];

  // Available ranks and suits
  const allSuits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const allRanks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '9', '10', 'J', 'Q', 'K'];

  const myHalfSuits = isPlayer
    ? Array.from(new Set(playerHand.map(card => card.halfSuit)))
    : [];

  const handleAskForCard = async () => {
    if (!isPlayer || !game) return;

    setErrorMessage('');
    setIsAsking(true);

    const card: Card = { 
      suit: selectedSuit, 
      rank: selectedRank, 
      halfSuit: getHalfSuitFromCard(selectedSuit, selectedRank) 
    };

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

  const canAskForCard = (): boolean => {
    if (!isPlayer || !selectedOpponent) return false;
    if (game.declarePhase?.active) return false;
    if (isGameOver) return false;

    const cardHalfSuit = getHalfSuitFromCard(selectedSuit, selectedRank);

    return belongsToHalfSuit(playerHand, cardHalfSuit) &&
           !playerHand.some(c => c.suit === selectedSuit && c.rank === selectedRank);
  };

  const handleDeclare = async () => {
    if (!isPlayer || !game || !user) return;

    setDeclareError('');
    setIsDeclaring(true);
    setDeclarationHalfSuit(null);
    setDeclarationTeam(null);
    setDeclarationAssignments({});

    const result = await startDeclaration(game.id, user.uid);

    if (!result.success && result.error) {
      setDeclareError(result.error);
      setIsDeclaring(false);
    } else {
      setIsDeclaring(false);
    }
  };

  const handleSelectHalfSuit = (halfSuit: Card['halfSuit']) => {
    setDeclarationHalfSuit(halfSuit);
    setDeclarationTeam(null);
    setDeclarationAssignments({});
  };

  const handleSelectTeam = (team: 0 | 1) => {
    setDeclarationTeam(team);
    setDeclarationAssignments({});
  };

  const handleAssignCard = (cardKey: string, playerId: string) => {
    setDeclarationAssignments(prev => ({
      ...prev,
      [cardKey]: playerId
    }));
  };

  const handleFinishDeclaration = async () => {
    if (!isPlayer || !game || !user) return;
    if (!declarationHalfSuit || declarationTeam === null) return;

    setDeclareError('');
    setIsDeclaring(true);

    const result = await finishDeclaration(
      game.id,
      user.uid,
      declarationHalfSuit,
      declarationTeam,
      declarationAssignments
    );

    if (!result.success && result.error) {
      setDeclareError(result.error);
    } else {
      setDeclarationHalfSuit(null);
      setDeclarationTeam(null);
      setDeclarationAssignments({});
    }

    setIsDeclaring(false);
  };

  const isInDeclarePhase = game.declarePhase?.active || false;
  const isDeclaree = isPlayer && game.declarePhase?.declareeId === user?.uid;
  const allHalfSuits: Card['halfSuit'][] = [
    'low-spades', 'high-spades', 'low-hearts', 'high-hearts',
    'low-diamonds', 'high-diamonds', 'low-clubs', 'high-clubs'
  ];
  const availableHalfSuits = allHalfSuits.filter(hs => !game.completedHalfsuits.includes(hs));
  const isGameOver = game.gameOver?.winner !== null && game.gameOver?.winner !== undefined;
  const winningTeam = game.gameOver?.winner ?? null;
  const historicalScores = lobby?.historicalScores || { 0: 0, 1: 0 };
  const isHost = lobby?.createdBy === user?.uid;
  const nonHostPlayers = game.players.filter(p => p !== lobby?.createdBy);
  const replayVoteCount = game.replayVotes?.filter(v => nonHostPlayers.includes(v)).length || 0;
  const hasVotedForReplay = game.replayVotes?.includes(user?.uid || '') || false;

  const handleReturnToLobby = async () => {
    if (!gameId) return;
    try {
      await returnToLobby(gameId);
    } catch (error) {
      console.error('Failed to return to lobby:', error);
    }
  };

  const handleReplay = async () => {
    if (!gameId || !isHost) return;
    try {
      await replayGame(gameId);
    } catch (error) {
      console.error('Failed to replay game:', error);
    }
  };

  const handleVoteForReplay = async () => {
    if (!game || !user || hasVotedForReplay) return;
    try {
      const result = await voteForReplay(game.id, user.uid);
      if (!result.success && result.error) {
        console.error('Failed to vote for replay:', result.error);
      }
    } catch (error) {
      console.error('Failed to vote for replay:', error);
    }
  };

  return (
    <div>
      <div>
        <h1>Game: {lobby.name}</h1>
        <Link to="/">Back to Home</Link>

        {isGameOver && winningTeam !== null ? (
          <div>
            <h2>TEAM {winningTeam === 0 ? '1' : '2'} WINS!</h2>
            <div>
              <h3>Winning Team Members:</h3>
              <ul>
                {getTeamPlayers(game, winningTeam as 0 | 1).map(playerId => {
                  const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
                  const isCurrentUser = playerId === user?.uid;
                  return (
                    <li key={playerId}>
                      {isCurrentUser ? 'You' : playerUsername}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3>Game History</h3>
              <div>
                <h4>Turns</h4>
                <ul>
                  {game.turns.map((turn, index) => {
                    const askerName = usernames.get(turn.askerId) || `Player ${turn.askerId.slice(0, 16)}`;
                    const targetName = usernames.get(turn.targetId) || `Player ${turn.targetId.slice(0, 16)}`;
                    return (
                      <li key={index}>
                        {askerName} asked {targetName} for {turn.card.rank} of {turn.card.suit} - {turn.success ? 'Success' : 'Failed'}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <h4>Declarations</h4>
                <ul>
                  {game.declarations.map((declaration, index) => {
                    const declareeName = usernames.get(declaration.declareeId) || `Player ${declaration.declareeId.slice(0, 16)}`;
                    return (
                      <li key={index}>
                        {declareeName} declared {declaration.halfSuit} for Team {declaration.team === 0 ? '1' : '2'} - {declaration.correct ? 'Correct' : 'Incorrect'}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <div>
              {isHost ? (
                <button onClick={handleReplay}>
                  Replay {nonHostPlayers.length > 0 ? `(${replayVoteCount}/${nonHostPlayers.length})` : ''}
                </button>
              ) : (
                <button onClick={handleVoteForReplay} disabled={hasVotedForReplay}>
                  {hasVotedForReplay ? 'Voted for Replay' : 'Vote for Replay'}
                </button>
              )}
              <button onClick={handleReturnToLobby}>Back to Lobby</button>
            </div>
          </div>
        ) : (
          <div>
            <h2>
              {isInDeclarePhase 
                ? `Declaration Phase - ${game.declarePhase?.declareeId === user?.uid ? 'Your' : usernames.get(game.declarePhase?.declareeId || '') || 'Player'}'s Declaration`
                : isMyTurn ? "It's Your Turn!" : `It is ${currentTurnPlayerName}'s turn.`}
            </h2>
          </div>
        )}

        <div>
          <h3>Scores</h3>
          <div>Team 1: {game.scores?.[0] || 0}</div>
          <div>Team 2: {game.scores?.[1] || 0}</div>
          {historicalScores && (historicalScores[0] > 0 || historicalScores[1] > 0) && (
            <div>
              <h4>Historical Scores</h4>
              <div>Team 1: {historicalScores[0]}</div>
              <div>Team 2: {historicalScores[1]}</div>
            </div>
          )}
        </div>

        {game.completedHalfsuits && game.completedHalfsuits.length > 0 && (
          <div>
            <h3>Completed Halfsuits</h3>
            <div>
              {game.completedHalfsuits.join(', ')}
            </div>
          </div>
        )}

        {!isPlayer && (
          <div>
            <h2>YOU ARE SPECTATING</h2>
          </div>
        )}

        {isPlayer && isMyTurn && !isInDeclarePhase && !isGameOver && (
          <div>
            <h3>Ask for a Card</h3>

            <div>
              <label>Select Opponent: </label>
              <select
                value={selectedOpponent}
                onChange={(e) => setSelectedOpponent(e.target.value)}
              >
                <option value="">-- Select Opponent --</option>
                {opponents.map(opponentId => {
                  const opponentUsername = usernames.get(opponentId) || `Player ${opponentId.slice(0, 16)}`;
                  return (
                    <option key={opponentId} value={opponentId}>
                      {opponentUsername} ({game.playerHands[opponentId]?.length || 0} cards)
                    </option>
                  );
                })}
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
                  {card.rank} of {card.suit} ({card.halfSuit})
                </div>
              ))}
            </div>
          </div>
        )}

        {isPlayer && !isInDeclarePhase && !isGameOver && isPlayerAlive(game, user.uid) && (
          <div>
            <button onClick={handleDeclare} disabled={isDeclaring}>
              {isDeclaring ? 'Starting Declaration...' : 'Declare'}
            </button>
            {declareError && (
              <div>
                {declareError}
              </div>
            )}
          </div>
        )}

        {isInDeclarePhase && !isGameOver && isDeclaree && (
          <div>
            <h3>Declaration Phase</h3>
            
            {!declarationHalfSuit && (
              <div>
                <h4>Step 1: Select Halfsuit</h4>
                <div>
                  {availableHalfSuits.map(halfSuit => (
                    <button
                      key={halfSuit}
                      onClick={() => handleSelectHalfSuit(halfSuit)}
                    >
                      {halfSuit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {declarationHalfSuit && declarationTeam === null && (
              <div>
                <h4>Step 2: Select Team</h4>
                <div>
                  Selected Halfsuit: {declarationHalfSuit}
                </div>
                <div>
                  <button onClick={() => handleSelectTeam(0)}>
                    Team 1
                  </button>
                  <button onClick={() => handleSelectTeam(1)}>
                    Team 2
                  </button>
                </div>
              </div>
            )}

            {declarationHalfSuit && declarationTeam !== null && (
              <div>
                <h4>Step 3: Assign Cards</h4>
                <div>
                  Halfsuit: {declarationHalfSuit}
                </div>
                <div>
                  Team: {declarationTeam === 0 ? 'Team 1' : 'Team 2'}
                </div>
                <div>
                  {getAllCardsInHalfSuit(declarationHalfSuit).map(card => {
                    const cardKey = getCardKey(card);
                    const assignedPlayerId = declarationAssignments[cardKey];
                    const teamPlayers = getTeamPlayers(game, declarationTeam);
                    
                    return (
                      <div key={cardKey}>
                        <span>{card.rank} of {card.suit}: </span>
                        <select
                          value={assignedPlayerId || ''}
                          onChange={(e) => handleAssignCard(cardKey, e.target.value)}
                        >
                          <option value="">-- Select Player --</option>
                          {teamPlayers.map(playerId => {
                            const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
                            const isCurrentUser = playerId === user?.uid;
                            return (
                              <option key={playerId} value={playerId}>
                                {isCurrentUser ? 'You' : playerUsername}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <button
                    onClick={handleFinishDeclaration}
                    disabled={isDeclaring || !getAllCardsInHalfSuit(declarationHalfSuit).every(card => {
                      const cardKey = getCardKey(card);
                      return declarationAssignments[cardKey] !== undefined;
                    })}
                  >
                    {isDeclaring ? 'Finishing...' : 'Finish Declaration'}
                  </button>
                </div>
              </div>
            )}

            {declareError && (
              <div>
                {declareError}
              </div>
            )}
          </div>
        )}

        {isInDeclarePhase && !isGameOver && !isDeclaree && (
          <div>
            <h3>Declaration in Progress</h3>
            <div>
              {usernames.get(game.declarePhase?.declareeId || '') || 'A player'} is making a declaration.
              Please wait...
            </div>
          </div>
        )}

        <div>    
          <div>
            <h3>Team 1</h3>
            <ul>
              {getTeamPlayers(game, 0).map(playerId => {
                const playerHandSize = game.playerHands[playerId]?.length || 0;
                const isCurrentUser = playerId === user?.uid;
                const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
                return (
                  <li key={playerId}>
                    {isCurrentUser ? 'You' : playerUsername} - {playerHandSize} cards
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
                const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
                return (
                  <li key={playerId}>
                    {isCurrentUser ? 'You' : playerUsername} - {playerHandSize} cards
                  </li>
                );
              })}
            </ul>
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

