import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Crown, Users, ArrowLeftRight, Shuffle, Play, LogOut, Copy, Check, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { leaveLobby, subscribeToLobby, joinLobby, startLobby, joinTeam, swapPlayerTeam, areTeamsEven, randomizeTeams } from '../firebase/lobbyService';
import type { Lobby } from '../firebase/lobbyService';
import { subscribeToUser, type UserDocument } from '../firebase/userService';
import { useUsernames } from '../hooks/useUsername';
import Header from '@/components/Header';
import ChatBox from '@/components/ChatBox';
import { cn } from '@/lib/utils';

const LobbyPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [userCurrentLobby, setUserCurrentLobby] = useState<Lobby | null>(null);
  const [copied, setCopied] = useState(false);
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

  useEffect(() => {
    if (!user || !lobby || !gameId || hasJoined || isLeavingRef.current) return;

    if (lobby.players.includes(user.uid)) {
      setHasJoined(true);
      return;
    }

    if (userCurrentLobby?.status === 'playing') {
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
      navigate('/');
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

  const usernames = useUsernames(lobby?.players || []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-slate-500">Loading lobby...</div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col">
        <Header type="home" />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold mb-2">Lobby not found</h1>
            <p className="text-slate-500 mb-6">This lobby may have been deleted or doesn't exist.</p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
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

  const PlayerRow = ({ playerId, team, showSwap = false }: { playerId: string; team: 0 | 1; showSwap?: boolean }) => {
    const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 8)}`;
    const isCurrentUser = playerId === user?.uid;
    const isPlayerHost = playerId === lobby.createdBy;

    return (
      <div className={cn(
        "flex items-center justify-between py-3 px-4 rounded-xl transition-all",
        team === 0 ? "hover:bg-red-100 dark:hover:bg-red-900/30" : "hover:bg-blue-100 dark:hover:bg-blue-900/30"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
            team === 0 ? "bg-gradient-to-br from-red-400 to-red-600" : "bg-gradient-to-br from-blue-400 to-blue-600"
          )}>
            {playerUsername.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold", isCurrentUser && "text-emerald-600 dark:text-emerald-400")}>
                {isCurrentUser ? 'You' : playerUsername}
              </span>
              {isPlayerHost && (
                <Crown className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>
        </div>
        {showSwap && isHost && !isCurrentUser && (
          <button
            onClick={() => handleSwapTeam(playerId)}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
          >
            <ArrowLeftRight className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col">
      <Header type="home" />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Warning if in another active game */}
        {isInActiveGameElsewhere && !isInThisLobby && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-800 dark:text-red-200">You're in an active game</p>
                <p className="text-sm text-red-600 dark:text-red-400">Finish your current game before joining this lobby.</p>
              </div>
              <button
                onClick={() => navigate(`/game/${userCurrentLobby?.id}`)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Return to Game
              </button>
            </div>
          </div>
        )}

        {/* Lobby Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{lobby.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {lobby.players.length}/{lobby.maxPlayers} players
                </span>
                {(historicalScores[0] > 0 || historicalScores[1] > 0) && (
                  <span>
                    Series: <span className="text-red-500 font-bold">{historicalScores[0]}</span>
                    <span className="mx-1">-</span>
                    <span className="text-blue-500 font-bold">{historicalScores[1]}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyInviteLink}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                  copied
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Invite Link'}
              </button>
              <div className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium",
                lobby.status === 'waiting'
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
              )}>
                {lobby.status === 'waiting' ? 'Waiting for players' : 'In Progress'}
              </div>
            </div>
          </div>
        </div>

        {/* Teams */}
        {lobby.status === 'waiting' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Red Team */}
            <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20 rounded-2xl p-6 border border-red-200/50 dark:border-red-800/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Red Team</h2>
                <span className="px-3 py-1 bg-red-200/50 dark:bg-red-800/50 text-red-700 dark:text-red-300 rounded-full text-sm font-bold">
                  {team0Players.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {team0Players.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No players yet</p>
                ) : (
                  team0Players.map(playerId => (
                    <PlayerRow key={playerId} playerId={playerId} team={0} showSwap />
                  ))
                )}
              </div>
              {user && userTeam !== 0 && isInThisLobby && (
                <button
                  onClick={() => handleJoinTeam(0)}
                  className="w-full mt-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-red-500/25"
                >
                  Join Red Team
                </button>
              )}
            </div>

            {/* Blue Team */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400">Blue Team</h2>
                <span className="px-3 py-1 bg-blue-200/50 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-bold">
                  {team1Players.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {team1Players.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No players yet</p>
                ) : (
                  team1Players.map(playerId => (
                    <PlayerRow key={playerId} playerId={playerId} team={1} showSwap />
                  ))
                )}
              </div>
              {user && userTeam !== 1 && isInThisLobby && (
                <button
                  onClick={() => handleJoinTeam(1)}
                  className="w-full mt-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/25"
                >
                  Join Blue Team
                </button>
              )}
            </div>
          </div>
        )}

        {/* Unassigned Players */}
        {lobby.status === 'waiting' && unassignedPlayers.length > 0 && (
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-6 mb-6 border-2 border-dashed border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-400 mb-4">Unassigned Players</h3>
            <div className="flex flex-wrap gap-3">
              {unassignedPlayers.map(playerId => {
                const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 8)}`;
                const isCurrentUser = playerId === user?.uid;
                const isPlayerHost = playerId === lobby.createdBy;

                return (
                  <div
                    key={playerId}
                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-full"
                  >
                    <div className="h-6 w-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      {playerUsername.charAt(0).toUpperCase()}
                    </div>
                    <span className={cn("text-sm font-medium", isCurrentUser && "text-emerald-600 dark:text-emerald-400")}>
                      {isCurrentUser ? 'You' : playerUsername}
                    </span>
                    {isPlayerHost && <Crown className="h-3 w-3 text-amber-500" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        {lobby.status === 'waiting' && isInThisLobby && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {isHost && (
                <>
                  <button
                    onClick={handleRandomizeTeams}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                  >
                    <Shuffle className="h-4 w-4" />
                    Randomize
                  </button>
                  <button
                    onClick={handleStartLobby}
                    disabled={!teamsEven || lobby.players.length < 2}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                      teamsEven && lobby.players.length >= 2
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    <Play className="h-4 w-4" />
                    Start Game
                  </button>
                </>
              )}
              <button
                onClick={handleLeaveLobby}
                className="flex items-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Leave
              </button>
            </div>
            {isHost && !teamsEven && (
              <p className="text-center text-sm text-slate-400 mt-4 flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Teams must be even to start
              </p>
            )}
          </div>
        )}

        {/* Game in progress */}
        {lobby.status === 'playing' && lobby.onGoingGame && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Game in Progress</h2>
            <p className="text-slate-500 mb-6">This lobby has an active game.</p>
            <button
              onClick={() => navigate(`/game/${gameId}`)}
              className="px-8 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              {isInThisLobby ? 'Go to Game' : 'Spectate Game'}
            </button>
          </div>
        )}
      </main>

      {/* Chat Box */}
      {gameId && isInThisLobby && (
        <div className="fixed bottom-4 right-4 z-50">
          <ChatBox gameId={gameId} />
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
