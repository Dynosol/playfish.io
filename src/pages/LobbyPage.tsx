import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Crown, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentSession } from '../contexts/CurrentSessionContext';
import SEO from '@/components/SEO';
import { leaveLobby, deleteLobby, subscribeToLobby, joinLobby, startLobby, joinTeam, leaveTeam, swapPlayerTeam, areTeamsEven, randomizeTeams } from '../firebase/lobbyService';
import type { Lobby } from '../firebase/lobbyService';
import { useUsers } from '../hooks/useUsername';
import { getUserColorHex } from '../utils/userColors';
import { colors } from '../utils/colors';
import Header from '@/components/Header';
import ChatBox from '@/components/ChatBox';
import TeamPanel from '@/components/lobby/TeamPanel';
import LobbyControls from '@/components/lobby/LobbyControls';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const LobbyPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const { currentLobby: userCurrentLobby } = useCurrentSession();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isLeavingRef = useRef(false);
  const navigate = useNavigate();

  // Subscribe to the lobby being viewed (from URL param)
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

  // If user is viewing a different lobby than their current one, userCurrentLobby comes from context
  // (only show warnings if userCurrentLobby.id !== gameId)

  // Auto-redirect to game when lobby status changes to 'playing'
  useEffect(() => {
    if (!lobby || !gameId || !user) return;

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

    // Don't auto-join if user is already in a DIFFERENT lobby or game
    if (userCurrentLobby && userCurrentLobby.id !== gameId) {
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

  const handleLeaveTeam = async () => {
    if (!gameId || !user) return;

    try {
      await leaveTeam(gameId);
    } catch (error) {
      console.error('Failed to leave team:', error);
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
  // Only show "in active game elsewhere" if user's current lobby is playing AND it's a different lobby
  const isInActiveGameElsewhere = userCurrentLobby?.status === 'playing' && userCurrentLobby?.id !== gameId;
  const isInThisLobby = user && lobby.players.includes(user.uid);
  const historicalScores = lobby.historicalScores || { 0: 0, 1: 0 };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <SEO
        title={`Lobby: ${lobby?.name || 'Loading...'}`}
        description="Fish card game lobby - waiting for players."
        noindex={true}
      />
      <Header type="home" />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar - Chat (hidden on mobile) */}
        <div className="hidden lg:block p-3 shrink-0">
          {gameId && user ? (
            <ChatBox chatId={gameId} className="border border-gray-200" title="Lobby Chat" />
          ) : (
            <div className="w-72" />
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-2 sm:p-3">
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

            <div className="space-y-2 sm:space-y-3">
              {/* Teams and Options */}
              <div className="space-y-2 sm:space-y-3">
                {/* Lobby Header - Centered */}
                <div className="text-center pb-2 sm:pb-3 border-b border-gray-200 bg-white p-3 sm:p-4 rounded shadow">
                  <h1 className="text-xl sm:text-2xl"><span className="font-normal">Lobby name: </span><span className="font-semibold">{lobby.name}</span></h1>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                    <TeamPanel
                      team={0}
                      teamPlayers={team0Players}
                      lobby={lobby}
                      userId={user?.uid}
                      userTeam={userTeam}
                      isHost={isHost}
                      isInThisLobby={!!isInThisLobby}
                      onJoinTeam={handleJoinTeam}
                      onSwapTeam={handleSwapTeam}
                      getUsername={getUsername}
                      getUserColor={getUserColor}
                    />
                    <TeamPanel
                      team={1}
                      teamPlayers={team1Players}
                      lobby={lobby}
                      userId={user?.uid}
                      userTeam={userTeam}
                      isHost={isHost}
                      isInThisLobby={!!isInThisLobby}
                      onJoinTeam={handleJoinTeam}
                      onSwapTeam={handleSwapTeam}
                      getUsername={getUsername}
                      getUserColor={getUserColor}
                    />
                  </div>
                )}

                {/* Unassigned Players */}
                {lobby.status === 'waiting' && (
                  <div className="p-2 border border-gray-200">
                    <h3 className="text-xs text-gray-500 mb-1.5">Unassigned Players</h3>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-2 flex-1">
                        {unassignedPlayers.length > 0 ? (
                          unassignedPlayers.map(playerId => {
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
                          })
                        ) : (
                          <span className="text-sm text-gray-400 italic">None</span>
                        )}
                      </div>
                      {isInThisLobby && userTeam !== null && (
                        <button
                          onClick={handleLeaveTeam}
                          className="px-4 py-2 text-sm text-white font-medium transition-colors rounded hover:opacity-90"
                          style={{ backgroundColor: colors.grayMedium }}
                        >
                          Leave Team
                        </button>
                      )}
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
                <div className="bg-white p-2 sm:p-3 rounded shadow space-y-2 max-w-2xl mx-auto">
                  {/* Status Info */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{lobby.players.length}/{lobby.maxPlayers} players</span>
                    {(lobby.stale || lobby.status === 'playing' || lobby.players.length < 2 || !teamsEven) && (
                      <div
                        className="px-3 py-1 text-xs font-normal rounded-full text-white"
                        style={{
                          backgroundColor: lobby.stale && lobby.status === 'waiting'
                            ? colors.grayMedium
                            : lobby.status === 'waiting'
                              ? colors.purple
                              : '#f59e0b'
                        }}
                      >
                        {lobby.stale && lobby.status === 'waiting'
                          ? 'Stale'
                          : lobby.status === 'waiting'
                            ? (lobby.players.length >= 2 && !teamsEven
                                ? 'Teams must be balanced to start'
                                : 'Waiting for more players')
                            : 'In Progress'}
                      </div>
                    )}
                  </div>

                  <LobbyControls
                    isHost={isHost}
                    isInThisLobby={!!isInThisLobby}
                    isWaiting={lobby.status === 'waiting'}
                    isPlaying={lobby.status === 'playing'}
                    teamsEven={teamsEven}
                    playerCount={lobby.players.length}
                    copied={copied}
                    gameId={gameId || ''}
                    onStartLobby={handleStartLobby}
                    onCopyInviteLink={handleCopyInviteLink}
                    onRandomizeTeams={handleRandomizeTeams}
                    onLeave={() => setShowLeaveConfirm(true)}
                    onDelete={() => setShowDeleteConfirm(true)}
                    onNavigateToGame={() => navigate(`/game/${gameId}`)}
                    onSpectateGame={() => navigate(`/game/${gameId}`)}
                  />

                  {!isInThisLobby && lobby.status === 'waiting' && (
                    <p className="text-xs text-gray-500 text-center">
                      {userCurrentLobby && userCurrentLobby.id !== gameId
                        ? (userCurrentLobby.status === 'playing'
                            ? 'You must leave your current game before joining another'
                            : 'You must leave your current lobby before joining another')
                        : 'You are spectating this lobby'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Chat - shown at bottom on mobile, inside main content area for consistent spacing */}
            {gameId && user && (
              <div className="lg:hidden mt-2 sm:mt-3">
                <ChatBox chatId={gameId} className="border border-gray-200 rounded-lg h-48" title="Lobby Chat" />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Leave Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLeaveConfirm}
        title="Leave Lobby?"
        message="Are you sure you want to leave this lobby?"
        confirmLabel="Leave"
        onConfirm={() => {
          setShowLeaveConfirm(false);
          handleLeaveLobby();
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Lobby?"
        message="This will permanently delete the lobby and remove all players. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleDeleteLobby();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default LobbyPage;
