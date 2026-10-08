const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { TOOL_DEFINITIONS, TOOLS_BY_NAME } = require('./agent.tools');
const { createMockClient } = require('./agent.mock');

const MODEL = 'claude-opus-5-5';
// Tự chạy lại trên model dự phòng nếu model chính từ chối (refusal)
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const MAX_TOOL_ROUNDS = 8; // chặn vòng lặp tool vô hạn trong 1 lượt chat
const CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_CONVERSATIONS = 200;

class AgentError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const SYSTEM_PROMPT = `Bạn là Trợ lý AI của SeaTrade AI — nền tảng kết nối giao thương hải sản ven biển giữa tàu đánh bắt (ngư dân) và tàu thu gom / thương lái. Bạn hỗ trợ QUẢN TRỊ VIÊN (admin) tra cứu và vận hành hệ thống qua các công cụ được cung cấp.

Nguyên tắc:
- Luôn trả lời bằng tiếng Việt, ngắn gọn, đi thẳng vào số liệu. Tiền định dạng kiểu 1.250.000 đ, khối lượng theo kg.
- Câu trả lời hiển thị dạng chữ thường trên web: không dùng Markdown (bảng, tiêu đề, chữ đậm). Khi liệt kê, mỗi ý một dòng bắt đầu bằng "- ".
- Chỉ dùng dữ liệu lấy từ công cụ; không bịa số liệu. Nếu công cụ không có dữ liệu, nói rõ là chưa có.
- Khi nhắc tới đơn hàng, ghi mã ngắn (8 ký tự đầu, viết hoa) thay vì UUID đầy đủ.
- Các thao tác thay đổi dữ liệu (đổi trạng thái đơn, khoá/mở khoá hoặc đổi vai trò tài khoản, đổi trạng thái tàu) chỉ là ĐỀ XUẤT: hệ thống sẽ hiện nút để admin xác nhận. Không bao giờ nói thao tác đã xong trước khi nhận được kết quả công cụ báo done.
- Trước khi đề xuất thao tác, tra cứu để có đúng UUID đầy đủ của đối tượng. Nếu yêu cầu mơ hồ hoặc khớp nhiều đối tượng, hỏi lại admin thay vì đoán.
- Nếu admin từ chối một thao tác, ghi nhận và không đề xuất lại trừ khi được yêu cầu.`;

// Hội thoại lưu trong bộ nhớ server, chỉ NỐI THÊM (append-only): nội dung trả
// về của model (gồm cả khối thinking) phải được gửi lại nguyên vẹn ở lượt sau.
// Khởi động lại server thì mất lịch sử — chấp nhận được với trợ lý admin.
const conversations = new Map();

const pruneConversations = () => {
  const now = Date.now();
  for (const [id, conversation] of conversations) {
    if (now - conversation.updatedAt > CONVERSATION_TTL_MS) conversations.delete(id);
  }
  while (conversations.size > MAX_CONVERSATIONS) {
    conversations.delete(conversations.keys().next().value);
  }
};

// AI_AGENT_MOCK=true: dùng model giả lập (agent.mock.js), không cần API key
const isMockMode = () => process.env.AI_AGENT_MOCK === 'true';

let client = null;
const getClient = () => {
  if (isMockMode()) return createMockClient();
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AgentError(503, 'Trợ lý AI chưa được cấu hình: thiếu ANTHROPIC_API_KEY trong back-end/.env');
  }
  client = client || new Anthropic();
  return client;
};

const getConversation = (conversationId, admin) => {
  const conversation = conversations.get(conversationId);
  if (!conversation || conversation.adminId !== admin.id) {
    throw new AgentError(404, 'Cuộc hội thoại không tồn tại hoặc đã hết hạn, hãy bắt đầu cuộc mới');
  }
  return conversation;
};

const extractText = (content) =>
  content.filter(block => block.type === 'text').map(block => block.text).join('\n').trim();

const toolResult = (toolUseId, payload, isError = false) => ({
  type: 'tool_result',
  tool_use_id: toolUseId,
  content: JSON.stringify(payload),
  ...(isError && { is_error: true })
});

const runTool = async (tool, toolUse, admin) => {
  try {
    return toolResult(toolUse.id, await tool.run(toolUse.input, admin));
  } catch (error) {
    return toolResult(toolUse.id, { error: error.message }, true);
  }
};

const callModel = (messages) =>
  getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    // Tự động cache phần đầu ổn định (tools + system + lịch sử) giữa các lượt
    cache_control: { type: 'ephemeral' },
    system: `${SYSTEM_PROMPT}\n\nHôm nay là ${new Date().toLocaleDateString('vi-VN')}.`,
    tools: TOOL_DEFINITIONS,
    messages
  });

