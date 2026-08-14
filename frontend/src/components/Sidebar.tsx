import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Cloud, Folder, HardDrive, LogOut, ShieldAlert } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);

  const formatSize = (bytesStr: string | number | undefined) => {
    if (!bytesStr) return '0 B';
    const bytes = typeof bytesStr === 'string' ? parseInt(bytesStr, 10) : bytesStr;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const used = user?.storageUsed ? parseInt(user.storageUsed, 10) : 0;
  const quota = user?.storageQuota ? parseInt(user.storageQuota, 10) : 1073741824;
  const percent = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

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
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Jarvis Drive</h2>
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
        {/* Storage quota progress bar */}
        <div style={{ padding: '0 0.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 500 }}>
            <span style={{ color: 'var(--text-muted)' }}>Storage Used</span>
            <span>{percent}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <div style={{ width: `${percent}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {formatSize(used)} of {formatSize(quota)}
          </div>
        </div>

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
