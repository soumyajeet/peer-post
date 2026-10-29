import type { CurrentUser } from './auth';

export type OnlineUser = CurrentUser & {
  tabId: string;
  isDemo?: boolean;
};

export type DirectMessage = {
  id: string;
  sender: string;
  recipient: string;
  text: string;
  sentAt: string;
};

type PresenceRecord = OnlineUser & {
  postId: string | null;
  lastSeen: number;
};

const presenceStorageKey = 'learning-manager-presence';
const messagesStorageKey = 'learning-manager-direct-messages';
const presenceEventName = 'learning-manager-presence-changed';
const messagesEventName = 'learning-manager-messages-changed';
const presenceLifetimeMs = 20_000;
const onlineUsersCache = new Map<string, OnlineUser[]>();
const conversationCache = new Map<string, DirectMessage[]>();
const demoCommunityUsers: OnlineUser[] = [
  { username: 'Olivia Rhye', role: 'user', tabId: 'demo-community-olivia', isDemo: true },
  { username: 'Phoenix Baker', role: 'user', tabId: 'demo-community-phoenix', isDemo: true },
  { username: 'Lana Steiner', role: 'user', tabId: 'demo-community-lana', isDemo: true },
];
const demoPostUsers: Record<string, OnlineUser[]> = {
  'quiet-mornings': [
    { username: 'Demi Wilkinson', role: 'user', tabId: 'demo-quiet-demi', isDemo: true },
    { username: 'Candice Wu', role: 'user', tabId: 'demo-quiet-candice', isDemo: true },
  ],
  'a-little-color': [
    { username: 'Demi Wilkinson', role: 'user', tabId: 'demo-color-demi', isDemo: true },
  ],
  'weekend-notes': [
    { username: 'Candice Wu', role: 'user', tabId: 'demo-weekend-candice', isDemo: true },
    { username: 'Olivia Rhye', role: 'user', tabId: 'demo-weekend-olivia', isDemo: true },
  ],
  'somewhere-outside': [
    { username: 'Phoenix Baker', role: 'user', tabId: 'demo-outside-phoenix', isDemo: true },
  ],
  'the-everyday-edit': [
    { username: 'Lana Steiner', role: 'user', tabId: 'demo-edit-lana', isDemo: true },
    { username: 'Demi Wilkinson', role: 'user', tabId: 'demo-edit-demi', isDemo: true },
  ],
  'small-things': [
    { username: 'Candice Wu', role: 'user', tabId: 'demo-small-candice', isDemo: true },
  ],
};

const notifySameTab = (name: string) => {
  if (name === presenceEventName) {
    onlineUsersCache.clear();
  } else {
    conversationCache.clear();
  }
  window.dispatchEvent(new Event(name));
};

const readPresence = (): PresenceRecord[] => {
  const savedPresence = window.localStorage.getItem(presenceStorageKey);
  if (!savedPresence) {
    return [];
  }

  const parsedPresence: unknown = JSON.parse(savedPresence);
  if (!Array.isArray(parsedPresence)) {
    throw new Error('Saved online-user data has an invalid format.');
  }

  return parsedPresence.filter((record): record is PresenceRecord => (
    typeof record === 'object'
    && record !== null
    && 'tabId' in record
    && typeof record.tabId === 'string'
    && 'username' in record
    && typeof record.username === 'string'
    && 'role' in record
    && (record.role === 'admin' || record.role === 'user')
    && 'postId' in record
    && (typeof record.postId === 'string' || record.postId === null)
    && 'lastSeen' in record
    && typeof record.lastSeen === 'number'
  ));
};

export const publishPresence = (
  user: CurrentUser,
  tabId: string,
  postId: string | null,
): void => {
  const activeCutoff = Date.now() - presenceLifetimeMs;
  const activePresence = readPresence().filter((record) => (
    record.tabId !== tabId && record.lastSeen > activeCutoff
  ));

  activePresence.push({ ...user, tabId, postId, lastSeen: Date.now() });
  window.localStorage.setItem(presenceStorageKey, JSON.stringify(activePresence));
  notifySameTab(presenceEventName);
};

