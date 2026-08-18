import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getDashboardStatsApi } from '../services/api/dashboard';
import { DashboardStats } from '../types';
import { Feather } from '@expo/vector-icons';
import { ColdStartBanner } from '../components/ColdStartBanner';

export const HomeScreen = ({ navigation }: any) => {
  const { user, isColdStartNotice } = useContext(AuthContext);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStatsApi();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return '0 B';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercent = () => {
    if (!stats || !stats.storageQuota || !stats.storageUsed) return 0;
    const used = parseInt(stats.storageUsed, 10);
    const quota = parseInt(stats.storageQuota, 10);
    if (isNaN(used) || isNaN(quota) || quota === 0) return 0;
    return Math.min(100, Math.round((used / quota) * 100));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
    >
      {isColdStartNotice && <ColdStartBanner />}

      {/* Greeting Card */}
      <View style={styles.welcomeCard}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <View style={styles.activeBadge}>
          <Feather name="shield" size={16} color="#22c55e" style={{ marginRight: 4 }} />
          <Text style={styles.activeBadgeText}>Supabase Active</Text>
        </View>
      </View>

      {/* Storage Quota Card */}
      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <Feather name="hard-drive" color="#38bdf8" size={24} style={{ marginRight: 10 }} />
          <Text style={styles.storageTitle}>Cloud Storage Usage</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#38bdf8" style={{ marginVertical: 16 }} />
        ) : (
          <>
            <View style={styles.usageTextRow}>
              <Text style={styles.usedAmount}>{formatSize(stats?.storageUsed)}</Text>
              <Text style={styles.totalQuota}>of {formatSize(stats?.storageQuota)}</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${getUsagePercent()}%` }]} />
            </View>

            <Text style={styles.percentLabel}>{getUsagePercent()}% Storage Used</Text>
          </>
        )}
      </View>

      {/* Stat Grid */}
      <View style={styles.gridRow}>
        <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('Files')}>
          <Feather name="file-text" color="#38bdf8" size={28} style={{ marginBottom: 8 }} />
          <Text style={styles.statCount}>{stats?.fileCount ?? '-'}</Text>
          <Text style={styles.statLabel}>Total Files</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('Files')}>
          <Feather name="folder" color="#f59e0b" size={28} style={{ marginBottom: 8 }} />
          <Text style={styles.statCount}>{stats?.folderCount ?? '-'}</Text>
          <Text style={styles.statLabel}>Folders</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity Section */}
      <View style={styles.sectionHeader}>
        <Feather name="activity" color="#a855f7" size={20} style={{ marginRight: 6 }} />
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>

      {stats?.recentActivity && stats.recentActivity.length > 0 ? (
        stats.recentActivity.slice(0, 5).map((log) => (
          <View key={log.id} style={styles.activityCard}>
            <Feather name="clock" color="#64748b" size={16} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activityAction}>{log.action.replace('_', ' ')}</Text>
              <Text style={styles.activityDetail} numberOfLines={1}>
                {log.entityName || log.entityType}
              </Text>
            </View>
            <Text style={styles.activityTime}>{new Date(log.timestamp).toLocaleDateString()}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No recent activity found.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeBadgeText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
  },
  storageCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  usageTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  usedAmount: {
    color: '#38bdf8',
    fontSize: 24,
    fontWeight: '800',
    marginRight: 6,
  },
  totalQuota: {
    color: '#94a3b8',
    fontSize: 14,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#334155',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
  percentLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statCount: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  activityCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activityAction: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activityDetail: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  activityTime: {
    color: '#64748b',
    fontSize: 11,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 16,
  },
});
