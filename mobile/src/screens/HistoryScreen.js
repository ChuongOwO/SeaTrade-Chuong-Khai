import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { fetchConversations, startConversation } from '../api/chatApi';
import ChatThread from '../components/ChatThread';
import { useNotifications } from '../context/NotificationContext';

// Dữ liệu mẫu (mock) — tab "Giao dịch" chưa nối API lịch sử giao dịch thật vì
// back-end hiện chưa có module đơn hàng (orders). Giữ nguyên như cũ, đồng đội
// nối API thật cho phần này sau. Tab "Chat" (mới) đã gọi API chat thật —
// xem back-end/src/modules/chat.
const MOCK_HISTORY = [
  { id: 'DH-1042', species: 'Cá Ngừ Vây Vàng', counterparty: 'Hải Nam 09', price: '190,000 đ/kg', quantity: '85 kg', date: '15/08/2026', status: 'COMPLETED' },
  { id: 'DH-1041', species: 'Tôm Hùm Bông', counterparty: 'Phú Quốc King', price: '1,280,000 đ/kg', quantity: '12 kg', date: '13/08/2026', status: 'COMPLETED' },
  { id: 'DH-1039', species: 'Cá Thu Thuận Hải', counterparty: 'Biển Đông 02', price: '220,000 đ/kg', quantity: '60 kg', date: '10/08/2026', status: 'CANCELLED' },
  { id: 'DH-1035', species: 'Mực Lá Tươi', counterparty: 'Sông Tiền 01', price: '165,000 đ/kg', quantity: '40 kg', date: '05/08/2026', status: 'COMPLETED' },
];

