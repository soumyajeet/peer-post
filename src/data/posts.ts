export type PostRecord = {
  id: string;
  title: string;
  category: string;
  style: string;
  content: string;
  youtubeUrl: string;
  likes: number;
};

const storageKey = 'learning-manager-posts';

export const initialPosts: PostRecord[] = [
  { id: 'quiet-mornings', title: 'Quiet mornings', category: 'JOURNAL', style: 'morning', content: 'A few notes on making space for slower mornings.', youtubeUrl: '', likes: 0 },
  { id: 'a-little-color', title: 'A little color', category: 'DESIGN', style: 'color', content: 'A collection of colors and ideas that caught my eye.', youtubeUrl: '', likes: 0 },
  { id: 'weekend-notes', title: 'Weekend notes', category: 'LIFESTYLE', style: 'weekend', content: 'Small moments from a restorative weekend.', youtubeUrl: '', likes: 0 },
  { id: 'somewhere-outside', title: 'Somewhere outside', category: 'TRAVEL', style: 'outside', content: 'A reminder to get outside and explore somewhere new.', youtubeUrl: '', likes: 0 },
  { id: 'the-everyday-edit', title: 'The everyday edit', category: 'INSPIRATION', style: 'edit', content: 'A few useful ideas for the everyday.', youtubeUrl: '', likes: 0 },
  { id: 'small-things', title: 'Small things', category: 'JOURNAL', style: 'small', content: 'Noticing the little things that make a day.', youtubeUrl: '', likes: 0 },
];

export const getPosts = (): PostRecord[] => {
  const savedPosts = window.localStorage.getItem(storageKey);

  if (!savedPosts) {
    return initialPosts;
  }

  const parsedPosts: unknown = JSON.parse(savedPosts);
  if (!Array.isArray(parsedPosts)) {
    throw new Error('Saved post data has an invalid format.');
  }

  return parsedPosts as PostRecord[];
};

export const savePost = (updatedPost: PostRecord): void => {
  const posts = getPosts();
  const updatedPosts = posts.map((post) => (
    post.id === updatedPost.id ? updatedPost : post
  ));

  if (!updatedPosts.some((post) => post.id === updatedPost.id)) {
    throw new Error('The post could not be found.');
  }

  window.localStorage.setItem(storageKey, JSON.stringify(updatedPosts));
};

export const updatePostLikes = (postId: string, liked: boolean): number => {
  const posts = getPosts();
  const post = posts.find((item) => item.id === postId);

  if (!post) {
    throw new Error('The post could not be found.');
  }

  const likes = Math.max(0, post.likes + (liked ? 1 : -1));
  savePost({ ...post, likes });
  return likes;
};
