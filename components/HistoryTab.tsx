import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TrainingSession } from '../App';

export default function HistoryTab({ items, onDelete }: { items: TrainingSession[]; onDelete: (id: number) => void }) {
  const [selected, setSelected] = useState<TrainingSession | null>(null);

  if (selected) return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Pressable style={styles.back} onPress={() => setSelected(null)}>
        <Text style={styles.backText}>← 목록</Text>
      </Pressable>
      <View style={styles.questionBox}>
        <Text style={styles.questionLabel}>면접 질문</Text>
        <Text style={styles.questionText}>{selected.question}</Text>
      </View>
      <View style={styles.myAnswerBox}>
        <Text style={styles.myAnswerLabel}>내 답변</Text>
        <Text style={styles.myAnswerText}>{selected.userAnswer}</Text>
      </View>
      <View style={styles.feedbackBox}>
        <Text style={styles.feedbackTitle}>피드백</Text>
        <Text style={styles.feedbackText}>{selected.feedback}</Text>
      </View>
      <Pressable style={styles.deleteBtn} onPress={() =>
        Alert.alert('삭제', '이 기록을 삭제할까요?', [
          { text: '취소', style: 'cancel' },
          { text: '삭제', style: 'destructive', onPress: () => { onDelete(selected.id); setSelected(null); } },
        ])
      }>
        <Text style={styles.deleteBtnText}>삭제</Text>
      </Pressable>
    </ScrollView>
  );

  if (!items.length) return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>아직 훈련 기록이 없어요</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {items.map(item => (
        <Pressable key={item.id} style={styles.card} onPress={() => setSelected(item)}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.question}</Text>
          <Text style={styles.cardArrow}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  scroll: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8, lineHeight: 20 },
  cardArrow: { fontSize: 20, color: '#ccc' },
  back: { marginBottom: 20 },
  backText: { fontSize: 16, color: '#333' },
  questionBox: { backgroundColor: '#f0f4ff', borderRadius: 12, padding: 16, marginBottom: 16 },
  questionLabel: { fontSize: 12, fontWeight: '700', color: '#3a5bcc', marginBottom: 6 },
  questionText: { fontSize: 17, fontWeight: '600', lineHeight: 26 },
  myAnswerBox: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 16 },
  myAnswerLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 6 },
  myAnswerText: { fontSize: 15, lineHeight: 24, color: '#444' },
  feedbackBox: { backgroundColor: '#fff8e6', borderRadius: 12, padding: 16, marginBottom: 20 },
  feedbackTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, color: '#b07800' },
  feedbackText: { fontSize: 15, lineHeight: 26, color: '#333' },
  deleteBtn: { backgroundColor: '#e53e3e', borderRadius: 8, padding: 14, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
