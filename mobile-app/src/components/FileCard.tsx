import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FileItem } from '../types';
import { Feather } from '@expo/vector-icons';

interface FileCardProps {
  file: FileItem;
  onDownload: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onStar: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onDownload, onDelete, onStar, onShare }) => {
  const formatSize = (bytesStr: string) => {
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Feather name="image" color="#38bdf8" size={24} />;
    if (mime.startsWith('video/')) return <Feather name="film" color="#a855f7" size={24} />;
    if (mime.startsWith('audio/')) return <Feather name="music" color="#ec4899" size={24} />;
    return <Feather name="file-text" color="#60a5fa" size={24} />;
  };

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>{getFileIcon(file.mimeType)}</View>

      <View style={styles.infoContainer}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.originalName}
        </Text>
        <Text style={styles.fileMeta}>
          {formatSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity onPress={() => onStar(file)} style={styles.actionBtn}>
          <Feather name="star" size={18} color={file.starred ? '#eab308' : '#64748b'} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onDownload(file)} style={styles.actionBtn}>
          <Feather name="download" size={18} color="#38bdf8" />
        </TouchableOpacity>

        {onShare && (
          <TouchableOpacity onPress={() => onShare(file)} style={styles.actionBtn}>
            <Feather name="share-2" size={18} color="#a855f7" />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => onDelete(file)} style={styles.actionBtn}>
          <Feather name="trash-2" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconContainer: {
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  fileMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
