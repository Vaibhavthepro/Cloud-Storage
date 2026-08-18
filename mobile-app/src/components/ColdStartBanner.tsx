import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export const ColdStartBanner: React.FC = () => {
  return (
    <View style={styles.container}>
      <Feather name="wifi-off" color="#f59e0b" size={18} style={styles.icon} />
      <Text style={styles.text}>
        Connecting to backend... Render free-tier is spinning up (may take 20-30s).
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#451a03',
    borderColor: '#b45309',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fef3c7',
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
});