export const clearPresence = (tabId: string): void => {
  const remainingPresence = readPresence().filter((record) => record.tabId !== tabId);
  window.localStorage.setItem(presenceStorageKey, JSON.stringify(remainingPresence));
  notifySameTab(presenceEventName);
};

export const getOnlineUsers = (
  postId: string | null,
  excludedUsername?: string,
): OnlineUser[] => {
  const cacheKey = `${postId ?? 'community'}:${excludedUsername ?? ''}`;
  const cachedUsers = onlineUsersCache.get(cacheKey);
  if (cachedUsers) {
    return cachedUsers;
  }

  const activeCutoff = Date.now() - presenceLifetimeMs;
  const usersByName = new Map<string, OnlineUser>();

  readPresence()
    .filter((record) => (
      record.lastSeen > activeCutoff
      && record.postId === postId
      && record.username !== excludedUsername
    ))
    .forEach((record) => {
      if (!usersByName.has(record.username)) {
        usersByName.set(record.username, {
          tabId: record.tabId,
          username: record.username,
          role: record.role,
        });

  const demoUsers = postId === null
        ? demoCommunityUsers
        : demoPostUsers[postId] ?? [];
  demoUsers
        .filter((user) => user.username !== excludedUsername)
        .forEach((user) => {
          if (!usersByName.has(user.username)) {
            usersByName.set(user.username, user);
          }
        });
      }
    });

  const onlineUsers = [...usersByName.values()].sort((first, second) => (
    first.username.localeCompare(second.username)
  ));
  onlineUsersCache.set(cacheKey, onlineUsers);
  return onlineUsers;
};

export const subscribeToPresence = (callback: () => void): (() => void) => {
  const handleChange = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== presenceStorageKey) {
      return;
    }
    onlineUsersCache.clear();
    callback();
  };

  window.addEventListener('storage', handleChange);
  window.addEventListener(presenceEventName, handleChange);
  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(presenceEventName, handleChange);
  };
};

const getConversationKey = (postId: string | null, firstUser: string, secondUser: string) => {
  const participants = [firstUser, secondUser].sort();
  return `${postId ?? 'community'}:${participants[0]}:${participants[1]}`;
};

const readMessages = (): Record<string, DirectMessage[]> => {
  const savedMessages = window.localStorage.getItem(messagesStorageKey);
  if (!savedMessages) {
    return {};
  }

  const parsedMessages: unknown = JSON.parse(savedMessages);
  if (
    typeof parsedMessages !== 'object'
    || parsedMessages === null
    || Array.isArray(parsedMessages)
  ) {
    throw new Error('Saved chat data has an invalid format.');
  }

  return parsedMessages as Record<string, DirectMessage[]>;
};

export const getConversationSnapshot = (
  postId: string | null,
  firstUser: string,
  secondUser: string,
): DirectMessage[] => {
  const key = getConversationKey(postId, firstUser, secondUser);
  const cachedMessages = conversationCache.get(key);
  if (cachedMessages) {
    return cachedMessages;
  }

  const messages = readMessages()[key] ?? [];
  conversationCache.set(key, messages);
  return messages;
};

export const sendDirectMessage = (
  postId: string | null,
  sender: string,
  recipient: string,
  text: string,
): DirectMessage => {
  const trimmedText = text.trim();
  if (!trimmedText || sender === recipient) {
    throw new Error('Enter a message for another user.');
  }

  const messages = readMessages();
  const key = getConversationKey(postId, sender, recipient);
  const message: DirectMessage = {
    id: crypto.randomUUID(),
    sender,
    recipient,
    text: trimmedText,
    sentAt: new Date().toISOString(),
  };
  messages[key] = [...(messages[key] ?? []), message];

  window.localStorage.setItem(messagesStorageKey, JSON.stringify(messages));
  conversationCache.clear();
  notifySameTab(messagesEventName);
  return message;
};

export const subscribeToConversation = (callback: () => void): (() => void) => {
  const handleChange = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== messagesStorageKey) {
      return;
    }
    conversationCache.clear();
    callback();
  };

  window.addEventListener('storage', handleChange);
  window.addEventListener(messagesEventName, handleChange);
  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(messagesEventName, handleChange);
  };
};