const STATUS_LABEL = {
  COMPLETED: 'Hoàn Tất',
  CANCELLED: 'Đã Hủy',
};

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const { unreadCount, refresh: refreshNotifications } = useNotifications();
  const [tab, setTab] = useState('TRANSACTIONS'); // 'TRANSACTIONS' | 'CHAT'
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState('');
  const [activeConversation, setActiveConversation] = useState(null);
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);
  const [peerPhoneInput, setPeerPhoneInput] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const data = await fetchConversations();
      setConversations(data);
      setConversationsError('');
    } catch (err) {
      setConversationsError(
        err.status === 404
          ? 'API chat chưa tồn tại trên back-end (404). Cần đồng đội xác nhận đã tạo module chat chưa.'
          : (err.message || 'Không kết nối được tới máy chủ chat.')
      );
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'CHAT' && !activeConversation) {
      loadConversations();
    }
  }, [tab, activeConversation, loadConversations]);

  const handleStartChat = async () => {
    const phone = peerPhoneInput.trim();
    if (!phone) return;
    setStartingChat(true);
    try {
      const conversation = await startConversation(phone);
      setNewChatModalVisible(false);
      setPeerPhoneInput('');
      await loadConversations();
      setActiveConversation(conversation);
    } catch (err) {
      Alert.alert('Không bắt đầu được hội thoại', err.message || 'Có lỗi xảy ra.');
    } finally {
      setStartingChat(false);
    }
  };

  const renderTransactionItem = ({ item }) => {
    const isCompleted = item.status === 'COMPLETED';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.species}>{item.species}</Text>
            <Text style={styles.meta}>{item.counterparty} • {item.quantity}</Text>
          </View>
          <View style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusCancelled]}>
            <Text style={[styles.statusText, isCompleted ? styles.statusTextCompleted : styles.statusTextCancelled]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.orderId}>{item.id}</Text>
          <Text style={styles.price}>{item.price}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>
      </View>
    );
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity style={styles.chatCard} onPress={() => setActiveConversation(item)}>
      <View style={styles.chatAvatar}>
        <Ionicons name="person" size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.chatPeerName} numberOfLines={1}>
          {item.peer?.full_name || item.peer?.phone || 'Người dùng'}
        </Text>
        <Text style={styles.chatLastMessage} numberOfLines={1}>
          {item.last_message || 'Chưa có tin nhắn'}
        </Text>
      </View>
      <Text style={styles.chatTime}>{formatTime(item.updated_at)}</Text>
    </TouchableOpacity>
  );

  if (activeConversation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ChatThread
          conversation={activeConversation}
          onBack={() => {
            setActiveConversation(null);
            // Mở hội thoại đã tự đánh dấu tin nhắn + notification liên quan là
            // đã đọc ở back-end (xem chat.controller.js getMessages) — refresh
            // ngay ở đây để chấm đỏ trên sub-tab "Chat" cập nhật liền, không
            // phải đợi tới lần poll định kỳ tiếp theo (tối đa 5s).
            refreshNotifications();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch Sử</Text>
        {tab === 'CHAT' && (
          <TouchableOpacity style={styles.newChatBtn} onPress={() => setNewChatModalVisible(true)}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2 tab con: Giao dịch / Chat */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'TRANSACTIONS' && styles.tabBtnActive]}
          onPress={() => setTab('TRANSACTIONS')}
        >
          <Ionicons name="receipt" size={16} color={tab === 'TRANSACTIONS' ? '#fff' : colors.textMuted} />
          <Text style={[styles.tabBtnText, tab === 'TRANSACTIONS' && styles.tabBtnTextActive]}>Giao dịch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'CHAT' && styles.tabBtnActive]}
          onPress={() => setTab('CHAT')}
        >
          <View>
            <Ionicons name="chatbubbles" size={16} color={tab === 'CHAT' ? '#fff' : colors.textMuted} />
            {unreadCount > 0 && <View style={styles.chatTabDot} />}
          </View>
          <Text style={[styles.tabBtnText, tab === 'CHAT' && styles.tabBtnTextActive]}>Chat</Text>
        </TouchableOpacity>
      </View>

      {tab === 'TRANSACTIONS' && (
        MOCK_HISTORY.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyText}>Chưa có giao dịch nào gần đây.</Text>
          </View>
        ) : (
          <FlatList
            data={MOCK_HISTORY}
            keyExtractor={item => item.id}
            renderItem={renderTransactionItem}
            contentContainerStyle={styles.list}
          />
        )
      )}

      {tab === 'CHAT' && (
        loadingConversations ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : conversationsError ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="warning-outline" size={40} color={colors.danger} />
            <Text style={styles.errorText}>{conversationsError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadConversations}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setNewChatModalVisible(true)}>
              <Text style={styles.retryBtnText}>+ Nhắn tin mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => item.id}
            renderItem={renderConversationItem}
            contentContainerStyle={styles.list}
            refreshing={loadingConversations}
            onRefresh={loadConversations}
          />
        )
      )}

      <Modal
        visible={newChatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewChatModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nhắn tin mới</Text>
            <Text style={styles.modalSub}>Nhập số điện thoại người bạn muốn nhắn tin</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: 0912345678"
              keyboardType="phone-pad"
              value={peerPhoneInput}
              onChangeText={setPeerPhoneInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setNewChatModalVisible(false); setPeerPhoneInput(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, (!peerPhoneInput.trim() || startingChat) && styles.modalBtnDisabled]}
                onPress={handleStartChat}
                disabled={!peerPhoneInput.trim() || startingChat}
              >
                {startingChat ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Bắt đầu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  newChatBtn: { padding: 2 },
  tabBar: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  chatTabDot: {
    position: 'absolute',
    top: -3,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  species: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
  },
  statusCompleted: {
    backgroundColor: colors.successSoft,
  },
  statusCancelled: {
    backgroundColor: colors.dangerSoft,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTextCompleted: {
    color: colors.success,
  },
  statusTextCancelled: {
    color: colors.danger,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderId: {
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: '600',
  },
  price: {
    fontSize: 13,
    color: colors.warningAccent,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  retryBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
  },
  chatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatPeerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  chatLastMessage: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  chatTime: {
    fontSize: 10,
    color: colors.textFaint,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: colors.background,
  },
  modalBtnCancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
