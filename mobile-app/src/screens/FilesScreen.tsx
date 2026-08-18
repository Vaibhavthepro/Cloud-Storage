import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { FileItem, FolderItem } from '../types';
import { getFilesApi, uploadFileApi, deleteFileApi, toggleStarFileApi, downloadAndOpenFileApi } from '../services/api/files';
import { getFoldersApi, createFolderApi, deleteFolderApi, toggleStarFolderApi } from '../services/api/folders';
import { searchApi } from '../services/api/search';
import { FileCard } from '../components/FileCard';
import { FolderCard } from '../components/FolderCard';
import { UploadModal } from '../components/UploadModal';
import { ShareModal } from '../components/ShareModal';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';

export const FilesScreen = () => {
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null);
  const [folderHistory, setFolderHistory] = useState<FolderItem[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Upload modal state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Create folder modal
  const [createFolderVisible, setCreateFolderVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Share modal
  const [shareItem, setShareItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);

  const fetchData = async () => {
    try {
      if (searchQuery.trim()) {
        const searchResults = await searchApi(searchQuery.trim());
        setFiles(searchResults.files);
        setFolders(searchResults.folders);
      } else {
        const folderId = currentFolder ? currentFolder.id : undefined;
        const [filesData, foldersData] = await Promise.all([
          getFilesApi(folderId),
          getFoldersApi(folderId),
        ]);
        setFiles(filesData);
        setFolders(foldersData);
      }
    } catch (error: any) {
      console.error('Error fetching files/folders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [currentFolder, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Android Native File Picker & Upload
  const handlePickAndUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploadFilename(asset.name);
      setUploadProgress(0);
      setUploadStatus('Preparing upload & ClamAV virus scan...');
      setUploadError(false);
      setUploadSuccess(false);
      setUploading(true);

      await uploadFileApi(
        asset.uri,
        asset.name,
        asset.mimeType || 'application/octet-stream',
        currentFolder ? currentFolder.id : undefined,
        (percent) => {
          setUploadProgress(percent);
          if (percent < 100) {
            setUploadStatus(`Uploading (${percent}%)...`);
          } else {
            setUploadStatus('ClamAV Virus Scanning & Supabase Storage...');
          }
        }
      );

      setUploadStatus('Upload & Virus Scan Complete!');
      setUploadSuccess(true);
      setTimeout(() => {
        setUploading(false);
        fetchData();
      }, 1500);
    } catch (error: any) {
      setUploadError(true);
      setUploadStatus(error.message || 'Upload failed');
      setTimeout(() => {
        setUploading(false);
      }, 2500);
    }
  };

  // Folder navigation
  const openFolder = (folder: FolderItem) => {
    setFolderHistory((prev) => [...prev, folder]);
    setCurrentFolder(folder);
  };

  const navigateBackFolder = () => {
    if (folderHistory.length === 0) return;
    const newHistory = [...folderHistory];
    newHistory.pop();
    const parent = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
    setFolderHistory(newHistory);
    setCurrentFolder(parent);
  };

  // Folder creation
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Invalid Name', 'Folder name cannot be empty.');
      return;
    }
    try {
      await createFolderApi(newFolderName.trim(), currentFolder ? currentFolder.id : undefined);
      setNewFolderName('');
      setCreateFolderVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Create Folder Failed', error.message || 'Error creating folder');
    }
  };

  // File Download & Open
  const handleDownloadFile = async (file: FileItem) => {
    try {
      setUploadFilename(file.originalName);
      setUploadProgress(0);
      setUploadStatus('Downloading file...');
      setUploadError(false);
      setUploadSuccess(false);
      setUploading(true);

      await downloadAndOpenFileApi(file.id, file.originalName, (percent) => {
        setUploadProgress(percent);
      });

      setUploadStatus('File downloaded & opened!');
      setUploadSuccess(true);
      setTimeout(() => setUploading(false), 1200);
    } catch (error: any) {
      setUploadError(true);
      setUploadStatus(error.message || 'Download failed');
      setTimeout(() => setUploading(false), 2500);
    }
  };

  // Delete handlers
  const handleDeleteFile = (file: FileItem) => {
    Alert.alert('Delete File', `Are you sure you want to delete "${file.originalName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFileApi(file.id);
            fetchData();
          } catch (error: any) {
            Alert.alert('Delete Failed', error.message);
          }
        },
      },
    ]);
  };

  const handleDeleteFolder = (folder: FolderItem) => {
    Alert.alert('Delete Folder', `Are you sure you want to delete folder "${folder.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFolderApi(folder.id);
            fetchData();
          } catch (error: any) {
            Alert.alert('Delete Failed', error.message);
          }
        },
      },
    ]);
  };

  // Star handlers
  const handleStarFile = async (file: FileItem) => {
    try {
      await toggleStarFileApi(file.id);
      fetchData();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleStarFolder = async (folder: FolderItem) => {
    try {
      await toggleStarFolderApi(folder.id);
      fetchData();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search & Breadcrumb Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchWrapper}>
          <Feather name="search" color="#64748b" size={18} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search files and folders..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Navigation Breadcrumb */}
      {currentFolder && (
        <View style={styles.breadcrumbBar}>
          <TouchableOpacity onPress={navigateBackFolder} style={styles.backBtn}>
            <Feather name="chevron-left" color="#38bdf8" size={20} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.currentFolderText} numberOfLines={1}>
            / {currentFolder.name}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.uploadBtn} onPress={handlePickAndUploadFile}>
          <Feather name="upload" color="#ffffff" size={18} style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>Upload File</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.createFolderBtn} onPress={() => setCreateFolderVisible(true)}>
          <Feather name="folder-plus" color="#38bdf8" size={18} style={{ marginRight: 6 }} />
          <Text style={styles.createFolderBtnText}>New Folder</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <ActivityIndicator color="#38bdf8" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[...folders.map((f) => ({ ...f, _isFolder: true })), ...files.map((f) => ({ ...f, _isFolder: false }))]}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Files Found</Text>
              <Text style={styles.emptySubtitle}>Tap 'Upload File' or 'New Folder' to get started.</Text>
            </View>
          }
          renderItem={({ item }: any) => {
            if (item._isFolder) {
              return (
                <FolderCard
                  folder={item}
                  onOpen={openFolder}
                  onDelete={handleDeleteFolder}
                  onStar={handleStarFolder}
                />
              );
            }
            return (
              <FileCard
                file={item}
                onDownload={handleDownloadFile}
                onDelete={handleDeleteFile}
                onStar={handleStarFile}
                onShare={(f) => setShareItem({ id: f.id, name: f.originalName, type: 'file' })}
              />
            );
          }}
        />
      )}

      {/* Upload / Download Progress Modal */}
      <UploadModal
        visible={uploading}
        filename={uploadFilename}
        progress={uploadProgress}
        statusText={uploadStatus}
        isError={uploadError}
        isSuccess={uploadSuccess}
      />

      {/* Share Dialog Modal */}
      <ShareModal
        visible={!!shareItem}
        item={shareItem}
        onClose={() => setShareItem(null)}
      />

      {/* Create Folder Modal */}
      <Modal visible={createFolderVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Folder</Text>
            <TextInput
              style={styles.folderInput}
              placeholder="Folder Name"
              placeholderTextColor="#64748b"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCreateFolderVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateBtn} onPress={handleCreateFolder}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    paddingVertical: 10,
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  backText: {
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: 14,
  },
  currentFolderText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  createFolderBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  createFolderBtnText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  folderInput: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  modalCancelText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalCreateBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCreateText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
