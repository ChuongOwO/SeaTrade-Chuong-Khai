import { apiFetch } from './client';

// Trợ lý AI cho admin — back-end/src/modules/admin/agent.
// Kết quả: { conversationId, reply, pendingActions?: [{ id, tool, summary }], executed? }

export async function askAgent(message, conversationId = null) {
  const res = await apiFetch('/api/admin/agent/chat', {
    method: 'POST',
    body: { conversationId, message },
  });
  return res.metadata;
}

// Cuộc trò chuyện đang mở (lưu ở DB) để hiển thị lại sau khi tải lại trang.
// Kết quả: { conversationId, mode, messages: [{ role, text, actions?: [{ id, tool, summary, decision? }] }] }
export async function fetchAgentConversation() {
  const res = await apiFetch('/api/admin/agent/conversation');
  return res.metadata;
}

export async function resetAgentConversation() {
  await apiFetch('/api/admin/agent/conversation', { method: 'DELETE' });
}

// decisions: { [actionId]: true (duyệt) | false (từ chối) }
export async function confirmAgentActions(conversationId, decisions) {
  const res = await apiFetch('/api/admin/agent/confirm', {
    method: 'POST',
    body: { conversationId, decisions },
  });
  return res.metadata;
}
