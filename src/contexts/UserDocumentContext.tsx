import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToUser } from '../firebase/userService';
import type { UserDocument } from '../firebase/userService';
import { setUserProps } from '../firebase/analytics';

interface UserDocumentContextType {
  userDoc: UserDocument | null;
  loading: boolean;
}

const UserDocumentContext = createContext<UserDocumentContextType>({
  userDoc: null,
  loading: true,
});

export const useUserDocument = () => useContext(UserDocumentContext);

export const UserDocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setUserDoc(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUser(user.uid, (data) => {
      setUserDoc(data);
      if (data) {
        setUserProps({
          color: data.color,
          has_custom_username: !data.username.startsWith('User '),
        });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user, authLoading]);

  return (
    <UserDocumentContext.Provider value={{ userDoc, loading: authLoading || loading }}>
      {children}
    </UserDocumentContext.Provider>
  );
};
