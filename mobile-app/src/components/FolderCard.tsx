import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FolderItem } from '../types';
import { Feather } from '@expo/vector-icons';

interface FolderCardProps {
  folder: FolderItem;
  onOpen: (folder: FolderItem) => void;
  onDelete: (folder: FolderItem) => void;
  onStar: (folder: FolderItem) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onOpen, onDelete, onStar }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onOpen(folder)}>
      <View style={styles.iconContainer}>
        <Feather name="folder" color="#f59e0b" size={24} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.folderName} numberOfLines={1}>
          {folder.name}
        </Text>
        <Text style={styles.folderMeta}>{new Date(folder.createdAt).toLocaleDateString()}</Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity onPress={() => onStar(folder)} style={styles.actionBtn}>
          <Feather name="star" size={18} color={folder.starred ? '#eab308' : '#64748b'} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onDelete(folder)} style={styles.actionBtn}>
          <Feather name="trash-2" size={18} color="#ef4444" />
        </TouchableOpacity>

        <Feather name="chevron-right" size={18} color="#64748b" style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
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
  folderName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  folderMeta: {
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
