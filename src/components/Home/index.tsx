import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import { getPosts, initialPosts } from '../../data/posts';

type User = {
  name: string;
  handle: string;
  initials: string;
  color: string;
};

type ChatMessage = {
  text: string;
  sentAt: string;
};

const users: User[] = [
  { name: 'Olivia Rhye', handle: '@olivia', initials: 'OR', color: 'rose' },
  { name: 'Phoenix Baker', handle: '@phoenix', initials: 'PB', color: 'blue' },
  { name: 'Lana Steiner', handle: '@lana', initials: 'LS', color: 'gold' },
  { name: 'Demi Wilkinson', handle: '@demi', initials: 'DW', color: 'green' },
  { name: 'Candice Wu', handle: '@candice', initials: 'CW', color: 'purple' },
];

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
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [draft, setDraft] = useState('');
  const [messagesByUser, setMessagesByUser] = useState<Record<string, ChatMessage[]>>({});
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const activeMessages = activeUser ? messagesByUser[activeUser.handle] ?? [] : [];

  useEffect(() => {
    if (!activeUser) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveUser(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeUser]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeUser]);

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();

    if (!activeUser || !text) {
      return;
    }

    setMessagesByUser((currentMessages) => ({
      ...currentMessages,
      [activeUser.handle]: [
        ...(currentMessages[activeUser.handle] ?? []),
        { text, sentAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) },
      ],
    }));
    setDraft('');
  };

  return (
    <div className="dashboard">
      <aside className="dashboard-profile" aria-label="Your profile">
        <div className="profile-avatar" aria-hidden="true">JD</div>
        <h1 className="profile-name">Jordan Davis</h1>
        <p className="profile-handle">@jordan.davis</p>
        <div className="profile-divider" />
        <p className="profile-bio">Collecting moments, ideas, and inspiration.</p>
      </aside>

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
            <p className="eyebrow">SAY HELLO</p>
            <h2 id="people-heading">People</h2>
          </div>
          <span className="user-count">{users.length}</span>
        </header>
        <ul className="user-list">
          {users.map((user) => (
            <li className="user-item" key={user.handle}>
              <button
                className="user-chat-button"
                type="button"
                onClick={() => {
                  setActiveUser(user);
                  setDraft('');
                }}
                aria-label={`Open chat with ${user.name}`}
              >
                <span className={`user-avatar avatar-${user.color}`} aria-hidden="true">
                  {user.initials}
                </span>
                <span className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-handle">{user.handle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {activeUser && (
        <div
          className="chat-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveUser(null);
            }
          }}
        >
          <section
            className="chat-window"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-title"
          >
            <header className="chat-header">
              <div className={`user-avatar avatar-${activeUser.color}`} aria-hidden="true">
                {activeUser.initials}
              </div>
              <div className="chat-contact">
                <h2 id="chat-title">{activeUser.name}</h2>
                <p>{activeUser.handle}</p>
              </div>
              <button
                className="chat-close"
                type="button"
                onClick={() => setActiveUser(null)}
                aria-label="Close chat"
              >
                ×
              </button>
            </header>

            <div className="chat-messages" aria-live="polite">
              {activeMessages.length === 0 ? (
                <p className="chat-empty">This is the start of your one-on-one conversation with {activeUser.name}.</p>
              ) : (
                activeMessages.map((message, index) => (
                  <div className="chat-message-row" key={`${message.sentAt}-${index}`}>
                    <div className="chat-message">
                      <p>{message.text}</p>
                      <time>{message.sentAt}</time>
                    </div>
                  </div>
                ))
              )}
              <div ref={endOfMessagesRef} />
            </div>

            <form className="chat-compose" onSubmit={sendMessage}>
              <label className="visually-hidden" htmlFor="chat-message">
                Message {activeUser.name}
              </label>
              <input
                id="chat-message"
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a message..."
                autoComplete="off"
              />
              <button type="submit" disabled={!draft.trim()}>
                Send
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default Home;
