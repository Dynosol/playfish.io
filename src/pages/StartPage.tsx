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
import ChatBox from '@/components/ChatBox';
import LobbyListTable from '@/components/lobby/LobbyListTable';
import CreateLobbyForm from '@/components/lobby/CreateLobbyForm';

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

        <main className="flex-1 overflow-y-auto p-2 sm:p-3">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3">
              {/* Center: Lobby List */}
              <div className="lg:col-span-2 space-y-2 sm:space-y-3">
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
              </div>

              {/* Right Center: Create Game */}
              <div>
                <CreateLobbyForm
                  currentLobby={currentLobby}
                  onCreateLobby={handleCreateLobby}
                />
              </div>
            </div>

            {/* Mobile Chat - shown at bottom on mobile, inside main content area for consistent spacing */}
            <div className="lg:hidden mt-2 sm:mt-3 pb-14">
              <ChatBox chatId="global" className="border border-gray-200 rounded-lg h-48" title="Global Chat" />
            </div>
          </div>
        </main>
      </div>

      {/* Footer - fixed to bottom of viewport */}
      <footer
        className="border-t border-gray-200 bg-background py-3 px-4"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}
      >
        <div className="container mx-auto flex justify-center gap-6 text-sm text-muted-foreground">
          <a href="/rules" className="hover:text-foreground transition-colors">Help</a>
          <a href="/about" className="hover:text-foreground transition-colors">About</a>
        </div>
      </footer>
    </div>
  );
};

export default StartPage;
