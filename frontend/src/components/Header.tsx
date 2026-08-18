import React, { useContext } from 'react';
import { Menu, Cloud } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

interface HeaderProps {
  onOpenSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { user } = useContext(AuthContext);

  return (
    <header className="mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          className="mobile-header-btn"
          onClick={onOpenSidebar}
          aria-label="Open Menu"
        >
          <Menu size={24} />
        </button>
        <div className="mobile-header-title">
          <Cloud size={24} style={{ color: 'var(--primary)' }} />
          <span>Jarvis Drive</span>
        </div>
      </div>

      <div
        className="mobile-user-avatar"
        onClick={onOpenSidebar}
        title={user?.name || 'User Profile'}
      >
        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
      </div>
    </header>
  );
};

export default Header;
