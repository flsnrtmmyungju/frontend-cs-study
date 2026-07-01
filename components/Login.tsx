import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function Login({ onLogin }: { onLogin: (key: string) => void }) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.length < 10) {
      Alert.alert('오류', '올바른 API 키를 입력하세요.');
      return;
    }
    onLogin(input);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Groq API 키 입력</Text>
      <Text style={styles.sub}>console.groq.com에서 발급한{'\n'}API 키를 입력하세요</Text>
      <TextInput
        style={styles.input}
        placeholder="API 키 입력..."
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        secureTextEntry
      />
      <Pressable style={styles.btn} onPress={handleSubmit}>
        <Text style={styles.btnText}>시작하기</Text>
      </Pressable>
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16 },
  btn: { width: '100%', backgroundColor: '#000', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
