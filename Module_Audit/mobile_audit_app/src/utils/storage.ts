import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Robust Storage Helper with Fallback
const memoryStorage: Record<string, string | null> = {};

export const getStorageItem = async (key: string) => {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return await AsyncStorage.getItem(key);
  } catch (e) {
    return memoryStorage[key] || null;
  }
};

export const setStorageItem = async (key: string, value: string) => {
  try {
    memoryStorage[key] = value;
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // Silent fail
  }
};

export const removeStorageItem = async (key: string) => {
  try {
    delete memoryStorage[key];
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // Silent fail
  }
};
