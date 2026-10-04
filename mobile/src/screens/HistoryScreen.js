import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { fetchConversations, startConversation } from '../api/chatApi';
import ChatThread from '../components/ChatThread';
import { useNotifications } from '../context/NotificationContext';
import { API_URL } from '../config/api';

const STATUS_LABEL = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  IN_TRANSIT: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  REJECTED: 'Bị từ chối',
};

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen({ route, navigation }) {
  const { unreadCount, refresh: refreshNotifications } = useNotifications();
  const [tab, setTab] = useState('TRANSACTIONS'); // 'TRANSACTIONS' | 'CHAT'
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState('');
  const [activeConversation, setActiveConversation] = useState(null);
  const [targetOfferId, setTargetOfferId] = useState(null);
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);
  const [peerPhoneInput, setPeerPhoneInput] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('userData').then(raw => {
      if (raw) try { setMyUserId(JSON.parse(raw).id); } catch { }
    });
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.metadata) setOrders(data.metadata);
    } catch (e) {
      console.log('Error loading orders:', e.message);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const loadConversations = useCallback(async ({ silent } = {}) => {
    try {
      if (!silent) setLoadingConversations(true);
      const data = await fetchConversations();
      setConversations(data);
      setConversationsError('');
    } catch (err) {
      // Lỗi ở lần poll nền (silent) không nên đè banner lỗi người dùng đang
      // đọc dở — chỉ cập nhật lỗi khi đây là lần tải "chính" (mở tab/kéo refresh).
      if (!silent) {
        setConversationsError(
          err.status === 404
            ? 'API chat chưa tồn tại trên back-end (404). Cần đồng đội xác nhận đã tạo module chat chưa.'
            : (err.message || 'Không kết nối được tới máy chủ chat.')
        );
      }
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, []);

  // Tự làm mới danh sách hội thoại mỗi 8s khi đang đứng ở tab Chat (chưa mở
  // hẳn 1 hội thoại) — cùng kiểu REST polling đang dùng ở ChatThread.js và
  // NotificationContext.js. Nhờ vậy tin nhắn mới/preview cập nhật mà không
  // cần thoát ra vào lại tab. {silent: true} để không nháy spinner mỗi lần
  // poll nền (chỉ hiện spinner ở lần tải đầu hoặc khi người dùng chủ động kéo refresh).
  useEffect(() => {
    if (route.params?.openChat) {
      setTab('CHAT');
      setActiveConversation(route.params.openChat);
      navigation.setParams({ openChat: undefined });
    }
  }, [route.params?.openChat, navigation]);

  useEffect(() => {
    if (tab === 'CHAT' && !activeConversation) {
      loadConversations();
      const interval = setInterval(() => loadConversations({ silent: true }), 8000);
      return () => clearInterval(interval);
    }
    if (tab === 'TRANSACTIONS') {
      loadOrders();
    }
  }, [tab, activeConversation, loadConversations, loadOrders]);

  const startChatWithPhone = async (phone, offerId = null) => {
    if (!phone) return;
    setStartingChat(true);
    try {
      const conversation = await startConversation(phone);
      await loadConversations();
      setTab('CHAT');
      setTargetOfferId(offerId);
      setActiveConversation(conversation);
    } catch (err) {
      Alert.alert('Không bắt đầu được hội thoại', err.message || 'Có lỗi xảy ra.');
    } finally {
      setStartingChat(false);
    }
  };

  const handleStartChat = async () => {
    const phone = peerPhoneInput.trim();
    if (phone) {
      await startChatWithPhone(phone);
      setNewChatModalVisible(false);
      setPeerPhoneInput('');
    }
  };

  const renderTransactionItem = ({ item }) => {
    const isConfirmed = ['CONFIRMED', 'DELIVERED'].includes(item.status);
    const isCancelled = ['CANCELLED', 'REJECTED'].includes(item.status);
    const firstItem = item.items?.[0];
    const speciesName = firstItem?.species_name || 'Hải sản';
    const counterparty = item.buyer?.id === myUserId ? item.seller?.full_name : item.buyer?.full_name;
    const isBuyer = item.buyer?.id === myUserId;
    const formatDate = (iso) => {
      if (!iso) return '';
      return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const formatVND = (n) => Number(n).toLocaleString('vi-VN') + 'đ';

    const counterpartyPhone = isBuyer ? item.seller?.phone : item.buyer?.phone;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => startChatWithPhone(counterpartyPhone, item.accepted_offer_id)}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.species}>{speciesName}</Text>
            <Text style={styles.meta}>
              {isBuyer ? 'Mua từ' : 'Bán cho'}: {counterparty} • {firstItem?.quantity_kg}kg
            </Text>
          </View>
          <View style={[styles.statusBadge, isConfirmed ? styles.statusCompleted : isCancelled ? styles.statusCancelled : styles.statusPending]}>
            <Text style={[styles.statusText, isConfirmed ? styles.statusTextCompleted : isCancelled ? styles.statusTextCancelled : styles.statusTextPending]}>
              {STATUS_LABEL[item.status] || item.status}
            </Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.orderId}>{item.id.substring(0, 8).toUpperCase()}</Text>
          <Text style={styles.price}>{firstItem ? formatVND(firstItem.price_per_kg) + '/kg' : ''}</Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng đơn:</Text>
          <Text style={styles.totalValue}>{formatVND(item.total_amount)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderConversationItem = ({ item }) => {
    // unread_count do back-end tính riêng cho từng hội thoại (chat.service.js
    // listConversationsForUser) — khác với unreadCount toàn cục ở tab Chat,
    // cái này cho biết CHÍNH XÁC cuộc trò chuyện nào có tin chưa đọc.
    const unread = item.unread_count || 0;
    const isUnread = unread > 0;
    const peerName = item.peer?.full_name || item.peer?.phone || 'Người dùng';
    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => setActiveConversation(item)}
        accessibilityRole="button"
        accessibilityLabel={
          isUnread
            ? `Hội thoại với ${peerName}, ${unread} tin nhắn chưa đọc`
            : `Hội thoại với ${peerName}`
        }
      >
        <View style={styles.chatAvatarWrap}>
          <View style={styles.chatAvatar}>
            <Ionicons name="person" size={22} color={colors.primary} />
          </View>
          {isUnread && <View style={styles.chatAvatarDot} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.chatPeerName, isUnread && styles.chatPeerNameUnread]} numberOfLines={1}>
            {peerName}
          </Text>
          <Text style={[styles.chatLastMessage, isUnread && styles.chatLastMessageUnread]} numberOfLines={1}>
            {item.last_message || 'Chưa có tin nhắn'}
          </Text>
        </View>
        <View style={styles.chatCardRight}>
          <Text style={[styles.chatTime, isUnread && styles.chatTimeUnread]}>{formatTime(item.updated_at)}</Text>
          {isUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (activeConversation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ChatThread
          conversation={activeConversation}
          targetOfferId={targetOfferId}
          onBack={() => {
            setActiveConversation(null);
            setTargetOfferId(null);
            // Mở hội thoại đã tự đánh dấu tin nhắn + notification liên quan là
            // đã đọc ở back-end (xem chat.controller.js getMessages) — refresh
            // ngay ở đây để chấm đỏ trên sub-tab "Chat" cập nhật liền, không
            // phải đợi tới lần poll định kỳ tiếp theo (tối đa 5s).
            refreshNotifications();
            // Refresh luôn danh sách hội thoại (silent, không hiện spinner) để
            // unread_count/badge của hội thoại vừa đọc biến mất ngay lập tức
            // thay vì đợi vòng poll 8s tiếp theo.
            loadConversations({ silent: true });
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch Sử</Text>
        <TouchableOpacity
          style={[styles.newChatBtn, tab !== 'CHAT' && styles.newChatBtnHidden]}
          onPress={() => setNewChatModalVisible(true)}
          disabled={tab !== 'CHAT'}
          accessibilityElementsHidden={tab !== 'CHAT'}
          importantForAccessibility={tab !== 'CHAT' ? 'no-hide-descendants' : 'yes'}
          accessibilityRole="button"
          accessibilityLabel="Nhắn tin mới"
        >
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 2 tab con: Giao dịch / Chat */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'TRANSACTIONS' && styles.tabBtnActive]}
          onPress={() => setTab('TRANSACTIONS')}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'TRANSACTIONS' }}
          accessibilityLabel="Giao dịch"
        >
          <Ionicons name="receipt" size={16} color={tab === 'TRANSACTIONS' ? '#fff' : colors.textMuted} />
          <Text style={[styles.tabBtnText, tab === 'TRANSACTIONS' && styles.tabBtnTextActive]}>Giao dịch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'CHAT' && styles.tabBtnActive]}
          onPress={() => setTab('CHAT')}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'CHAT' }}
          accessibilityLabel={unreadCount > 0 ? `Chat, ${unreadCount} tin nhắn chưa đọc` : 'Chat'}
        >
          <View>
            <Ionicons name="chatbubbles" size={16} color={tab === 'CHAT' ? '#fff' : colors.textMuted} />
            {unreadCount > 0 && <View style={styles.chatTabDot} />}
          </View>
          <Text style={[styles.tabBtnText, tab === 'CHAT' && styles.tabBtnTextActive]}>Chat</Text>
        </TouchableOpacity>
      </View>

      {tab === 'TRANSACTIONS' && (
        loadingOrders ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyText}>Chưa có giao dịch nào.{"\n"}Thỏa thuận giá trong Chat để tạo đơn hàng!</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={item => item.id}
            renderItem={renderTransactionItem}
            contentContainerStyle={styles.list}
            refreshing={loadingOrders}
            onRefresh={loadOrders}
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
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadConversations()} accessibilityRole="button" accessibilityLabel="Thử tải lại danh sách hội thoại">
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setNewChatModalVisible(true)} accessibilityRole="button" accessibilityLabel="Bắt đầu nhắn tin mới">
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
  // Ẩn "vô hình" (opacity 0) thay vì gỡ khỏi cây layout — xem giải thích ở JSX phía trên.
  newChatBtnHidden: { opacity: 0 },
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
  chatAvatarWrap: {
    position: 'relative',
  },
  chatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Chấm đỏ nhỏ trên avatar — đánh dấu NGAY tại hội thoại nào có tin chưa đọc,
  // để không phải đoán/đếm bằng chấm đỏ chung ở tab Chat nữa.
  chatAvatarDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.card,
  },
  chatPeerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  chatPeerNameUnread: {
    color: colors.textPrimary,
  },
  chatLastMessage: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Tin nhắn cuối được in đậm + màu chữ đậm hơn khi hội thoại còn tin chưa đọc,
  // giống quy ước của các app chat phổ biến.
  chatLastMessageUnread: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chatCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  chatTime: {
    fontSize: 10,
    color: colors.textFaint,
  },
  chatTimeUnread: {
    color: colors.primary,
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  statusPending: { backgroundColor: '#fef3c7' },
  statusTextPending: { color: '#d97706' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { fontSize: 12, color: colors.textMuted },
  totalValue: { fontSize: 15, fontWeight: 'bold', color: colors.success },
});
