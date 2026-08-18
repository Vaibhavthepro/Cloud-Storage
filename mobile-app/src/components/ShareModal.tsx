import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { shareFileApi, shareFolderApi } from '../services/api/shares';

interface ShareModalProps {
  visible: boolean;
  item: { id: string; name: string; type: 'file' | 'folder' } | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ visible, item, onClose }) => {
  const [targetEmail, setTargetEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!item) return null;

  const handleShare = async () => {
    if (!targetEmail || !targetEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid user email address.');
      return;
    }

    setLoading(true);
    try {
      if (item.type === 'file') {
        await shareFileApi(item.id, targetEmail.trim());
      } else {
        await shareFolderApi(item.id, targetEmail.trim());
      }

      Alert.alert('Shared!', `Successfully shared ${item.name} with ${targetEmail}.`);
      setTargetEmail('');
      onClose();
    } catch (error: any) {
      Alert.alert('Sharing Failed', error.message || 'Could not share file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Feather name="share-2" color="#a855f7" size={24} style={{ marginRight: 8 }} />
            <Text style={styles.title}>Share {item.type === 'file' ? 'File' : 'Folder'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.subtitle}>Enter the email address of the user you want to share with:</Text>

          <TextInput
            style={styles.input}
            placeholder="user@example.com"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            value={targetEmail}
            onChangeText={setTargetEmail}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.shareBtnText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
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
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  itemName: {
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    fontSize: 14,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  shareBtn: {
    backgroundColor: '#a855f7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  shareBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
