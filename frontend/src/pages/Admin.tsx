import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { Users, HardDrive, ShieldCheck, Activity } from 'lucide-react';

const Admin = () => {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await axios.get('/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data.data);
      } catch (error) {
        console.error('Error fetching admin data', error);
      }
    };
    fetchAdminData();
  }, [token]);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <h1 style={{ marginBottom: '2rem', fontSize: '1.75rem' }}>Administration Dashboard</h1>

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
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{(parseInt(stats?.storageUsed || '0') / (1024*1024)).toFixed(2)} MB</div>
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
                  <td style={{ padding: '1rem 0', fontWeight: 500 }}>{log.action}</td>
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

      </div>
    </div>
  );
};

export default Admin;
