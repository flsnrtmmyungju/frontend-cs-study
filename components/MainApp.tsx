import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrainingSession } from '../App';
import QuestionTab from './QuestionTab';
import HistoryTab from './HistoryTab';

type Tab = 'question' | 'history' | 'settings';
const STORAGE_KEY = 'history';

export default function MainApp({ apiKey, onLogout }: { apiKey: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('question');
  const [history, setHistory] = useState<TrainingSession[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) setHistory(JSON.parse(val));
    });
  }, []);

  const save = (next: TrainingSession[]) => {
    setHistory(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addSession = (s: TrainingSession) => save([s, ...history]);
  const deleteSession = (id: number) => save(history.filter(s => s.id !== id));
  const deleteAll = () => save([]);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <Pressable style={[styles.tab, tab === 'question' && styles.tabActive]} onPress={() => setTab('question')}>
          <Text style={[styles.tabText, tab === 'question' && styles.tabTextActive]}>훈련</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>기록 {history.length}</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'settings' && styles.tabActive]} onPress={() => setTab('settings')}>
          <Text style={[styles.tabText, tab === 'settings' && styles.tabTextActive]}>설정</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        {tab === 'question' && <QuestionTab apiKey={apiKey} onDone={addSession} />}
        {tab === 'history' && <HistoryTab items={history} onDelete={deleteSession} />}
        {tab === 'settings' && (
          <ScrollView contentContainerStyle={styles.section}>
            <Pressable style={styles.dangerBtn} onPress={() =>
              Alert.alert('전체 삭제', '모든 훈련 기록이 삭제됩니다.', [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: deleteAll },
              ])
            }>
              <Text style={styles.dangerBtnText}>훈련 기록 전체 삭제</Text>
            </Pressable>
            <Pressable style={[styles.dangerBtn, styles.darkBtn]} onPress={() =>
              Alert.alert('API 키 삭제', '삭제하면 다시 입력해야 합니다.', [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: onLogout },
              ])
            }>
              <Text style={styles.dangerBtnText}>API 키 삭제</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: 56 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#000' },
  tabText: { fontSize: 13, color: '#999' },
  tabTextActive: { color: '#000', fontWeight: '600' },
  content: { flex: 1 },
  section: { padding: 20, gap: 12 },
  dangerBtn: { backgroundColor: '#e53e3e', borderRadius: 8, padding: 14, alignItems: 'center' },
  darkBtn: { backgroundColor: '#333', marginTop: 12 },
  dangerBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
