import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Crown, Check, AlertCircle } from 'lucide-react';
import swapIcon from '@/assets/swap.png';
import leaveIcon from '@/assets/leave.png';
import randomizeIcon from '@/assets/randomize.png';
import copyIcon from '@/assets/copy.png';
import trashIcon from '@/assets/trash.png';
import playIcon from '@/assets/play.png';
import { useAuth } from '../contexts/AuthContext';
import { leaveLobby, deleteLobby, subscribeToLobby, joinLobby, startLobby, joinTeam, swapPlayerTeam, areTeamsEven, randomizeTeams } from '../firebase/lobbyService';
import type { Lobby } from '../firebase/lobbyService';
import { subscribeToUser, type UserDocument } from '../firebase/userService';
import { useUsers } from '../hooks/useUsername';
import { getUserColorHex } from '../utils/userColors';
import { colors } from '../utils/colors';
import Header from '@/components/Header';
import ChatBox from '@/components/ChatBox';

const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
`;

const LobbyPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [userCurrentLobby, setUserCurrentLobby] = useState<Lobby | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUser(user.uid, (userData) => {
      setUserDoc(userData);
    });

    return unsubscribe;
  }, [user]);

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

  // Auto-redirect to game when lobby status changes to 'playing'
  useEffect(() => {
    if (!lobby || !gameId || !user) return;

    // If the game has started and the user is in this lobby, redirect to the game
    if (lobby.status === 'playing' && lobby.players.includes(user.uid)) {
      navigate(`/game/${gameId}`);
    }
  }, [lobby?.status, lobby?.players, user, gameId, navigate]);

  useEffect(() => {
    if (!user || !lobby || !gameId || hasJoined || isLeavingRef.current) return;

    if (lobby.players.includes(user.uid)) {
      setHasJoined(true);
      return;
    }

    // Don't auto-join if user is already in another lobby or game
    if (userCurrentLobby) {
      return;
    }

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


  const handleLeaveLobby = async () => {
    if (!user || !gameId) return;

    try {
      isLeavingRef.current = true;
      await leaveLobby(gameId, user.uid);
      navigate('/');
    } catch (error) {
      console.error('Failed to leave lobby:', error);
      isLeavingRef.current = false;
    }
  };

  const handleDeleteLobby = async () => {
    if (!user || !gameId) return;

    try {
      await deleteLobby(gameId, user.uid);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete lobby:', error);
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

  const handleJoinTeam = async (team: 0 | 1) => {
    if (!gameId || !user) return;

    try {
      await joinTeam(gameId, user.uid, team);
    } catch (error) {
      console.error('Failed to join team:', error);
    }
  };

  const handleSwapTeam = async (playerId: string) => {
    if (!gameId || !lobby || lobby.createdBy !== user?.uid) return;

    try {
      await swapPlayerTeam(gameId, playerId);
    } catch (error) {
      console.error('Failed to swap team:', error);
    }
  };

  const handleRandomizeTeams = async () => {
    if (!gameId || !lobby || lobby.createdBy !== user?.uid) return;

    try {
      await randomizeTeams(gameId, user.uid);
    } catch (error) {
      console.error('Failed to randomize teams:', error);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getTeamPlayers = (team: 0 | 1 | null): string[] => {
    if (!lobby) return [];
    return lobby.players.filter(playerId => lobby.teams[playerId] === team);
  };

  const getUnassignedPlayers = (): string[] => {
    if (!lobby) return [];
    return lobby.players.filter(playerId => lobby.teams[playerId] === null);
  };

  const usersData = useUsers(lobby?.players || []);

  // Helper to get styled username
  const getUsername = (playerId: string) => usersData.get(playerId)?.username || `Player ${playerId.slice(0, 8)}`;
  const getUserColor = (playerId: string) => getUserColorHex(usersData.get(playerId)?.color || 'slate');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading lobby...</div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header type="home" />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white border border-gray-200 p-6 max-w-md w-full text-center">
            <h1 className="text-base font-semibold mb-1">Lobby not found</h1>
            <p className="text-sm text-gray-500 mb-4">This lobby may have been deleted or doesn't exist.</p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2 px-4 text-sm bg-black text-white font-medium hover:opacity-90 transition-opacity"
            >
              Back to Home
            </button>
          </div>
        </main>
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
  const historicalScores = lobby.historicalScores || { 0: 0, 1: 0 };

  const PlayerRow = ({ playerId, showSwap = false, index }: { playerId: string; showSwap?: boolean; index: number }) => {
    const isCurrentUser = playerId === user?.uid;
    const isPlayerHost = playerId === lobby.createdBy;

    return (
      <tr>
        <td className="py-2 pr-2 text-base text-black font-bold w-6">{index + 1}</td>
        <td className="py-2" colSpan={2}>
          <div className="inline-flex items-center bg-white px-3 py-2 rounded shadow-sm">
            <span className="text-base font-semibold" style={{ color: getUserColor(playerId) }}>
              {isCurrentUser ? 'You' : getUsername(playerId)}
            </span>
            {isPlayerHost && (
              <Crown className="h-3.5 w-3.5 text-yellow-400 ml-1.5" />
            )}
            {showSwap && isHost && !isCurrentUser && (
              <button
                onClick={() => handleSwapTeam(playerId)}
                className="p-1 hover:bg-gray-100 transition-colors ml-1.5 rounded"
              >
                <img src={swapIcon} alt="Swap" className="h-4 w-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <Header type="home" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Chat */}
        <div className="p-3 shrink-0">
          {gameId && user ? (
            <ChatBox chatId={gameId} className="border border-gray-200" title="Lobby Chat" />
          ) : (
            <div className="w-72" />
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-3">
          <div className="container mx-auto">
            {/* Warning if in another active game */}
            {isInActiveGameElsewhere && !isInThisLobby && (
              <div className="mb-3 border p-2" style={{ borderColor: colors.red }}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" style={{ color: colors.red }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: colors.red }}>You're in an active game</p>
                    <p className="text-xs text-gray-500">Finish your current game before joining this lobby.</p>
                  </div>
                  <button
                    onClick={() => navigate(`/game/${userCurrentLobby?.id}`)}
                    className="px-3 py-1.5 text-sm text-white font-medium transition-colors hover:opacity-90"
                    style={{ backgroundColor: colors.red }}
                  >
                    Return to Game
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Teams and Options */}
              <div className="space-y-3">
                {/* Lobby Header - Centered */}
                <div className="text-center pb-3 border-b border-gray-200 bg-white p-4 rounded shadow">
                  <h1 className="text-2xl font-semibold">{lobby.name}</h1>
                  {(historicalScores[0] > 0 || historicalScores[1] > 0) && (
                    <div className="mt-2 inline-block bg-white px-4 py-2 rounded shadow-sm text-2xl font-bold">
                      Score: <span style={{ color: colors.red }}>{historicalScores[0]}</span>
                      <span className="mx-1">-</span>
                      <span style={{ color: colors.blue }}>{historicalScores[1]}</span>
                    </div>
                  )}
                </div>

                {/* Teams */}
                {lobby.status === 'waiting' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Red Team */}
                    <div className="bg-gray-50 p-4 pb-6 rounded shadow">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${colors.red}` }}>
                            <th className="py-2 text-left text-sm font-semibold" style={{ color: colors.red }} colSpan={2}>
                              Red Team
                            </th>
                            <th className="py-2 text-right">
                              <span style={{ backgroundColor: colors.red, color: 'white', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px' }}>{team0Players.length}/{lobby.maxPlayers / 2}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: Math.max(team0Players.length, lobby.maxPlayers / 2) }).map((_, index) => {
                            const playerId = team0Players[index];
                            return playerId ? (
                              <PlayerRow key={playerId} playerId={playerId} showSwap index={index} />
                            ) : (
                              <tr key={`empty-0-${index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="py-2 pr-2 text-base text-black font-bold w-6">{index + 1}</td>
                                <td className="py-2 text-base text-gray-300 italic" colSpan={2}>Empty</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {user && userTeam !== 0 && isInThisLobby && (
                        <button
                          onClick={() => handleJoinTeam(0)}
                          className="w-full mt-2 py-2 text-sm text-white font-medium transition-colors rounded hover:opacity-90"
                          style={{ backgroundColor: colors.red }}
                        >
                          Join Red Team
                        </button>
                      )}
                    </div>

                    {/* Blue Team */}
                    <div className="bg-gray-50 p-4 pb-6 rounded shadow">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${colors.blue}` }}>
                            <th className="py-2 text-left text-sm font-semibold" style={{ color: colors.blue }} colSpan={2}>
                              Blue Team
                            </th>
                            <th className="py-2 text-right">
                              <span style={{ backgroundColor: colors.blue, color: 'white', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px' }}>{team1Players.length}/{lobby.maxPlayers / 2}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: Math.max(team1Players.length, lobby.maxPlayers / 2) }).map((_, index) => {
                            const playerId = team1Players[index];
                            return playerId ? (
                              <PlayerRow key={playerId} playerId={playerId} showSwap index={index} />
                            ) : (
                              <tr key={`empty-1-${index}`} className="border-b border-gray-100 last:border-b-0">
                                <td className="py-2 pr-2 text-base text-black font-bold w-6">{index + 1}</td>
                                <td className="py-2 text-base text-gray-300 italic" colSpan={2}>Empty</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {user && userTeam !== 1 && isInThisLobby && (
                        <button
                          onClick={() => handleJoinTeam(1)}
                          className="w-full mt-2 py-2 text-sm text-white font-medium transition-colors rounded hover:opacity-90"
                          style={{ backgroundColor: colors.blue }}
                        >
                          Join Blue Team
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Unassigned Players */}
                {lobby.status === 'waiting' && unassignedPlayers.length > 0 && (
                  <div className="p-2 border border-gray-200">
                    <h3 className="text-xs text-gray-500 mb-1.5">Unassigned Players</h3>
                    <div className="flex flex-wrap gap-2">
                      {unassignedPlayers.map(playerId => {
                        const isCurrentUser = playerId === user?.uid;
                        const isPlayerHost = playerId === lobby.createdBy;

                        return (
                          <div key={playerId} className="flex items-center gap-1">
                            <span className="text-sm font-semibold" style={{ color: getUserColor(playerId) }}>
                              {isCurrentUser ? 'You' : getUsername(playerId)}
                            </span>
                            {isPlayerHost && <Crown className="h-3 w-3 text-yellow-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Game in progress */}
                {lobby.status === 'playing' && lobby.onGoingGame && (
                  <div className="p-6 text-center border border-gray-200">
                    <h2 className="text-base font-semibold mb-1">Game in Progress</h2>
                    <p className="text-sm text-gray-500">This lobby has an active game.</p>
                  </div>
                )}

                {/* Options */}
                <div className="bg-white p-3 rounded shadow space-y-2 max-w-2xl mx-auto">
                  {/* Status Info */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{lobby.players.length}/{lobby.maxPlayers} players</span>
                    {(lobby.status === 'playing' || lobby.players.length < 2 || !teamsEven) && (
                      <div
                        className="px-3 py-1 text-xs font-normal rounded-full text-white"
                        style={{ backgroundColor: lobby.status === 'waiting' ? colors.purple : '#f59e0b' }}
                      >
                        {lobby.status === 'waiting'
                          ? (lobby.players.length >= 2 && !teamsEven
                              ? 'Teams must be balanced to start'
                              : 'Waiting for more players')
                          : 'In Progress'}
                      </div>
                    )}
                  </div>

                  {lobby.status === 'waiting' && isInThisLobby && isHost && (
                    <>
                      <style>{shimmerKeyframes}</style>
                      <button
                        onClick={handleStartLobby}
                        disabled={!teamsEven || lobby.players.length < 2}
                        className="w-full relative overflow-hidden flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded"
                        style={{
                          backgroundColor: teamsEven && lobby.players.length >= 2 ? colors.purple : '#e5e7eb',
                          color: teamsEven && lobby.players.length >= 2 ? 'white' : '#9ca3af',
                          cursor: teamsEven && lobby.players.length >= 2 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {teamsEven && lobby.players.length >= 2 && (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 65%, transparent 100%)',
                              backgroundSize: '300% 100%',
                              animation: 'shimmer 3s linear infinite',
                            }}
                          />
                        )}
                        <img src={playIcon} alt="Play" className="h-3.5 w-3.5 relative z-10" />
                        <span className="relative z-10">Start Game</span>
                      </button>

                      {!teamsEven && (
                        <p className="text-xs flex items-center gap-1.5" style={{ color: colors.red }}>
                          <AlertCircle className="h-3.5 w-3.5" />
                          Teams must be even to start
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 bg-gray-50 p-3 rounded shadow min-w-max">
                        <button
                          onClick={handleCopyInviteLink}
                          className="flex items-center gap-1 text-sm text-black underline hover:opacity-70 transition-opacity whitespace-nowrap"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <img src={copyIcon} alt="Copy" className="h-3.5 w-3.5" />}
                          {copied ? 'Copied!' : 'Copy Invite Link'}
                        </button>
                        <button
                          onClick={handleRandomizeTeams}
                          className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
                          style={{ color: colors.blue }}
                        >
                          <img src={randomizeIcon} alt="Randomize" className="h-3.5 w-3.5" />
                          Randomize Teams
                        </button>
                        <button
                          onClick={() => setShowLeaveConfirm(true)}
                          className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
                          style={{ color: colors.red }}
                        >
                          <img src={leaveIcon} alt="Leave" className="h-3.5 w-3.5" />
                          Leave Lobby
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
                          style={{ color: colors.red }}
                        >
                          <img src={trashIcon} alt="Delete" className="h-3.5 w-3.5" />
                          Delete Lobby
                        </button>
                      </div>
                    </>
                  )}

                  {lobby.status === 'waiting' && isInThisLobby && !isHost && (
                    <div className="flex gap-4 bg-gray-50 p-3 rounded shadow min-w-max">
                      <button
                        onClick={handleCopyInviteLink}
                        className="flex items-center gap-1 text-sm text-black underline hover:opacity-70 transition-opacity whitespace-nowrap"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <img src={copyIcon} alt="Copy" className="h-3.5 w-3.5" />}
                        {copied ? 'Copied!' : 'Copy Invite Link'}
                      </button>
                      <button
                        onClick={() => setShowLeaveConfirm(true)}
                        className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
                        style={{ color: colors.red }}
                      >
                        <img src={leaveIcon} alt="Leave" className="h-3.5 w-3.5" />
                        Leave Lobby
                      </button>
                    </div>
                  )}

                  {lobby.status === 'playing' && isInThisLobby && (
                    <button
                      onClick={() => navigate(`/game/${gameId}`)}
                      className="w-full py-2 text-sm text-white font-medium transition-colors rounded hover:opacity-90"
                      style={{ backgroundColor: colors.green }}
                    >
                      Return to game
                    </button>
                  )}

                  {lobby.status === 'playing' && !isInThisLobby && (
                    <button
                      onClick={() => navigate(`/game/${gameId}`)}
                      style={{ backgroundColor: colors.purple, color: 'white' }}
                      className="w-full py-2 text-sm font-medium transition-colors rounded hover:opacity-90"
                    >
                      Spectate game
                    </button>
                  )}

                  {!isInThisLobby && lobby.status === 'waiting' && (
                    <p className="text-xs text-gray-500 text-center">
                      {userCurrentLobby?.status === 'playing'
                        ? 'You must leave your current game before joining another'
                        : userCurrentLobby
                          ? 'You must leave your current lobby before joining another'
                          : 'You are spectating this lobby'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">Leave Lobby?</h2>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to leave this lobby?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleLeaveLobby();
                }}
                className="flex-1 py-2 text-sm font-medium text-white rounded hover:opacity-90 transition-opacity"
                style={{ backgroundColor: colors.red }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">Delete Lobby?</h2>
            <p className="text-sm text-gray-500 mb-4">This will permanently delete the lobby and remove all players. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDeleteLobby();
                }}
                className="flex-1 py-2 text-sm font-medium text-white rounded hover:opacity-90 transition-opacity"
                style={{ backgroundColor: colors.red }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
