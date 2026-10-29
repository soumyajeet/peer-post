import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { CurrentUser } from '../data/auth';
import {
  clearPresence,
  getOnlineUsers,
  publishPresence,
  subscribeToPresence,
} from '../data/collaboration';

export const useOnlineUsers = (
  currentUser: CurrentUser | null,
  postId: string | null,
) => {
  const [tabId] = useState(() => crypto.randomUUID());
  const username = currentUser?.username;
  const role = currentUser?.role;

  const subscribe = useCallback((callback: () => void) => (
    subscribeToPresence(callback)
  ), []);

  const getSnapshot = useCallback(() => (
    getOnlineUsers(postId, username)
  ), [postId, username]);

  const onlineUsers = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!username || !role) {
      return;
    }

    const announcePresence = () => {
      publishPresence({ username, role }, tabId, postId);
    };

    announcePresence();
    const intervalId = window.setInterval(announcePresence, 5000);

    return () => {
      window.clearInterval(intervalId);
      clearPresence(tabId);
    };
  }, [postId, role, tabId, username]);

  return onlineUsers;
};
