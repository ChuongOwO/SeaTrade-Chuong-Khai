import { apiFetch } from './client';

// Khớp back-end/src/modules/chat (chat.routes.js / chat.controller.js).
// Hội thoại là giữa 2 người dùng (buyer_id/seller_id), mở bằng SĐT của người
// kia; tin nhắn dùng field `message` (không phải `content`).

// Danh sách hội thoại của tôi, kèm peer, last_message, unread_count
export async function fetchConversations() {
  const res = await apiFetch('/api/chat/conversations');
  return res.metadata || [];
}

// Mở (hoặc tạo mới) hội thoại với người có SĐT peerPhone
export async function openConversation(peerPhone) {
  const res = await apiFetch('/api/chat/conversations', {
    method: 'POST',
    body: { peer_phone: peerPhone },
  });
  return res.metadata;
}

export async function fetchMessages(conversationId) {
  const res = await apiFetch(`/api/chat/conversations/${conversationId}/messages`);
  return res.metadata || [];
}

export async function sendMessage(conversationId, message) {
  const res = await apiFetch(`/api/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { message },
  });
  return res.metadata;
}
