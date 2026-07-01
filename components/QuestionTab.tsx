import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrainingSession } from '../App';

type Mode = 'socratic' | 'error-fix' | 'analogy' | 'coding' | 'quiz';
type Phase = 'select' | 'conversation' | 'feedback';
type Message = { role: 'ai' | 'user'; text: string };

const MAX_TURNS = 3;

async function call(apiKey: string, messages: { role: string; content: string }[], model = 'llama-3.3-70b-versatile'): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// CJK 一-鿿, Cyrillic Ѐ-ӿ, Arabic ؀-ۿ, Devanagari ऀ-ॿ, Latin-ext (Vietnamese) Ā-ɏ
const CONTAMINATED = /[\u4E00-\u9FFF\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u0100-\u024F]/;

async function groq(apiKey: string, messages: { role: string; content: string }[]): Promise<string> {
  const result = await call(apiKey, messages);
  if (CONTAMINATED.test(result)) {
    return call(apiKey, [
      { role: 'system', content: '너는 반드시 한국어만 써야 해. 한자, 베트남어, 러시아어, 아랍어, 힌디어 절대 금지. 오직 한국어와 영어 알파벳만 허용.' },
      ...messages.slice(1),
      { role: 'assistant', content: result },
      { role: 'user', content: '한자나 외국어가 포함됐어. 한국어와 영어만 사용해서 처음부터 다시 작성해줘.' },
    ]);
  }
  return result;
}

const KOREAN_ONLY = `[CRITICAL] LANGUAGE RULE: Respond in Korean ONLY. Forbidden: Vietnamese, Russian, Arabic, Japanese, Chinese, Thai, Hindi, or any non-Korean language. Technical terms (async, Promise, DOM) may stay in English but ALL sentences MUST be Korean. Writing Vietnamese (e.g. "cap nhat") = failure.\n\n`;

const SYSTEM: Record<Mode, string> = {
  socratic: `${KOREAN_ONLY}너는 국내 IT 기업 프론트엔드 면접관이야. 무조건 한국어로만 대답해.

규칙 (반드시 지켜):
1. 사용자 답변에 절대 설명하지 마. 정답도 힌트도 금지.
2. 오직 짧은 후속 질문 하나만 해. "왜 그런가요?", "예시 들어줄 수 있어요?", "그럼 이 경우엔?" 형태로.
3. 피드백은 ${MAX_TURNS}번 주고받은 후에만. 그 전엔 질문만.
4. 피드백 형식: ✅ 잘 이해한 부분 / ⚠️ 보완할 부분 / 💬 더 자연스러운 표현`,

  'error-fix': `${KOREAN_ONLY}너는 프론트엔드 면접관이야. 무조건 한국어로만 대답해.
일부러 틀린 개념 설명을 던지고, 지원자가 뭐가 틀렸는지 지적하고 올바르게 고치게 해.
지원자 답변 후 피드백 줘: ✅ 정확하게 잡아낸 부분 / ⚠️ 놓친 부분 / 💬 완전한 정답`,

  analogy: `${KOREAN_ONLY}너는 프론트엔드 면접관이야. 무조건 한국어로만 대답해.
CS 개념을 비개발자에게 설명하듯 쉬운 말로 설명해보라고 요청해.
답변 후 피드백: ✅ 잘 전달된 부분 / ⚠️ 더 쉽게 말할 수 있는 부분 / 💬 모범 비유 설명`,

  coding: `${KOREAN_ONLY}너는 프론트엔드 라이브 코딩 면접관이야. 무조건 한국어로만 대답해.
JavaScript/TypeScript 코딩 문제를 내고, 제출된 코드에 피드백을 줘.
피드백: ✅ 잘 작성한 부분 / ⚠️ 개선할 부분 (버그/엣지케이스/복잡도) / 💡 모범 풀이`,

  quiz: `${KOREAN_ONLY}너는 프론트엔드 CS 퀴즈 출제자야. 무조건 한국어로만 대답해.
4지선다 문제를 낼 때 반드시 아래 형식을 정확히 지켜:

질문: [질문 내용]
A) [보기]
B) [보기]
C) [보기]
D) [보기]
정답: [A/B/C/D]
해설: [정답 이유 1~2문장]

이 형식 외에 다른 말 붙이지 마.`,
};

