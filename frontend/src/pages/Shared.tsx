import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { FileText, Download, Folder as FolderIcon } from 'lucide-react';

interface SharedFileItem {
  id: string;
  shareId: string;
  type: string;
  originalName: string;
  size: string;
  sharedBy: string;
  sharedByEmail: string;
  sharedAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

const Shared = () => {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<SharedFileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSharedData = async () => {
    try {
      const res = await axios.get('/api/shares/shared-with-me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSharedFiles(res.data.data);
    } catch (error) {
      console.error('Error fetching shared data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedData();
  }, [token]);

  const handleDownload = async (id: string, filename: string) => {
    try {
      const res = await axios.get(`/api/files/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Error downloading file', error);
    }
  };

  const handleDownloadFolder = async (id: string, folderName: string) => {
    try {
      const res = await axios.get(`/api/folders/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${folderName}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Error downloading folder', error);
    }
  };

  const handleStatusUpdate = async (shareId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      await axios.patch(`/api/shares/${shareId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSharedData();
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  const formatSize = (bytesStr: string) => {
    const bytes = parseInt(bytesStr);
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="app-container">
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Shared With Me</h1>
        
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="glass-panel" style={{ padding: '1.25rem', flex: 1, minHeight: '60vh' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--secondary)' }}>Transfer Requests</h2>
            <div className="file-grid" style={{ marginBottom: '2rem' }}>
              {sharedFiles.filter(f => f.status === 'PENDING').length === 0 && <p className="text-muted" style={{ gridColumn: '1 / -1' }}>No pending transfer requests.</p>}
              {sharedFiles.filter(f => f.status === 'PENDING').map(file => (
                <div key={file.id} className="file-card glass-panel" style={{ position: 'relative', border: '1px solid var(--secondary)' }}>
                  {file.type === 'folder' ? (
                    <FolderIcon className="file-icon" style={{ color: 'var(--secondary)' }} />
                  ) : (
                    <FileText className="file-icon" style={{ color: 'var(--secondary)' }} />
                  )}
                  <div className="file-name" title={file.originalName}>{file.originalName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    {file.type === 'folder' ? 'Folder' : formatSize(file.size)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    From: {file.sharedBy}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                    <button className="btn btn-primary" style={{ padding: '0.5rem', border: 'none', cursor: 'pointer', borderRadius: '4px', flex: 1, fontSize: '0.8rem' }} onClick={() => handleStatusUpdate(file.shareId, 'ACCEPTED')} title="Accept">
                      Accept
                    </button>
                    <button className="btn-ghost" style={{ padding: '0.5rem', border: '1px solid var(--danger)', color: 'var(--danger)', cursor: 'pointer', borderRadius: '4px', flex: 1, fontSize: '0.8rem' }} onClick={() => handleStatusUpdate(file.shareId, 'DECLINED')} title="Decline">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--success)' }}>Accepted Files & Folders</h2>
            <div className="file-grid">
              {sharedFiles.filter(f => f.status === 'ACCEPTED').length === 0 && <p className="text-muted" style={{ gridColumn: '1 / -1' }}>No accepted items.</p>}
              {sharedFiles.filter(f => f.status === 'ACCEPTED').map(file => (
                <div key={file.id} className="file-card glass-panel" style={{ position: 'relative', cursor: file.type === 'folder' ? 'pointer' : 'default' }} onClick={() => { if (file.type === 'folder') navigate('/dashboard?folder=' + file.id); }}>
                  {file.type === 'folder' ? (
                    <FolderIcon className="file-icon" style={{ color: 'var(--success)' }} />
                  ) : (
                    <FileText className="file-icon" style={{ color: 'var(--success)' }} />
                  )}
                  <div className="file-name" title={file.originalName}>{file.originalName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    {file.type === 'folder' ? 'Folder' : formatSize(file.size)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    From: {file.sharedBy}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                    <button className="btn-ghost" style={{ padding: '0.5rem', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', width: '100%' }} onClick={(e) => { 
                      e.stopPropagation(); 
                      if (file.type === 'folder') {
                        handleDownloadFolder(file.id, file.originalName);
                      } else {
                        handleDownload(file.id, file.originalName); 
                      }
                    }} title="Download">
                      <Download size={16} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shared;
