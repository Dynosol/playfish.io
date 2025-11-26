import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUser } from '../firebase/userService';
import { subscribeToLobby } from '../firebase/lobbyService';
import type { UserDocument } from '../firebase/userService';
import type { Lobby } from '../firebase/lobbyService';

const StartPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
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

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Fish</h1>
      <p>Welcome, {userDoc?.username ?? 'Loading username...'}</p>
      <nav>
        <ul>
          <li><Link to="/join">Join Game</Link></li>
          <li><Link to="/create">Create Game</Link></li>
          <li><Link to="/settings">Settings</Link></li>
        </ul>
      </nav>

      {currentLobby && (
        <div>
          <p>You are currently waiting in game "{currentLobby.name}"</p>
          <Link to={`/lobby/${currentLobby.id}`}>Go to Lobby</Link>
        </div>
      )}
    </div>
  );
};

export default StartPage;