/**
 * Xử lý các tool_use trong 1 lượt trả lời của model: tool đọc chạy ngay, tool
 * ghi chỉ tạo "thao tác chờ xác nhận". Trả về { results, actions }.
 */
const handleToolUses = async (toolUses, admin) => {
  const results = [];
  const actions = [];

  for (const toolUse of toolUses) {
    const tool = TOOLS_BY_NAME[toolUse.name];
    if (!tool) {
      results.push(toolResult(toolUse.id, { error: `Không có công cụ ${toolUse.name}` }, true));
    } else if (!tool.requiresConfirmation) {
      results.push(await runTool(tool, toolUse, admin));
    } else {
      try {
        const summary = await tool.describe(toolUse.input, admin);
        actions.push({ id: toolUse.id, tool: toolUse.name, input: toolUse.input, summary });
      } catch (error) {
        // Đề xuất không hợp lệ (sai id, tự khoá mình...) -> báo lại cho model tự sửa
        results.push(toolResult(toolUse.id, { error: error.message }, true));
      }
    }
  }
  return { results, actions };
};

/**
 * Vòng lặp agent cho tới khi model trả lời xong, hoặc dừng lại chờ admin xác
 * nhận thao tác ghi. Mọi tool_result của 1 lượt gửi chung trong 1 message.
 */
const runUntilReply = async (conversation, admin) => {
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callModel(conversation.messages);
    conversation.messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'refusal') {
      return { reply: 'Trợ lý không thể xử lý yêu cầu này. Hãy diễn đạt lại hoặc thao tác trực tiếp trên giao diện.' };
    }
    if (response.stop_reason === 'pause_turn') continue;

    const text = extractText(response.content);
    const toolUses = response.content.filter(block => block.type === 'tool_use');
    if (toolUses.length === 0 || response.stop_reason === 'max_tokens') {
      return { reply: text || 'Trợ lý chưa đưa ra câu trả lời, hãy thử hỏi lại.' };
    }

    const { results, actions } = await handleToolUses(toolUses, admin);
    if (actions.length > 0) {
      conversation.pending = { results, actions };
      return { reply: text, pendingActions: actions.map(({ id, tool, summary }) => ({ id, tool, summary })) };
    }
    conversation.messages.push({ role: 'user', content: results });
  }
  return { reply: 'Yêu cầu cần quá nhiều bước tra cứu, hãy chia nhỏ câu hỏi.' };
};

const getMode = () => (isMockMode() ? 'mock' : 'claude');

const chat = async (admin, { conversationId, message }) => {
  pruneConversations();

  let conversation;
  if (conversationId) {
    conversation = getConversation(conversationId, admin);
    if (conversation.pending) {
      throw new AgentError(409, 'Còn thao tác đang chờ xác nhận, hãy xác nhận hoặc từ chối trước');
    }
  } else {
    conversation = { id: crypto.randomUUID(), adminId: admin.id, messages: [], pending: null };
    conversations.set(conversation.id, conversation);
  }

  conversation.updatedAt = Date.now();
  conversation.messages.push({ role: 'user', content: message });
  return { conversationId: conversation.id, mode: getMode(), ...(await runUntilReply(conversation, admin)) };
};

/**
 * decisions: { [actionId]: true (duyệt) | false (từ chối) }. Thực thi các thao
 * tác được duyệt, báo kết quả cho model rồi để model trả lời tiếp.
 */
const confirm = async (admin, { conversationId, decisions }) => {
  const conversation = getConversation(conversationId, admin);
  const { pending } = conversation;
  if (!pending) throw new AgentError(409, 'Không có thao tác nào đang chờ xác nhận');

  const results = [...pending.results];
  const executed = [];
  for (const action of pending.actions) {
    if (decisions[action.id] === true) {
      const result = await runTool(TOOLS_BY_NAME[action.tool], action, admin);
      results.push(result);
      executed.push({ id: action.id, success: !result.is_error });
    } else {
      results.push(toolResult(action.id, { done: false, message: 'Admin đã TỪ CHỐI thao tác này, không thực hiện.' }));
    }
  }

  conversation.pending = null;
  conversation.updatedAt = Date.now();
  conversation.messages.push({ role: 'user', content: results });
  return { conversationId, executed, mode: getMode(), ...(await runUntilReply(conversation, admin)) };
};

module.exports = { chat, confirm, AgentError };
