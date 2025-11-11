import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { createOrUpdateUser, updateUserLastOnline } from '../firebase/userService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

const HEARTBEAT_INTERVAL_MS = 30000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('Failed to sign in anonymously:', error);
        }
      } else {
        setUser(user);
        try {
          await createOrUpdateUser(user.uid);
          
          heartbeatIntervalRef.current = setInterval(async () => {
            try {
              await updateUserLastOnline(user.uid);
            } catch (error) {
              console.error('Failed to update last online:', error);
            }
          }, HEARTBEAT_INTERVAL_MS);
        } catch (error) {
          console.error('Failed to create/update user document:', error);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
