import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CHAT_CONVERSATIONS_URL, chatMessagesUrl } from '../config/api';

// Lớp gọi API Chat — viết theo đúng phong cách raw fetch() + đọc token từ
// AsyncStorage đang dùng trong toàn app mobile (xem LoginScreen.js,
// ProfileScreen.js uploadAvatar). Field "message" khớp đúng tên cột thật
// trong bảng messages (script.sql của đồng đội, mục 18) — KHÔNG phải "content".

async function authHeaders() {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    // không có JSON body
  }
  if (!response.ok) {
    const err = new Error(data?.message || `Lỗi HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

// Bắt đầu (hoặc mở lại) hội thoại với 1 người dùng khác qua số điện thoại.
// listingId/orderId để trống vì module Listing/Order thật chưa có API.
export async function startConversation(peerPhone, listingId = null, orderId = null) {
  const response = await fetch(API_CHAT_CONVERSATIONS_URL, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ peer_phone: peerPhone, listing_id: listingId, order_id: orderId }),
  });
  const data = await handleResponse(response);
  return data.metadata;
}

// Danh sách hội thoại của tôi, sắp xếp mới nhất trước.
export async function fetchConversations() {
  const response = await fetch(API_CHAT_CONVERSATIONS_URL, {
    headers: await authHeaders(),
  });
  const data = await handleResponse(response);
  return data.metadata || [];
}

export async function fetchMessages(conversationId) {
  const response = await fetch(chatMessagesUrl(conversationId), {
    headers: await authHeaders(),
  });
  const data = await handleResponse(response);
  return data.metadata || [];
}

export async function sendMessage(conversationId, message) {
  const response = await fetch(chatMessagesUrl(conversationId), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ message }),
  });
  const data = await handleResponse(response);
  return data.metadata;
}
