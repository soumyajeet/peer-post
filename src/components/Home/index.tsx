import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import { getPosts, initialPosts } from '../../data/posts';
import { getCurrentUser } from '../../data/auth';
import type { CurrentUser } from '../../data/auth';
import { useOnlineUsers } from '../../hooks/useOnlineUsers';
import DirectChat from '../DirectChat';
import UserProfile from '../UserProfile';

const Home = () => {
  const [postData] = useState(() => {
    try {
      return { posts: getPosts(), error: '' };
    } catch (error) {
      return {
        posts: initialPosts,
        error: error instanceof Error ? error.message : 'Unable to load posts',
      };
    }
  });
  const { posts, error: postError } = postData;
  const [userData] = useState(() => {
    try {
      return { user: getCurrentUser(), error: '' };
    } catch (error) {
      return {
        user: null as CurrentUser | null,
        error: error instanceof Error ? error.message : 'Unable to load current user',
      };
    }
  });
  const currentUser = userData.user;
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const onlineUsers = useOnlineUsers(currentUser, null);

  return (
    <div className="dashboard">
      <UserProfile user={currentUser} />

      <main className="dashboard-feed">
        <header className="feed-header">
          <div>
            <p className="eyebrow">YOUR COMMUNITY</p>
            <h2>Explore posts</h2>
          </div>
          <span className="post-count">{posts.length} posts</span>
        </header>

        <section className="post-grid" aria-label="Post thumbnails">
          {posts.map((post) => (
            <Link
              className="post-card"
              key={post.id}
              to={`/post/${post.id}`}
              aria-label={`Open post: ${post.title}, category ${post.category}`}
            >
              <div className={`post-thumbnail thumbnail-${post.style}`}>
                <span className="thumbnail-label">{post.category}</span>
                <span className="thumbnail-title">{post.title}</span>
              </div>
              <h3>{post.title}</h3>
              <p>Shared by the community</p>
            </Link>
          ))}
        </section>
        {postError && <p className="feed-error" role="alert">{postError}</p>}
      </main>

      <aside className="dashboard-users" aria-labelledby="people-heading">
        <header className="users-header">
          <div>
            <p className="eyebrow">ONLINE NOW</p>
            <h2 id="people-heading">People</h2>
          </div>
          <span className="user-count">{onlineUsers.length}</span>
        </header>
        {userData.error && <p className="feed-error" role="alert">{userData.error}</p>}
        {!userData.error && onlineUsers.length === 0 && (
          <p className="online-empty">No other users are online right now.</p>
        )}
        {onlineUsers.length > 0 && (
          <ul className="user-list">
            {onlineUsers.map((user) => (
              <li className="user-item" key={user.username}>
                <button
                  className="user-chat-button"
                  type="button"
                  onClick={() => setActiveUsername(user.username)}
                  aria-label={`Open chat with ${user.username}`}
                >
                  <span className="online-avatar" aria-hidden="true">
                    {user.username.slice(0, 1).toUpperCase()}
                    <span />
                  </span>
                  <span className="user-details">
                    <span className="user-name">{user.username}</span>
                    <span className="user-handle">{user.isDemo ? 'demo user' : user.role}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {activeUsername && currentUser && (
        <DirectChat
          username={currentUser.username}
          peerUsername={activeUsername}
          postId={null}
          onClose={() => setActiveUsername(null)}
        />
      )}
    </div>
  );
};

export default Home;