const TOPICS = [
  'JavaScript 이벤트 루프', 'JavaScript 프로토타입 체인', 'JavaScript this 바인딩',
  'JavaScript 호이스팅', 'JavaScript Promise와 async/await', '브라우저 렌더링 파이프라인',
  '리플로우와 리페인트', 'React Virtual DOM', 'React hooks 동작 원리',
  'React 렌더링 최적화', 'HTTP와 HTTPS 차이', 'CORS', '브라우저 캐싱',
  'XSS 공격', 'CSRF 공격', 'CSS BFC', '웹 성능 최적화', 'WebSocket',
];

const INIT_PROMPT: Record<Mode, string> = {
  socratic: `오늘의 주제: "${TOPICS[Math.floor(Math.random() * TOPICS.length)]}"
이 주제로 프론트엔드 면접 질문 하나만 해줘. 질문 한 문장만. 설명이나 답 절대 하지 마.`,
  'error-fix': `프론트엔드 CS 개념 하나를 골라서, 일부러 틀린 설명을 해줘. 그리고 "이 설명에서 틀린 부분을 찾아서 올바르게 고쳐보세요."라고 요청해.`,
  analogy: `프론트엔드 CS 개념 하나를 골라서, "이 개념을 개발을 전혀 모르는 친구에게 설명한다면 어떻게 말하겠어요?"라고 질문해줘.`,
  coding: `프론트엔드 라이브 코딩 문제 하나를 내줘. 난이도 중급, 30분 이내. 배열/문자열/비동기/자료구조/알고리즘 중 랜덤. 문제 설명과 입출력 예시 포함.`,
  quiz: `프론트엔드 CS 4지선다 문제 하나를 내줘. 반드시 아래 형식 그대로:

질문: [질문 내용]
A) [보기]
B) [보기]
C) [보기]
D) [보기]
정답: [A/B/C/D]
해설: [정답 이유 1~2문장]`,
};

const MODE_LABELS: Record<Mode, string> = {
  socratic: '💬 소크라테스식 면접',
  'error-fix': '🔍 틀린 설명 고치기',
  analogy: '🗣️ 비유로 설명하기',
  coding: '💻 라이브 코딩 테스트',
  quiz: '🔢 4지선다 퀴즈',
};

type QuizData = { question: string; options: [string, string, string, string]; correct: string; explanation: string };

function parseQuiz(text: string): QuizData | null {
  const q = text.match(/질문:\s*(.+)/);
  const a = text.match(/A\)\s*(.+)/);
  const b = text.match(/B\)\s*(.+)/);
  const c = text.match(/C\)\s*(.+)/);
  const d = text.match(/D\)\s*(.+)/);
  const ans = text.match(/정답:\s*([ABCD])/);
  const exp = text.match(/해설:\s*([\s\S]+)/);
  if (!q || !a || !b || !c || !d || !ans) return null;
  return {
    question: q[1].trim(),
    options: [a[1].trim(), b[1].trim(), c[1].trim(), d[1].trim()],
    correct: ans[1].trim(),
    explanation: exp ? exp[1].trim() : '',
  };
}

