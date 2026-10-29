export type CurrentUser = {
  username: string;
  role: 'admin' | 'user';
};

const storageKey = 'learning-manager-current-user';

export const setCurrentUser = (user: CurrentUser): void => {
  window.sessionStorage.setItem(storageKey, JSON.stringify(user));
};

export const clearCurrentUser = (): void => {
  window.sessionStorage.removeItem(storageKey);
};

export const getCurrentUser = (): CurrentUser | null => {
  const savedUser = window.sessionStorage.getItem(storageKey);
  if (!savedUser) {
    return null;
  }

  const parsedUser: unknown = JSON.parse(savedUser);
  if (
    typeof parsedUser !== 'object'
    || parsedUser === null
    || !('username' in parsedUser)
    || typeof parsedUser.username !== 'string'
    || !('role' in parsedUser)
    || (parsedUser.role !== 'admin' && parsedUser.role !== 'user')
  ) {
    throw new Error('Saved user data has an invalid format.');
  }

  return parsedUser as CurrentUser;
};
