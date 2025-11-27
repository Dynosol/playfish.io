import { useEffect, useState, useMemo, useRef } from 'react';
import { subscribeToUser, subscribeToUsers } from '../firebase/userService';
import type { UserDocument } from '../firebase/userService';

export const useUsername = (uid: string | null | undefined): string | null => {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setUsername(null);
      return;
    }

    return subscribeToUser(uid, (user: UserDocument | null) => {
      setUsername(user?.username ?? null);
    });
  }, [uid]);

  return username;
};

export const useUsernames = (uids: string[]): Map<string, string | null> => {
  const [usernames, setUsernames] = useState<Map<string, string | null>>(new Map());
  const prevUidsKeyRef = useRef<string>('');

  const uidsKey = useMemo(() => [...uids].sort().join(','), [uids]);

  useEffect(() => {
    if (uidsKey === prevUidsKeyRef.current) return;
    prevUidsKeyRef.current = uidsKey;

    if (uids.length === 0) {
      setUsernames(new Map());
      return;
    }

    return subscribeToUsers(uids, (users) => {
      const map = new Map<string, string | null>();
      users.forEach(u => map.set(u.uid, u.username));
      uids.forEach(uid => { if (!map.has(uid)) map.set(uid, null); });
      setUsernames(map);
    });
  }, [uidsKey, uids]);

  return usernames;
};

