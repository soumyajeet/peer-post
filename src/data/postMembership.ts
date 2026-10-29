const storageKey = 'learning-manager-post-memberships';

const readMemberships = (): Record<string, string[]> => {
  const savedMemberships = window.localStorage.getItem(storageKey);
  if (!savedMemberships) {
    return {};
  }

  const parsedMemberships: unknown = JSON.parse(savedMemberships);
  if (
    typeof parsedMemberships !== 'object'
    || parsedMemberships === null
    || Array.isArray(parsedMemberships)
  ) {
    throw new Error('Saved post membership data has an invalid format.');
  }

  return parsedMemberships as Record<string, string[]>;
};

export const isPostMember = (postId: string, username: string): boolean => (
  readMemberships()[postId]?.includes(username) ?? false
);

export const joinPost = (postId: string, username: string): void => {
  const memberships = readMemberships();
  const members = memberships[postId] ?? [];

  if (!members.includes(username)) {
    memberships[postId] = [...members, username];
    window.localStorage.setItem(storageKey, JSON.stringify(memberships));
  }
};
