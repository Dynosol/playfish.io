import { useEffect, useState, useMemo, useRef } from 'react';
import { getUser, subscribeToUser } from '../firebase/userService';
import type { UserDocument } from '../firebase/userService';

export const useUsername = (uid: string | null | undefined): string | null => {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setUsername(null);
      return;
    }

    const unsubscribe = subscribeToUser(uid, (user: UserDocument | null) => {
      if (user) {
        setUsername(user.username);
      } else {
        getUser(uid).then((userDoc) => {
          if (userDoc) {
            setUsername(userDoc.username);
          } else {
            setUsername(null);
          }
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [uid]);

  return username;
};

export const useUsernames = (uids: string[]): Map<string, string | null> => {
  const [usernames, setUsernames] = useState<Map<string, string | null>>(new Map());
  const prevUidsKeyRef = useRef<string>('');

  const uidsKey = useMemo(() => uids.join(','), [uids]);

  useEffect(() => {
    if (uidsKey === prevUidsKeyRef.current) {
      return;
    }
    prevUidsKeyRef.current = uidsKey;

    if (uids.length === 0) {
      setUsernames(new Map());
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const usernameMap = new Map<string, string | null>();

    uids.forEach((uid) => {
      const unsubscribe = subscribeToUser(uid, (user: UserDocument | null) => {
        if (user) {
          usernameMap.set(uid, user.username);
          setUsernames(new Map(usernameMap));
        } else {
          getUser(uid).then((userDoc) => {
            if (userDoc) {
              usernameMap.set(uid, userDoc.username);
            } else {
              usernameMap.set(uid, null);
            }
            setUsernames(new Map(usernameMap));
          });
        }
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [uidsKey, uids]);

  return usernames;
};

