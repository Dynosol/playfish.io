import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUser } from '../firebase/userService';
import { subscribeToLobby } from '../firebase/lobbyService';
import { subscribeToGame, returnToGame, LEAVE_TIMEOUT_SECONDS } from '../firebase/gameService';
import type { UserDocument } from '../firebase/userService';
import type { Lobby } from '../firebase/lobbyService';
import type { Game } from '../firebase/gameService';

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

const ActiveGameBanner: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [leaveCountdown, setLeaveCountdown] = useState<number | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUser(user.uid, (userData) => {
      setUserDoc(userData);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!userDoc?.currentLobbyId) {
      setCurrentLobby(null);
      return;
    }

    const unsubscribe = subscribeToLobby(userDoc.currentLobbyId, (lobby) => {
      setCurrentLobby(lobby);
    });

    return unsubscribe;
  }, [userDoc?.currentLobbyId]);

  // Subscribe to the current game to check if user has left
  useEffect(() => {
    if (!currentLobby?.onGoingGame) {
      setCurrentGame(null);
      return;
    }

    const unsubscribe = subscribeToGame(currentLobby.onGoingGame, (game) => {
      setCurrentGame(game);
    });

    return unsubscribe;
  }, [currentLobby?.onGoingGame]);

  // Handle countdown when user has left
  useEffect(() => {
    if (!currentGame?.leftPlayer || !user || currentGame.leftPlayer.odId !== user.uid) {
      setLeaveCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - currentGame.leftPlayer!.odAt;
      const remaining = Math.max(0, LEAVE_TIMEOUT_SECONDS - Math.floor(elapsed / 1000));
      setLeaveCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [currentGame?.leftPlayer, user]);

  const handleReturnToGame = async () => {
    if (!currentGame || !user || isReturning) return;

    setIsReturning(true);
    try {
      const result = await returnToGame(currentGame.id, user.uid);
      if (result.success) {
        navigate(`/game/${currentLobby?.id}`);
      }
    } catch (error) {
      console.error('Failed to return to game:', error);
    } finally {
      setIsReturning(false);
    }
  };

  if (!currentLobby) {
    return null;
  }

  const isPlaying = currentLobby.status === 'playing';
  const isWaiting = currentLobby.status === 'waiting';

  // Check if we're already on the correct page for this lobby
  const isOnGamePage = location.pathname === `/game/${currentLobby.id}`;
  const isOnLobbyPage = location.pathname === `/lobby/${currentLobby.id}`;

  // Check if user has left the game
  const hasUserLeft = currentGame?.leftPlayer?.odId === user?.uid;

  // Show red warning banner if user has left the game (highest priority)
  if (isPlaying && hasUserLeft && leaveCountdown !== null) {
    return (
      <>
        <style>{shimmerKeyframes}</style>
        <div
          onClick={handleReturnToGame}
          className="relative overflow-hidden bg-red-600 text-white py-2 px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-red-700 transition-colors"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 65%, transparent 100%)',
              backgroundSize: '300% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
          />
          <span className="relative z-10">
            You have <strong>{leaveCountdown} seconds</strong> to return to{' '}
            <strong>{currentLobby.name}</strong> or the game will end! Click{' '}
            <span className="underline">here</span> to return
          </span>
          <ArrowRight className="h-4 w-4 relative z-10" />
        </div>
      </>
    );
  }

  // Show green banner for active game (if not on game page)
  if (isPlaying && !isOnGamePage) {
    return (
      <>
        <style>{shimmerKeyframes}</style>
        <div
          onClick={() => navigate(`/game/${currentLobby.id}`)}
          className="relative overflow-hidden bg-green-700 text-white py-2 px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-green-800 transition-colors"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 65%, transparent 100%)',
              backgroundSize: '300% 100%',
              animation: 'shimmer 5s linear infinite',
            }}
          />
          <span className="relative z-10">
            You are currently in game <strong>{currentLobby.name}</strong>, click{' '}
            <span className="underline">here</span> to return
          </span>
          <ArrowRight className="h-4 w-4 relative z-10" />
        </div>
      </>
    );
  }

  // Show blue banner for waiting lobby (if not on lobby page)
  if (isWaiting && !isOnLobbyPage) {
    return (
      <>
        <style>{shimmerKeyframes}</style>
        <div
          onClick={() => navigate(`/lobby/${currentLobby.id}`)}
          className="relative overflow-hidden bg-green-700 text-white py-2 px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-green-800 transition-colors"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 65%, transparent 100%)',
              backgroundSize: '300% 100%',
              animation: 'shimmer 5s linear infinite',
            }}
          />
          <span className="relative z-10">
            You are currently in lobby <strong>{currentLobby.name}</strong>, click{' '}
            <span className="underline">here</span> to return
          </span>
          <ArrowRight className="h-4 w-4 relative z-10" />
        </div>
      </>
    );
  }

  return null;
};

export default ActiveGameBanner;
