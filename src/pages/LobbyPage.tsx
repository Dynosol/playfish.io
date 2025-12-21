import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leaveLobby, subscribeToLobby, joinLobby, startLobby, joinTeam, swapPlayerTeam, areTeamsEven, randomizeTeams } from '../firebase/lobbyService';
import type { Lobby } from '../firebase/lobbyService';
import { subscribeToUser, type UserDocument } from '../firebase/userService';
import { useUsernames } from '../hooks/useUsername';

const LobbyPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [userCurrentLobby, setUserCurrentLobby] = useState<Lobby | null>(null);
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

  // Subscribe to user document to check their current lobby
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUser(user.uid, (userData) => {
      setUserDoc(userData);
    });

    return unsubscribe;
  }, [user]);

  // Subscribe to user's current lobby (if different from this one)
  useEffect(() => {
    if (!userDoc?.currentLobbyId || userDoc.currentLobbyId === gameId) {
      setUserCurrentLobby(null);
      return;
    }

    const unsubscribe = subscribeToLobby(userDoc.currentLobbyId, (lobbyData) => {
      setUserCurrentLobby(lobbyData);
    });

    return unsubscribe;
  }, [userDoc?.currentLobbyId, gameId]);

  useEffect(() => {
    if (!user || !lobby || !gameId || hasJoined || isLeavingRef.current) return;

    if (lobby.players.includes(user.uid)) {
      setHasJoined(true);
      return;
    }

    // Don't auto-join if user is in an active game in another lobby
    if (userCurrentLobby?.status === 'playing') {
      return;
    }

    // Don't auto-join if lobby is full or not waiting
    if (lobby.status !== 'waiting' || lobby.players.length >= lobby.maxPlayers) {
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
  }, [user, lobby, gameId, hasJoined, userCurrentLobby]);

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
      alert((error as Error).message);
    }
  };

  const handleJoinTeam = async (team: 0 | 1) => {
    if (!gameId || !user) return;

    try {
      await joinTeam(gameId, user.uid, team);
    } catch (error) {
      console.error('Failed to join team:', error);
      alert((error as Error).message);
    }
  };

  const handleSwapTeam = async (playerId: string) => {
    if (!gameId || !lobby || lobby.createdBy !== user?.uid) return;

    try {
      await swapPlayerTeam(gameId, playerId);
    } catch (error) {
      console.error('Failed to swap team:', error);
      alert((error as Error).message);
    }
  };

  const handleRandomizeTeams = async () => {
    if (!gameId || !lobby || lobby.createdBy !== user?.uid) return;

    try {
      await randomizeTeams(gameId, user.uid);
    } catch (error) {
      console.error('Failed to randomize teams:', error);
      alert((error as Error).message);
    }
  }

  const getTeamPlayers = (team: 0 | 1 | null): string[] => {
    if (!lobby) return [];
    return lobby.players.filter(playerId => lobby.teams[playerId] === team);
  };

  const getUnassignedPlayers = (): string[] => {
    if (!lobby) return [];
    return lobby.players.filter(playerId => lobby.teams[playerId] === null);
  };

  const usernames = useUsernames(lobby?.players || []);

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

  const team0Players = getTeamPlayers(0);
  const team1Players = getTeamPlayers(1);
  const unassignedPlayers = getUnassignedPlayers();
  const teamsEven = areTeamsEven(lobby);
  const isHost = lobby.createdBy === user?.uid;
  const userTeam = user ? lobby.teams[user.uid] : null;

  const isInActiveGameElsewhere = userCurrentLobby?.status === 'playing';
  const isInThisLobby = user && lobby.players.includes(user.uid);

  return (
    <div>
      <h1>{lobby.name}</h1>
      <Link to="/">Back to Home</Link>

      {isInActiveGameElsewhere && !isInThisLobby && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red', margin: '10px 0' }}>
          You are currently in an active game. You cannot join this lobby until your game ends.
          <br />
          <Link to={`/game/${userCurrentLobby.id}`}>Return to your game</Link>
        </div>
      )}

      <div>
        <h2>Lobby Status: {lobby.status}</h2>
        <h3>Players ({lobby.players.length}/{lobby.maxPlayers})</h3>
      </div>

      {lobby.status === 'waiting' && (
        <div>
          <div>
            <h3>Red Team ({team0Players.length})</h3>
            <ul>
              {team0Players.map(playerId => {
                const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
                return (
                  <li key={playerId}>
                    {playerId === user?.uid ? 'You' : playerUsername}
                    {playerId === lobby.createdBy && ' (Host)'}
                    {isHost && playerId !== user?.uid && (
                      <button onClick={() => handleSwapTeam(playerId)}>
                        Swap
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {user && userTeam !== 0 && (
              <button onClick={() => handleJoinTeam(0)}>
                Join Red Team
              </button>
            )}
          </div>

          <div>
            <h3>Blue Team ({team1Players.length})</h3>
            <ul>
              {team1Players.map(playerId => {
                const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
                return (
                  <li key={playerId}>
                    {playerId === user?.uid ? 'You' : playerUsername}
                    {playerId === lobby.createdBy && ' (Host)'}
                    {isHost && playerId !== user?.uid && (
                      <button onClick={() => handleSwapTeam(playerId)}>
                        Swap
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {user && userTeam !== 1 && (
              <button onClick={() => handleJoinTeam(1)}>
                Join Blue Team
              </button>
            )}
          </div>
        </div>
      )}

      {lobby.status === 'waiting' && unassignedPlayers.length > 0 && (
        <div>
          <h3>Unassigned Players</h3>
            <ul>
            {unassignedPlayers.map(playerId => {
              const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
              return (
                <li key={playerId}>
                  {playerId === user?.uid ? 'You' : playerUsername}
                  {playerId === lobby.createdBy && ' (Host)'}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        {lobby.status === 'waiting' && isHost && (
          <button onClick={handleRandomizeTeams}>
            Randomize Teams
          </button>
        )}

        {lobby.status === 'waiting' && isHost && (
          <button onClick={handleStartLobby} disabled={!teamsEven || lobby.players.length < 2}>
            Start Game
          </button>
        )}
        {lobby.status === 'waiting' && isHost && !teamsEven && (
          <span>
            Teams must be even to start the game
          </span>
        )}

        {lobby.status === 'waiting' && (
          <button onClick={handleLeaveLobby}>
            Leave Lobby
          </button>
        )}
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

