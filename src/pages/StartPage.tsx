import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useCurrentSession } from '../contexts/CurrentSessionContext';
import SEO from '@/components/SEO';
import { useUsers } from '../hooks/useUsername';
import { getUserColorHex } from '../utils/userColors';
import { subscribeToActiveLobbies, createLobby, joinLobby } from '../firebase/lobbyService';
import { returnToGame } from '../firebase/gameService';
import type { Lobby } from '../firebase/lobbyService';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatBox from '@/components/ChatBox';
import LobbyListTable from '@/components/lobby/LobbyListTable';
import CreateLobbyForm from '@/components/lobby/CreateLobbyForm';
import PowerGraph from '@/components/PowerGraph';

const StartPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentLobby, currentGame } = useCurrentSession();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const navigate = useNavigate();

  const hostUids = useMemo(() => lobbies.map(l => l.createdBy).filter(Boolean), [lobbies]);
  const hostUsersData = useUsers(hostUids);

  const getHostUsername = (hostId: string) => hostUsersData.get(hostId)?.username || '...';
  const getHostColor = (hostId: string) => getUserColorHex(hostUsersData.get(hostId)?.color || 'slate');

  // Subscribe to active lobbies list (this is different from currentLobby - it lists all lobbies)
  useEffect(() => {
    if (!user) {
      setLobbies([]);
      setLoadingLobbies(false);
      return;
    }

    setLoadingLobbies(true);
    const unsubscribe = subscribeToActiveLobbies((lobbiesList) => {
      setLobbies(lobbiesList);
      setLoadingLobbies(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleCreateLobby = async (name: string, maxPlayers: number, isPrivate: boolean) => {
    if (!user) return;
    if (currentLobby) return;

    const lobbyId = await createLobby({
      name,
      createdBy: user.uid,
      maxPlayers,
      isPrivate
    });
    navigate(`/lobby/${lobbyId}`);
  };

  const handleJoinGame = async (lobbyId: string) => {
    if (!user) return;

    setJoining(lobbyId);
    try {
      await joinLobby(lobbyId, user.uid);
      navigate(`/lobby/${lobbyId}`);
    } catch (error) {
      console.error('Failed to join lobby:', error);
      setJoining(null);
    }
  };

  const handleSpectate = (lobbyId: string, status: string) => {
    if (status === 'playing') {
      navigate(`/game/${lobbyId}`);
    } else {
      navigate(`/lobby/${lobbyId}`);
    }
  };

  // Handle returning to game when user has left (clears leftPlayer and navigates)
  const handleReturnToGame = async (lobbyId: string) => {
    if (!currentGame || !user || isReturning) return;

    setIsReturning(true);
    try {
      const result = await returnToGame(currentGame.id, user.uid);
      if (result.success) {
        navigate(`/game/${lobbyId}`);
      } else {
        console.error('Failed to return to game:', result.error);
      }
    } catch (error) {
      console.error('Failed to return to game:', error);
    } finally {
      setIsReturning(false);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Play Fish Online"
        description="Play Fish online - the classic 6-player team card game of deduction and strategy. Create or join a game, form teams, and compete in real-time multiplayer matches. Not Go Fish!"
        canonical="/"
      />
      <Header type="home" />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar - Global Chat (hidden on mobile) */}
        <div className="hidden lg:block p-3 shrink-0">
          <ChatBox chatId="global" className="border border-gray-200" title="Global Chat" />
        </div>

        <main className="flex-1 overflow-hidden p-2 sm:p-3 flex flex-col">
          <div className="container mx-auto flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 flex-1 min-h-0">
              {/* Center: Lobby List */}
              <div className="lg:col-span-2 flex flex-col min-h-0">
                {loadingLobbies ? (
                  <div className="p-8 text-center text-muted-foreground">Loading lobbies...</div>
                ) : (
                  <LobbyListTable
                    lobbies={lobbies}
                    currentLobby={currentLobby}
                    currentGame={currentGame}
                    user={user}
                    joining={joining}
                    isReturning={isReturning}
                    onJoinGame={handleJoinGame}
                    onSpectate={handleSpectate}
                    onReturnToGame={handleReturnToGame}
                    getHostUsername={getHostUsername}
                    getHostColor={getHostColor}
                  />
                )}

                {/* Game info - directly below lobby list */}
                <div
                  className="flex items-center gap-2 sm:gap-4 rounded-lg p-2 sm:p-4 mt-2 sm:mt-3 shrink-0"
                  style={{ backgroundColor: '#F3F4F6' }}
                >
                  <PowerGraph className="shrink-0 scale-[0.6] sm:scale-100 -m-6 sm:m-0" />
                  <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    <p className="font-semibold text-gray-700 mb-1">The Game of Fish</p>
                    <p>
                      A strategic team card game of deduction and memory for 6 players.
                      Ask opponents for cards, deduce holdings from questions asked, and
                      declare complete half-suits to score. The best strategy divulges
                      information to teammates while hiding it from opponents.
                    </p>
                    <p className="mt-2 text-xs italic text-gray-500 hidden sm:block">
                      "A perfect history of the game is more valuable than perfect logic based on incomplete information."
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Center: Create Game */}
              <div>
                <CreateLobbyForm
                  currentLobby={currentLobby}
                  onCreateLobby={handleCreateLobby}
                />
              </div>
            </div>

            {/* Mobile Chat - shown at bottom on mobile */}
            <div className="lg:hidden mt-2 sm:mt-3 pb-14">
              <ChatBox chatId="global" className="border border-gray-200 rounded-lg h-48" title="Global Chat" />
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default StartPage;
