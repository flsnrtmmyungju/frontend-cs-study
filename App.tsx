import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import Login from './components/Login';
import MainApp from './components/MainApp';

const API_KEY_STORE = 'groq_api_key';

export type TrainingSession = {
  id: number;
  question: string;
  userAnswer: string;
  feedback: string;
};

const storage = {
  get: (key: string) => Platform.OS === 'web' ? Promise.resolve(localStorage.getItem(key)) : SecureStore.getItemAsync(key),
  set: (key: string, val: string) => Platform.OS === 'web' ? Promise.resolve(localStorage.setItem(key, val)) : SecureStore.setItemAsync(key, val),
  del: (key: string) => Platform.OS === 'web' ? Promise.resolve(localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key),
};

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.get(API_KEY_STORE).then(val => {
      setApiKey(val);
      setLoading(false);
    });
  }, []);

  const handleLogin = async (key: string) => {
    await storage.set(API_KEY_STORE, key);
    setApiKey(key);
  };

  const handleLogout = async () => {
    await storage.del(API_KEY_STORE);
    setApiKey(null);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      <StatusBar style="auto" />
    </View>
  );

  if (!apiKey) return <SafeAreaProvider><Login onLogin={handleLogin} /></SafeAreaProvider>;
  return <SafeAreaProvider><MainApp apiKey={apiKey} onLogout={handleLogout} /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
