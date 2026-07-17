import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { FileText, Folder as FolderIcon, Upload, Trash2, Download, Search, Share2 } from 'lucide-react';
import { UploadManager } from '../components/UploadManager';
import type { UploadItem } from '../components/UploadManager';
import { ChunkUploader } from '../utils/uploadClient';

interface FileItem {
  id: string;
  originalName: string;
  size: string;
  updatedAt: string;
}

interface FolderItem {
  id: string;
  name: string;
  updatedAt: string;
}

const Dashboard = () => {
  const { token, refreshUser } = useContext(AuthContext);
  const queryParams = new URLSearchParams(window.location.search);
  const initialFolder = queryParams.get('folder');

  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | null>(initialFolder);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const uploadersRef = useRef<{ [key: string]: ChunkUploader }>({});
  const [isDragging, setIsDragging] = useState(false);

  const handlePauseUpload = (id: string) => {
    uploadersRef.current[id]?.pause();
  };

  const handleResumeUpload = (id: string) => {
    uploadersRef.current[id]?.resume();
  };

  const handleCancelUpload = (id: string) => {
    uploadersRef.current[id]?.cancel();
    delete uploadersRef.current[id];
    setUploads((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCompleted = () => {
    setUploads((prev) => prev.filter((item) => item.status !== 'SUCCESS'));
  };

  const fetchData = async () => {
    try {
      if (searchQuery) {
        const res = await axios.get(`/api/search?q=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFiles(res.data.data.files);
        setFolders(res.data.data.folders);
      } else {
        const filesRes = await axios.get(currentFolder ? `/api/files?folderId=${currentFolder}` : '/api/files', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const foldersRes = await axios.get(currentFolder ? `/api/folders?parentId=${currentFolder}` : '/api/folders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFiles(filesRes.data.data);
        setFolders(foldersRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, token, currentFolder]);

  const handleCreateFolder = async () => {
    const name = window.prompt('Enter folder name:');
    if (!name) return;
    try {
      await axios.post('/api/folders', { name, parentId: currentFolder }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error creating folder');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFolderUploadClick = () => {
    folderInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFilesAndFolders([{ file, folderPath: '' }]);
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    const filesToUpload = Array.from(filesList).map((file) => {
      const parts = file.webkitRelativePath.split('/');
      parts.pop(); // Remove filename
      const folderPath = parts.join('/');
      return { file, folderPath };
    });

    await uploadFilesAndFolders(filesToUpload);
  };

  const uploadFilesAndFolders = async (filesList: { file: File; folderPath: string }[]) => {
    // 1. Get all unique folder paths to create
    const folderPathsSet = new Set<string>();
    filesList.forEach(({ folderPath }) => {
      if (folderPath) {
        let currentPath = '';
        folderPath.split('/').forEach((part, index) => {
          currentPath = index === 0 ? part : `${currentPath}/${part}`;
          folderPathsSet.add(currentPath);
        });
      }
    });

    // Sort by depth so parent folders are created first
    const sortedFolderPaths = Array.from(folderPathsSet).sort((a, b) => {
      return a.split('/').length - b.split('/').length;
    });

    // Create folders sequentially
    const pathToFolderId: { [path: string]: string } = {};

    try {
      setLoading(true);
      for (const relPath of sortedFolderPaths) {
        const parts = relPath.split('/');
        const folderName = parts[parts.length - 1];
        
        let parentFolderId: string | null = currentFolder;
        if (parts.length > 1) {
          const parentPath = parts.slice(0, -1).join('/');
          parentFolderId = pathToFolderId[parentPath] || currentFolder;
        }

        const res = await axios.post('/api/folders', {
          name: folderName,
          parentId: parentFolderId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        pathToFolderId[relPath] = res.data.data.id;
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error creating folder structure');
      fetchData();
      return;
    } finally {
      setLoading(false);
    }

    // 2. Start uploads
    filesList.forEach(({ file, folderPath }) => {
      const fileFolderId = folderPath ? (pathToFolderId[folderPath] || currentFolder) : currentFolder;
      const uploadId = Math.random().toString(36).substring(2, 9);
      
      const nameToShow = folderPath ? `${folderPath}/${file.name}` : file.name;

      const newItem: UploadItem = {
        id: uploadId,
        name: nameToShow,
        size: file.size,
        percentage: 0,
        currentChunk: 0,
        totalChunks: 0,
        speed: 0,
        eta: 0,
        status: 'PENDING',
      };

      setUploads((prev) => [newItem, ...prev]);

      const uploader = new ChunkUploader({
        file,
        token: token || '',
        folderId: fileFolderId,
        onProgress: (progress) => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === uploadId
                ? {
                    ...item,
                    percentage: progress.percentage,
                    currentChunk: progress.currentChunk,
                    totalChunks: progress.totalChunks,
                    speed: progress.speed,
                    eta: progress.eta,
                    status: progress.status,
                  }
                : item
            )
          );
        },
        onSuccess: () => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, status: 'SUCCESS', percentage: 100 } : item
            )
          );
          delete uploadersRef.current[uploadId];
          fetchData();
          refreshUser();
        },
        onError: (err) => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === uploadId ? { ...item, status: 'FAILED', error: err } : item
            )
          );
        },
      });

      uploadersRef.current[uploadId] = uploader;
      uploader.start();
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items) return;

    const filesToUpload: { file: File; folderPath: string }[] = [];

    const traverseEntry = async (entry: any, path: string = '') => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
        filesToUpload.push({ file, folderPath: path });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        
        const readAllEntries = async () => {
          const allEntries: any[] = [];
          const read = async () => {
            const batch = await new Promise<any[]>((resolve, reject) => dirReader.readEntries(resolve, reject));
            if (batch.length > 0) {
              allEntries.push(...batch);
              await read();
            }
          };
          await read();
          return allEntries;
        };

        const entries = await readAllEntries();
        const newPath = path ? `${path}/${entry.name}` : entry.name;
        for (const childEntry of entries) {
          await traverseEntry(childEntry, newPath);
        }
      }
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          promises.push(traverseEntry(entry));
        }
      }
    }

    await Promise.all(promises);

    if (filesToUpload.length === 0) return;
    await uploadFilesAndFolders(filesToUpload);
  };

  const handleDelete = async (id: string, type: 'file' | 'folder') => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      await axios.delete(`/api/${type}s/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      refreshUser();
    } catch (error) {
      console.error('Error deleting', error);
    }
  };

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

  const handleShare = async (id: string) => {
    const email = window.prompt('Enter the email address of the user you want to share with:');
    if (!email) return;

    try {
      await axios.post('/api/shares/share', { fileId: id, email }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('File shared successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error sharing file');
    }
  };

  const handleShareFolder = async (id: string) => {
    const email = window.prompt('Enter the email address of the user you want to share this folder with:');
    if (!email) return;

    try {
      await axios.post('/api/shares/share-folder', { folderId: id, email }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Folder shared successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error sharing folder');
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
      <Sidebar />
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentFolder && (
              <button className="btn-ghost" onClick={() => setCurrentFolder(null)} style={{ padding: '0.5rem', cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                &larr; Back to Root
              </button>
            )}
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>My Storage</h1>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search files..." 
                style={{ paddingLeft: '2.5rem', width: '250px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary" onClick={handleCreateFolder}>
              <FolderIcon size={18} />
              New Folder
            </button>
            <button className="btn btn-secondary" onClick={handleFolderUploadClick} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={18} />
              Upload Folder
            </button>
            <button className="btn btn-primary" onClick={handleUploadClick} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={18} />
              Upload File
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
              accept="*/*"
            />
            <input 
              type="file" 
              ref={folderInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFolderChange}
              {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
            />
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div 
            className="glass-panel" 
            style={{ 
              padding: '1.5rem', 
              flex: 1,
              border: isDragging ? '2px dashed var(--primary)' : '1px solid var(--border-color)',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderRadius: '8px',
                pointerEvents: 'none'
              }}>
                <Upload size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Drop files or folders here to upload</span>
              </div>
            )}
            
            {folders.length > 0 && (
              <>
                <h3 style={{ marginBottom: '1rem' }}>Folders</h3>
                <div className="file-grid" style={{ marginBottom: '2rem' }}>
                  {folders.map(folder => (
                    <div key={folder.id} className="file-card glass-panel" style={{ padding: '1rem', flexDirection: 'row', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setCurrentFolder(folder.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FolderIcon size={24} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 500 }}>{folder.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-ghost" style={{ padding: '0.25rem', border: 'none', cursor: 'pointer', color: 'var(--success)' }} onClick={(e) => { e.stopPropagation(); handleDownloadFolder(folder.id, folder.name); }} title="Download Folder as ZIP">
                          <Download size={16} />
                        </button>
                        <button className="btn-ghost" style={{ padding: '0.25rem', border: 'none', cursor: 'pointer', color: 'var(--secondary)' }} onClick={(e) => { e.stopPropagation(); handleShareFolder(folder.id); }} title="Share Folder">
                          <Share2 size={16} />
                        </button>
                        <button className="btn-ghost" style={{ padding: '0.25rem', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, 'folder'); }} title="Delete Folder">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h3 style={{ marginBottom: '1rem' }}>Files</h3>
            {files.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
                <p>No files found. Upload something to get started!</p>
              </div>
            ) : (
              <div className="file-grid">
                {files.map(file => (
                  <div key={file.id} className="file-card glass-panel">
                    <FileText className="file-icon" />
                    <div className="file-name" title={file.originalName}>{file.originalName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      {formatSize(file.size)}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                      <button className="btn-ghost" style={{ padding: '0.5rem', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} onClick={() => handleDownload(file.id, file.originalName)} title="Download">
                        <Download size={16} />
                      </button>
                      <button className="btn-ghost" style={{ padding: '0.5rem', border: 'none', cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--secondary)', borderRadius: '4px' }} onClick={() => handleShare(file.id)} title="Share">
                        <Share2 size={16} />
                      </button>
                      <button className="btn-ghost" style={{ padding: '0.5rem', border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '4px' }} onClick={() => handleDelete(file.id, 'file')} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </div>
        )}
      </div>
      <UploadManager
        uploads={uploads}
        onPause={handlePauseUpload}
        onResume={handleResumeUpload}
        onCancel={handleCancelUpload}
        onClearCompleted={handleClearCompleted}
      />
    </div>
  );
};

export default Dashboard;
