import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { getDashboardStatsApi } from '../services/api/dashboard';
import { ActivityLog } from '../types';
import { Feather } from '@expo/vector-icons';

export const ActivityScreen = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const data = await getDashboardStatsApi();
      setLogs(data.recentActivity || []);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="activity" color="#38bdf8" size={24} style={{ marginRight: 8 }} />
        <Text style={styles.headerTitle}>Activity Log</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Activity Logs</Text>
              <Text style={styles.emptySubtitle}>System actions like uploads, downloads, and shares will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Feather name="clock" color="#64748b" size={18} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionText}>{item.action.replace('_', ' ')}</Text>
                <Text style={styles.entityText}>{item.entityName || item.entityType}</Text>
              </View>
              <Text style={styles.timeText}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          )}
        />
      )}
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
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  entityText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  timeText: {
    color: '#64748b',
    fontSize: 12,
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
