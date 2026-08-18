import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { getSharedWithMeApi } from '../services/api/shares';
import { FileItem, FolderItem } from '../types';
import { FileCard } from '../components/FileCard';
import { FolderCard } from '../components/FolderCard';
import { Feather } from '@expo/vector-icons';
import { downloadAndOpenFileApi } from '../services/api/files';
import { UploadModal } from '../components/UploadModal';

export const SharedScreen = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadFilename, setDownloadFilename] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');

  const fetchShared = async () => {
    try {
      const data = await getSharedWithMeApi();
      setFiles(data.files || []);
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Failed to fetch shared files:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchShared();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShared();
  };

  const handleDownloadFile = async (file: FileItem) => {
    try {
      setDownloadFilename(file.originalName);
      setDownloadProgress(0);
      setDownloadStatus('Downloading shared file...');
      setDownloading(true);

      await downloadAndOpenFileApi(file.id, file.originalName, (percent) => {
        setDownloadProgress(percent);
      });

      setDownloadStatus('Downloaded successfully!');
      setTimeout(() => setDownloading(false), 1200);
    } catch (error: any) {
      setDownloadStatus(error.message || 'Download failed');
      setTimeout(() => setDownloading(false), 2500);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="users" color="#a855f7" size={24} style={{ marginRight: 8 }} />
        <Text style={styles.headerTitle}>Shared With Me</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#a855f7" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[
            ...folders.map((f) => ({ ...f, _isFolder: true })),
            ...files.map((f) => ({ ...f, _isFolder: false })),
          ]}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Shared Files</Text>
              <Text style={styles.emptySubtitle}>Files or folders shared with you by other users will appear here.</Text>
            </View>
          }
          renderItem={({ item }: any) => {
            if (item._isFolder) {
              return (
                <FolderCard
                  folder={item}
                  onOpen={() => {}}
                  onDelete={() => {}}
                  onStar={() => {}}
                />
              );
            }
            return (
              <FileCard
                file={item}
                onDownload={handleDownloadFile}
                onDelete={() => {}}
                onStar={() => {}}
              />
            );
          }}
        />
      )}

      <UploadModal
        visible={downloading}
        filename={downloadFilename}
        progress={downloadProgress}
        statusText={downloadStatus}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
