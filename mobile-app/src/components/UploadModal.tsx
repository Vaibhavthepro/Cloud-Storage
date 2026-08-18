import React from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface UploadModalProps {
  visible: boolean;
  filename: string;
  progress: number;
  statusText: string;
  isError?: boolean;
  isSuccess?: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  filename,
  progress,
  statusText,
  isError,
  isSuccess,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {isError ? (
            <Feather name="alert-circle" size={40} color="#ef4444" style={styles.icon} />
          ) : isSuccess ? (
            <Feather name="check-circle" size={40} color="#22c55e" style={styles.icon} />
          ) : (
            <Feather name="upload-cloud" size={40} color="#38bdf8" style={styles.icon} />
          )}

          <Text style={styles.title}>{filename || 'File Transfer'}</Text>
          <Text style={styles.statusText}>{statusText}</Text>

          {!isError && !isSuccess && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.percentText}>{progress}%</Text>
            </View>
          )}

          {!isError && !isSuccess && progress < 100 && (
            <ActivityIndicator color="#38bdf8" style={{ marginTop: 12 }} />
          )}
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
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
  percentText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 12,
    width: 36,
  },
});
