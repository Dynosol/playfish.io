import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUser } from '../firebase/userService';
import { subscribeToLobby } from '../firebase/lobbyService';
import type { UserDocument } from '../firebase/userService';
import type { Lobby } from '../firebase/lobbyService';

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

  if (!currentLobby) {
    return null;
  }

  const isPlaying = currentLobby.status === 'playing';
  const isWaiting = currentLobby.status === 'waiting';

  // Check if we're already on the correct page for this lobby
  const isOnGamePage = location.pathname === `/game/${currentLobby.id}`;
  const isOnLobbyPage = location.pathname === `/lobby/${currentLobby.id}`;

  // Show green banner for active game (if not on game page)
  if (isPlaying && !isOnGamePage) {
    return (
      <>
        <style>{shimmerKeyframes}</style>
        <div
          onClick={() => navigate(`/game/${currentLobby.id}`)}
          className="relative overflow-hidden bg-green-600 text-white py-2 px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-green-700 transition-colors"
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
          className="relative overflow-hidden bg-blue-600 text-white py-2 px-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-700 transition-colors"
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
