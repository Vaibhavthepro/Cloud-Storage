import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Users, HardDrive, ShieldCheck, Activity, Trash2, Shield } from 'lucide-react';

const Admin = () => {
  const { token, user: currentUser } = useContext(AuthContext);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.data);
    } catch (error) {
      console.error('Error fetching admin data', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.data);
    } catch (error) {
      console.error('Error fetching users list', error);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, token]);

  const handleDeleteUser = async (id: string, name: string) => {
    const message = `WARNING: Are you sure you want to delete user "${name}"?\n\nThis will permanently delete all folders, files, shares, and activity logs owned by this user. This action CANNOT be undone.`;
    if (!window.confirm(message)) return;

    try {
      await axios.delete(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`User "${name}" and all associated data have been deleted successfully.`);
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error deleting user');
    }
  };

  const formatSize = (bytesStr: string) => {
    const bytes = parseInt(bytesStr, 10);
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatQuotaPercent = (usedStr: string, quotaStr: string) => {
    const used = parseInt(usedStr, 10) || 0;
    const quota = parseInt(quotaStr, 10) || 1;
    return Math.min(100, Math.round((used / quota) * 100));
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Administration Dashboard</h1>
          
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border-color)' }}>
            <button 
              className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('stats')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Overview
            </button>
            <button 
              className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('users')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              User Management
            </button>
          </div>
        </div>

        {activeTab === 'stats' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                  <Users size={24} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Total Users</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats?.totalUsers || 0}</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                  <HardDrive size={24} style={{ color: 'var(--success)' }} />
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Storage Used</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{formatSize(stats?.storageUsed || '0')}</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                  <ShieldCheck size={24} style={{ color: 'var(--danger)' }} />
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Viruses Blocked</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>0</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                  <Activity size={24} style={{ color: 'var(--secondary)' }} />
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Duplicate Savings</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>45.2 MB</div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Recent Activity Logs</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem 0' }}>Action</th>
                    <th>Entity Type</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentActivity?.map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0', fontWeight: 500 }}>
                        {log.action}
                        {log.entityName && (
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.85rem' }}>
                            ({log.entityName})
                          </span>
                        )}
                      </td>
                      <td>{log.entityType}</td>
                      <td className="text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                    <tr>
                      <td colSpan={3} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Registered Users</h3>
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading users list...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '1rem 0' }}>User</th>
                    <th>Role</th>
                    <th style={{ width: '220px' }}>Storage Quota Used</th>
                    <th>Joined At</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item: any) => {
                    const percent = formatQuotaPercent(item.storageUsed, item.storageQuota);
                    const isSelf = item.id === currentUser?.id;
                    
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '1rem 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isSelf ? 'var(--primary)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem' }}>
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {item.name} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '4px' }}>(You)</span>}
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem', 
                            fontWeight: 500,
                            background: item.role === 'ADMIN' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                            color: item.role === 'ADMIN' ? 'var(--primary)' : 'var(--text-muted)'
                          }}>
                            {item.role === 'ADMIN' && <Shield size={12} />}
                            {item.role}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>{formatSize(item.storageUsed)}</span>
                              <span>{percent}%</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${percent}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }} />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Limit: {formatSize(item.storageQuota)}
                            </div>
                          </div>
                        </td>
                        <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {!isSelf && (
                            <button 
                              className="btn-ghost" 
                              onClick={() => handleDeleteUser(item.id, item.name)}
                              style={{ 
                                padding: '0.5rem', 
                                border: 'none', 
                                background: 'transparent', 
                                color: 'var(--danger)', 
                                cursor: 'pointer',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Delete User and all associated data"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No users registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
