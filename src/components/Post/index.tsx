import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCurrentUser, type CurrentUser } from '../../data/auth';
import { useOnlineUsers } from '../../hooks/useOnlineUsers';
import { getPosts, savePost, updatePostLikes, type PostRecord } from '../../data/posts';
import { isPostMember, joinPost } from '../../data/postMembership';
import DirectChat from '../DirectChat';
import UserProfile from '../UserProfile';
import './Post.css';

type Reply = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

type Comment = Reply & {
  replies: Reply[];
};

type Attachment = {
  id: string;
  file: File;
  url: string;
};

const allowedFileExtensions = /\.(zip|jpe?g|png|gif|webp|pdf|docx?|xlsx?)$/i;
const isAllowedFile = (file: File) => (
  allowedFileExtensions.test(file.name) || file.type.startsWith('image/')
);

const commentsStorageKey = (postId: string) => `learning-manager-comments-${postId}`;
const getCurrentTimeLabel = () => new Date().toLocaleString();

const getYoutubeEmbedUrl = (value: string): string | null => {
  if (!value.trim()) {
    return '';
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = url.pathname.slice(1);
    } else if (
      host === 'youtube.com'
      || host === 'www.youtube.com'
      || host === 'm.youtube.com'
    ) {
      videoId = url.searchParams.get('v') ?? '';
      if (!videoId && url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.slice('/embed/'.length);
      }
    }

    return /^[\w-]{11}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  } catch {
    return null;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type LoadedPostData = {
  post: PostRecord | null;
  currentUser: CurrentUser | null;
  comments: Comment[];
  isLiked: boolean;
  isJoined: boolean;
  error: string;
};

const loadPostData = (postId: string): LoadedPostData => {
  try {
    const post = getPosts().find((item) => item.id === postId) ?? null;
    const currentUser = getCurrentUser();
    const savedComments = window.localStorage.getItem(commentsStorageKey(postId));
    const comments: unknown = savedComments ? JSON.parse(savedComments) : [];
    const likedPosts: unknown = JSON.parse(
      window.localStorage.getItem('learning-manager-liked-posts') ?? '[]',
    );

    if (!Array.isArray(comments)) {
      throw new Error('Saved comments have an invalid format.');
    }

    return {
      post,
      currentUser,
      comments: comments as Comment[],
      isLiked: Array.isArray(likedPosts) && likedPosts.includes(postId),
      isJoined: currentUser ? isPostMember(postId, currentUser.username) : false,
      error: '',
    };
  } catch (error) {
    return {
      post: null,
      currentUser: null,
      comments: [],
      isLiked: false,
      isJoined: false,
      error: error instanceof Error ? error.message : 'Unable to load this post',
    };
  }
};

const Post = () => {
  const { postId } = useParams();
  if (!postId) {
    return <PostNotFound />;
  }

  return <PostDetail key={postId} postId={postId} />;
};

const PostNotFound = () => (
  <main className="post-page">
    <Link className="post-back-link" to="/home">← Back to posts</Link>
    <section className="post-not-found">
      <h1>Post not found</h1>
      <p>Choose a post from the home page to view its details.</p>
    </section>
  </main>
);

const PostDetail = ({ postId }: { postId: string }) => {
  const [loadedData] = useState(() => loadPostData(postId));
  const [post, setPost] = useState<PostRecord | null>(loadedData.post);
  const [currentUser] = useState<CurrentUser | null>(loadedData.currentUser);
  const [comments, setComments] = useState<Comment[]>(loadedData.comments);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLiked, setIsLiked] = useState(loadedData.isLiked);
  const [isJoined, setIsJoined] = useState(loadedData.isJoined);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(loadedData.error);
  const [editTitle, setEditTitle] = useState(loadedData.post?.title ?? '');
  const [editCategory, setEditCategory] = useState(loadedData.post?.category ?? '');
  const [editContent, setEditContent] = useState(loadedData.post?.content ?? '');
  const [editYoutubeUrl, setEditYoutubeUrl] = useState(loadedData.post?.youtubeUrl ?? '');
  const objectUrlsRef = useRef<string[]>([]);

  const isAdmin = currentUser?.role === 'admin';
  const canParticipate = isAdmin || isJoined;
  const onlineUsers = useOnlineUsers(currentUser, postId);
  const youtubeEmbedUrl = post ? getYoutubeEmbedUrl(post.youtubeUrl) : '';

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const persistComments = (updatedComments: Comment[]) => {
    try {
      window.localStorage.setItem(commentsStorageKey(postId), JSON.stringify(updatedComments));
      setComments(updatedComments);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save comment');
    }
  };

  const joinCurrentPost = () => {
    if (!currentUser || currentUser.role === 'admin') {
      return;
    }

    try {
      joinPost(postId, currentUser.username);
      setIsJoined(true);
      setErrorMessage('');
      setStatusMessage('You joined this post. You can now comment and reply.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to join this post');
    }
  };

  const savePostChanges = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let activeUser: CurrentUser | null;
    try {
      activeUser = getCurrentUser();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify edit permissions');
      return;
    }

    if (!post || !isAdmin || activeUser?.role !== 'admin') {
      setErrorMessage('Only an admin can edit this post.');
      return;
    }

    const title = editTitle.trim();
    const category = editCategory.trim();
    const content = editContent.trim();
    const youtubeUrl = editYoutubeUrl.trim();
    const embedUrl = getYoutubeEmbedUrl(youtubeUrl);

    if (!title || !category || !content) {
      setErrorMessage('Title, category, and post content are required.');
      return;
    }
    if (embedUrl === null) {
      setErrorMessage('Enter a valid YouTube video link, or leave the field empty.');
      return;
    }

    try {
      const updatedPost = { ...post, title, category, content, youtubeUrl };
      savePost(updatedPost);
      setPost(updatedPost);
      setIsEditing(false);
      setErrorMessage('');
      setStatusMessage('Post updated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save post changes');
    }
  };

  const addComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canParticipate) {
      setErrorMessage('Join this post before commenting.');
      return;
    }

    const text = commentDraft.trim();
    if (!text) {
      return;
    }

    const comment: Comment = {
      id: crypto.randomUUID(),
      author: currentUser?.username ?? 'Guest',
      text,
      createdAt: getCurrentTimeLabel(),
      replies: [],
    };
    persistComments([...comments, comment]);
    setCommentDraft('');
  };

  const addReply = (event: FormEvent<HTMLFormElement>, commentId: string) => {
    event.preventDefault();
    if (!canParticipate) {
      setErrorMessage('Join this post before replying.');
      return;
    }

    const text = replyDraft.trim();
    if (!text) {
      return;
    }

    const reply: Reply = {
      id: crypto.randomUUID(),
      author: currentUser?.username ?? 'Guest',
      text,
      createdAt: getCurrentTimeLabel(),
    };
    persistComments(comments.map((comment) => (
      comment.id === commentId
        ? { ...comment, replies: [...comment.replies, reply] }
        : comment
    )));
    setReplyDraft('');
    setReplyingTo(null);
  };

  const toggleLike = () => {
    if (!post) {
      return;
    }

    try {
      const nextLiked = !isLiked;
      const storedLikes: unknown = JSON.parse(
        window.localStorage.getItem('learning-manager-liked-posts') ?? '[]',
      );
      const likedPosts = Array.isArray(storedLikes)
        ? storedLikes.filter((id): id is string => typeof id === 'string')
        : [];
      const updatedLikedPosts = nextLiked
        ? [...new Set([...likedPosts, postId])]
        : likedPosts.filter((id) => id !== postId);
      window.localStorage.setItem('learning-manager-liked-posts', JSON.stringify(updatedLikedPosts));

      const likes = updatePostLikes(postId, nextLiked);
      setPost({ ...post, likes });
      setIsLiked(nextLiked);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update like');
    }
  };

  const sharePost = async () => {
    if (!post) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url: window.location.href });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setStatusMessage('Post link copied.');
      } else {
        setErrorMessage('Sharing is not supported in this browser.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : 'Unable to share this post');
    }
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      setErrorMessage('Only an admin can attach files.');
      event.target.value = '';
      return;
    }

    const selectedFiles = Array.from(event.target.files ?? []);
    const invalidFiles = selectedFiles.filter((file) => !isAllowedFile(file));

    if (invalidFiles.length > 0) {
      setErrorMessage(`Unsupported file type: ${invalidFiles.map((file) => file.name).join(', ')}`);
    }

    const validFiles = selectedFiles.filter(isAllowedFile);
    const nextAttachments = validFiles.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      return { id: crypto.randomUUID(), file, url };
    });

    setAttachments((existing) => [...existing, ...nextAttachments]);
    event.target.value = '';
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((existing) => {
      const attachment = existing.find((item) => item.id === attachmentId);
      if (attachment) {
        URL.revokeObjectURL(attachment.url);
        objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== attachment.url);
      }
      return existing.filter((item) => item.id !== attachmentId);
    });
  };

  if (!post) {
    return (
      <main className="post-page">
        <Link className="post-back-link" to="/home">← Back to posts</Link>
        <section className="post-not-found">
          <h1>Post not found</h1>
          <p>{errorMessage || 'Choose a post from the home page to view its details.'}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="post-page">
      <Link className="post-back-link" to="/home">← Back to posts</Link>
      {errorMessage && <p className="post-feedback post-feedback-error" role="alert">{errorMessage}</p>}
      {statusMessage && <p className="post-feedback" role="status">{statusMessage}</p>}

      <div className="post-layout">
        <UserProfile user={currentUser} />

        <article className="post-detail">
        <div className={`post-detail-thumbnail thumbnail-${post.style}`}>
          <span className="thumbnail-label">{post.category}</span>
          <span className="post-detail-title">{post.title}</span>
        </div>

        <div className="post-detail-content">
          <div className="post-detail-heading">
            <div>
              <p className="post-detail-category">{post.category}</p>
              <h1>{post.title}</h1>
            </div>
            {isAdmin && (
              <button
                className="post-secondary-button"
                type="button"
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    setEditTitle(post.title);
                    setEditCategory(post.category);
                    setEditContent(post.content);
                    setEditYoutubeUrl(post.youtubeUrl);
                    setIsEditing(true);
                  }
                  setErrorMessage('');
                }}
              >
                {isEditing ? 'Cancel editing' : 'Edit post'}
              </button>
            )}
          </div>
          <p className="post-detail-description">{post.content}</p>

          {!isAdmin && (
            <section className="post-join-panel" aria-label="Join post discussion">
              <div>
                <strong>{isJoined ? 'You joined this post' : 'Join the conversation'}</strong>
                <p>
                  {isJoined
                    ? 'You can comment on this post and reply to other comments.'
                    : 'Join this post to add comments and reply to the discussion.'}
                </p>
              </div>
              {!isJoined && (
                <button className="post-primary-button" type="button" onClick={joinCurrentPost}>
                  Join
                </button>
              )}
            </section>
          )}

          <div className="post-actions">
            <button
              className={`post-action-button${isLiked ? ' is-liked' : ''}`}
              type="button"
              onClick={toggleLike}
              aria-pressed={isLiked}
            >
              {isLiked ? '♥ Liked' : '♡ Like'} · {post.likes}
            </button>
            <button className="post-action-button" type="button" onClick={sharePost}>
              Share
            </button>
          </div>

          {isEditing && isAdmin && (
            <form className="post-editor" onSubmit={savePostChanges}>
              <h2>Edit post</h2>
              <label>
                Title
                <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
              </label>
              <label>
                Category
                <input value={editCategory} onChange={(event) => setEditCategory(event.target.value)} />
              </label>
              <label>
                Post content
                <textarea
                  rows={5}
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                />
              </label>
              <label>
                YouTube link
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={editYoutubeUrl}
                  onChange={(event) => setEditYoutubeUrl(event.target.value)}
                />
              </label>
              <label className="post-file-input">
                Upload files
                <span>ZIP, images, PDF, Word, or Excel files</span>
                <input
                  type="file"
                  multiple
                  accept=".zip,image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={addFiles}
                />
              </label>
              {attachments.length > 0 && (
                <ul className="attachment-list" aria-label="Uploaded files">
                  {attachments.map(({ id, file, url }) => (
                    <li className="attachment-item" key={id}>
                      <a href={url} download={file.name}>{file.name}</a>
                      <span>{formatFileSize(file.size)}</span>
                      <button type="button" onClick={() => removeAttachment(id)}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="post-editor-note">
                File uploads are available in this browser session. Add server storage to retain files for other users.
              </p>
              <button className="post-primary-button" type="submit">Save changes</button>
            </form>
          )}

          {youtubeEmbedUrl && (
            <section className="post-video" aria-label="YouTube video">
              <h2>Featured video</h2>
              <div className="post-video-frame">
                <iframe
                  src={youtubeEmbedUrl}
                  title={`YouTube video for ${post.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          <section className="post-comments" aria-labelledby="comments-heading">
            <h2 id="comments-heading">Comments <span>{comments.length}</span></h2>
            {canParticipate ? (
              <form className="comment-form" onSubmit={addComment}>
                <label className="visually-hidden" htmlFor="new-comment">Write a comment</label>
                <textarea
                  id="new-comment"
                  rows={3}
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="Share your thoughts..."
                />
                <button className="post-primary-button" type="submit" disabled={!commentDraft.trim()}>
                  Post comment
                </button>
              </form>
            ) : (
              <p className="comments-join-prompt">Join this post to comment or reply.</p>
            )}

            {comments.length === 0 ? (
              <p className="comments-empty">No comments yet. Start the conversation.</p>
            ) : (
              <ul className="comment-list">
                {comments.map((comment) => (
                  <li className="comment-item" key={comment.id}>
                    <div className="comment-avatar" aria-hidden="true">
                      {comment.author.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="comment-body">
                      <p className="comment-meta">
                        <strong>{comment.author}</strong>
                                        <time>{comment.createdAt}</time>
                      </p>
                      <p className="comment-text">{comment.text}</p>
                      {canParticipate && (
                        <button
                          className="reply-toggle"
                          type="button"
                          onClick={() => {
                            setReplyingTo(replyingTo === comment.id ? null : comment.id);
                            setReplyDraft('');
                          }}
                        >
                          Reply
                        </button>
                      )}
                      {canParticipate && replyingTo === comment.id && (
                        <form className="reply-form" onSubmit={(event) => addReply(event, comment.id)}>
                          <label className="visually-hidden" htmlFor={`reply-${comment.id}`}>
                            Reply to {comment.author}
                          </label>
                          <input
                            id={`reply-${comment.id}`}
                            value={replyDraft}
                            onChange={(event) => setReplyDraft(event.target.value)}
                            placeholder={`Reply to ${comment.author}...`}
                          />
                          <button className="post-primary-button" type="submit" disabled={!replyDraft.trim()}>
                            Reply
                          </button>
                        </form>
                      )}
                      {comment.replies.length > 0 && (
                        <ul className="reply-list">
                          {comment.replies.map((reply) => (
                            <li className="reply-item" key={reply.id}>
                              <p className="comment-meta">
                                <strong>{reply.author}</strong>
                                <time>{reply.createdAt}</time>
                              </p>
                              <p className="comment-text">{reply.text}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        </article>

        <aside className="post-participants" aria-labelledby="post-participants-heading">
          <div className="post-participants-header">
            <div>
              <p className="post-detail-category">IN THIS POST</p>
              <h2 id="post-participants-heading">People viewing</h2>
            </div>
            <span>{onlineUsers.length}</span>
          </div>
          {onlineUsers.length === 0 ? (
            <p className="post-participants-empty">No other users are viewing this post right now.</p>
          ) : (
            <ul className="post-participants-list">
              {onlineUsers.map((user) => (
                <li key={user.username}>
                  <span className="post-participant-avatar" aria-hidden="true">
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="post-participant-details">
                    <span className="post-participant-name">{user.username}</span>
                    <span className="post-participant-role">{user.isDemo ? 'demo user' : user.role}</span>
                  </span>
                  <button
                    className="post-secondary-button"
                    type="button"
                    onClick={() => setActiveUsername(user.username)}
                    aria-label={`Chat privately with ${user.username}`}
                  >
                    Chat
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
      {activeUsername && currentUser && (
        <DirectChat
          username={currentUser.username}
          peerUsername={activeUsername}
          postId={postId}
          onClose={() => setActiveUsername(null)}
        />
      )}
    </main>
  );
};

export default Post;
