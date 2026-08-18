import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { FileText, Folder as FolderIcon, Upload, Trash2, Download, Search, Share2, MoreHorizontal, Image as ImageIcon, FileArchive as FileArchiveIcon, Database as DatabaseIcon, Code as CodeIcon, Star } from 'lucide-react';
import { UploadManager } from '../components/UploadManager';
import type { UploadItem } from '../components/UploadManager';
import { ChunkUploader } from '../utils/uploadClient';

interface FileItem {
  id: string;
  originalName: string;
  size: string;
  updatedAt: string;
  starred: boolean;
}

interface FolderItem {
  id: string;
  name: string;
  updatedAt: string;
  starred: boolean;
}

interface ImagePreviewProps {
  fileId: string;
  token: string;
  alt: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ fileId, token, alt }) => {
  const [src, setSrc] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let objectUrl = '';
    const fetchImage = async () => {
      if (!fileId) {
        setError(true);
        return;
      }
      try {
        const res = await axios.get(`/api/files/${fileId}/download`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        objectUrl = window.URL.createObjectURL(res.data);
        setSrc(objectUrl);
        setError(false);
      } catch (err) {
        console.error("Failed to load image preview", err);
        setError(true);
      }
    };

    fetchImage();

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, token]);

  if (error) {
    return (
      <div style={{ 
        width: '100%', 
        height: '150px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <ImageIcon size={28} style={{ opacity: 0.5, marginBottom: '6px' }} />
        <span>Preview unavailable</span>
      </div>
    );
  }

  if (!src) {
    return (
      <div style={{ 
        width: '100%', 
        height: '150px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        Loading preview...
      </div>
    );
  }

  return <img src={src} alt={alt} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px' }} />;
};

const Dashboard = () => {
  const { token, refreshUser } = useContext(AuthContext);
  const queryParams = new URLSearchParams(window.location.search);
  const initialFolder = queryParams.get('folder');

  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    placeholder: string;
    submitText: string;
    onSubmit: (val: string) => void;
  } | null>(null);
  const [modalInputValue, setModalInputValue] = useState('');

  const toggleMenu = (id: string) => {
    setActiveMenuId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const getFolderColor = (index: number) => {
    const colors = ['#3b82f6', '#a855f7', '#06b6d4', '#10b981', '#6366f1'];
    return colors[index % colors.length];
  };

  const isImageFile = (file: FileItem) => {
    const ext = file.originalName.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
  };

  const getFileIcon = (file: FileItem) => {
    const ext = file.originalName.split('.').pop()?.toLowerCase();
    
    // PDF
    if (ext === 'pdf') {
      return (
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={22} style={{ color: '#ef4444' }} />
        </div>
      );
    }
    // Figma
    if (ext === 'fig') {
      return (
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(242, 78, 30, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={22} style={{ color: '#f24e1e' }} />
        </div>
      );
    }
    // SQL / Database
    if (ext === 'sql' || ext === 'db') {
      return (
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DatabaseIcon size={22} style={{ color: '#3b82f6' }} />
        </div>
      );
    }
    // Code / Script
    const codeExts = ['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'json', 'sh'];
    if (codeExts.includes(ext || '')) {
      return (
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CodeIcon size={22} style={{ color: '#6366f1' }} />
        </div>
      );
    }
    // Image
    const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    if (imgExts.includes(ext || '')) {
      return (
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ImageIcon size={22} style={{ color: '#10b981' }} />
        </div>
      );
    }
    // Zip / Archive
    const zipExts = ['zip', 'rar', 'tar', 'gz', '7z'];
    if (zipExts.includes(ext || '')) {
      return (
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileArchiveIcon size={22} style={{ color: '#f59e0b' }} />
        </div>
      );
    }
    
    // Default
    return (
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileText size={22} style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  };

  const getLargeFileIcon = (file: FileItem) => {
    const ext = file.originalName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText size={32} style={{ color: '#ef4444' }} />;
    if (ext === 'fig') return <FileText size={32} style={{ color: '#f24e1e' }} />;
    if (ext === 'sql' || ext === 'db') return <DatabaseIcon size={32} style={{ color: '#3b82f6' }} />;
    return <CodeIcon size={32} style={{ color: '#3b82f6' }} />;
  };

  const getLargeFileIconContainerStyle = (file: FileItem) => {
    const ext = file.originalName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return {
        width: '64px',
        height: '64px',
        borderRadius: '12px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        background: 'rgba(239, 68, 68, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    }
    if (ext === 'fig') {
      return {
        width: '64px',
        height: '64px',
        borderRadius: '12px',
        border: '1px solid rgba(242, 78, 30, 0.3)',
        background: 'rgba(242, 78, 30, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    }
    if (ext === 'sql' || ext === 'db') {
      return {
        width: '64px',
        height: '64px',
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        background: 'rgba(59, 130, 246, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    }
    // Code / Default
    return {
      width: '64px',
      height: '64px',
      borderRadius: '12px',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      background: 'rgba(99, 102, 241, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  };

  const getFileTypeLabel = (file: FileItem) => {
    const ext = file.originalName.split('.').pop()?.toLowerCase();
    if (!ext) return 'File';
    if (ext === 'pdf') return 'PDF';
    if (ext === 'fig') return 'Fig';
    if (ext === 'sql') return 'Database';
    if (ext === 'db') return 'Database';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'Image';
    if (['zip', 'rar', 'tar'].includes(ext)) return 'Archive';
    if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py'].includes(ext)) return 'Code';
    return ext.toUpperCase();
  };

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

  const handleCreateFolder = () => {
    setModalInputValue('');
    setModalConfig({
      isOpen: true,
      title: 'Create New Folder',
      description: 'Enter a name for your new folder:',
      placeholder: 'Folder name...',
      submitText: 'Create Folder',
      onSubmit: async (name) => {
        if (!name.trim()) return;
        try {
          await axios.post('/api/folders', { name: name.trim(), parentId: currentFolder }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchData();
        } catch (error: any) {
          alert(error.response?.data?.message || 'Error creating folder');
        }
      }
    });
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

  const handleToggleStarFile = async (id: string) => {
    try {
      await axios.patch(`/api/files/${id}/star`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Error starring file', error);
    }
  };

  const handleToggleStarFolder = async (id: string) => {
    try {
      await axios.patch(`/api/folders/${id}/star`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Error starring folder', error);
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

  const handleShare = (id: string) => {
    setModalInputValue('');
    setModalConfig({
      isOpen: true,
      title: 'Share File',
      description: 'Enter the email address of the user you want to share with:',
      placeholder: 'user@example.com',
      submitText: 'Share',
      onSubmit: async (email) => {
        if (!email.trim()) return;
        try {
          await axios.post('/api/shares/share', { fileId: id, email: email.trim() }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          alert('File shared successfully!');
        } catch (error: any) {
          alert(error.response?.data?.message || 'Error sharing file');
        }
      }
    });
  };

  const handleShareFolder = (id: string) => {
    setModalInputValue('');
    setModalConfig({
      isOpen: true,
      title: 'Share Folder',
      description: 'Enter the email address of the user you want to share this folder with:',
      placeholder: 'user@example.com',
      submitText: 'Share Folder',
      onSubmit: async (email) => {
        if (!email.trim()) return;
        try {
          await axios.post('/api/shares/share-folder', { folderId: id, email: email.trim() }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          alert('Folder shared successfully!');
        } catch (error: any) {
          alert(error.response?.data?.message || 'Error sharing folder');
        }
      }
    });
  };

  const formatSize = (bytesStr: string | number) => {
    const bytes = typeof bytesStr === 'string' ? parseInt(bytesStr, 10) : bytesStr;
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const starredFiles = files.filter((f) => f.starred);
  const starredFolders = folders.filter((f) => f.starred);

  return (
    <div className="app-container">
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentFolder && (
              <button className="btn-ghost" onClick={() => setCurrentFolder(null)} style={{ padding: '0.5rem', cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                &larr; Back to Root
              </button>
            )}
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>My Storage</h1>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', width: '100%', maxWidth: '100%', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search files..." 
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary" onClick={handleCreateFolder} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <FolderIcon size={18} />
              New Folder
            </button>
            <button className="btn btn-secondary" onClick={handleFolderUploadClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <Upload size={18} />
              Upload Folder
            </button>
            <button className="btn btn-primary" onClick={handleUploadClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
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
            
            {/* Top section: Starred / Featured Items Section */}
            {(starredFiles.length > 0 || starredFolders.length > 0) && (
              <>
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.2rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={20} fill="#eab308" color="#eab308" /> Starred Items
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2.5rem'
                }}>
                  {/* Starred Folders */}
                  {starredFolders.map((folder, index) => (
                    <div 
                      key={`starred-folder-${folder.id}`} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.25rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between', 
                        cursor: 'pointer',
                        position: 'relative',
                        borderRadius: '16px',
                        minHeight: '120px',
                        border: '1px solid rgba(234, 179, 8, 0.3)'
                      }} 
                      onClick={() => setCurrentFolder(folder.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <FolderIcon size={32} style={{ color: getFolderColor(index) }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); handleToggleStarFolder(folder.id); }}
                            title="Unstar Folder"
                          >
                            <Star size={16} fill="#eab308" color="#eab308" />
                          </button>
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }} 
                            onClick={(e) => { e.stopPropagation(); toggleMenu(folder.id); }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Folder</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          {new Date(folder.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Starred Files */}
                  {starredFiles.map((file) => (
                    <div 
                      key={`starred-file-${file.id}`} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.25rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '1rem',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        border: '1px solid rgba(234, 179, 8, 0.3)'
                      }}
                    >
                      {/* Top half: preview */}
                      {isImageFile(file) ? (
                        <ImagePreview fileId={file.id} token={token || ''} alt={file.originalName} />
                      ) : (
                        <div style={{ width: '100%', height: '150px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={getLargeFileIconContainerStyle(file)}>
                            {getLargeFileIcon(file)}
                          </div>
                        </div>
                      )}
                      
                      {/* Bottom half: name, size, time, and action buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', position: 'relative' }}>
                        <span className="file-name" title={file.originalName} style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', maxWidth: '75%' }}>
                          {file.originalName}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatSize(file.size)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          Today, 10:34 AM
                        </span>
                        
                        {/* Action buttons on bottom right */}
                        <div style={{ display: 'flex', gap: '0.4rem', position: 'absolute', right: 0, bottom: 0 }}>
                          <button className="btn-ghost" style={{ padding: '0.35rem', border: '1px solid rgba(234, 179, 8, 0.3)', cursor: 'pointer', background: 'rgba(234, 179, 8, 0.05)', borderRadius: '8px', color: '#eab308', display: 'flex', alignItems: 'center' }} onClick={() => handleToggleStarFile(file.id)} title="Unstar File">
                            <Star size={14} fill="#eab308" color="#eab308" />
                          </button>
                          <button className="btn-ghost" style={{ padding: '0.35rem', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} onClick={() => handleDownload(file.id, file.originalName)} title="Download">
                            <Download size={14} />
                          </button>
                          <button className="btn-ghost" style={{ padding: '0.35rem', border: '1px solid rgba(99, 102, 241, 0.2)', cursor: 'pointer', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', color: 'var(--secondary)', display: 'flex', alignItems: 'center' }} onClick={() => handleShare(file.id)} title="Share">
                            <Share2 size={14} />
                          </button>
                          <button className="btn-ghost" style={{ padding: '0.35rem', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', color: 'var(--danger)', display: 'flex', alignItems: 'center' }} onClick={() => handleDelete(file.id, 'file')} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Folders Section */}
            {folders.length > 0 && (
              <>
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.2rem', textAlign: 'left' }}>Folders</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2.5rem'
                }}>
                  {folders.map((folder, index) => (
                    <div 
                      key={folder.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.25rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between', 
                        cursor: 'pointer',
                        position: 'relative',
                        borderRadius: '16px',
                        minHeight: '120px'
                      }} 
                      onClick={() => setCurrentFolder(folder.id)}
                    >
                      {/* Top section: folder icon and 3 dots menu */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <FolderIcon size={32} style={{ color: getFolderColor(index) }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); handleToggleStarFolder(folder.id); }}
                            title={folder.starred ? "Unstar Folder" : "Star Folder"}
                          >
                            <Star size={16} fill={folder.starred ? "#eab308" : "none"} color={folder.starred ? "#eab308" : "var(--text-muted)"} />
                          </button>
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }} 
                            onClick={(e) => { e.stopPropagation(); toggleMenu(folder.id); }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          
                          {activeMenuId === folder.id && (
                            <div className="glass-panel dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleToggleStarFolder(folder.id); }}>
                                <Star size={14} fill={folder.starred ? "#eab308" : "none"} color={folder.starred ? "#eab308" : "currentColor"} /> {folder.starred ? 'Unstar Folder' : 'Star Folder'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDownloadFolder(folder.id, folder.name); }}>
                                <Download size={14} /> Download ZIP
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleShareFolder(folder.id); }}>
                                <Share2 size={14} /> Share Folder
                              </button>
                              <button style={{ color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDelete(folder.id, 'folder'); }}>
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Bottom section: text details */}
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Folder</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          {new Date(folder.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* All Files Section */}
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.2rem', textAlign: 'left' }}>All Files</h3>
            {files.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
                <p>No files found. Upload something to get started!</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
                gap: '1.5rem'
              }}>
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '1.25rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      position: 'relative',
                      borderRadius: '16px',
                      minHeight: '120px',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Top section: file icon and 3 dots menu */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      {getFileIcon(file)}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
                        <button 
                          className="btn-ghost" 
                          style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); handleToggleStarFile(file.id); }}
                          title={file.starred ? "Unstar File" : "Star File"}
                        >
                          <Star size={16} fill={file.starred ? "#eab308" : "none"} color={file.starred ? "#eab308" : "var(--text-muted)"} />
                        </button>
                        <button 
                          className="btn-ghost" 
                          style={{ padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }} 
                          onClick={(e) => { e.stopPropagation(); toggleMenu(file.id); }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        
                        {activeMenuId === file.id && (
                          <div className="glass-panel dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleToggleStarFile(file.id); }}>
                              <Star size={14} fill={file.starred ? "#eab308" : "none"} color={file.starred ? "#eab308" : "currentColor"} /> {file.starred ? 'Unstar File' : 'Star File'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDownload(file.id, file.originalName); }}>
                              <Download size={14} /> Download
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleShare(file.id); }}>
                              <Share2 size={14} /> Share
                            </button>
                            <button style={{ color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDelete(file.id, 'file'); }}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Bottom section: text details */}
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                      <span className="file-name" title={file.originalName} style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.originalName}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {getFileTypeLabel(file)}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        <span>{formatSize(file.size)}</span>
                        <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </div>
        )}
      </div>
      {modalConfig?.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }} onClick={() => setModalConfig(null)}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: 'calc(100vw - 32px)',
            padding: '1.5rem',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: 'var(--text-main)' }}>{modalConfig.title}</h3>
            {modalConfig.description && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                {modalConfig.description}
              </p>
            )}
            <form onSubmit={(e) => {
              e.preventDefault();
              modalConfig.onSubmit(modalInputValue);
              setModalConfig(null);
            }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                placeholder={modalConfig.placeholder}
                value={modalInputValue}
                onChange={(e) => setModalInputValue(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalConfig(null)}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  {modalConfig.submitText}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
