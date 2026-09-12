import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { fetchMessages, sendMessage } from '../api/chatApi';

const POLL_INTERVAL_MS = 5000;

// Khung 1 cuộc trò chuyện — back-end chưa có WebSocket cho chat (chỉ có
// socket.io-client dùng cho radar GPS, xem App.js) nên dùng REST polling mỗi
// 5s để tạo cảm giác gần-realtime. Khi có server chat realtime thật, chỉ cần
// thay effect polling này bằng lắng nghe socket event.
export default function ChatThread({ conversation, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('userData').then((raw) => {
      if (raw) {
        try { setMyUserId(JSON.parse(raw).id); } catch {}
      }
    });
  }, []);

  const load = useCallback(async ({ silent } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchMessages(conversation.id);
      setMessages(data);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.message || 'Không tải được tin nhắn.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await sendMessage(conversation.id, content);
      setInput('');
      await load({ silent: true });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setErrorMsg(err.message || 'Gửi tin nhắn thất bại.');
    } finally {
      setSending(false);
    }
  };

  const peerName = conversation.peer?.full_name || conversation.peer?.phone || 'Người dùng';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{peerName}</Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Chưa có tin nhắn nào. Gửi lời chào để bắt đầu!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender_id === myUserId;
            return (
              <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.message}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4, marginRight: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, flex: 1 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { color: colors.danger, fontSize: 12, flex: 1 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: colors.textFaint, fontSize: 13, textAlign: 'center' },
  list: { padding: 12, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: colors.textPrimary },
  bubbleTextMine: { color: colors.textOnPrimary },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, backgroundColor: colors.background, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
