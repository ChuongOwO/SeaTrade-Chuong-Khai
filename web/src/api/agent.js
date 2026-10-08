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

// decisions: { [actionId]: true (duyệt) | false (từ chối) }
export async function confirmAgentActions(conversationId, decisions) {
  const res = await apiFetch('/api/admin/agent/confirm', {
    method: 'POST',
    body: { conversationId, decisions },
  });
  return res.metadata;
}
