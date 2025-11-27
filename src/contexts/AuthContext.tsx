import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { createOrUpdateUser, updateUserLogoffTime } from '../firebase/userService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (previousUserIdRef.current && !currentUser) {
        try {
          await updateUserLogoffTime(previousUserIdRef.current);
        } catch (error) {
          console.error('Failed to update logoff time:', error);
        }
        previousUserIdRef.current = null;
      }

      if (!currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('Failed to sign in anonymously:', error);
        }
      } else {
        previousUserIdRef.current = currentUser.uid;
        setUser(currentUser);
        try {
          await createOrUpdateUser(currentUser.uid);
        } catch (error) {
          console.error('Failed to create/update user document:', error);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (previousUserIdRef.current) {
        updateUserLogoffTime(previousUserIdRef.current).catch(error => {
          console.error('Failed to update logoff time on unmount:', error);
        });
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
