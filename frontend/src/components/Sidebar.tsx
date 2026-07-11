import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Cloud, Folder, HardDrive, LogOut, ShieldAlert } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);

  const navItemStyle = (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: isActive ? 'white' : 'var(--text-muted)',
    background: isActive ? 'var(--primary)' : 'transparent',
    textDecoration: 'none',
    transition: 'var(--transition)',
    marginBottom: '0.5rem',
    fontWeight: isActive ? 500 : 400,
  });

  return (
    <div className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', padding: '0 0.5rem' }}>
        <Cloud size={32} style={{ color: 'var(--primary)' }} />
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>CloudVault</h2>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <NavLink to="/dashboard" style={({ isActive }) => navItemStyle(isActive)}>
          <HardDrive size={20} />
          My Storage
        </NavLink>
        <NavLink to="/shared" style={({ isActive }) => navItemStyle(isActive)}>
          <Folder size={20} />
          Shared with me
        </NavLink>
        
        {user?.role === 'ADMIN' && (
          <>
            <div style={{ margin: '1.5rem 0 0.5rem', padding: '0 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Administration
            </div>
            <NavLink to="/admin" style={({ isActive }) => navItemStyle(isActive)}>
              <ShieldAlert size={20} />
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      <div style={{ padding: '1.5rem 0 0', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '0 0.5rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</div>
          </div>
        </div>
        <button 
          onClick={logout}
          className="btn-ghost" 
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', border: 'none', color: 'var(--text-muted)', justifyContent: 'flex-start' }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
