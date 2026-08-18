import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'user_jwt_token';

// In-memory fallback if SecureStore is unavailable on web
let inMemoryToken: string | null = null;

export const saveToken = async (token: string): Promise<void> => {
  try {
    inMemoryToken = token;
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Error saving JWT token:', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS !== 'web') {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) return token;
    }
    return inMemoryToken;
  } catch (error) {
    console.error('Error retrieving JWT token:', error);
    return inMemoryToken;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    inMemoryToken = null;
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error removing JWT token:', error);
  }
};
