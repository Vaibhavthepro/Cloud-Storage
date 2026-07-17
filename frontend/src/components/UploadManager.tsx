import React, { useState } from 'react';
import { Play, Pause, X, ChevronDown, ChevronUp, CheckCircle, Loader2, FileText } from 'lucide-react';
import type { UploadProgress } from '../utils/uploadClient';

export interface UploadItem {
  id: string; // usually same as uploadId or temp uuid
  name: string;
  size: number;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
  speed: number;
  eta: number;
  status: UploadProgress['status'];
  error?: string;
  uploader?: any; // ChunkUploader reference
}

interface UploadManagerProps {
  uploads: UploadItem[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onClearCompleted: () => void;
}

export const UploadManager: React.FC<UploadManagerProps> = ({
  uploads,
  onPause,
  onResume,
  onCancel,
  onClearCompleted,
}) => {
  const [minimized, setMinimized] = useState(false);

  if (uploads.length === 0) return null;

  const activeCount = uploads.filter(
    (u) => u.status === 'UPLOADING' || u.status === 'PENDING' || u.status === 'VIRUS_SCANNING'
  ).length;

  const completedCount = uploads.filter((u) => u.status === 'SUCCESS').length;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatETA = (seconds: number) => {
    if (seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'SUCCESS':
        return 'var(--success)';
      case 'FAILED':
        return 'var(--danger)';
      case 'PAUSED':
        return '#f59e0b'; // Amber
      case 'VIRUS_SCANNING':
        return 'var(--secondary)';
      default:
        return 'var(--primary)';
    }
  };

  const getStatusMessage = (item: UploadItem) => {
    switch (item.status) {
      case 'SUCCESS':
        return 'Upload complete';
      case 'FAILED':
        return item.error || 'Upload failed';
      case 'PAUSED':
        return 'Paused';
      case 'VIRUS_SCANNING':
        return 'Scanning for malware...';
      case 'PENDING':
        return 'Preparing...';
      case 'UPLOADING':
        return `Uploading chunk ${item.currentChunk} of ${item.totalChunks}`;
      default:
        return '';
    }
  };

  return (
    <>
      <style>{`
        .upload-manager-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 380px;
          max-height: 480px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-color);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 480px) {
          .upload-manager-container {
            width: calc(100% - 32px);
            right: 16px;
            bottom: 16px;
          }
        }

        .upload-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          background: rgba(15, 23, 42, 0.85);
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
        }

        .upload-manager-title {
          font-size: 0.95rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .upload-manager-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .upload-manager-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
        }

        .upload-manager-btn:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.08);
        }

        .upload-manager-body {
          flex: 1;
          overflow-y: auto;
          background: rgba(30, 41, 59, 0.85);
          padding: 12px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 380px;
        }

        .upload-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .upload-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .upload-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .upload-item-fileinfo {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .upload-item-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .upload-item-size {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .upload-item-progress-bar-bg {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .upload-item-progress-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .upload-item-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .upload-item-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pulse-loader {
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="upload-manager-container glass-panel animate-fade-in"
        style={{
          height: minimized ? '48px' : 'auto',
        }}
      >
        <div className="upload-manager-header" onClick={() => setMinimized(!minimized)}>
          <div className="upload-manager-title">
            {activeCount > 0 ? (
              <>
                <Loader2 className="pulse-loader" size={16} style={{ color: 'var(--primary)' }} />
                <span>Uploading {activeCount} {activeCount === 1 ? 'file' : 'files'}</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                <span>Uploads finished ({completedCount})</span>
              </>
            )}
          </div>
          <div className="upload-manager-controls" onClick={(e) => e.stopPropagation()}>
            {completedCount > 0 && activeCount === 0 && (
              <button
                className="upload-manager-btn"
                onClick={onClearCompleted}
                style={{ fontSize: '0.75rem', padding: '2px 6px' }}
              >
                Clear
              </button>
            )}
            <button className="upload-manager-btn" onClick={() => setMinimized(!minimized)}>
              {minimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="upload-manager-body">
            {uploads.map((item) => (
              <div key={item.id} className="upload-item">
                <div className="upload-item-header">
                  <div className="upload-item-fileinfo">
                    <FileText size={16} style={{ color: getStatusColor(item.status), flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="upload-item-name" title={item.name}>
                        {item.name}
                      </div>
                      <div className="upload-item-size">{formatSize(item.size)}</div>
                    </div>
                  </div>

                  <div className="upload-item-actions">
                    {item.status === 'UPLOADING' && (
                      <button
                        className="upload-manager-btn"
                        onClick={() => onPause(item.id)}
                        title="Pause"
                      >
                        <Pause size={14} />
                      </button>
                    )}
                    {item.status === 'PAUSED' && (
                      <button
                        className="upload-manager-btn"
                        onClick={() => onResume(item.id)}
                        title="Resume"
                      >
                        <Play size={14} />
                      </button>
                    )}
                    {(item.status === 'UPLOADING' ||
                      item.status === 'PAUSED' ||
                      item.status === 'FAILED' ||
                      item.status === 'PENDING') && (
                      <button
                        className="upload-manager-btn"
                        onClick={() => onCancel(item.id)}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="upload-item-progress-bar-bg">
                  <div
                    className="upload-item-progress-bar-fill"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: getStatusColor(item.status),
                    }}
                  />
                </div>

                <div className="upload-item-meta">
                  <span style={{ color: getStatusColor(item.status), fontWeight: 500 }}>
                    {getStatusMessage(item)}
                  </span>
                  <span>
                    {item.status === 'UPLOADING' && item.speed > 0 && (
                      <>
                        {formatSpeed(item.speed)} • ETA: {formatETA(item.eta)}
                      </>
                    )}
                    {item.status === 'SUCCESS' && '100%'}
                    {item.status === 'PAUSED' && `${item.percentage}%`}
                    {item.status === 'FAILED' && 'Error'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
