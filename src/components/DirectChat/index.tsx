import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from 'react';
import {
  getConversationSnapshot,
  sendDirectMessage,
  subscribeToConversation,
} from '../../data/collaboration';
import './DirectChat.css';

type DirectChatProps = {
  username: string;
  peerUsername: string;
  postId: string | null;
  onClose: () => void;
};

const DirectChat = ({ username, peerUsername, postId, onClose }: DirectChatProps) => {
  const [draft, setDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const subscribe = useCallback((callback: () => void) => (
    subscribeToConversation(callback)
  ), []);

  const getSnapshot = useCallback(() => (
    getConversationSnapshot(postId, username, peerUsername)
  ), [peerUsername, postId, username]);

  const messages = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }

    try {
      sendDirectMessage(postId, username, peerUsername, draft);
      setDraft('');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send message');
    }
  };

  return (
    <div
      className="direct-chat-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="direct-chat"
        role="dialog"
        aria-modal="true"
        aria-labelledby="direct-chat-heading"
      >
        <header className="direct-chat-header">
          <div className="direct-chat-avatar" aria-hidden="true">
            {peerUsername.slice(0, 1).toUpperCase()}
          </div>
          <div className="direct-chat-contact">
            <h2 id="direct-chat-heading">{peerUsername}</h2>
            <p>{postId ? 'One-on-one post chat' : 'One-on-one community chat'}</p>
          </div>
          <button className="direct-chat-close" type="button" onClick={onClose} aria-label="Close chat">
            ×
          </button>
        </header>

        <div className="direct-chat-messages" aria-live="polite">
          {messages.length === 0 ? (
            <p className="direct-chat-empty">Start a private conversation with {peerUsername}.</p>
          ) : (
            messages.map((message) => (
              <div
                className={`direct-chat-message${message.sender === username ? ' own-message' : ''}`}
                key={message.id}
              >
                <span className="direct-chat-sender">{message.sender}</span>
                <p>{message.text}</p>
                <time dateTime={message.sentAt}>
                  {new Date(message.sentAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            ))
          )}
        </div>

        {errorMessage && <p className="direct-chat-error" role="alert">{errorMessage}</p>}
        <form className="direct-chat-compose" onSubmit={sendMessage}>
          <label className="visually-hidden" htmlFor="direct-chat-message">
            Message {peerUsername}
          </label>
          <input
            id="direct-chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message..."
            autoComplete="off"
          />
          <button type="submit" disabled={!draft.trim()}>Send</button>
        </form>
      </section>
    </div>
  );
};

export default DirectChat;
