import React, { useState, useContext, useRef, useEffect } from 'react';
import { Menu, Cloud, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

interface HeaderProps {
  onOpenSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      <div style={{ position: 'relative' }} ref={menuRef}>
        <div
          className="mobile-user-avatar"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          title={user?.name || 'User Profile'}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>

        {showProfileMenu && (
          <div 
            className="dropdown-menu"
            style={{ 
              top: 'calc(100% + 8px)', 
              right: 0, 
              width: '180px', 
              padding: '0.75rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user?.role}
              </div>
            </div>
            <button
              onClick={() => {
                setShowProfileMenu(false);
                logout();
              }}
              style={{
                color: '#ef4444',
                padding: '0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontWeight: 500,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
