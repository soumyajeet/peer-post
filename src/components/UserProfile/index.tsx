import type { CurrentUser } from '../../data/auth';
import { clearCurrentUser } from '../../data/auth';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';

type UserProfileProps = {
  user: CurrentUser | null;
};

const getInitials = (username: string): string => {
  const words = username.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return username.slice(0, 2).toUpperCase();
};

const UserProfile = ({ user }: UserProfileProps) => {
  const navigate = useNavigate();
  const username = user?.username ?? 'Guest';

  const logout = () => {
    clearCurrentUser();
    navigate('/', { replace: true });
  };

  return (
    <aside className="user-profile" aria-label="Your profile">
      <div className="user-profile-avatar" aria-hidden="true">
        {getInitials(username)}
      </div>
      <h1 className="user-profile-name">{username}</h1>
      <p className="user-profile-role">{user?.role ?? 'viewer'}</p>
      <div className="user-profile-divider" />
      <p className="user-profile-bio">Collecting moments, ideas, and inspiration.</p>
      {user && (
        <button className="user-profile-logout" type="button" onClick={logout}>
          Log out
        </button>
      )}
    </aside>
  );
};

export default UserProfile;