export default function QuestionTab({ apiKey, onDone }: { apiKey: string; onDone: (s: TrainingSession) => void }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('select');
  const [mode, setMode] = useState<Mode>('socratic');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [turn, setTurn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wordModal, setWordModal] = useState<{ word: string; explanation: string } | null>(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizPick, setQuizPick] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const QUIZ_MAX = 5;

  const explainWord = async (word: string) => {
    const cleaned = word.replace(/[^가-힣a-zA-Z0-9]/g, '');
    if (!cleaned || cleaned.length < 2) return;
    setWordModal({ word: cleaned, explanation: '' });
    setWordLoading(true);
    try {
      const explanation = await call(apiKey, [
        { role: 'system', content: '개발을 전혀 모르는 사람에게 설명하듯이, 아주 쉬운 한국어로 2~3문장으로 설명해줘. 비유나 예시 사용해.' },
        { role: 'user', content: `"${cleaned}"이(가) 뭐야?` },
      ]);
      setWordModal({ word: cleaned, explanation });
    } catch {
      setWordModal({ word: cleaned, explanation: '설명을 불러오지 못했어요.' });
    } finally {
      setWordLoading(false);
    }
  };

  const TappableText = ({ text, style }: { text: string; style?: any }) => (
    <Text style={style}>
      {text.split(/(\s+)/).map((chunk, i) =>
        /^\s+$/.test(chunk) ? chunk : (
          <Text key={i} onPress={() => explainWord(chunk)} suppressHighlighting>
            {chunk}
          </Text>
        )
      )}
    </Text>
  );

  const toGroqMessages = (msgs: Message[]) => [
    { role: 'system', content: SYSTEM[mode] },
    ...msgs.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
  ];

  const start = async (m: Mode) => {
    setMode(m);
    setLoading(true);
    setError('');
    setTurn(0);
    setQuizData(null);
    setQuizPick(null);
    setQuizScore({ correct: 0, total: 0 });
    try {
      const aiMsg = await groq(apiKey, [
        { role: 'system', content: SYSTEM[m] },
        { role: 'user', content: INIT_PROMPT[m] },
      ]);
      setMessages([{ role: 'ai', text: aiMsg }]);
      if (m === 'quiz') setQuizData(parseQuiz(aiMsg));
      setPhase('conversation');
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const pickAnswer = async (letter: string) => {
    if (!quizData) return;
    const isCorrect = letter === quizData.correct;
    const newScore = { correct: quizScore.correct + (isCorrect ? 1 : 0), total: quizScore.total + 1 };
    setQuizPick(letter);
    setQuizScore(newScore);
    const summary = `[${quizData.question}] 정답: ${quizData.correct}, 내 선택: ${letter} → ${isCorrect ? '정답' : '오답'}`;
    setMessages(prev => [...prev, { role: 'user', text: summary }]);
    if (newScore.total >= QUIZ_MAX) {
      const scoreMsg: Message = { role: 'ai', text: `퀴즈 완료! ${QUIZ_MAX}문제 중 ${newScore.correct}개 정답 (${Math.round(newScore.correct / QUIZ_MAX * 100)}%)` };
      setMessages(prev => [...prev, scoreMsg]);
      setPhase('feedback');
    }
  };

  const nextQuiz = async () => {
    setLoading(true);
    setQuizData(null);
    setQuizPick(null);
    setError('');
    try {
      const aiMsg = await groq(apiKey, [
        { role: 'system', content: SYSTEM.quiz },
        { role: 'user', content: INIT_PROMPT.quiz },
      ]);
      setMessages(prev => [...prev, { role: 'ai', text: aiMsg }]);
      setQuizData(parseQuiz(aiMsg));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', text: input };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput('');
    setLoading(true);

    const nextTurn = turn + 1;
    const isFinal = mode !== 'socratic' || nextTurn >= MAX_TURNS;

    try {
      const dontKnow = /모르|모름|몰라|생각안|기억안|잘모|뭔지모/.test(input);
      const prompt = isFinal
        ? [...toGroqMessages(nextMsgs), { role: 'user', content: '지금까지 대화를 바탕으로 최종 피드백을 줘. 한국어로.' }]
        : mode === 'socratic' && dontKnow
          ? [...toGroqMessages(nextMsgs), { role: 'user', content: '사용자가 모른다고 했어. 처음 질문한 개념을 친절하게 한국어로 설명해줘.' }]
          : mode === 'socratic'
            ? [...toGroqMessages(nextMsgs), { role: 'user', content: '사용자 답변을 바탕으로 후속 질문 하나만 해줘. 설명 금지. 질문 한 문장만 출력해.' }]
            : toGroqMessages(nextMsgs);

      const aiReply = await groq(apiKey, prompt);
      const finalMsgs = [...nextMsgs, { role: 'ai' as const, text: aiReply }];
      setMessages(finalMsgs);
      setTurn(nextTurn);

      if (isFinal) {
        setPhase('feedback');
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setMessages(nextMsgs);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setPhase('select'); setMessages([]); setInput(''); setTurn(0); setError(''); setQuizData(null); setQuizPick(null); setQuizScore({ correct: 0, total: 0 }); };

  if (phase === 'select') return (
    <ScrollView contentContainerStyle={styles.selectScroll}>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.selectTitle}>훈련 방식을 선택하세요</Text>
      {(Object.keys(MODE_LABELS) as Mode[]).map((m, i) => (
        <Pressable key={m} style={[styles.modeBtn, i % 2 === 1 && styles.modeBtnAlt]} onPress={() => start(m)}>
          <Text style={styles.modeBtnText}>{MODE_LABELS[m]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <>
    <Modal visible={!!wordModal} transparent animationType="fade" onRequestClose={() => setWordModal(null)}>
      <Pressable style={styles.modalOverlay} onPress={() => setWordModal(null)}>
        <View style={styles.modalBox}>
          <Text style={styles.modalWord}>{wordModal?.word}</Text>
          {wordLoading
            ? <ActivityIndicator style={{ marginTop: 12 }} />
            : <>
                <Text style={styles.modalExplanation}>{wordModal?.explanation}</Text>
                <Pressable style={styles.modalRetry} onPress={() => wordModal && explainWord(wordModal.word)}>
                  <Text style={styles.modalRetryText}>🔄 다시 한글로</Text>
                </Pressable>
              </>
          }
          <Pressable style={styles.modalClose} onPress={() => setWordModal(null)}>
            <Text style={styles.modalCloseText}>닫기</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
    <View style={styles.flex}>
      <Pressable style={styles.backBtn} onPress={reset}>
        <Text style={styles.backBtnText}>← 처음으로</Text>
      </Pressable>
      <ScrollView style={styles.flex} contentContainerStyle={[styles.scroll, { paddingBottom: mode === 'quiz' ? insets.bottom + 16 : phase === 'conversation' ? 320 : insets.bottom + 16 }]} keyboardShouldPersistTaps="handled" ref={ref => ref?.scrollToEnd({ animated: true })}>
        {mode !== 'quiz' && messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
            {msg.role === 'ai' && (
              <Pressable style={styles.retranslateBtn} onPress={async () => {
                setLoading(true);
                try {
                  const fixed = await call(apiKey, [
                    { role: 'system', content: '번역가야. 아래 텍스트를 한국어로 번역해. 내용 추가/수정/설명 절대 금지. 번역된 텍스트만 출력해.' },
                    { role: 'user', content: msg.text },
                  ]);
                  setMessages(prev => prev.map((m, j) => j === i ? { ...m, text: fixed } : m));
                } catch (e: any) { setError(e?.message ?? String(e)); }
                finally { setLoading(false); }
              }}>
                <Text style={styles.retranslateBtnText}>🔄</Text>
              </Pressable>
            )}
            {msg.role === 'ai'
              ? <TappableText text={msg.text} style={styles.bubbleText} />
              : <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{msg.text}</Text>
            }
          </View>
        ))}
        {mode === 'quiz' && phase === 'conversation' && (
          loading && !quizData
            ? <ActivityIndicator size="large" style={{ marginTop: 40 }} />
            : quizData
              ? <View style={styles.quizCard}>
                  <Text style={styles.quizProgress}>{quizScore.total + 1} / {QUIZ_MAX}</Text>
                  <Text style={styles.quizQuestion}>{quizData.question}</Text>
                  {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => {
                    const picked = quizPick !== null;
                    const isCorrect = letter === quizData.correct;
                    const isUserPick = letter === quizPick;
                    const bg = !picked ? '#f5f5f5'
                      : isCorrect ? '#d4edda'
                      : isUserPick ? '#f8d7da'
                      : '#f5f5f5';
                    return (
                      <Pressable key={letter} style={[styles.quizOption, { backgroundColor: bg }]} onPress={() => !picked && pickAnswer(letter)} disabled={picked || loading}>
                        <Text style={styles.quizOptionLabel}>{letter}</Text>
                        <Text style={styles.quizOptionText}>{quizData.options[idx]}</Text>
                        {picked && isCorrect && <Text style={styles.quizMark}>✅</Text>}
                        {picked && isUserPick && !isCorrect && <Text style={styles.quizMark}>❌</Text>}
                      </Pressable>
                    );
                  })}
                  {quizPick && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.quizResult}>{quizPick === quizData.correct ? '🎉 정답!' : `😅 오답 — 정답: ${quizData.correct}`}</Text>
                      <Text style={styles.quizExplanation}>{quizData.explanation}</Text>
                      <Pressable style={[styles.modeBtn, { marginTop: 16 }]} onPress={nextQuiz} disabled={loading}>
                        <Text style={styles.modeBtnText}>다음 문제 →</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              : null
        )}
        {mode === 'quiz' && phase === 'feedback' && (
          <View style={styles.quizCard}>
            <Text style={styles.quizQuestion}>퀴즈 완료!</Text>
            <Text style={styles.quizResult}>{QUIZ_MAX}문제 중 {quizScore.correct}개 정답 ({Math.round(quizScore.correct / QUIZ_MAX * 100)}%)</Text>
          </View>
        )}
        {mode !== 'quiz' && loading && (
          <View style={styles.bubbleAi}>
            <ActivityIndicator size="small" />
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        {phase === 'feedback' && (
          <View style={{ marginTop: 16, gap: 10 }}>
            <Pressable style={styles.modeBtn} onPress={() => {
              const conversation = messages.map(m => `[${m.role === 'ai' ? 'AI' : '나'}] ${m.text}`).join('\n\n');
              onDone({ id: Date.now(), question: messages[0]?.text ?? '퀴즈', userAnswer: conversation, feedback: messages[messages.length - 1]?.text ?? '' });
              reset();
            }}>
              <Text style={styles.modeBtnText}>저장하기</Text>
            </Pressable>
            <Pressable style={styles.modeBtnAlt} onPress={reset}>
              <Text style={styles.modeBtnText}>저장 안 하고 다음 훈련</Text>
            </Pressable>
          </View>
        )}
        {phase === 'conversation' && mode !== 'quiz' && (
          <View style={styles.inputBar}>
            <TextInput
              style={[styles.input, mode === 'coding' && styles.codeInput]}
              placeholder="답변 입력..."
              value={input}
              onChangeText={setInput}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={send} disabled={!input.trim() || loading}>
              <Text style={styles.sendBtnText}>전송</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  selectScroll: { padding: 24, paddingTop: 40 },
  selectTitle: { fontSize: 18, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  modeBtn: { backgroundColor: '#000', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  modeBtnAlt: { backgroundColor: '#3a5bcc' },
  modeBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  scroll: { padding: 16, paddingBottom: 16 },
  bubble: { borderRadius: 14, padding: 14, marginBottom: 10, maxWidth: '90%', position: 'relative' },
  retranslateBtn: { position: 'absolute', top: 6, right: 8 },
  retranslateBtnText: { fontSize: 14 },
  bubbleAi: { backgroundColor: '#f0f4ff', alignSelf: 'flex-start' },
  bubbleUser: { backgroundColor: '#000', alignSelf: 'flex-end' },
  bubbleText: { fontSize: 15, lineHeight: 24, color: '#333' },
  bubbleTextUser: { color: '#fff' },
  inputBar: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, maxHeight: 120 },
  codeInput: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 13 },
  sendBtn: { backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontWeight: '600' },
  error: { fontSize: 14, color: '#e53e3e', margin: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalWord: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#3a5bcc' },
  modalExplanation: { fontSize: 15, lineHeight: 24, color: '#333' },
  modalRetry: { marginTop: 12, alignItems: 'center', paddingVertical: 8, backgroundColor: '#fff8e6', borderRadius: 8 },
  modalRetryText: { fontSize: 13, fontWeight: '600', color: '#b07800' },
  modalClose: { marginTop: 8, alignItems: 'center', paddingVertical: 10, backgroundColor: '#f0f4ff', borderRadius: 8 },
  modalCloseText: { fontSize: 14, fontWeight: '600', color: '#3a5bcc' },
  backBtn: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtnText: { fontSize: 14, color: '#666' },
  quizCard: { padding: 16, gap: 12 },
  quizProgress: { fontSize: 13, color: '#999', fontWeight: '600' },
  quizQuestion: { fontSize: 17, fontWeight: '700', color: '#111', lineHeight: 26 },
  quizOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  quizOptionLabel: { fontSize: 16, fontWeight: '700', color: '#3a5bcc', width: 22 },
  quizOptionText: { flex: 1, fontSize: 15, color: '#333' },
  quizMark: { fontSize: 18 },
  quizResult: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
  quizExplanation: { fontSize: 14, color: '#555', lineHeight: 22 },
});
