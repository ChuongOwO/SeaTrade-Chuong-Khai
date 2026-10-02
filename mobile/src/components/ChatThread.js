import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
  Image, Alert, Linking, Modal
} from 'react-native';
import { io } from 'socket.io-client';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { fetchMessages, sendMessage } from '../api/chatApi';
import { API_URL } from '../config/api';

const POLL_INTERVAL_MS = 15000; // Giảm tải vì đã có Socket.io

function parseMessageContent(raw) {
  if (!raw) return { type: 'text', data: '' };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.__type === 'IMAGE') return { type: 'image', data: parsed };
    if (parsed.__type === 'LOCATION') return { type: 'location', data: parsed };
    if (parsed.__type === 'PRICE_OFFER') return { type: 'price_offer', data: parsed };
    if (parsed.__type === 'OFFER_ACCEPTED') return { type: 'offer_accepted', data: parsed };
    if (parsed.__type === 'OFFER_REJECTED') return { type: 'offer_rejected', data: parsed };
    return { type: 'text', data: raw };
  } catch {
    return { type: 'text', data: raw };
  }
}

function formatVND(n) {
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

export default function ChatThread({ conversation, onBack, targetOfferId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [negotiation, setNegotiation] = useState(null);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [counterTargetOffer, setCounterTargetOffer] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const listRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    AsyncStorage.getItem('userData').then((raw) => {
      if (raw) {
        try { setMyUserId(JSON.parse(raw).id); } catch {}
      }
    });
    // Đọc negotiation context (nếu đến từ MarketScreen)
    AsyncStorage.getItem('negotiation_context').then((raw) => {
      if (raw) {
        try {
          const ctx = JSON.parse(raw);
          if (ctx.conversation_id === conversation.id) {
            setNegotiation(ctx);
            setQtyInput(String(ctx.quantity_kg || ''));
          }
        } catch {}
      }
    });
  }, [conversation.id]);

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
    
    // Khởi tạo kết nối Socket.io
    const socket = io(API_URL);
    
    socket.on('connect', () => {
      // Đăng ký nhận thông báo có tin nhắn mới cho room này
      socket.on(`new_message_${conversation.id}`, () => {
        load({ silent: true });
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
      });
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [load, conversation.id]);

  // Cuộn tới targetOfferId nếu có
  useEffect(() => {
    if (!loading && messages.length > 0 && targetOfferId && listRef.current) {
      const index = messages.findIndex(m => {
        if (m.message?.startsWith('{')) {
          try {
            const data = JSON.parse(m.message);
            return data.offer_id === targetOfferId;
          } catch {}
        }
        return false;
      });
      if (index >= 0) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }, 500);
      }
    }
  }, [loading, messages, targetOfferId]);

  const getToken = async () => await AsyncStorage.getItem('userToken');

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

  // === Gửi ảnh ===
  const handleSendImage = async () => {
    setShowActions(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.15,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setSending(true);
    try {
      const imagePayload = JSON.stringify({
        __type: 'IMAGE',
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null,
        width: asset.width,
        height: asset.height,
      });
      await sendMessage(conversation.id, imagePayload);
      await load({ silent: true });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi ảnh: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // === Gửi vị trí GPS ===
  const handleSendLocation = async () => {
    setShowActions(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền', 'Vui lòng cấp quyền truy cập vị trí.');
      return;
    }
    setSending(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const locationPayload = JSON.stringify({
        __type: 'LOCATION',
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      });
      await sendMessage(conversation.id, locationPayload);
      await load({ silent: true });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lấy vị trí: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const openLocationInMap = (lat, lng) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
    });
  };

  // === Đề xuất giá ===
  const handleSubmitOffer = async () => {
    const price = parseFloat(priceInput);
    const qty = parseFloat(qtyInput);
    if (!price || price <= 0 || !qty || qty <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá và số lượng hợp lệ.');
      return;
    }
    if (!negotiation) {
      Alert.alert('Lỗi', 'Không có thông tin mẻ cá để thương lượng.');
      return;
    }
    setPriceModalVisible(false);
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          conversation_id: conversation.id,
          batch_id: negotiation.batch_id,
          seller_id: negotiation.seller_id,
          quantity_kg: qty,
          price_per_kg: price,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể gửi đề xuất');
      setPriceInput('');
      await load({ silent: true });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setSending(false);
    }
  };

  // === Chấp nhận / Từ chối / Trả giá ===
  const handleAcceptOffer = async (offerId) => {
    Alert.alert('Xác nhận', 'Bạn chắc chắn chấp nhận giá này và tạo đơn hàng?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Chấp nhận', onPress: async () => {
        setSending(true);
        try {
          const token = await getToken();
          const res = await fetch(`${API_URL}/api/offers/${offerId}/accept`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Không thể chấp nhận');
          await load({ silent: true });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (err) {
          Alert.alert('Lỗi', err.message);
        } finally {
          setSending(false);
        }
      }}
    ]);
  };

  const handleRejectOffer = async (offerId) => {
    Alert.alert('Xác nhận', 'Bạn chắc chắn từ chối đề xuất giá này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Từ chối', style: 'destructive', onPress: async () => {
        setSending(true);
        try {
          const token = await getToken();
          const res = await fetch(`${API_URL}/api/offers/${offerId}/reject`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Không thể từ chối');
          await load({ silent: true });
        } catch (err) {
          Alert.alert('Lỗi', err.message);
        } finally {
          setSending(false);
        }
      }}
    ]);
  };

  const handleSubmitCounter = async () => {
    const price = parseFloat(priceInput);
    const qty = parseFloat(qtyInput) || counterTargetOffer?.quantity_kg;
    if (!price || price <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá hợp lệ.');
      return;
    }
    setCounterModalVisible(false);
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/offers/${counterTargetOffer.offer_id}/counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ price_per_kg: price, quantity_kg: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể trả giá');
      setPriceInput('');
      setCounterTargetOffer(null);
      await load({ silent: true });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setSending(false);
    }
  };

  const peerName = conversation.peer?.full_name || conversation.peer?.phone || 'Người dùng';

  // === Render bong bóng ===
  const renderBubble = (item) => {
    const isMine = item.sender_id === myUserId;
    const { type, data } = parseMessageContent(item.message);
    const timeStr = item.created_at
      ? new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '';

    if (type === 'image') {
      const imageSource = data.base64 || data.uri;
      const aspect = data.width && data.height ? data.width / data.height : 4 / 3;
      return (
        <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
          <TouchableOpacity 
            style={[styles.bubble, styles.imageBubble]}
            activeOpacity={0.8}
            onPress={() => setFullScreenImage(imageSource)}
          >
            {imageSource ? (
              <Image source={{ uri: imageSource }} style={[styles.chatImage, { aspectRatio: aspect }]} resizeMode="contain" />
            ) : (
              <View style={styles.chatImagePlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              </View>
            )}
            <Text style={styles.bubbleTimeBelowImage}>{timeStr}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'location') {
      return (
        <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
          <View style={[styles.bubble, styles.locationBubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="location" size={20} color={isMine ? '#fff' : colors.primary} />
              <Text style={[styles.locationText, isMine && { color: '#fff' }]}>Vị trí tàu</Text>
            </View>
            
            <View style={styles.mapContainer}>
              <MapView
                style={styles.miniMap}
                initialRegion={{
                  latitude: data.latitude,
                  longitude: data.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                pitchEnabled={false}
                rotateEnabled={false}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker coordinate={{ latitude: data.latitude, longitude: data.longitude }} />
              </MapView>
              <TouchableOpacity
                style={styles.mapOverlay}
                onPress={() => {
                  // Chuyển sang Tab Home kèm toạ độ mục tiêu
                  navigation.navigate('Home', { targetLocation: { latitude: data.latitude, longitude: data.longitude } });
                }}
              >
                <Text style={styles.mapOverlayText}>Chỉ đường đi</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.locationCoords, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
              {data.latitude?.toFixed(5)}, {data.longitude?.toFixed(5)}
            </Text>
            <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{timeStr}</Text>
          </View>
        </View>
      );
    }

    // === PRICE OFFER ===
    if (type === 'price_offer') {
      const isMyOffer = data.from_user_id === myUserId;
      const isPending = data.status === 'PENDING';
      return (
        <View style={[styles.bubbleRow, isMyOffer ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
          <View style={[styles.offerBubble, isMyOffer ? styles.offerBubbleMine : styles.offerBubbleTheirs]}>
            <View style={styles.offerHeader}>
              <Ionicons name="pricetag" size={16} color={colors.warningAccent} />
              <Text style={styles.offerTitle}>
                {data.is_counter ? '💬 Trả giá' : '💰 Đề xuất giá'}
              </Text>
            </View>
            <Text style={styles.offerSpecies}>{data.species_name}</Text>
            <View style={styles.offerDetails}>
              <Text style={styles.offerPrice}>{formatVND(data.price_per_kg)}/kg</Text>
              <Text style={styles.offerQty}>× {data.quantity_kg} kg</Text>
            </View>
            <View style={styles.offerTotalRow}>
              <Text style={styles.offerTotalLabel}>Tổng:</Text>
              <Text style={styles.offerTotal}>{formatVND(data.total)}</Text>
            </View>
            {/* Nút Accept/Reject/Counter chỉ hiện cho người NHẬN offer và khi PENDING */}
            {!isMyOffer && isPending && (
              <View style={styles.offerActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptOffer(data.offer_id)}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.offerActionText}>Chấp nhận</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.counterBtn} onPress={() => {
                  setCounterTargetOffer(data);
                  setQtyInput(String(data.quantity_kg));
                  setPriceInput('');
                  setCounterModalVisible(true);
                }}>
                  <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                  <Text style={[styles.offerActionText, { color: colors.primary }]}>Trả giá</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectOffer(data.offer_id)}>
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                  <Text style={[styles.offerActionText, { color: colors.danger }]}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.offerTime}>{timeStr}</Text>
          </View>
        </View>
      );
    }

    // === OFFER ACCEPTED ===
    if (type === 'offer_accepted') {
      const isTarget = data.offer_id === targetOfferId;
      return (
        <View style={[styles.systemBubble, isTarget && { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#e0f2fe' }]}>
          <Ionicons name="checkmark-done-circle" size={28} color={colors.success} />
          <Text style={styles.systemText}>
            ✅ Đã chốt đơn! {data.species_name} — {formatVND(data.price_per_kg)}/kg × {data.quantity_kg}kg = {formatVND(data.total)}
          </Text>
          <Text style={styles.systemSubText}>Đơn hàng đã được tạo. Xem tại tab Giao dịch.</Text>
        </View>
      );
    }

    // === OFFER REJECTED ===
    if (type === 'offer_rejected') {
      return (
        <View style={styles.systemBubble}>
          <Ionicons name="close-circle" size={24} color={colors.danger} />
          <Text style={styles.systemText}>
            ❌ Đã từ chối đề xuất {formatVND(data.price_per_kg)}/kg × {data.quantity_kg}kg
          </Text>
        </View>
      );
    }

    // Text thường
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{data}</Text>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{peerName}</Text>
        {negotiation && (
          <Text style={styles.headerSub} numberOfLines={1}>
            🐟 {negotiation.species_name} • {negotiation.quantity_kg}kg
          </Text>
        )}
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
          onContentSizeChange={() => {
            if (!targetOfferId) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onScrollToIndexFailed={info => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            });
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Chưa có tin nhắn nào. Gửi lời chào để bắt đầu!</Text>
            </View>
          }
          renderItem={({ item }) => renderBubble(item)}
        />
      )}

      {showActions && (
        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleSendImage}>
            <Ionicons name="image" size={22} color={colors.primary} />
            <Text style={styles.actionLabel}>Ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleSendLocation}>
            <Ionicons name="location" size={22} color={colors.success} />
            <Text style={styles.actionLabel}>Vị trí</Text>
          </TouchableOpacity>
          {negotiation && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => {
              setShowActions(false);
              setPriceModalVisible(true);
            }}>
              <Ionicons name="pricetag" size={22} color={colors.warningAccent} />
              <Text style={styles.actionLabel}>Đề xuất giá</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.attachBtn} onPress={() => setShowActions(!showActions)}>
          <Ionicons name={showActions ? 'close-circle' : 'add-circle'} size={28} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          onFocus={() => setShowActions(false)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal đề xuất giá */}
      <Modal visible={priceModalVisible} transparent animationType="fade" onRequestClose={() => setPriceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>💰 Đề xuất giá mua</Text>
            {negotiation && (
              <Text style={styles.modalSub}>
                {negotiation.species_name} • Chất lượng: {negotiation.quality_level || 'N/A'}
              </Text>
            )}
            <Text style={styles.modalLabel}>Giá mỗi kg (VNĐ)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: 190000"
              keyboardType="numeric"
              value={priceInput}
              onChangeText={setPriceInput}
              autoFocus
            />
            <Text style={styles.modalLabel}>Số lượng (kg)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: 50"
              keyboardType="numeric"
              value={qtyInput}
              onChangeText={setQtyInput}
            />
            {priceInput && qtyInput ? (
              <Text style={styles.modalTotal}>
                Tổng: {formatVND(parseFloat(priceInput || 0) * parseFloat(qtyInput || 0))}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setPriceModalVisible(false)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleSubmitOffer}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Gửi đề xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal trả giá */}
      <Modal visible={counterModalVisible} transparent animationType="fade" onRequestClose={() => setCounterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>💬 Trả giá</Text>
            <Text style={styles.modalSub}>
              Giá đề xuất hiện tại: {counterTargetOffer ? formatVND(counterTargetOffer.price_per_kg) : ''}/kg
            </Text>
            <Text style={styles.modalLabel}>Giá mới (VNĐ/kg)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: 200000"
              keyboardType="numeric"
              value={priceInput}
              onChangeText={setPriceInput}
              autoFocus
            />
            <Text style={styles.modalLabel}>Số lượng (kg)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: 50"
              keyboardType="numeric"
              value={qtyInput}
              onChangeText={setQtyInput}
            />
            {priceInput && qtyInput ? (
              <Text style={styles.modalTotal}>
                Tổng: {formatVND(parseFloat(priceInput || 0) * parseFloat(qtyInput || 0))}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setCounterModalVisible(false)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleSubmitCounter}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Gửi trả giá</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Zoom Ảnh */}
      <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setFullScreenImage(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullScreenImage && <Image source={{ uri: fullScreenImage }} style={{ width: '100%', height: '85%' }} resizeMode="contain" />}
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: 'wrap',
  },
  backBtn: { padding: 4, marginRight: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, flex: 1 },
  headerSub: { fontSize: 11, color: colors.primary, fontWeight: '600', width: '100%', marginTop: 2, marginLeft: 30 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { color: colors.danger, fontSize: 12, flex: 1 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: colors.textFaint, fontSize: 13, textAlign: 'center' },
  list: { padding: 12, flexGrow: 1, paddingBottom: 60 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: colors.textPrimary },
  bubbleTextMine: { color: colors.textOnPrimary },
  bubbleTime: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeBelowImage: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },

  imageBubble: { padding: 0, maxWidth: '75%', backgroundColor: 'transparent', borderWidth: 0 },
  chatImage: { width: 220, borderRadius: 12 },
  chatImagePlaceholder: {
    width: 200, height: 150, borderRadius: 12,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
  },

  locationBubble: { paddingVertical: 12, paddingHorizontal: 14, maxWidth: '85%' },
  locationText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 4 },
  mapContainer: { width: 220, height: 140, borderRadius: 12, overflow: 'hidden', marginTop: 4, marginBottom: 8, backgroundColor: '#eee' },
  miniMap: { width: '100%', height: '100%' },
  mapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6, alignItems: 'center'
  },
  mapOverlayText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  locationCoords: { fontSize: 11, color: colors.textMuted },

  // Offer bubbles
  offerBubble: {
    maxWidth: '85%', padding: 14, borderRadius: 16,
    borderWidth: 2, borderColor: colors.warningAccent, backgroundColor: '#fffbeb',
  },
  offerBubbleMine: { borderBottomRightRadius: 4 },
  offerBubbleTheirs: { borderBottomLeftRadius: 4 },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  offerTitle: { fontSize: 13, fontWeight: 'bold', color: colors.warningAccent },
  offerSpecies: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  offerDetails: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerPrice: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  offerQty: { fontSize: 14, color: colors.textMuted },
  offerTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#fde68a',
  },
  offerTotalLabel: { fontSize: 13, color: colors.textMuted },
  offerTotal: { fontSize: 16, fontWeight: 'bold', color: colors.success },
  offerActions: {
    flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'space-between',
  },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.success, paddingVertical: 8, borderRadius: 8,
  },
  counterBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.primarySoft, paddingVertical: 8, borderRadius: 8,
  },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.dangerSoft, paddingVertical: 8, borderRadius: 8,
  },
  offerActionText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  offerTime: { fontSize: 10, color: colors.textMuted, marginTop: 6, textAlign: 'right' },

  // System bubble (accepted/rejected)
  systemBubble: {
    alignItems: 'center', padding: 14, marginVertical: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0',
  },
  systemText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  systemSubText: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  actionsBar: {
    flexDirection: 'row', gap: 20, paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
  attachBtn: { paddingBottom: 6 },
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

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: { width: '100%', backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  modalSub: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 14 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginTop: 10, marginBottom: 4 },
  modalInput: {
    backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  modalTotal: {
    fontSize: 16, fontWeight: 'bold', color: colors.success, marginTop: 12, textAlign: 'right',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  modalBtnCancel: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.background },
  modalBtnPrimary: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary },
});
